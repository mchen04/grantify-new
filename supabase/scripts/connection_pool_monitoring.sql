-- Connection pool monitoring and management functions
-- Provides database-level connection tracking and cleanup

-- Function to get current database connection statistics
CREATE OR REPLACE FUNCTION get_connection_pool_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_connections integer;
    v_active_connections integer;
    v_idle_connections integer;
    v_idle_in_transaction integer;
    v_waiting_connections integer;
    v_max_connections integer;
    v_connection_limit_ratio numeric;
    v_long_running_queries integer;
    v_oldest_query_age interval;
    v_database_name text;
    v_result json;
BEGIN
    -- Get current database name
    SELECT current_database() INTO v_database_name;
    
    -- Get total connections for current database
    SELECT COUNT(*) INTO v_total_connections
    FROM pg_stat_activity
    WHERE datname = v_database_name;
    
    -- Get active connections (executing queries)
    SELECT COUNT(*) INTO v_active_connections
    FROM pg_stat_activity
    WHERE datname = v_database_name
      AND state = 'active'
      AND query NOT LIKE '%pg_stat_activity%';
    
    -- Get idle connections
    SELECT COUNT(*) INTO v_idle_connections
    FROM pg_stat_activity
    WHERE datname = v_database_name
      AND state = 'idle';
    
    -- Get idle in transaction connections (potential issue)
    SELECT COUNT(*) INTO v_idle_in_transaction
    FROM pg_stat_activity
    WHERE datname = v_database_name
      AND state = 'idle in transaction';
    
    -- Get waiting connections (locks)
    SELECT COUNT(*) INTO v_waiting_connections
    FROM pg_stat_activity
    WHERE datname = v_database_name
      AND wait_event_type IS NOT NULL
      AND wait_event_type != 'Activity';
    
    -- Get max connections setting
    SELECT setting::integer INTO v_max_connections
    FROM pg_settings
    WHERE name = 'max_connections';
    
    -- Calculate connection limit ratio
    v_connection_limit_ratio := (v_total_connections::numeric / v_max_connections::numeric) * 100;
    
    -- Get long running queries (>5 minutes)
    SELECT COUNT(*) INTO v_long_running_queries
    FROM pg_stat_activity
    WHERE datname = v_database_name
      AND state = 'active'
      AND now() - query_start > interval '5 minutes'
      AND query NOT LIKE '%pg_stat_activity%';
    
    -- Get oldest query age
    SELECT COALESCE(MAX(now() - query_start), interval '0') INTO v_oldest_query_age
    FROM pg_stat_activity
    WHERE datname = v_database_name
      AND state = 'active'
      AND query NOT LIKE '%pg_stat_activity%';
    
    -- Build result JSON
    v_result := json_build_object(
        'database_name', v_database_name,
        'timestamp', now(),
        'connections', json_build_object(
            'total', v_total_connections,
            'active', v_active_connections,
            'idle', v_idle_connections,
            'idle_in_transaction', v_idle_in_transaction,
            'waiting', v_waiting_connections,
            'max_allowed', v_max_connections,
            'utilization_percent', ROUND(v_connection_limit_ratio, 2)
        ),
        'queries', json_build_object(
            'long_running_count', v_long_running_queries,
            'oldest_query_age_seconds', EXTRACT(EPOCH FROM v_oldest_query_age)
        ),
        'health_indicators', json_build_object(
            'high_utilization', v_connection_limit_ratio > 80,
            'idle_in_transaction_present', v_idle_in_transaction > 0,
            'long_running_queries_present', v_long_running_queries > 0,
            'high_wait_events', v_waiting_connections > 5
        )
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'error', SQLERRM,
            'timestamp', now(),
            'database_name', COALESCE(v_database_name, 'unknown')
        );
END;
$$;

-- Function to get detailed connection information
CREATE OR REPLACE FUNCTION get_connection_details()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_connections json;
    v_database_name text;
    v_result json;
BEGIN
    -- Get current database name
    SELECT current_database() INTO v_database_name;
    
    -- Get detailed connection information
    SELECT json_agg(
        json_build_object(
            'pid', pid,
            'user', usename,
            'application_name', application_name,
            'client_addr', client_addr,
            'client_hostname', client_hostname,
            'client_port', client_port,
            'backend_start', backend_start,
            'query_start', query_start,
            'state_change', state_change,
            'state', state,
            'wait_event_type', wait_event_type,
            'wait_event', wait_event,
            'query_duration_seconds', EXTRACT(EPOCH FROM (now() - query_start)),
            'connection_age_seconds', EXTRACT(EPOCH FROM (now() - backend_start)),
            'current_query', CASE 
                WHEN state = 'active' AND query NOT LIKE '%pg_stat_activity%' 
                THEN LEFT(query, 200) 
                ELSE NULL 
            END
        )
    ) INTO v_connections
    FROM pg_stat_activity
    WHERE datname = v_database_name
      AND pid != pg_backend_pid() -- Exclude current session
    ORDER BY backend_start DESC;
    
    v_result := json_build_object(
        'database_name', v_database_name,
        'timestamp', now(),
        'connections', COALESCE(v_connections, '[]'::json)
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'error', SQLERRM,
            'timestamp', now(),
            'database_name', COALESCE(v_database_name, 'unknown')
        );
END;
$$;

-- Function to terminate idle connections
CREATE OR REPLACE FUNCTION cleanup_idle_connections(
    p_max_idle_time_minutes integer DEFAULT 30,
    p_dry_run boolean DEFAULT true
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_connections_to_terminate cursor FOR
        SELECT pid, usename, application_name, state, 
               EXTRACT(EPOCH FROM (now() - state_change)) as idle_seconds
        FROM pg_stat_activity
        WHERE datname = current_database()
          AND state = 'idle'
          AND now() - state_change > (p_max_idle_time_minutes || ' minutes')::interval
          AND pid != pg_backend_pid()
          AND usename NOT IN ('postgres', 'supabase_admin'); -- Protect system users
    
    v_terminated_count integer := 0;
    v_failed_count integer := 0;
    v_errors text[] := ARRAY[]::text[];
    v_terminated_pids integer[] := ARRAY[]::integer[];
    v_connection_info record;
    v_result json;
BEGIN
    -- Iterate through connections to terminate
    FOR v_connection_info IN v_connections_to_terminate LOOP
        BEGIN
            IF NOT p_dry_run THEN
                -- Actually terminate the connection
                PERFORM pg_terminate_backend(v_connection_info.pid);
                v_terminated_count := v_terminated_count + 1;
                v_terminated_pids := array_append(v_terminated_pids, v_connection_info.pid);
            ELSE
                -- Just count what would be terminated
                v_terminated_count := v_terminated_count + 1;
                v_terminated_pids := array_append(v_terminated_pids, v_connection_info.pid);
            END IF;
            
        EXCEPTION
            WHEN OTHERS THEN
                v_failed_count := v_failed_count + 1;
                v_errors := array_append(v_errors, 
                    'Failed to terminate PID ' || v_connection_info.pid || ': ' || SQLERRM);
        END;
    END LOOP;
    
    v_result := json_build_object(
        'dry_run', p_dry_run,
        'max_idle_time_minutes', p_max_idle_time_minutes,
        'timestamp', now(),
        'terminated_count', v_terminated_count,
        'failed_count', v_failed_count,
        'terminated_pids', v_terminated_pids,
        'errors', v_errors
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'error', SQLERRM,
            'timestamp', now(),
            'dry_run', p_dry_run
        );
END;
$$;

-- Function to get connection pool health score
CREATE OR REPLACE FUNCTION get_connection_pool_health()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stats json;
    v_health_score integer := 100;
    v_issues text[] := ARRAY[]::text[];
    v_warnings text[] := ARRAY[]::text[];
    v_status text := 'healthy';
    v_result json;
BEGIN
    -- Get current stats
    SELECT get_connection_pool_stats() INTO v_stats;
    
    -- Extract values for health checks
    DECLARE
        v_utilization numeric := (v_stats->'connections'->>'utilization_percent')::numeric;
        v_idle_in_transaction integer := (v_stats->'connections'->>'idle_in_transaction')::integer;
        v_long_running integer := (v_stats->'queries'->>'long_running_count')::integer;
        v_waiting integer := (v_stats->'connections'->>'waiting')::integer;
        v_oldest_query_age numeric := (v_stats->'queries'->>'oldest_query_age_seconds')::numeric;
    BEGIN
        -- Check connection utilization
        IF v_utilization > 95 THEN
            v_health_score := v_health_score - 30;
            v_issues := array_append(v_issues, 'Critical: Connection utilization > 95%');
        ELSIF v_utilization > 85 THEN
            v_health_score := v_health_score - 20;
            v_warnings := array_append(v_warnings, 'High connection utilization > 85%');
        ELSIF v_utilization > 70 THEN
            v_health_score := v_health_score - 10;
            v_warnings := array_append(v_warnings, 'Elevated connection utilization > 70%');
        END IF;
        
        -- Check idle in transaction connections
        IF v_idle_in_transaction > 10 THEN
            v_health_score := v_health_score - 25;
            v_issues := array_append(v_issues, 'High number of idle in transaction connections');
        ELSIF v_idle_in_transaction > 5 THEN
            v_health_score := v_health_score - 15;
            v_warnings := array_append(v_warnings, 'Moderate idle in transaction connections');
        ELSIF v_idle_in_transaction > 0 THEN
            v_health_score := v_health_score - 5;
            v_warnings := array_append(v_warnings, 'Some idle in transaction connections present');
        END IF;
        
        -- Check long running queries
        IF v_long_running > 5 THEN
            v_health_score := v_health_score - 20;
            v_issues := array_append(v_issues, 'Multiple long-running queries detected');
        ELSIF v_long_running > 2 THEN
            v_health_score := v_health_score - 10;
            v_warnings := array_append(v_warnings, 'Some long-running queries detected');
        END IF;
        
        -- Check waiting connections
        IF v_waiting > 10 THEN
            v_health_score := v_health_score - 15;
            v_issues := array_append(v_issues, 'High number of waiting connections');
        ELSIF v_waiting > 5 THEN
            v_health_score := v_health_score - 10;
            v_warnings := array_append(v_warnings, 'Some connections waiting for locks');
        END IF;
        
        -- Check oldest query age
        IF v_oldest_query_age > 1800 THEN -- 30 minutes
            v_health_score := v_health_score - 15;
            v_issues := array_append(v_issues, 'Very long-running query detected (>30 min)');
        ELSIF v_oldest_query_age > 600 THEN -- 10 minutes
            v_health_score := v_health_score - 10;
            v_warnings := array_append(v_warnings, 'Long-running query detected (>10 min)');
        END IF;
    END;
    
    -- Determine overall status
    IF v_health_score < 50 THEN
        v_status := 'critical';
    ELSIF v_health_score < 70 THEN
        v_status := 'degraded';
    ELSIF v_health_score < 85 THEN
        v_status := 'warning';
    END IF;
    
    v_result := json_build_object(
        'timestamp', now(),
        'health_score', v_health_score,
        'status', v_status,
        'issues', v_issues,
        'warnings', v_warnings,
        'stats', v_stats,
        'recommendations', CASE
            WHEN v_health_score < 50 THEN 
                '["Immediate intervention required", "Consider restarting problematic connections", "Review application connection patterns"]'::json
            WHEN v_health_score < 70 THEN 
                '["Monitor closely", "Consider connection cleanup", "Review long-running operations"]'::json
            WHEN v_health_score < 85 THEN 
                '["Monitor connection usage", "Consider optimizing queries"]'::json
            ELSE 
                '["System operating normally"]'::json
        END
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'error', SQLERRM,
            'timestamp', now(),
            'health_score', 0,
            'status', 'error'
        );
END;
$$;

-- Function to log connection pool events
CREATE OR REPLACE FUNCTION log_connection_pool_event(
    p_event_type text,
    p_event_data json DEFAULT NULL,
    p_severity text DEFAULT 'info'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insert into connection_pool_logs table (create if doesn't exist)
    INSERT INTO connection_pool_logs (
        event_type,
        event_data,
        severity,
        created_at
    ) VALUES (
        p_event_type,
        p_event_data,
        p_severity,
        now()
    );
    
    RETURN true;
    
EXCEPTION
    WHEN OTHERS THEN
        -- If table doesn't exist or other error, just return false
        RETURN false;
END;
$$;

-- Create connection pool logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS connection_pool_logs (
    id bigserial PRIMARY KEY,
    event_type text NOT NULL,
    event_data json,
    severity text CHECK (severity IN ('debug', 'info', 'warn', 'error', 'critical')) DEFAULT 'info',
    created_at timestamp with time zone DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_connection_pool_logs_created_at 
ON connection_pool_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_connection_pool_logs_event_type 
ON connection_pool_logs (event_type);

CREATE INDEX IF NOT EXISTS idx_connection_pool_logs_severity 
ON connection_pool_logs (severity);

-- Grant permissions (adjust role name as needed)
-- GRANT EXECUTE ON FUNCTION get_connection_pool_stats() TO grantify_app;
-- GRANT EXECUTE ON FUNCTION get_connection_details() TO grantify_app;
-- GRANT EXECUTE ON FUNCTION cleanup_idle_connections(integer, boolean) TO grantify_app;
-- GRANT EXECUTE ON FUNCTION get_connection_pool_health() TO grantify_app;
-- GRANT EXECUTE ON FUNCTION log_connection_pool_event(text, json, text) TO grantify_app;

-- Add comments
COMMENT ON FUNCTION get_connection_pool_stats() IS 'Returns comprehensive connection pool statistics for the current database';
COMMENT ON FUNCTION get_connection_details() IS 'Returns detailed information about all active connections';
COMMENT ON FUNCTION cleanup_idle_connections(integer, boolean) IS 'Terminates idle connections older than specified time (dry_run=true for testing)';
COMMENT ON FUNCTION get_connection_pool_health() IS 'Returns connection pool health score and recommendations';
COMMENT ON FUNCTION log_connection_pool_event(text, json, text) IS 'Logs connection pool events for monitoring and debugging';
COMMENT ON TABLE connection_pool_logs IS 'Stores connection pool events and monitoring data';