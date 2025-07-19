-- Atomic CSRF token operations to prevent race conditions
-- Supports thread-safe CSRF token management

-- Function for atomic CSRF token upsert
CREATE OR REPLACE FUNCTION atomic_csrf_token_upsert(
    p_user_id uuid,
    p_token_hash text,
    p_expires_at timestamp with time zone
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_existing_token_id uuid;
    v_result json;
BEGIN
    -- Try to get existing token for user with row-level lock
    SELECT id INTO v_existing_token_id
    FROM csrf_tokens
    WHERE user_id = p_user_id
    FOR UPDATE;
    
    IF v_existing_token_id IS NOT NULL THEN
        -- Update existing token atomically
        UPDATE csrf_tokens
        SET token = p_token_hash,
            expires_at = p_expires_at,
            created_at = NOW()
        WHERE id = v_existing_token_id;
        
        v_result := json_build_object(
            'success', true,
            'action', 'updated',
            'token_id', v_existing_token_id,
            'user_id', p_user_id
        );
    ELSE
        -- Insert new token
        INSERT INTO csrf_tokens (user_id, token, expires_at, created_at)
        VALUES (p_user_id, p_token_hash, p_expires_at, NOW())
        RETURNING id INTO v_existing_token_id;
        
        v_result := json_build_object(
            'success', true,
            'action', 'created',
            'token_id', v_existing_token_id,
            'user_id', p_user_id
        );
    END IF;
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'user_id', p_user_id
        );
END;
$$;

-- Function for atomic CSRF token validation
CREATE OR REPLACE FUNCTION atomic_csrf_token_validate(
    p_user_id uuid,
    p_token_hash text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_token_exists boolean := false;
    v_current_time timestamp with time zone;
BEGIN
    v_current_time := NOW();
    
    -- Check if valid token exists atomically
    SELECT EXISTS (
        SELECT 1 
        FROM csrf_tokens 
        WHERE user_id = p_user_id 
          AND token = p_token_hash 
          AND expires_at > v_current_time
    ) INTO v_token_exists;
    
    RETURN v_token_exists;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Return false on any error for security
        RETURN false;
END;
$$;

-- Function for atomic CSRF token validation with cleanup
CREATE OR REPLACE FUNCTION atomic_csrf_token_validate_and_cleanup(
    p_user_id uuid,
    p_token_hash text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_token_valid boolean := false;
    v_current_time timestamp with time zone;
    v_cleaned_tokens integer := 0;
    v_result json;
BEGIN
    v_current_time := NOW();
    
    -- Check if valid token exists
    SELECT EXISTS (
        SELECT 1 
        FROM csrf_tokens 
        WHERE user_id = p_user_id 
          AND token = p_token_hash 
          AND expires_at > v_current_time
    ) INTO v_token_valid;
    
    -- Clean up expired tokens for this user while we're here
    DELETE FROM csrf_tokens
    WHERE user_id = p_user_id 
      AND expires_at <= v_current_time;
    
    GET DIAGNOSTICS v_cleaned_tokens = ROW_COUNT;
    
    v_result := json_build_object(
        'valid', v_token_valid,
        'user_id', p_user_id,
        'cleaned_tokens', v_cleaned_tokens,
        'validated_at', v_current_time
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'valid', false,
            'error', SQLERRM,
            'user_id', p_user_id
        );
END;
$$;

-- Function for batch cleanup of expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_csrf_tokens(
    p_batch_size integer DEFAULT 1000
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_count integer := 0;
    v_current_time timestamp with time zone;
    v_result json;
BEGIN
    v_current_time := NOW();
    
    -- Delete expired tokens in batches to avoid long locks
    WITH deleted_tokens AS (
        DELETE FROM csrf_tokens
        WHERE expires_at <= v_current_time
          AND id IN (
              SELECT id 
              FROM csrf_tokens 
              WHERE expires_at <= v_current_time 
              LIMIT p_batch_size
          )
        RETURNING user_id
    )
    SELECT COUNT(*) INTO v_deleted_count FROM deleted_tokens;
    
    v_result := json_build_object(
        'deleted_count', v_deleted_count,
        'cleanup_time', v_current_time,
        'batch_size', p_batch_size
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'deleted_count', 0,
            'error', SQLERRM,
            'cleanup_time', v_current_time
        );
END;
$$;

-- Function to get CSRF token statistics
CREATE OR REPLACE FUNCTION get_csrf_token_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_tokens integer;
    v_active_tokens integer;
    v_expired_tokens integer;
    v_oldest_token timestamp with time zone;
    v_newest_token timestamp with time zone;
    v_current_time timestamp with time zone;
    v_result json;
BEGIN
    v_current_time := NOW();
    
    -- Get token counts
    SELECT COUNT(*) INTO v_total_tokens FROM csrf_tokens;
    
    SELECT COUNT(*) INTO v_active_tokens 
    FROM csrf_tokens 
    WHERE expires_at > v_current_time;
    
    SELECT COUNT(*) INTO v_expired_tokens 
    FROM csrf_tokens 
    WHERE expires_at <= v_current_time;
    
    -- Get oldest and newest token timestamps
    SELECT MIN(created_at), MAX(created_at) 
    INTO v_oldest_token, v_newest_token 
    FROM csrf_tokens;
    
    v_result := json_build_object(
        'total_tokens', v_total_tokens,
        'active_tokens', v_active_tokens,
        'expired_tokens', v_expired_tokens,
        'oldest_token', v_oldest_token,
        'newest_token', v_newest_token,
        'stats_generated_at', v_current_time
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'error', SQLERRM,
            'stats_generated_at', NOW()
        );
END;
$$;

-- Function for atomic token refresh (get existing or create new)
CREATE OR REPLACE FUNCTION atomic_csrf_token_refresh(
    p_user_id uuid,
    p_new_token_hash text,
    p_expires_at timestamp with time zone
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_existing_token_valid boolean := false;
    v_existing_token_hash text;
    v_current_time timestamp with time zone;
    v_result json;
BEGIN
    v_current_time := NOW();
    
    -- Check for existing valid token
    SELECT token INTO v_existing_token_hash
    FROM csrf_tokens
    WHERE user_id = p_user_id 
      AND expires_at > v_current_time
    FOR UPDATE;
    
    IF v_existing_token_hash IS NOT NULL THEN
        -- Valid token exists, return indicator
        v_result := json_build_object(
            'action', 'existing_valid',
            'user_id', p_user_id,
            'has_valid_token', true
        );
    ELSE
        -- No valid token, create/update with new one
        INSERT INTO csrf_tokens (user_id, token, expires_at, created_at)
        VALUES (p_user_id, p_new_token_hash, p_expires_at, v_current_time)
        ON CONFLICT (user_id) 
        DO UPDATE SET 
            token = EXCLUDED.token,
            expires_at = EXCLUDED.expires_at,
            created_at = EXCLUDED.created_at;
        
        v_result := json_build_object(
            'action', 'created_new',
            'user_id', p_user_id,
            'has_valid_token', false
        );
    END IF;
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'action', 'error',
            'error', SQLERRM,
            'user_id', p_user_id
        );
END;
$$;

-- Create indexes for better performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_csrf_tokens_user_expires 
ON csrf_tokens (user_id, expires_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_csrf_tokens_expires_cleanup 
ON csrf_tokens (expires_at) 
WHERE expires_at <= NOW();

-- Grant execute permissions
-- Note: Replace 'grantify_app' with your actual application database user
-- GRANT EXECUTE ON FUNCTION atomic_csrf_token_upsert(uuid, text, timestamp with time zone) TO grantify_app;
-- GRANT EXECUTE ON FUNCTION atomic_csrf_token_validate(uuid, text) TO grantify_app;
-- GRANT EXECUTE ON FUNCTION atomic_csrf_token_validate_and_cleanup(uuid, text) TO grantify_app;
-- GRANT EXECUTE ON FUNCTION cleanup_expired_csrf_tokens(integer) TO grantify_app;
-- GRANT EXECUTE ON FUNCTION get_csrf_token_stats() TO grantify_app;
-- GRANT EXECUTE ON FUNCTION atomic_csrf_token_refresh(uuid, text, timestamp with time zone) TO grantify_app;

-- Add comments
COMMENT ON FUNCTION atomic_csrf_token_upsert IS 'Atomically creates or updates a CSRF token for a user with row-level locking';
COMMENT ON FUNCTION atomic_csrf_token_validate IS 'Validates a CSRF token atomically without cleanup';
COMMENT ON FUNCTION atomic_csrf_token_validate_and_cleanup IS 'Validates a CSRF token and cleans up expired tokens for the user';
COMMENT ON FUNCTION cleanup_expired_csrf_tokens IS 'Batch cleanup of expired CSRF tokens with configurable batch size';
COMMENT ON FUNCTION get_csrf_token_stats IS 'Returns comprehensive statistics about CSRF token usage';
COMMENT ON FUNCTION atomic_csrf_token_refresh IS 'Atomically refreshes a token only if no valid token exists';