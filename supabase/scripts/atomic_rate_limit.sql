-- Atomic rate limit check and increment function
-- Prevents race conditions in external API rate limiting
CREATE OR REPLACE FUNCTION atomic_rate_limit_check(
    p_data_source_id text,
    p_window_start timestamp with time zone,
    p_window_duration_seconds integer,
    p_requests_limit integer,
    p_burst_allowance integer DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_requests integer := 0;
    v_effective_limit integer;
    v_window_end timestamp with time zone;
    v_allowed boolean := false;
    v_retry_after_seconds integer;
    v_record_exists boolean := false;
BEGIN
    -- Calculate effective limit with burst allowance
    v_effective_limit := p_requests_limit + p_burst_allowance;
    v_window_end := p_window_start + (p_window_duration_seconds || ' seconds')::interval;
    
    -- Try to get current rate limit record with row-level lock
    SELECT requests_made, true
    INTO v_current_requests, v_record_exists
    FROM api_rate_limits
    WHERE data_source_id = p_data_source_id
      AND window_start = p_window_start
    FOR UPDATE;
    
    -- If no record exists, create it atomically
    IF NOT v_record_exists THEN
        INSERT INTO api_rate_limits (
            data_source_id,
            window_start,
            window_duration_seconds,
            requests_made,
            requests_limit,
            created_at,
            updated_at
        ) VALUES (
            p_data_source_id,
            p_window_start,
            p_window_duration_seconds,
            1, -- Start with 1 since we're making a request now
            p_requests_limit,
            NOW(),
            NOW()
        );
        
        -- First request in window is always allowed
        v_allowed := true;
        v_current_requests := 1;
    ELSE
        -- Check if we're under the effective limit
        IF v_current_requests < v_effective_limit THEN
            -- Increment atomically
            UPDATE api_rate_limits
            SET requests_made = requests_made + 1,
                updated_at = NOW()
            WHERE data_source_id = p_data_source_id
              AND window_start = p_window_start;
            
            v_allowed := true;
            v_current_requests := v_current_requests + 1;
        ELSE
            -- Rate limit exceeded
            v_allowed := false;
            -- Calculate retry after seconds
            v_retry_after_seconds := EXTRACT(EPOCH FROM (v_window_end - NOW()))::integer;
            IF v_retry_after_seconds < 0 THEN
                v_retry_after_seconds := 0;
            END IF;
        END IF;
    END IF;
    
    -- Return result as JSON
    RETURN json_build_object(
        'allowed', v_allowed,
        'requests_used', v_current_requests,
        'requests_limit', p_requests_limit,
        'effective_limit', v_effective_limit,
        'window_start', p_window_start,
        'window_end', v_window_end,
        'retry_after_seconds', v_retry_after_seconds
    );
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log error and deny request on any exception
        RAISE WARNING 'atomic_rate_limit_check error for data_source_id %: %', p_data_source_id, SQLERRM;
        
        RETURN json_build_object(
            'allowed', false,
            'requests_used', p_requests_limit,
            'requests_limit', p_requests_limit,
            'effective_limit', v_effective_limit,
            'window_start', p_window_start,
            'window_end', v_window_end,
            'retry_after_seconds', p_window_duration_seconds,
            'error', SQLERRM
        );
END;
$$;

-- Create optimized index for rate limit lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_rate_limits_lookup 
ON api_rate_limits (data_source_id, window_start);

-- Create partial index for active windows (last 2 hours)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_rate_limits_active 
ON api_rate_limits (data_source_id, window_start DESC) 
WHERE window_start > NOW() - INTERVAL '2 hours';

-- Add comment explaining the function
COMMENT ON FUNCTION atomic_rate_limit_check IS 
'Atomically checks and increments API rate limits to prevent race conditions across multiple application instances. Uses row-level locking to ensure consistency.';

-- Grant execute permission to the application user
-- Note: Replace 'grantify_app' with your actual application database user
-- GRANT EXECUTE ON FUNCTION atomic_rate_limit_check TO grantify_app;