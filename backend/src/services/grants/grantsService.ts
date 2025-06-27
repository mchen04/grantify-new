import { SupabaseClient } from '@supabase/supabase-js';
import supabaseClient from '../../db/supabaseClient';
import { Grant, GrantFilter, GrantStats } from '../../models/grant';
import logger from '../../utils/logger';

/**
 * Service for managing grants in the database
 */
class GrantsService {
  /**
   * Get grants with filtering and pagination
   */
  async getGrants(
    filters: GrantFilter, 
    client: SupabaseClient = supabaseClient
  ): Promise<{ grants: Grant[]; totalCount: number }> {
    try {
      // Start with base query
      let query = client
        .from('grants')
        .select('*', { count: 'exact' });

      // Apply search filter (using search_vector if available)
      if (filters.search) {
        // Use full-text search if search_vector exists
        query = query.textSearch('search_vector', filters.search, {
          type: 'websearch',
          config: 'english'
        });
      }

      // Apply status filter
      if (filters.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status);
        } else {
          query = query.eq('status', filters.status);
        }
      }

      // Apply organization filter
      if (filters.funding_organization_name) {
        if (Array.isArray(filters.funding_organization_name)) {
          query = query.in('funding_organization_name', filters.funding_organization_name);
        } else {
          query = query.ilike('funding_organization_name', `%${filters.funding_organization_name}%`);
        }
      }

      // Apply financial filters
      if (filters.funding_min !== undefined) {
        query = query.gte('funding_amount_max', filters.funding_min);
      }
      if (filters.funding_max !== undefined) {
        // Handle special case for $100M+
        if (filters.funding_max >= 100000000) {
          // For $100M+, we want grants with funding_amount_min >= $100M
          query = query.gte('funding_amount_min', 100000000);
        } else {
          // For upper limit, filter by funding_amount_max to ensure grants don't exceed the limit
          query = query.lte('funding_amount_max', filters.funding_max);
        }
      }

      // Apply date filters
      if (filters.posted_date_start) {
        query = query.gte('posted_date', filters.posted_date_start);
      }
      if (filters.posted_date_end) {
        query = query.lte('posted_date', filters.posted_date_end);
      }
      if (filters.deadline_start || filters.deadline_end) {
        // If include_no_deadline is true, we need to use OR logic
        if (filters.include_no_deadline) {
          // Build conditions for deadline range OR null
          const conditions = [];
          
          // Build the deadline range condition using Supabase's filter format
          let deadlineCondition = '';
          if (filters.deadline_start && filters.deadline_end) {
            deadlineCondition = `application_deadline.gte.${filters.deadline_start},application_deadline.lte.${filters.deadline_end}`;
          } else if (filters.deadline_start) {
            deadlineCondition = `application_deadline.gte.${filters.deadline_start}`;
          } else if (filters.deadline_end) {
            deadlineCondition = `application_deadline.lte.${filters.deadline_end}`;
          }
          
          if (deadlineCondition) {
            conditions.push(deadlineCondition);
          }
          conditions.push('application_deadline.is.null');
          
          // Use OR to include both deadline range and null deadlines
          query = query.or(conditions.join(','));
        } else {
          // Normal deadline filtering without null values
          if (filters.deadline_start) {
            query = query.gte('application_deadline', filters.deadline_start);
          }
          if (filters.deadline_end) {
            query = query.lte('application_deadline', filters.deadline_end);
          }
        }
      } else if (filters.include_no_deadline) {
        // If only include_no_deadline is set without date ranges, just return all
        // No additional filtering needed
      }

      // Apply type filters
      if (filters.grant_type) {
        if (Array.isArray(filters.grant_type)) {
          query = query.in('grant_type', filters.grant_type);
        } else {
          query = query.eq('grant_type', filters.grant_type);
        }
      }

      // Apply geographic filters
      if (filters.geographic_scope) {
        if (Array.isArray(filters.geographic_scope)) {
          query = query.in('geographic_scope', filters.geographic_scope);
        } else {
          query = query.eq('geographic_scope', filters.geographic_scope);
        }
      }
      if (filters.countries) {
        if (Array.isArray(filters.countries)) {
          query = query.contains('countries', filters.countries);
        } else {
          query = query.contains('countries', [filters.countries]);
        }
      }
      if (filters.states) {
        if (Array.isArray(filters.states)) {
          query = query.contains('states', filters.states);
        } else {
          query = query.contains('states', [filters.states]);
        }
      }

      // Apply other filters
      if (filters.cost_sharing_required !== undefined) {
        query = query.eq('cost_sharing_required', filters.cost_sharing_required);
      }
      
      // Apply currency filter
      if (filters.currency) {
        if (Array.isArray(filters.currency)) {
          query = query.in('currency', filters.currency);
        } else {
          query = query.eq('currency', filters.currency);
        }
      }
      
      // Apply featured filter
      if (filters.is_featured !== undefined) {
        query = query.eq('is_featured', filters.is_featured);
      }
      
      // Apply popularity filters
      if (filters.min_view_count !== undefined) {
        query = query.gte('view_count', filters.min_view_count);
      }
      if (filters.min_save_count !== undefined) {
        query = query.gte('save_count', filters.min_save_count);
      }
      if (filters.cfda_numbers) {
        if (Array.isArray(filters.cfda_numbers)) {
          query = query.contains('cfda_numbers', filters.cfda_numbers);
        } else {
          query = query.contains('cfda_numbers', [filters.cfda_numbers]);
        }
      }
      if (filters.opportunity_number) {
        query = query.eq('opportunity_number', filters.opportunity_number);
      }

      // Exclude specific grant
      if (filters.exclude_id) {
        query = query.neq('id', filters.exclude_id);
      }

      // Data source filter
      if (filters.data_source_ids) {
        // Validate UUIDs to prevent database errors
        const isValidUUID = (uuid: string) => {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          return uuidRegex.test(uuid);
        };
        
        if (Array.isArray(filters.data_source_ids)) {
          // Filter out invalid UUIDs
          const validUUIDs = filters.data_source_ids.filter(id => isValidUUID(id));
          if (validUUIDs.length > 0) {
            query = query.in('data_source_id', validUUIDs);
          }
        } else {
          // Single value
          if (isValidUUID(filters.data_source_ids)) {
            query = query.eq('data_source_id', filters.data_source_ids);
          }
        }
      }
      
      // Handle funding_null filter (only grants without funding)
      if (filters.funding_null) {
        query = query.is('funding_amount_min', null).is('funding_amount_max', null);
      }
      
      // Handle posted date filter
      if (filters.posted_date) {
        // Handle special posted date presets
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        switch (filters.posted_date) {
          case 'today':
            query = query.eq('posted_date', today.toISOString().split('T')[0]);
            break;
          case 'this_week':
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay());
            query = query.gte('posted_date', weekStart.toISOString().split('T')[0]);
            break;
          case 'this_month':
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            query = query.gte('posted_date', monthStart.toISOString().split('T')[0]);
            break;
          case 'last_30_days':
            const thirtyDaysAgo = new Date(today);
            thirtyDaysAgo.setDate(today.getDate() - 30);
            query = query.gte('posted_date', thirtyDaysAgo.toISOString().split('T')[0]);
            break;
        }
      }
      
      // Handle deadline_null filter (only grants without deadline)
      if (filters.deadline_null) {
        query = query.is('application_deadline', null);
      }
      
      // User interaction filters
      // Exclude grants that the user has already interacted with
      if (filters.user_id && filters.exclude_interaction_types && filters.exclude_interaction_types.length > 0) {
        // Create a subquery to find grant IDs that have been interacted with
        const { data: interactedGrantIds, error: interactionError } = await client
          .from('user_interactions')
          .select('grant_id')
          .eq('user_id', filters.user_id)
          .in('action', filters.exclude_interaction_types);
        
        if (interactionError) {
          logger.error('Error fetching user interactions:', interactionError);
          throw interactionError;
        }
        
        // Extract just the grant IDs from the results
        const excludeIds = interactedGrantIds?.map(row => row.grant_id) || [];
        
        // If there are grants to exclude, add the NOT IN condition
        if (excludeIds.length > 0) {
          query = query.not('id', 'in', `(${excludeIds.join(',')})`);
        }
      }

      // Apply sorting
      const sortBy = filters.sort_by || 'created_at';
      const sortDirection = filters.sort_direction || 'desc';
      query = query.order(sortBy, { ascending: sortDirection === 'asc' });

      // Apply pagination
      const page = filters.page || 1;
      const limit = Math.min(filters.limit || 20, 100); // Max 100 per page
      const offset = (page - 1) * limit;
      
      query = query.range(offset, offset + limit - 1);

      // Execute query
      const { data: grants, error, count } = await query;

      if (error) {
        logger.error('Error fetching grants:', error);
        throw error;
      }

      return {
        grants: grants || [],
        totalCount: count || 0
      };

    } catch (error) {
      logger.error('Error in getGrants:', error);
      throw error;
    }
  }

  /**
   * Get a single grant by ID
   */
  async getGrantById(grantId: string, client: SupabaseClient = supabaseClient): Promise<Grant | null> {
    try {
      const { data, error } = await client
        .from('grants')
        .select('*')
        .eq('id', grantId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        throw error;
      }

      return data;
    } catch (error) {
      logger.error('Error fetching grant by ID:', error);
      throw error;
    }
  }

  /**
   * Get multiple grants by IDs
   */
  async getGrantsByIds(grantIds: string[], client: SupabaseClient = supabaseClient): Promise<Grant[]> {
    try {
      if (grantIds.length === 0) {
        return [];
      }

      const { data, error } = await client
        .from('grants')
        .select('*')
        .in('id', grantIds);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Error fetching grants by IDs:', error);
      throw error;
    }
  }

  /**
   * Get grants with user interactions
   */
  async getGrantsWithInteractions(
    userId: string,
    grantIds: string[],
    client: SupabaseClient = supabaseClient
  ): Promise<Map<string, any>> {
    try {
      // Import service role client for grants access
      const { getServiceRoleClient } = await import('../../db/supabaseClient');
      
      // Fetch grants using service role client (bypasses RLS)
      const grants = await this.getGrantsByIds(grantIds, getServiceRoleClient());
      
      // Fetch user interactions using authenticated client
      const { data: interactions } = await client
        .from('user_interactions')
        .select('grant_id, action, created_at')
        .eq('user_id', userId)
        .in('grant_id', grantIds);

      // Create a map of interactions by grant_id
      const interactionMap = new Map();
      interactions?.forEach(interaction => {
        if (!interactionMap.has(interaction.grant_id)) {
          interactionMap.set(interaction.grant_id, {});
        }
        interactionMap.get(interaction.grant_id)[interaction.action] = {
          timestamp: interaction.created_at
        };
      });

      // Combine grants with interactions
      const result = new Map();
      grants.forEach(grant => {
        result.set(grant.id, {
          grant,
          interactions: interactionMap.get(grant.id) || {}
        });
      });

      return result;
    } catch (error) {
      logger.error('Error fetching grants with interactions:', error);
      throw error;
    }
  }

  /**
   * Get recommended grants for a user
   */
  async getRecommendedGrants(
    client: SupabaseClient,
    userId: string,
    options: { exclude?: string[]; limit?: number } = {}
  ): Promise<Grant[]> {
    try {
      const limit = options.limit || 10;
      
      // Get user's saved/applied grants to understand preferences
      const { data: userInteractions } = await client
        .from('user_interactions')
        .select('grant_id')
        .eq('user_id', userId)
        .in('action', ['saved', 'applied']);

      const interactedGrantIds = userInteractions?.map(i => i.grant_id) || [];
      
      // If user has interactions, get similar grants based on those
      if (interactedGrantIds.length > 0) {
        // Import service role client
        const { getServiceRoleClient } = await import('../../db/supabaseClient');
        const serviceClient = getServiceRoleClient();
        
        // Get details of interacted grants using service role client
        const { data: interactedGrants } = await serviceClient
          .from('grants')
          .select('grant_type, funding_organization_name, geographic_scope')
          .in('id', interactedGrantIds);

        if (interactedGrants && interactedGrants.length > 0) {
          // Extract common attributes
          const grantTypes = [...new Set(interactedGrants.map(g => g.grant_type).filter(Boolean))];
          const organizations = [...new Set(interactedGrants.map(g => g.funding_organization_name).filter(Boolean))];
          const scopes = [...new Set(interactedGrants.map(g => g.geographic_scope).filter(Boolean))];

          // Build recommendation query using service role client
          let query = serviceClient
            .from('grants')
            .select('*')
            .in('status', ['active', 'open', 'forecasted'])
            .not('id', 'in', `(${[...interactedGrantIds, ...(options.exclude || [])].join(',')})`)
            .limit(limit);

          // Add filters based on user preferences
          if (grantTypes.length > 0) {
            query = query.in('grant_type', grantTypes);
          }
          if (organizations.length > 0) {
            query = query.in('funding_organization_name', organizations.slice(0, 5)); // Top 5 organizations
          }
          if (scopes.length > 0) {
            query = query.in('geographic_scope', scopes);
          }

          const { data: recommendations, error } = await query;
          
          if (!error && recommendations && recommendations.length > 0) {
            return recommendations;
          }
        }
      }

      // Fallback: Return newest active grants using service role client
      const { getServiceRoleClient } = await import('../../db/supabaseClient');
      const serviceClient = getServiceRoleClient();
      
      const { data: fallbackGrants } = await serviceClient
        .from('grants')
        .select('*')
        .in('status', ['active', 'open', 'forecasted'])
        .not('id', 'in', `(${[...interactedGrantIds, ...(options.exclude || [])].join(',')})`)
        .order('created_at', { ascending: false })
        .limit(limit);

      return fallbackGrants || [];
    } catch (error) {
      logger.error('Error getting recommended grants:', error);
      return [];
    }
  }

  /**
   * Get grant statistics
   */
  async getGrantStats(client: SupabaseClient = supabaseClient): Promise<GrantStats> {
    try {
      const { data, error } = await client
        .rpc('get_grant_statistics');

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      logger.error('Error fetching grant statistics:', error);
      throw error;
    }
  }

  /**
   * Search grants using full-text search
   */
  async searchGrants(
    query: string,
    filters: Partial<GrantFilter> = {},
    client: SupabaseClient = supabaseClient
  ): Promise<{ grants: Grant[]; totalCount: number }> {
    try {
      // Add search to filters
      const searchFilters: GrantFilter = {
        ...filters,
        search: query
      };

      return this.getGrants(searchFilters, client);
    } catch (error) {
      logger.error('Error searching grants:', error);
      throw error;
    }
  }
}

// Export singleton instance
export default new GrantsService();