/**
 * Modern Supabase API client - replaces Express backend with direct Supabase calls
 */

import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface Grant {
  id: string
  data_source_id: string
  source_identifier: string
  source_url?: string
  title: string
  status: string
  funding_organization_name?: string
  currency?: string
  funding_amount_min?: number
  funding_amount_max?: number
  total_funding_available?: number
  posted_date?: string
  application_deadline?: string
  start_date?: string
  end_date?: string
  grant_type?: string
  funding_instrument?: string
  summary?: string
  description?: string
  geographic_scope?: string
  countries?: string[]
  states?: string[]
  cfda_numbers?: string[]
  opportunity_number?: string
  cost_sharing_required?: boolean
  application_url?: string
  guidelines_url?: string
  eligibility_criteria?: string
  raw_data?: any
  created_at?: string
  updated_at?: string
  last_synced_at?: string
}

export interface UserInteraction {
  id: string
  user_id: string
  grant_id: string
  action: 'viewed' | 'saved' | 'applied' | 'ignored' | 'shared' | 'downloaded'
  action_metadata?: any
  notes?: string
  created_at: string
}

export interface UserPreferences {
  user_id: string
  preferred_currency?: string
  funding_min?: number
  funding_max?: number
  preferred_countries?: string[]
  preferred_states?: string[]
  preferred_cities?: string[]
  preferred_categories?: any
  preferred_keywords?: string[]
  preferred_organizations?: string[]
  excluded_organizations?: string[]
  email_notifications?: boolean
  notification_frequency?: string
  project_description?: string
  project_description_embedding?: number[]
  organization_type?: string
  organization_size?: string
  created_at?: string
  updated_at?: string
}

// Filter schemas
const grantFilterSchema = z.object({
  searchTerm: z.string().optional(),
  user_id: z.string().optional(),
  statuses: z.array(z.string()).optional(),
  organizations: z.array(z.string()).optional(),
  grantTypes: z.array(z.string()).optional(),
  fundingInstruments: z.array(z.string()).optional(),
  geographicScopes: z.array(z.string()).optional(),
  dataSources: z.array(z.string()).optional(),
  countries: z.array(z.string()).optional(),
  states: z.array(z.string()).optional(),
  fundingMin: z.number().optional(),
  fundingMax: z.number().optional(),
  deadlineMinDays: z.number().optional(),
  deadlineMaxDays: z.number().optional(),
  includeFundingNull: z.boolean().optional(),
  includeNoDeadline: z.boolean().optional(),
  onlyNoFunding: z.boolean().optional(),
  onlyNoDeadline: z.boolean().optional(),
  showOverdue: z.boolean().optional(),
  exclude_interaction_types: z.array(z.string()).optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(6),
  sortBy: z.string().default('recent')
})

export type GrantFilter = z.infer<typeof grantFilterSchema>

// Grants API
export const grantsApi = {
  // Get all grants with optional filters and sorting
  async getGrants(filters: Partial<GrantFilter> = {}, accessToken?: string): Promise<ApiResponse<{ grants: Grant[], totalCount: number }>> {
    try {
      const validatedFilters = grantFilterSchema.parse(filters)
      
      // Create query builder
      let query = supabase
        .from('grants')
        .select('*', { count: 'exact' })

      // Apply search filter
      if (validatedFilters.searchTerm) {
        query = query.textSearch('search_vector', validatedFilters.searchTerm, {
          type: 'websearch',
          config: 'english'
        })
      }

      // Apply status filter
      if (validatedFilters.statuses && validatedFilters.statuses.length > 0) {
        query = query.in('status', validatedFilters.statuses)
      } else {
        // Default to active grants only
        query = query.in('status', ['active', 'open'])
      }

      // Apply organization filter
      if (validatedFilters.organizations && validatedFilters.organizations.length > 0) {
        query = query.in('funding_organization_name', validatedFilters.organizations)
      }

      // Apply grant type filter
      if (validatedFilters.grantTypes && validatedFilters.grantTypes.length > 0) {
        query = query.in('grant_type', validatedFilters.grantTypes)
      }

      // Apply funding instrument filter
      if (validatedFilters.fundingInstruments && validatedFilters.fundingInstruments.length > 0) {
        query = query.in('funding_instrument', validatedFilters.fundingInstruments)
      }

      // Apply geographic scope filter
      if (validatedFilters.geographicScopes && validatedFilters.geographicScopes.length > 0) {
        query = query.in('geographic_scope', validatedFilters.geographicScopes)
      }

      // Apply countries filter
      if (validatedFilters.countries && validatedFilters.countries.length > 0) {
        query = query.overlaps('countries', validatedFilters.countries)
      }

      // Apply states filter
      if (validatedFilters.states && validatedFilters.states.length > 0) {
        query = query.overlaps('states', validatedFilters.states)
      }

      // Apply funding amount filters
      if (validatedFilters.fundingMin !== undefined) {
        query = query.gte('funding_amount_min', validatedFilters.fundingMin)
      }
      if (validatedFilters.fundingMax !== undefined) {
        query = query.lte('funding_amount_max', validatedFilters.fundingMax)
      }

      // Apply deadline filters
      if (validatedFilters.deadlineMinDays !== undefined) {
        const minDate = new Date()
        minDate.setDate(minDate.getDate() + validatedFilters.deadlineMinDays)
        query = query.gte('application_deadline', minDate.toISOString())
      }
      if (validatedFilters.deadlineMaxDays !== undefined) {
        const maxDate = new Date()
        maxDate.setDate(maxDate.getDate() + validatedFilters.deadlineMaxDays)
        query = query.lte('application_deadline', maxDate.toISOString())
      }

      // Exclude grants user has interacted with (if user is authenticated)
      if (validatedFilters.user_id && validatedFilters.exclude_interaction_types) {
        const { data: interactedGrants } = await supabase
          .from('user_interactions')
          .select('grant_id')
          .eq('user_id', validatedFilters.user_id)
          .in('action', validatedFilters.exclude_interaction_types)

        if (interactedGrants && interactedGrants.length > 0) {
          const interactedIds = interactedGrants.map(i => i.grant_id)
          query = query.not('id', 'in', `(${interactedIds.join(',')})`)
        }
      }

      // Apply sorting
      switch (validatedFilters.sortBy) {
        case 'recent':
          query = query.order('created_at', { ascending: false })
          break
        case 'deadline':
          query = query.order('application_deadline', { ascending: true, nullsLast: true })
          break
        case 'deadline_latest':
          query = query.order('application_deadline', { ascending: false, nullsFirst: false })
          break
        case 'amount':
          query = query.order('funding_amount_max', { ascending: false, nullsLast: true })
          break
        case 'amount_asc':
          query = query.order('funding_amount_max', { ascending: true, nullsLast: true })
          break
        case 'title_asc':
          query = query.order('title', { ascending: true })
          break
        case 'title_desc':
          query = query.order('title', { ascending: false })
          break
        case 'relevance':
        default:
          // For relevance, order by last_synced_at desc as a proxy
          query = query.order('last_synced_at', { ascending: false })
          break
      }

      // Apply pagination
      const offset = (validatedFilters.page - 1) * validatedFilters.limit
      query = query.range(offset, offset + validatedFilters.limit - 1)

      const { data, error, count } = await query

      if (error) {
        console.error('Error fetching grants:', error)
        return { error: error.message }
      }

      return {
        data: {
          grants: data as Grant[],
          totalCount: count || 0
        }
      }

    } catch (error) {
      console.error('Error in getGrants:', error)
      return { error: 'Failed to fetch grants' }
    }
  },

  // Get a specific grant by ID
  async getGrantById(id: string): Promise<ApiResponse<{ grant: Grant }>> {
    try {
      const { data, error } = await supabase
        .from('grants')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching grant:', error)
        return { error: error.message }
      }

      return { data: { grant: data as Grant } }
    } catch (error) {
      console.error('Error in getGrantById:', error)
      return { error: 'Failed to fetch grant' }
    }
  },

  // Search grants with full-text search
  async searchGrants(
    query: string, 
    options: { limit?: number, page?: number } = {}
  ): Promise<ApiResponse<{ grants: Grant[], totalCount: number }>> {
    try {
      const limit = options.limit || 20
      const page = options.page || 1
      const offset = (page - 1) * limit

      const { data, error, count } = await supabase
        .from('grants')
        .select('*', { count: 'exact' })
        .textSearch('search_vector', query, {
          type: 'websearch',
          config: 'english'
        })
        .in('status', ['active', 'open'])
        .order('last_synced_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        console.error('Error searching grants:', error)
        return { error: error.message }
      }

      return {
        data: {
          grants: data as Grant[],
          totalCount: count || 0
        }
      }
    } catch (error) {
      console.error('Error in searchGrants:', error)
      return { error: 'Failed to search grants' }
    }
  },

  // Get recommended grants for a user
  async getRecommendedGrants(
    userId: string, 
    options: { exclude?: string[], limit?: number } = {}
  ): Promise<ApiResponse<{ grants: Grant[] }>> {
    try {
      const limit = options.limit || 10

      // Get user preferences for personalization
      const { data: preferences } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single()

      let query = supabase
        .from('grants')
        .select('*')
        .in('status', ['active', 'open'])

      // Exclude grants user has already interacted with
      const { data: interactedGrants } = await supabase
        .from('user_interactions')
        .select('grant_id')
        .eq('user_id', userId)

      if (interactedGrants && interactedGrants.length > 0) {
        const interactedIds = interactedGrants.map(i => i.grant_id)
        query = query.not('id', 'in', `(${interactedIds.join(',')})`)
      }

      // Exclude additional grants if specified
      if (options.exclude && options.exclude.length > 0) {
        query = query.not('id', 'in', `(${options.exclude.join(',')})`)
      }

      // Apply user preferences if available
      if (preferences) {
        if (preferences.preferred_organizations && preferences.preferred_organizations.length > 0) {
          query = query.in('funding_organization_name', preferences.preferred_organizations)
        }
        if (preferences.funding_min) {
          query = query.gte('funding_amount_min', preferences.funding_min)
        }
        if (preferences.funding_max) {
          query = query.lte('funding_amount_max', preferences.funding_max)
        }
        if (preferences.preferred_countries && preferences.preferred_countries.length > 0) {
          query = query.overlaps('countries', preferences.preferred_countries)
        }
        if (preferences.preferred_states && preferences.preferred_states.length > 0) {
          query = query.overlaps('states', preferences.preferred_states)
        }
      }

      // Order by a combination of factors for relevance
      query = query
        .order('last_synced_at', { ascending: false })
        .limit(limit)

      const { data, error } = await query

      if (error) {
        console.error('Error fetching recommended grants:', error)
        return { error: error.message }
      }

      return { data: { grants: data as Grant[] } }
    } catch (error) {
      console.error('Error in getRecommendedGrants:', error)
      return { error: 'Failed to fetch recommended grants' }
    }
  },

  // Get multiple grants by IDs (batch fetch)
  async getGrantsBatch(grantIds: string[]): Promise<ApiResponse<{ grants: Grant[] }>> {
    try {
      if (grantIds.length === 0) {
        return { data: { grants: [] } }
      }

      const { data, error } = await supabase
        .from('grants')
        .select('*')
        .in('id', grantIds)

      if (error) {
        console.error('Error fetching grants batch:', error)
        return { error: error.message }
      }

      return { data: { grants: data as Grant[] } }
    } catch (error) {
      console.error('Error in getGrantsBatch:', error)
      return { error: 'Failed to fetch grants batch' }
    }
  },

  // Get grant metadata for filters
  async getGrantMetadata(): Promise<ApiResponse<{
    organizations: string[];
    grantTypes: string[];
    fundingInstruments: string[];
    geographicScopes: string[];
    statuses: string[];
    dataSources: { id: string; display_name: string; name: string }[];
  }>> {
    try {
      // Execute all queries in parallel
      const [
        organizationsResult,
        grantTypesResult,
        fundingInstrumentsResult,
        geographicScopesResult,
        statusesResult,
        dataSourcesResult
      ] = await Promise.all([
        supabase.from('grants').select('funding_organization_name').not('funding_organization_name', 'is', null),
        supabase.from('grants').select('grant_type').not('grant_type', 'is', null),
        supabase.from('grants').select('funding_instrument').not('funding_instrument', 'is', null),
        supabase.from('grants').select('geographic_scope').not('geographic_scope', 'is', null),
        supabase.from('grants').select('status').not('status', 'is', null),
        supabase.from('data_sources').select('id, display_name, name').order('display_name')
      ])

      // Check for errors
      const errors = [
        organizationsResult.error,
        grantTypesResult.error,
        fundingInstrumentsResult.error,
        geographicScopesResult.error,
        statusesResult.error,
        dataSourcesResult.error
      ].filter(Boolean)

      if (errors.length > 0) {
        console.error('Error fetching metadata:', errors)
        return { error: 'Failed to fetch metadata' }
      }

      // Extract unique values
      const organizations = Array.from(new Set(
        organizationsResult.data?.map(item => item.funding_organization_name).filter(Boolean) || []
      )).sort()

      const grantTypes = Array.from(new Set(
        grantTypesResult.data?.map(item => item.grant_type).filter(Boolean) || []
      )).sort()

      const fundingInstruments = Array.from(new Set(
        fundingInstrumentsResult.data?.map(item => item.funding_instrument).filter(Boolean) || []
      )).sort()

      const geographicScopes = Array.from(new Set(
        geographicScopesResult.data?.map(item => item.geographic_scope).filter(Boolean) || []
      )).sort()

      const statuses = Array.from(new Set(
        statusesResult.data?.map(item => item.status).filter(Boolean) || []
      )).sort()

      return {
        data: {
          organizations,
          grantTypes,
          fundingInstruments,
          geographicScopes,
          statuses,
          dataSources: dataSourcesResult.data || []
        }
      }
    } catch (error) {
      console.error('Error in getGrantMetadata:', error)
      return { error: 'Failed to fetch grant metadata' }
    }
  },

  // Get grant statistics
  async getGrantStats(): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase.rpc('get_grant_stats')

      if (error) {
        console.error('Error fetching grant stats:', error)
        return { error: error.message }
      }

      return { data }
    } catch (error) {
      console.error('Error in getGrantStats:', error)
      return { error: 'Failed to fetch grant statistics' }
    }
  }
}

// Users API
export const usersApi = {
  // Get user preferences
  async getUserPreferences(userId: string): Promise<ApiResponse<UserPreferences>> {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching user preferences:', error)
        return { error: error.message }
      }

      return { data: data as UserPreferences }
    } catch (error) {
      console.error('Error in getUserPreferences:', error)
      return { error: 'Failed to fetch user preferences' }
    }
  },

  // Update user preferences
  async updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<ApiResponse<UserPreferences>> {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          ...preferences,
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('Error updating user preferences:', error)
        return { error: error.message }
      }

      return { data: data as UserPreferences }
    } catch (error) {
      console.error('Error in updateUserPreferences:', error)
      return { error: 'Failed to update user preferences' }
    }
  },

  // Record user interaction with a grant
  async recordInteraction(
    userId: string, 
    grantId: string, 
    action: 'viewed' | 'saved' | 'applied' | 'ignored' | 'shared' | 'downloaded'
  ): Promise<ApiResponse<UserInteraction>> {
    try {
      const { data, error } = await supabase
        .from('user_interactions')
        .upsert({
          user_id: userId,
          grant_id: grantId,
          action,
          created_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,grant_id,action'
        })
        .select()
        .single()

      if (error) {
        console.error('Error recording interaction:', error)
        return { error: error.message }
      }

      return { data: data as UserInteraction }
    } catch (error) {
      console.error('Error in recordInteraction:', error)
      return { error: 'Failed to record interaction' }
    }
  },

  // Get user interactions
  async getUserInteractions(
    userId: string,
    action?: 'viewed' | 'saved' | 'applied' | 'ignored' | 'shared' | 'downloaded',
    grantId?: string
  ): Promise<ApiResponse<{ interactions: UserInteraction[] }>> {
    try {
      let query = supabase
        .from('user_interactions')
        .select('*')
        .eq('user_id', userId)

      if (action) {
        query = query.eq('action', action)
      }

      if (grantId) {
        query = query.eq('grant_id', grantId)
      }

      query = query.order('created_at', { ascending: false })

      const { data, error } = await query

      if (error) {
        console.error('Error fetching user interactions:', error)
        return { error: error.message }
      }

      return { data: { interactions: data as UserInteraction[] } }
    } catch (error) {
      console.error('Error in getUserInteractions:', error)
      return { error: 'Failed to fetch user interactions' }
    }
  },

  // Delete user interaction
  async deleteInteraction(
    userId: string, 
    grantId: string, 
    action: 'viewed' | 'saved' | 'applied' | 'ignored' | 'shared' | 'downloaded'
  ): Promise<ApiResponse<{ message: string }>> {
    try {
      const { error } = await supabase
        .from('user_interactions')
        .delete()
        .eq('user_id', userId)
        .eq('grant_id', grantId)
        .eq('action', action)

      if (error) {
        console.error('Error deleting interaction:', error)
        return { error: error.message }
      }

      return { data: { message: 'Interaction deleted successfully' } }
    } catch (error) {
      console.error('Error in deleteInteraction:', error)
      return { error: 'Failed to delete interaction' }
    }
  }
}

// Analytics API (using Edge Functions)
export const analyticsApi = {
  // Get platform statistics
  async getStats(): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase.functions.invoke('analytics', {
        body: { action: 'stats' }
      })

      if (error) {
        console.error('Error fetching analytics:', error)
        return { error: error.message }
      }

      return { data }
    } catch (error) {
      console.error('Error in getStats:', error)
      // Fallback to grant stats if analytics function fails
      return grantsApi.getGrantStats()
    }
  }
}

// Export the new API client
const supabaseApiClient = {
  grants: grantsApi,
  users: usersApi,
  analytics: analyticsApi,
  supabase
}

export default supabaseApiClient