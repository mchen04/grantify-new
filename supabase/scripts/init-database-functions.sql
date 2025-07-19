-- Initialize all required database functions for Grantify.ai
-- Run this script to set up CSRF tokens and advisory locks

-- First, create the CSRF tokens table if it doesn't exist
CREATE TABLE IF NOT EXISTS "public"."csrf_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "token" character varying(255) NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "csrf_tokens_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "csrf_tokens_user_id_key" UNIQUE ("user_id")
);

-- Create indexes for CSRF tokens
CREATE INDEX IF NOT EXISTS "csrf_tokens_user_id_idx" ON "public"."csrf_tokens" USING "btree" ("user_id");
CREATE INDEX IF NOT EXISTS "csrf_tokens_expires_at_idx" ON "public"."csrf_tokens" USING "btree" ("expires_at");

-- Advisory lock functions
CREATE OR REPLACE FUNCTION try_advisory_lock_timeout(lock_id bigint, timeout_seconds integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    start_time timestamp;
    end_time timestamp;
BEGIN
    start_time := clock_timestamp();
    end_time := start_time + (timeout_seconds || ' seconds')::interval;
    
    LOOP
        IF pg_try_advisory_lock(lock_id) THEN
            RETURN true;
        END IF;
        
        IF clock_timestamp() > end_time THEN
            RETURN false;
        END IF;
        
        PERFORM pg_sleep(0.1);
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION try_advisory_lock(lock_id bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN pg_try_advisory_lock(lock_id);
END;
$$;

CREATE OR REPLACE FUNCTION advisory_unlock(lock_id bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN pg_advisory_unlock(lock_id);
END;
$$;

-- CSRF token functions
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
    SELECT id INTO v_existing_token_id
    FROM csrf_tokens
    WHERE user_id = p_user_id
    FOR UPDATE;
    
    IF v_existing_token_id IS NOT NULL THEN
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
    WHEN others THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'sqlstate', SQLSTATE
        );
END;
$$;

CREATE OR REPLACE FUNCTION atomic_csrf_token_validate(
    p_user_id uuid,
    p_token_hash text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count integer;
BEGIN
    SELECT COUNT(*)
    INTO v_count
    FROM csrf_tokens
    WHERE user_id = p_user_id
      AND token = p_token_hash
      AND expires_at > NOW();
    
    RETURN v_count > 0;
EXCEPTION
    WHEN others THEN
        RETURN false;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION try_advisory_lock_timeout(bigint, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION try_advisory_lock(bigint) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION advisory_unlock(bigint) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION atomic_csrf_token_upsert(uuid, text, timestamp with time zone) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION atomic_csrf_token_validate(uuid, text) TO authenticated, service_role;

-- Enable RLS on csrf_tokens table
ALTER TABLE csrf_tokens ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own CSRF tokens" ON csrf_tokens
    FOR ALL USING (auth.uid() = user_id);

-- Comments
COMMENT ON FUNCTION try_advisory_lock_timeout(bigint, integer) IS 'Try to acquire advisory lock with timeout';
COMMENT ON FUNCTION try_advisory_lock(bigint) IS 'Try to acquire advisory lock immediately';
COMMENT ON FUNCTION advisory_unlock(bigint) IS 'Release an advisory lock';
COMMENT ON FUNCTION atomic_csrf_token_upsert(uuid, text, timestamp with time zone) IS 'Atomically create or update CSRF token';
COMMENT ON FUNCTION atomic_csrf_token_validate(uuid, text) IS 'Validate CSRF token atomically';