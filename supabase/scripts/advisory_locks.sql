-- PostgreSQL advisory lock functions for distributed coordination
-- These functions provide atomic locking across multiple application instances

-- Function: try_advisory_lock_timeout
-- Try to acquire an advisory lock with timeout
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
    
    -- Try to acquire lock in a loop with timeout
    LOOP
        -- Try to acquire the advisory lock (non-blocking)
        IF pg_try_advisory_lock(lock_id) THEN
            RETURN true;
        END IF;
        
        -- Check if timeout exceeded
        IF clock_timestamp() > end_time THEN
            RETURN false;
        END IF;
        
        -- Wait a short time before retry (100ms)
        PERFORM pg_sleep(0.1);
    END LOOP;
END;
$$;

-- Function: try_advisory_lock
-- Try to acquire an advisory lock (non-blocking)
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

-- Function: advisory_unlock
-- Release an advisory lock
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

-- Function: advisory_unlock_all
-- Release all advisory locks held by current session
CREATE OR REPLACE FUNCTION advisory_unlock_all()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    PERFORM pg_advisory_unlock_all();
END;
$$;

-- Grant execute permissions to authenticated users and service role
GRANT EXECUTE ON FUNCTION try_advisory_lock_timeout(bigint, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION try_advisory_lock(bigint) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION advisory_unlock(bigint) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION advisory_unlock_all() TO authenticated, service_role;

-- Comments for documentation
COMMENT ON FUNCTION try_advisory_lock_timeout(bigint, integer) IS 'Try to acquire advisory lock with timeout in seconds';
COMMENT ON FUNCTION try_advisory_lock(bigint) IS 'Try to acquire advisory lock immediately (non-blocking)';
COMMENT ON FUNCTION advisory_unlock(bigint) IS 'Release an advisory lock';
COMMENT ON FUNCTION advisory_unlock_all() IS 'Release all advisory locks for current session';