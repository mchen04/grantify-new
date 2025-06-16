-- Optimized grants query function with efficient user interaction exclusion
-- This replaces the inefficient NOT IN logic with EXISTS subquery for better performance

CREATE OR REPLACE FUNCTION get_grants_optimized(
    p_search TEXT DEFAULT NULL,
    p_agency_name TEXT DEFAULT NULL,
    p_data_sources TEXT[] DEFAULT NULL,
    p_funding_min BIGINT DEFAULT NULL,
    p_funding_max BIGINT DEFAULT NULL,
    p_include_no_funding BOOLEAN DEFAULT TRUE,
    p_deadline_min TIMESTAMP DEFAULT NULL,
    p_deadline_max TIMESTAMP DEFAULT NULL,
    p_include_no_deadline BOOLEAN DEFAULT TRUE,
    p_user_id UUID DEFAULT NULL,
    p_exclude_interaction_types TEXT[] DEFAULT NULL,
    p_sort_by TEXT DEFAULT 'recent',
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description_short TEXT,
    description_full TEXT,
    award_ceiling BIGINT,
    award_floor BIGINT,
    close_date TIMESTAMP,
    post_date TIMESTAMP,
    agency_name TEXT,
    data_source TEXT,
    original_url TEXT,
    keywords TEXT,
    agency_subdivision TEXT,
    grant_type TEXT,
    activity_category TEXT,
    eligible_applicants TEXT,
    cost_sharing BOOLEAN,
    clinical_trial_allowed BOOLEAN,
    status TEXT,
    total_count BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_query TEXT;
    v_count_query TEXT;
    v_where_conditions TEXT[] := ARRAY[]::TEXT[];
    v_order_clause TEXT;
    v_total_count BIGINT;
BEGIN
    -- Build WHERE conditions
    
    -- Search filter using full-text search if available, fallback to ILIKE
    IF p_search IS NOT NULL AND p_search != '' THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'grants' AND column_name = 'search_vector') THEN
            v_where_conditions := array_append(v_where_conditions, 
                format('search_vector @@ plainto_tsquery(''english'', %L)', p_search));
        ELSE
            v_where_conditions := array_append(v_where_conditions, 
                format('(title ILIKE %L OR description_short ILIKE %L OR description_full ILIKE %L)', 
                    '%' || p_search || '%', '%' || p_search || '%', '%' || p_search || '%'));
        END IF;
    END IF;
    
    -- Agency filter
    IF p_agency_name IS NOT NULL THEN
        v_where_conditions := array_append(v_where_conditions, 
            format('agency_name = %L', p_agency_name));
    END IF;
    
    -- Data sources filter
    IF p_data_sources IS NOT NULL AND array_length(p_data_sources, 1) > 0 THEN
        v_where_conditions := array_append(v_where_conditions, 
            format('data_source = ANY(%L)', p_data_sources));
    END IF;
    
    -- Funding filters
    IF NOT p_include_no_funding THEN
        v_where_conditions := array_append(v_where_conditions, 'award_ceiling IS NOT NULL');
        
        IF p_funding_min IS NOT NULL THEN
            v_where_conditions := array_append(v_where_conditions, 
                format('award_ceiling >= %L', p_funding_min));
        END IF;
        
        IF p_funding_max IS NOT NULL THEN
            v_where_conditions := array_append(v_where_conditions, 
                format('award_ceiling <= %L', p_funding_max));
        END IF;
    ELSE
        -- Include null funding but still apply range filters to non-null values
        IF p_funding_min IS NOT NULL OR p_funding_max IS NOT NULL THEN
            DECLARE
                funding_condition TEXT := '';
            BEGIN
                IF p_funding_min IS NOT NULL AND p_funding_max IS NOT NULL THEN
                    funding_condition := format('(award_ceiling IS NULL OR (award_ceiling >= %L AND award_ceiling <= %L))', 
                        p_funding_min, p_funding_max);
                ELSIF p_funding_min IS NOT NULL THEN
                    funding_condition := format('(award_ceiling IS NULL OR award_ceiling >= %L)', p_funding_min);
                ELSIF p_funding_max IS NOT NULL THEN
                    funding_condition := format('(award_ceiling IS NULL OR award_ceiling <= %L)', p_funding_max);
                END IF;
                
                IF funding_condition != '' THEN
                    v_where_conditions := array_append(v_where_conditions, funding_condition);
                END IF;
            END;
        END IF;
    END IF;
    
    -- Deadline filters
    IF NOT p_include_no_deadline THEN
        v_where_conditions := array_append(v_where_conditions, 'close_date IS NOT NULL');
        
        IF p_deadline_min IS NOT NULL THEN
            v_where_conditions := array_append(v_where_conditions, 
                format('close_date >= %L', p_deadline_min));
        END IF;
        
        IF p_deadline_max IS NOT NULL THEN
            v_where_conditions := array_append(v_where_conditions, 
                format('close_date <= %L', p_deadline_max));
        END IF;
    ELSE
        -- Include null deadlines but still apply range filters to non-null values
        IF p_deadline_min IS NOT NULL OR p_deadline_max IS NOT NULL THEN
            DECLARE
                deadline_condition TEXT := '';
            BEGIN
                IF p_deadline_min IS NOT NULL AND p_deadline_max IS NOT NULL THEN
                    deadline_condition := format('(close_date IS NULL OR (close_date >= %L AND close_date <= %L))', 
                        p_deadline_min, p_deadline_max);
                ELSIF p_deadline_min IS NOT NULL THEN
                    deadline_condition := format('(close_date IS NULL OR close_date >= %L)', p_deadline_min);
                ELSIF p_deadline_max IS NOT NULL THEN
                    deadline_condition := format('(close_date IS NULL OR close_date <= %L)', p_deadline_max);
                END IF;
                
                IF deadline_condition != '' THEN
                    v_where_conditions := array_append(v_where_conditions, deadline_condition);
                END IF;
            END;
        END IF;
    END IF;
    
    -- User interaction exclusion (optimized with EXISTS)
    IF p_user_id IS NOT NULL AND p_exclude_interaction_types IS NOT NULL AND array_length(p_exclude_interaction_types, 1) > 0 THEN
        v_where_conditions := array_append(v_where_conditions, 
            format('NOT EXISTS (SELECT 1 FROM user_interactions ui WHERE ui.grant_id = grants.id AND ui.user_id = %L AND ui.action = ANY(%L))', 
                p_user_id, p_exclude_interaction_types));
    END IF;
    
    -- Build ORDER BY clause
    CASE p_sort_by
        WHEN 'recent' THEN v_order_clause := 'post_date DESC NULLS LAST';
        WHEN 'deadline' THEN v_order_clause := 'close_date ASC NULLS LAST';
        WHEN 'deadline_latest' THEN v_order_clause := 'close_date DESC NULLS LAST';
        WHEN 'amount' THEN v_order_clause := 'award_ceiling DESC NULLS LAST';
        WHEN 'amount_asc' THEN v_order_clause := 'award_ceiling ASC NULLS LAST';
        WHEN 'title_asc' THEN v_order_clause := 'title ASC';
        WHEN 'title_desc' THEN v_order_clause := 'title DESC';
        ELSE v_order_clause := 'post_date DESC NULLS LAST';
    END CASE;
    
    -- Build the main query
    v_query := 'SELECT g.id, g.title, g.description_short, g.description_full, g.award_ceiling, g.award_floor, ' ||
               'g.close_date, g.post_date, g.agency_name, g.data_source, g.original_url, g.keywords, ' ||
               'g.agency_subdivision, g.grant_type, g.activity_category, g.eligible_applicants, ' ||
               'g.cost_sharing, g.clinical_trial_allowed, g.status FROM grants g';
    
    -- Add WHERE clause if we have conditions
    IF array_length(v_where_conditions, 1) > 0 THEN
        v_query := v_query || ' WHERE ' || array_to_string(v_where_conditions, ' AND ');
    END IF;
    
    -- Get total count first (without pagination)
    v_count_query := 'SELECT COUNT(*) FROM grants g';
    IF array_length(v_where_conditions, 1) > 0 THEN
        v_count_query := v_count_query || ' WHERE ' || array_to_string(v_where_conditions, ' AND ');
    END IF;
    
    EXECUTE v_count_query INTO v_total_count;
    
    -- Add ORDER BY and LIMIT/OFFSET
    v_query := v_query || ' ORDER BY ' || v_order_clause;
    v_query := v_query || ' LIMIT ' || p_limit || ' OFFSET ' || p_offset;
    
    -- Return the results with total count
    RETURN QUERY EXECUTE v_query || format(' UNION ALL SELECT NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::BIGINT, NULL::BIGINT, NULL::TIMESTAMP, NULL::TIMESTAMP, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::BOOLEAN, NULL::BOOLEAN, NULL::TEXT, %L LIMIT 1', v_total_count);
    
END;
$$;