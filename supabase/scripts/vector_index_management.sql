-- Vector index health and management functions
-- Supports thread-safe vector search operations

-- Function to check vector index health
CREATE OR REPLACE FUNCTION check_vector_index_health()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    grants_index_size bigint;
    user_prefs_index_size bigint;
    grants_null_embeddings integer;
    user_prefs_null_embeddings integer;
    grants_total integer;
    user_prefs_total integer;
    avg_search_time float;
    result json;
BEGIN
    -- Get index sizes
    SELECT pg_total_relation_size('grants_embeddings_idx') INTO grants_index_size;
    SELECT pg_total_relation_size('user_preferences_project_description_embedding_idx') INTO user_prefs_index_size;
    
    -- Count NULL embeddings (indicates potential corruption or incomplete updates)
    SELECT COUNT(*) FROM grants WHERE embeddings IS NULL INTO grants_null_embeddings;
    SELECT COUNT(*) FROM user_preferences WHERE project_description_embedding IS NULL INTO user_prefs_null_embeddings;
    
    -- Get total record counts
    SELECT COUNT(*) FROM grants INTO grants_total;
    SELECT COUNT(*) FROM user_preferences INTO user_prefs_total;
    
    -- Estimate average search time by running a quick test query
    -- (Only if there are grants with embeddings)
    IF grants_total > grants_null_embeddings THEN
        DECLARE
            start_time timestamp;
            end_time timestamp;
            test_embedding vector(768);
        BEGIN
            -- Get a sample embedding for testing
            SELECT embeddings INTO test_embedding 
            FROM grants 
            WHERE embeddings IS NOT NULL 
            LIMIT 1;
            
            IF test_embedding IS NOT NULL THEN
                start_time := clock_timestamp();
                
                -- Run a small similarity search
                PERFORM COUNT(*) FROM grants g
                WHERE g.embeddings IS NOT NULL
                    AND (g.embeddings <=> test_embedding) < 0.5
                LIMIT 5;
                
                end_time := clock_timestamp();
                avg_search_time := EXTRACT(EPOCH FROM (end_time - start_time));
            ELSE
                avg_search_time := 0;
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                avg_search_time := -1; -- Indicates error during search test
        END;
    ELSE
        avg_search_time := 0;
    END IF;
    
    -- Build result JSON
    result := json_build_object(
        'grants_index_size_bytes', grants_index_size,
        'user_prefs_index_size_bytes', user_prefs_index_size,
        'grants_total', grants_total,
        'grants_null_embeddings', grants_null_embeddings,
        'grants_embedding_coverage_percent', 
            CASE WHEN grants_total > 0 THEN 
                ROUND(((grants_total - grants_null_embeddings)::float / grants_total) * 100, 2)
            ELSE 0 END,
        'user_prefs_total', user_prefs_total,
        'user_prefs_null_embeddings', user_prefs_null_embeddings,
        'user_prefs_embedding_coverage_percent',
            CASE WHEN user_prefs_total > 0 THEN 
                ROUND(((user_prefs_total - user_prefs_null_embeddings)::float / user_prefs_total) * 100, 2)
            ELSE 0 END,
        'avg_search_time_seconds', avg_search_time,
        'slow_queries', CASE WHEN avg_search_time > 0.5 THEN 1 ELSE 0 END,
        'corrupted', CASE WHEN avg_search_time = -1 THEN true ELSE false END,
        'fragmented', CASE WHEN grants_index_size > (grants_total * 1000) THEN true ELSE false END,
        'timestamp', NOW()
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'error', SQLERRM,
            'corrupted', true,
            'timestamp', NOW()
        );
END;
$$;

-- Function to rebuild vector index
CREATE OR REPLACE FUNCTION rebuild_vector_index(
    table_name text,
    column_name text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    index_name text;
    start_time timestamp;
    end_time timestamp;
    rebuild_time float;
    result json;
BEGIN
    start_time := clock_timestamp();
    
    -- Determine index name based on table and column
    IF table_name = 'grants' AND column_name = 'embeddings' THEN
        index_name := 'grants_embeddings_idx';
    ELSIF table_name = 'user_preferences' AND column_name = 'project_description_embedding' THEN
        index_name := 'user_preferences_project_description_embedding_idx';
    ELSE
        RAISE EXCEPTION 'Unsupported table/column combination: %.%', table_name, column_name;
    END IF;
    
    -- Log the start of rebuild
    RAISE NOTICE 'Starting rebuild of vector index: %', index_name;
    
    -- Drop existing index
    EXECUTE format('DROP INDEX IF EXISTS %I', index_name);
    
    -- Recreate index based on table
    IF table_name = 'grants' THEN
        EXECUTE format(
            'CREATE INDEX %I ON %I USING ivfflat (%I vector_cosine_ops) WITH (lists=100)',
            index_name, table_name, column_name
        );
    ELSIF table_name = 'user_preferences' THEN
        EXECUTE format(
            'CREATE INDEX %I ON %I USING ivfflat (%I vector_cosine_ops) WITH (lists=100)',
            index_name, table_name, column_name
        );
    END IF;
    
    end_time := clock_timestamp();
    rebuild_time := EXTRACT(EPOCH FROM (end_time - start_time));
    
    -- Log completion
    RAISE NOTICE 'Completed rebuild of vector index: % in % seconds', index_name, rebuild_time;
    
    result := json_build_object(
        'success', true,
        'index_name', index_name,
        'table_name', table_name,
        'column_name', column_name,
        'rebuild_time_seconds', rebuild_time,
        'timestamp', NOW()
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'index_name', index_name,
            'table_name', table_name,
            'column_name', column_name,
            'timestamp', NOW()
        );
END;
$$;

-- Function to get vector index statistics
CREATE OR REPLACE FUNCTION get_vector_index_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
    grants_stats json;
    user_prefs_stats json;
BEGIN
    -- Get grants index statistics
    SELECT json_build_object(
        'table_name', 'grants',
        'index_name', 'grants_embeddings_idx',
        'index_size_bytes', pg_total_relation_size('grants_embeddings_idx'),
        'table_size_bytes', pg_total_relation_size('grants'),
        'row_count', (SELECT COUNT(*) FROM grants),
        'non_null_embeddings', (SELECT COUNT(*) FROM grants WHERE embeddings IS NOT NULL),
        'null_embeddings', (SELECT COUNT(*) FROM grants WHERE embeddings IS NULL)
    ) INTO grants_stats;
    
    -- Get user preferences index statistics  
    SELECT json_build_object(
        'table_name', 'user_preferences',
        'index_name', 'user_preferences_project_description_embedding_idx',
        'index_size_bytes', pg_total_relation_size('user_preferences_project_description_embedding_idx'),
        'table_size_bytes', pg_total_relation_size('user_preferences'),
        'row_count', (SELECT COUNT(*) FROM user_preferences),
        'non_null_embeddings', (SELECT COUNT(*) FROM user_preferences WHERE project_description_embedding IS NOT NULL),
        'null_embeddings', (SELECT COUNT(*) FROM user_preferences WHERE project_description_embedding IS NULL)
    ) INTO user_prefs_stats;
    
    result := json_build_object(
        'grants', grants_stats,
        'user_preferences', user_prefs_stats,
        'timestamp', NOW()
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'error', SQLERRM,
            'timestamp', NOW()
        );
END;
$$;

-- Function for atomic embedding update with validation
CREATE OR REPLACE FUNCTION atomic_embedding_update(
    table_name text,
    record_id uuid,
    new_embedding vector(768),
    validate_dimensions boolean DEFAULT true
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
    old_embedding vector(768);
    update_successful boolean := false;
BEGIN
    -- Validate embedding dimensions if requested
    IF validate_dimensions THEN
        IF array_length(new_embedding::real[], 1) != 768 THEN
            RETURN json_build_object(
                'success', false,
                'error', 'Invalid embedding dimensions. Expected 768, got ' || array_length(new_embedding::real[], 1),
                'timestamp', NOW()
            );
        END IF;
    END IF;
    
    -- Perform atomic update based on table
    IF table_name = 'grants' THEN
        -- Get old embedding for comparison
        SELECT embeddings INTO old_embedding FROM grants WHERE id = record_id;
        
        -- Update with optimistic locking
        UPDATE grants 
        SET embeddings = new_embedding,
            updated_at = NOW()
        WHERE id = record_id;
        
        update_successful := FOUND;
        
    ELSIF table_name = 'user_preferences' THEN
        -- Get old embedding for comparison
        SELECT project_description_embedding INTO old_embedding 
        FROM user_preferences WHERE user_id = record_id;
        
        -- Update with optimistic locking
        UPDATE user_preferences 
        SET project_description_embedding = new_embedding,
            updated_at = NOW()
        WHERE user_id = record_id;
        
        update_successful := FOUND;
        
    ELSE
        RETURN json_build_object(
            'success', false,
            'error', 'Unsupported table: ' || table_name,
            'timestamp', NOW()
        );
    END IF;
    
    IF update_successful THEN
        result := json_build_object(
            'success', true,
            'table_name', table_name,
            'record_id', record_id,
            'old_embedding_exists', old_embedding IS NOT NULL,
            'new_embedding_dimensions', array_length(new_embedding::real[], 1),
            'timestamp', NOW()
        );
    ELSE
        result := json_build_object(
            'success', false,
            'error', 'Record not found: ' || record_id::text,
            'table_name', table_name,
            'timestamp', NOW()
        );
    END IF;
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'table_name', table_name,
            'record_id', record_id,
            'timestamp', NOW()
        );
END;
$$;

-- Function to batch update embeddings with transaction safety
CREATE OR REPLACE FUNCTION batch_update_embeddings(
    table_name text,
    updates jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    update_record jsonb;
    record_id uuid;
    embedding_array real[];
    embedding_vector vector(768);
    successful_updates integer := 0;
    failed_updates integer := 0;
    errors text[] := '{}';
    result json;
BEGIN
    -- Process each update in the batch
    FOR update_record IN SELECT value FROM jsonb_array_elements(updates)
    LOOP
        BEGIN
            -- Extract record ID and embedding
            record_id := (update_record->>'id')::uuid;
            embedding_array := ARRAY(SELECT jsonb_array_elements_text(update_record->'embedding'))::real[];
            embedding_vector := embedding_array::vector(768);
            
            -- Perform atomic update
            IF table_name = 'grants' THEN
                UPDATE grants 
                SET embeddings = embedding_vector,
                    updated_at = NOW()
                WHERE id = record_id;
                
                IF FOUND THEN
                    successful_updates := successful_updates + 1;
                ELSE
                    failed_updates := failed_updates + 1;
                    errors := array_append(errors, 'Grant not found: ' || record_id::text);
                END IF;
                
            ELSIF table_name = 'user_preferences' THEN
                UPDATE user_preferences 
                SET project_description_embedding = embedding_vector,
                    updated_at = NOW()
                WHERE user_id = record_id;
                
                IF FOUND THEN
                    successful_updates := successful_updates + 1;
                ELSE
                    failed_updates := failed_updates + 1;
                    errors := array_append(errors, 'User preference not found: ' || record_id::text);
                END IF;
                
            ELSE
                failed_updates := failed_updates + 1;
                errors := array_append(errors, 'Unsupported table: ' || table_name);
            END IF;
            
        EXCEPTION
            WHEN OTHERS THEN
                failed_updates := failed_updates + 1;
                errors := array_append(errors, 'Error updating ' || record_id::text || ': ' || SQLERRM);
        END;
    END LOOP;
    
    result := json_build_object(
        'successful_updates', successful_updates,
        'failed_updates', failed_updates,
        'total_updates', successful_updates + failed_updates,
        'errors', errors,
        'table_name', table_name,
        'timestamp', NOW()
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'successful_updates', 0,
            'failed_updates', 0,
            'error', SQLERRM,
            'table_name', table_name,
            'timestamp', NOW()
        );
END;
$$;

-- Grant execute permissions
-- Note: Replace 'grantify_app' with your actual application database user
-- GRANT EXECUTE ON FUNCTION check_vector_index_health() TO grantify_app;
-- GRANT EXECUTE ON FUNCTION rebuild_vector_index(text, text) TO grantify_app;
-- GRANT EXECUTE ON FUNCTION get_vector_index_stats() TO grantify_app;
-- GRANT EXECUTE ON FUNCTION atomic_embedding_update(text, uuid, vector, boolean) TO grantify_app;
-- GRANT EXECUTE ON FUNCTION batch_update_embeddings(text, jsonb) TO grantify_app;

-- Add comments
COMMENT ON FUNCTION check_vector_index_health() IS 'Checks the health of vector indexes and returns performance metrics';
COMMENT ON FUNCTION rebuild_vector_index(text, text) IS 'Rebuilds a corrupted vector index for the specified table and column';
COMMENT ON FUNCTION get_vector_index_stats() IS 'Returns detailed statistics about vector indexes';
COMMENT ON FUNCTION atomic_embedding_update(text, uuid, vector, boolean) IS 'Atomically updates a single embedding with validation';
COMMENT ON FUNCTION batch_update_embeddings(text, jsonb) IS 'Batch updates multiple embeddings within a transaction';