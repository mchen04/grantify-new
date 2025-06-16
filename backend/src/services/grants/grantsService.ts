import { supabaseClient } from '../../db/supabaseClient';
import * as readline from 'readline';
import { Grant } from '../../models/grant';
import { SupabaseClient } from '@supabase/supabase-js';
import logger from '../../utils/logger';
import weightedRecommendationService from '../ai/weightedRecommendationService';

// Define TransformedGrant as an alias for Grant to maintain compatibility
type TransformedGrant = Grant;

interface ProgressBar {
  total: number;
  current: number;
  bar: string;
  percent: number;
}

interface ProcessResult {
  status: 'new' | 'updated' | 'unchanged' | 'failed';
  id: string;
  error?: any;
}

interface PipelineStats {
  total: number;
  new: number;
  updated: number;
  unchanged: number;
  failed: number;
  startTime: Date;
  endTime: Date;
  failedGrants?: Array<{ id: string; error: any }>;
  error?: string;
}

interface PipelineRun {
  status: 'completed' | 'failed';
  details: {
    total: number;
    new: number;
    updated: number;
    unchanged: number;
    failed: number;
    duration_ms: number;
    error?: string;
  };
  timestamp: string;
}

interface GrantFilters {
  search?: string;
  category?: string;
  agency_name?: string;
  agency_subdivision?: string;
  funding_min?: number;
  funding_max?: number;
  activity_categories?: string[];
  eligible_applicant_types?: string[];
  grant_type?: string;  // Renamed from funding_type
  grant_types?: string[];  // Array version for frontend compatibility
  agencies?: string[];  // Array version for frontend compatibility
  status?: string;
  keywords?: string[];
  page?: number;
  limit?: number;
  // Added deadline and funding null filters
  deadline_min?: string;
  deadline_max?: string;
  deadline_null?: boolean;
  include_no_deadline?: boolean;
  funding_null?: boolean;
  include_no_funding?: boolean;
  exclude_id?: string; // Added to handle similar grants filtering
  user_id?: string;  // Added to filter out grants the user has already interacted with
  exclude_interaction_types?: ('saved' | 'applied' | 'ignored')[];  // Specify which interaction types to exclude
  data_sources?: string[];  // Added to filter by grant data sources
  show_overdue?: boolean;  // Added to control showing overdue grants
  cost_sharing?: boolean;  // Added to filter by cost sharing requirement
  clinical_trial_allowed?: boolean;  // Added to filter by clinical trial allowance
}

/**
 * Service for managing grants in the database
 */
class GrantsService {
  /**
   * Store grants in the database with delta updates
   * @param grants - Array of grant objects to store
   * @returns Result of the operation
   */
  async storeGrants(grants: TransformedGrant[]): Promise<PipelineStats> {
    try {
      
      // Track statistics
      const stats: PipelineStats = {
        total: grants.length,
        new: 0,
        updated: 0,
        unchanged: 0,
        failed: 0,
        startTime: new Date(),
        endTime: new Date(),
        failedGrants: [], // Track failed grants for reporting
      };
      
      // Process grants in batches to avoid overwhelming the database
      const batchSize = 50;
      const batches = [];
      
      for (let i = 0; i < grants.length; i += batchSize) {
        batches.push(grants.slice(i, i + batchSize));
      }
      
      
      // Set up progress bar
      const progressBar = this.createProgressBar(batches.length);
      
      // Process each batch
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        
        // Update progress bar
        this.updateProgressBar(progressBar, i + 1, batches.length);
        
        // Process each grant in the batch
        const batchResults = await Promise.all(
          batch.map((grant: TransformedGrant) => this.processGrant(grant))
        );
        
        // Update statistics
        batchResults.forEach(result => {
          if (result.status === 'new') stats.new++;
          else if (result.status === 'updated') stats.updated++;
          else if (result.status === 'unchanged') stats.unchanged++;
          else {
            stats.failed++;
            if (result.error && stats.failedGrants) {
              stats.failedGrants.push({
                id: result.id,
                error: result.error
              });
            }
          }
        });
      }
      
      // Complete the progress bar
      this.updateProgressBar(progressBar, batches.length, batches.length);
      
      // Log failed grants (limited to first 10)
      if (stats.failedGrants && stats.failedGrants.length > 0) {
        stats.failedGrants.slice(0, 10).forEach(failedGrant => {
          logger.error(`Failed to process grant ${failedGrant.id}:`, failedGrant.error);
        });
        
        if (stats.failedGrants.length > 10) {
          logger.warn(`${stats.failedGrants.length - 10} additional grant processing failures not shown`);
        }
      }
      
      // Record the pipeline run
      stats.endTime = new Date();
      await this.recordPipelineRun(stats);
      
      return stats;
    } catch (error) {
      // Error storing grants
      
      // Record the failed pipeline run
      await this.recordPipelineRun({
        total: grants.length,
        new: 0,
        updated: 0,
        unchanged: 0,
        failed: grants.length,
        startTime: new Date(),
        endTime: new Date(),
        error: error instanceof Error ? error.message : String(error),
      });
      
      throw error;
    }
  }
  
  /**
   * Create a progress bar
   * @param total - Total number of items
   * @returns Progress bar object
   */
  private createProgressBar(total: number): ProgressBar {
    const progressBar: ProgressBar = {
      total,
      current: 0,
      bar: '',
      percent: 0,
    };
    
    // Initialize the progress bar
    this.updateProgressBar(progressBar, 0, total);
    
    return progressBar;
  }
  
  /**
   * Update the progress bar
   * @param progressBar - Progress bar object
   * @param current - Current progress
   * @param total - Total items
   */
  private updateProgressBar(progressBar: ProgressBar, current: number, total: number): void {
    progressBar.current = current;
    progressBar.percent = Math.floor((current / total) * 100);
    
    const barLength = 30;
    const filledLength = Math.floor((current / total) * barLength);
    const emptyLength = barLength - filledLength;
    
    const filledBar = '='.repeat(filledLength);
    const emptyBar = ' '.repeat(emptyLength);
    progressBar.bar = `[${filledBar}>${emptyBar}]`;
    
    // Clear the current line and write the progress bar
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
    process.stdout.write(`Progress: ${progressBar.bar} ${progressBar.percent}% (${current}/${total} batches)`);
  }
  
  /**
   * Process a single grant (insert, update, or skip)
   * @param grant - Grant object to process
   * @returns Result of the operation
   */
  private async processGrant(grant: TransformedGrant): Promise<ProcessResult> {
    try {
      // Check if the grant already exists
      const { data: existingGrant, error: fetchError } = await supabaseClient
        .from('grants')
        .select('id, updated_at, opportunity_id')
        .eq('opportunity_id', grant.opportunity_id)
        .single();
      
      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
        throw fetchError;
      }
      
      // If the grant doesn't exist, insert it
      if (!existingGrant) {
        const { error: insertError } = await supabaseClient
          .from('grants')
          .insert(grant);
        
        if (insertError) throw insertError;
        
        return { status: 'new', id: grant.opportunity_id };
      }
      
      // If the grant exists, check if it needs to be updated
      // For simplicity, we're just updating all existing grants
      // In a real implementation, you might want to compare fields to see if anything changed
      const { error: updateError } = await supabaseClient
        .from('grants')
        .update({
          ...grant,
          id: existingGrant.id, // Preserve the original ID
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingGrant.id);
      
      if (updateError) throw updateError;
      
      return { status: 'updated', id: existingGrant.id };
    } catch (error) {
      return { status: 'failed', id: grant.opportunity_id, error };
    }
  }
  
  /**
   * Record a pipeline run in the database
   * @param stats - Statistics about the pipeline run
   */
  private async recordPipelineRun(stats: PipelineStats): Promise<void> {
    try {
      const { error } = await supabaseClient
        .from('pipeline_runs')
        .insert({
          status: stats.failed === stats.total ? 'failed' : 'completed',
          details: {
            total: stats.total,
            new: stats.new,
            updated: stats.updated,
            unchanged: stats.unchanged,
            failed: stats.failed,
            duration_ms: stats.endTime.getTime() - stats.startTime.getTime(),
            error: stats.error,
          },
          timestamp: new Date().toISOString(),
        });
      
      if (error) throw error;
      
    } catch (error) {
      // Error recording pipeline run
    }
  }
  
  /**
   * Get the latest pipeline run
   * @returns Latest pipeline run
   */
  async getLatestPipelineRun(): Promise<PipelineRun | null> {
    try {
      const { data, error } = await supabaseClient
        .from('pipeline_runs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      // Error getting latest pipeline run
      return null;
    }
  }
  
  /**
   * Get grants with filtering
   * @param filters - Filters to apply
   * @returns Array of grants
   */
  /**
   * Get all grant IDs from the database
   * @returns Array of grant IDs
   */
  async getAllGrantIds(): Promise<string[]> {
    try {
      const { data, error } = await supabaseClient
        .from('grants')
        .select('opportunity_id');
      
      if (error) throw error;
      
      return (data || []).map((grant: any) => grant.opportunity_id);
    } catch (error) {
      // Error getting grant IDs
      return [];
    }
  }

  async getGrants(filters: GrantFilters = {}, client: SupabaseClient = supabaseClient): Promise<{ grants: TransformedGrant[], totalCount: number }> {
    try {
      logger.info('getGrants called with filters:', {
        ...filters,
        include_no_funding: filters.include_no_funding,
        include_no_deadline: filters.include_no_deadline,
        funding_null: filters.funding_null,
        deadline_null: filters.deadline_null
      });

      // First, check if we can access the grants table at all
      const testQuery = await client.from('grants').select('count');
      if (testQuery.error) {
        // Error accessing grants table
        throw new Error(`Cannot access grants table: ${testQuery.error.message}`);
      }


      // Build the query with all filters
      let query = client.from('grants').select('*', { count: 'exact' });

      // Apply filters
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description_short.ilike.%${filters.search}%,description_full.ilike.%${filters.search}%`);
      }

      if (filters.category) {
        query = query.eq('category', filters.category);
      }

      if (filters.agency_name) {
        query = query.eq('agency_name', filters.agency_name);
      }

      if (filters.agency_subdivision) {
        query = query.eq('agency_subdivision', filters.agency_subdivision);
      }

      if (filters.grant_type) {
        query = query.eq('grant_type', filters.grant_type);
      }
      
      if (filters.grant_types && Array.isArray(filters.grant_types) && filters.grant_types.length > 0) {
        query = query.in('grant_type', filters.grant_types);
      }
      
      if (filters.agencies && Array.isArray(filters.agencies) && filters.agencies.length > 0) {
        query = query.in('agency_name', filters.agencies);
      }

      // Status filter removed - no longer filtering by status to show all grants
      // if (filters.status) {
      //   query = query.eq('status', filters.status);
      // }

      if (filters.keywords && Array.isArray(filters.keywords)) {
        query = query.contains('keywords', filters.keywords);
      }

      // Apply data sources filter
      if (filters.data_sources && Array.isArray(filters.data_sources) && filters.data_sources.length > 0) {
        query = query.in('data_source', filters.data_sources);
      }

      // Apply funding filters
      if (filters.funding_null === true) {
        // Only show grants with no funding specified
        query = query.is('award_ceiling', null);
      } else if (filters.include_no_funding === true) {
        // Check if this is effectively a "show all" filter by examining the funding range
        // Note: frontend sends 5000000 as MAX_FUNDING, treat this as "no upper limit"
        const hasRestrictiveFundingRange = (
          (filters.funding_min !== undefined && filters.funding_min > 0) ||
          (filters.funding_max !== undefined && filters.funding_max < 5000000)
        );
        
        if (hasRestrictiveFundingRange) {
          // Apply specific funding range + null filtering
          const fundingConditions: string[] = [];
          const rangeConditions: string[] = [];
          
          if (filters.funding_min !== undefined) {
            rangeConditions.push(`award_ceiling.gte.${filters.funding_min}`);
          }
          
          if (filters.funding_max !== undefined && filters.funding_max < Number.MAX_SAFE_INTEGER) {
            rangeConditions.push(`award_ceiling.lte.${filters.funding_max}`);
          }
          
          if (rangeConditions.length > 0) {
            // Combine range conditions with AND and add as one OR condition
            fundingConditions.push(`and(${rangeConditions.join(',')})`);
          }
          
          // Add null condition
          fundingConditions.push('award_ceiling.is.null');
          
          // Apply OR condition: (range AND conditions) OR null
          query = query.or(fundingConditions.join(','));
          
          logger.info('Applied restrictive funding filter with include_no_funding=true', {
            funding_min: filters.funding_min,
            funding_max: filters.funding_max,
            conditions: fundingConditions
          });
        } else {
          // No restrictive funding range specified with include_no_funding=true
          // This means "include ALL grants regardless of funding"
          // Don't apply any funding filters at all
          logger.info('Applied include_no_funding=true with no restrictive range - including all grants');
        }
      } else {
        // Only show grants with funding specified that match the range
        if (filters.funding_min !== undefined) {
          query = query.gte('award_ceiling', filters.funding_min);
        }

        if (filters.funding_max !== undefined && filters.funding_max < Number.MAX_SAFE_INTEGER) {
          query = query.lte('award_ceiling', filters.funding_max);
        }
        
        // Exclude nulls when include_no_funding is false
        if (filters.funding_min !== undefined || filters.funding_max !== undefined) {
          query = query.not('award_ceiling', 'is', null);
        }
      }


      if (filters.activity_categories && Array.isArray(filters.activity_categories)) {
        query = query.contains('activity_category', filters.activity_categories);
      }

      if (filters.eligible_applicant_types && Array.isArray(filters.eligible_applicant_types)) {
        query = query.contains('eligible_applicants', filters.eligible_applicant_types);
      }

      // Exclude a specific grant by ID for similar grants functionality
      if (filters.exclude_id) {
        query = query.not('id', 'eq', filters.exclude_id);
      }

      // Apply deadline filters
      if (filters.deadline_null === true) {
        // Only show grants with no deadline specified
        query = query.is('close_date', null);
      } else if (filters.include_no_deadline === true) {
        // Check if this is effectively a "show all" filter by examining the date range
        const hasRestrictiveDateRange = (
          (filters.deadline_min && filters.deadline_min !== '') ||
          (filters.deadline_max && filters.deadline_max !== '')
        );
        
        if (hasRestrictiveDateRange) {
          // Apply specific date range + null filtering
          const deadlineConditions: string[] = [];
          const rangeConditions: string[] = [];
          
          if (filters.deadline_min) {
            rangeConditions.push(`close_date.gte.${filters.deadline_min}`);
          }
          
          if (filters.deadline_max) {
            rangeConditions.push(`close_date.lte.${filters.deadline_max}`);
          }
          
          if (rangeConditions.length > 0) {
            // Combine range conditions with AND and add as one OR condition
            deadlineConditions.push(`and(${rangeConditions.join(',')})`);
          }
          
          // Add null condition
          deadlineConditions.push('close_date.is.null');
          
          // Apply OR condition: (range AND conditions) OR null
          query = query.or(deadlineConditions.join(','));
          
          logger.info('Applied restrictive deadline filter with include_no_deadline=true', {
            deadline_min: filters.deadline_min,
            deadline_max: filters.deadline_max,
            conditions: deadlineConditions
          });
        } else {
          // No restrictive date range specified with include_no_deadline=true
          // This means "include ALL grants regardless of deadline"
          // Don't apply any deadline filters at all
          logger.info('Applied include_no_deadline=true with no restrictive range - including all grants');
        }
      } else {
        // Only show grants with deadline specified that match the range
        if (filters.deadline_min) {
          query = query.gte('close_date', filters.deadline_min);
        }

        if (filters.deadline_max) {
          query = query.lte('close_date', filters.deadline_max);
        }
        
        // Exclude nulls when include_no_deadline is false
        if (filters.deadline_min || filters.deadline_max) {
          query = query.not('close_date', 'is', null);
        }
      }

      // Apply overdue grants filter - but only if no explicit deadline range was specified that includes past dates
      if (filters.show_overdue === false) {
        // Check if user has explicitly specified a deadline range that includes past dates
        // Only consider it "explicit past range" if deadline_min is actually before today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const hasExplicitPastRange = filters.deadline_min && new Date(filters.deadline_min) < today;
        
        if (!hasExplicitPastRange) {
          // Only exclude overdue grants if user hasn't explicitly included past dates in their range
          // Exclude overdue grants by only showing grants that:
          // 1. Have a close_date >= today, OR
          // 2. Have no close_date (null)
          query = query.or(`close_date.gte.${today.toISOString()},close_date.is.null`);
          logger.info('Applied show_overdue=false filter (no explicit past range)');
        } else {
          logger.info('Skipped show_overdue=false filter because user specified explicit past date range', {
            deadline_min: filters.deadline_min
          });
        }
      }

      if ((filters as any).has_award_ceiling === true) {
        query = query.not('award_ceiling', 'is', null);
      }

      // Apply boolean filters - only filter when explicitly set to true or false, not when null/undefined
      if (filters.cost_sharing !== undefined && filters.cost_sharing !== null) {
        query = query.eq('cost_sharing', filters.cost_sharing);
        logger.info('Applied cost_sharing filter:', filters.cost_sharing);
      }
      
      if (filters.clinical_trial_allowed !== undefined && filters.clinical_trial_allowed !== null) {
        query = query.eq('clinical_trial_allowed', filters.clinical_trial_allowed);
        logger.info('Applied clinical_trial_allowed filter:', filters.clinical_trial_allowed);
      }

      // Apply sorting
      const sortBy = (filters as any).sort_by;
      logger.info(`Applying sort: ${sortBy}`);

      switch (sortBy) {
        case 'recent':
          query = query.order('post_date', { ascending: false });
          break;
        case 'deadline':
          // For deadline sorting, we want nulls last when ascending (soonest first)
          query = query.order('close_date', { ascending: true, nullsFirst: false });
          break;
        case 'deadline_latest':
          // For deadline sorting descending, nulls should come first 
          query = query.order('close_date', { ascending: false, nullsFirst: true });
          break;
        case 'amount':
          // For amount sorting, we want nulls last when descending (highest first)
          query = query.order('award_ceiling', { ascending: false, nullsFirst: false });
          break;
        case 'amount_asc':
          // For amount sorting ascending, nulls should come first (lowest first)
          query = query.order('award_ceiling', { ascending: true, nullsFirst: true });
          break;
        case 'title_asc':
          query = query.order('title', { ascending: true });
          break;
        case 'title_desc':
          query = query.order('title', { ascending: false });
          break;
        case 'relevance':
        default:
          // Default sort by relevance (can be improved with full-text search ranking)
          // For now, default to recent if relevance is selected or no sort is specified
          query = query.order('post_date', { ascending: false });
          break;
      }

      // Filter out grants based on user interactions if user_id is provided
      if (filters.user_id && filters.exclude_interaction_types && filters.exclude_interaction_types.length > 0) {
        const excludeTypes = filters.exclude_interaction_types;
        
        logger.info(`Applying interaction exclusion for user ${filters.user_id} with types: ${excludeTypes.join(', ')}`);
        
        try {
          // Get interacted grant IDs using the same authenticated client
          const { data: userInteractions, error: interactionsError } = await client
            .from('user_interactions')
            .select('grant_id')
            .eq('user_id', filters.user_id)
            .in('action', excludeTypes);
          
          if (interactionsError) {
            logger.error('Error fetching user interactions for filtering:', interactionsError);
          } else if (userInteractions && userInteractions.length > 0) {
            const grantsToExclude = userInteractions.map((interaction: any) => interaction.grant_id);
            
            logger.info(`Excluding ${grantsToExclude.length} grants (types: ${excludeTypes.join(', ')}) from search results for user ${filters.user_id}`);
            logger.debug('Grant IDs to exclude:', grantsToExclude.slice(0, 5));
            
            // Use more efficient approach for large exclusion lists
            if (grantsToExclude.length > 100) {
              // For large exclusion lists, chunk the array to avoid query length limits
              const chunkSize = 100;
              for (let i = 0; i < grantsToExclude.length; i += chunkSize) {
                const chunk = grantsToExclude.slice(i, i + chunkSize);
                query = query.not('id', 'in', `(${chunk.join(',')})`);
              }
              logger.debug('Applied chunked NOT IN filter for grant exclusion (large list)');
            } else {
              // For smaller lists, NOT IN is efficient
              query = query.not('id', 'in', `(${grantsToExclude.join(',')})`);
              logger.debug('Applied NOT IN filter for grant exclusion (small list)');
            }
          } else {
            logger.info(`No interactions found for user ${filters.user_id} with types: ${excludeTypes.join(', ')}`);
          }
        } catch (error) {
          logger.error('Exception during interaction filtering:', error);
          // Continue without filtering rather than failing the entire request
        }
      }

      // Apply pagination
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const offset = (page - 1) * limit;

      // Execute query with count and pagination
      const { data, error, count } = await query
        .range(offset, offset + limit - 1);

      if (error) {
        // Supabase error fetching grants
        throw error;
      }


      // If no data was returned but there was no error, return empty grants with count
      if (!data || data.length === 0) {
        logger.info(`No grants found after applying filters. Total available: ${count || 0}`);
        return { grants: [], totalCount: count || 0 };
      }

      logger.info(`Returning ${data.length} grants out of ${count || 0} total available`);
      return { grants: data, totalCount: count || 0 };
    } catch (error) {
      // Error getting grants
      // Return empty grants with zero count instead of throwing to prevent UI errors
      return { grants: [], totalCount: 0 };
    }
  }
  /**
   * Get recommended grants for a user using weighted scoring algorithm
   * @param supabase - Supabase client instance
   * @param userId - User ID to get recommendations for
   * @param options - Options for filtering recommendations
   * @returns Array of recommended grants with scores
   */
  async getRecommendedGrants(supabase: SupabaseClient, userId: string, options: { exclude?: string[], limit?: number } = {}): Promise<TransformedGrant[]> {
    try {
      logger.info(`Getting recommendations for user ${userId} with weighted algorithm`);
      
      // Use the new weighted recommendation service
      const { grants: scoredGrants } = await weightedRecommendationService.getWeightedRecommendations(
        supabase,
        {
          userId,
          limit: options.limit || 20,
          offset: 0,
          excludeOverdue: true, // By default, exclude overdue grants
          minScore: 0.3 // Minimum recommendation score threshold
        }
      );

      // Log the recommendation results
      logger.info(`Found ${scoredGrants.length} recommended grants for user ${userId}`);
      
      // If we have scored grants, return them
      if (scoredGrants.length > 0) {
        // Add match_score for backward compatibility
        return scoredGrants.map(grant => ({
          ...grant,
          match_score: grant.recommendationScore
        }));
      }

      // Fallback to basic filtering if no weighted recommendations
      logger.info('No weighted recommendations found, falling back to basic filtering');
      
      // Build a basic query
      let query = supabase.from('grants').select('*');
      
      // Exclude overdue grants
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      query = query.or(`close_date.gte.${today.toISOString()},close_date.is.null`);
      
      // Exclude already interacted grants
      if (options.exclude && options.exclude.length > 0 && options.exclude.length <= 100) {
        query = query.not('id', 'in', `(${options.exclude.join(',')})`);
      }
      
      // Get user preferences for basic filtering
      const { data: userPrefs } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (userPrefs) {
        // Apply basic preference filters
        if (userPrefs.agencies && userPrefs.agencies.length > 0) {
          query = query.in('agency_name', userPrefs.agencies);
        }
        
        if (userPrefs.funding_min && userPrefs.funding_min > 0) {
          query = query.gte('award_floor', userPrefs.funding_min);
        }
        
        if (userPrefs.funding_max && userPrefs.funding_max < Number.MAX_SAFE_INTEGER) {
          query = query.lte('award_ceiling', userPrefs.funding_max);
        }
      }
      
      // Limit and order
      const limit = options.limit || 20;
      query = query
        .limit(limit)
        .order('post_date', { ascending: false });
      
      // Execute fallback query
      const { data, error } = await query;
      
      if (error) {
        logger.error('Error in fallback grant query:', error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      logger.error('Error getting recommended grants:', {
        error: error instanceof Error ? error.message : error,
        userId,
        options
      });
      // Return empty array instead of throwing to prevent UI errors
      return [];
    }
  }

  /**
   * Get multiple grants by their IDs in a single query (batch fetch)
   * @param grantIds - Array of grant IDs to fetch
   * @param client - Supabase client instance
   * @returns Array of grants
   */
  async getGrantsByIds(grantIds: string[], client: SupabaseClient = supabaseClient): Promise<TransformedGrant[]> {
    try {
      if (!grantIds || grantIds.length === 0) {
        return [];
      }

      // Supabase has a limit on the number of items in an IN clause
      // Split into chunks of 100 to be safe
      const chunks: string[][] = [];
      const chunkSize = 100;
      
      for (let i = 0; i < grantIds.length; i += chunkSize) {
        chunks.push(grantIds.slice(i, i + chunkSize));
      }

      // Fetch all chunks in parallel
      const chunkPromises = chunks.map(chunk => 
        client
          .from('grants')
          .select('*')
          .in('id', chunk)
      );

      const results = await Promise.all(chunkPromises);
      
      // Combine all results
      const allGrants: TransformedGrant[] = [];
      for (const result of results) {
        if (result.error) {
          logger.error('Error fetching grant batch:', result.error);
          continue;
        }
        if (result.data) {
          allGrants.push(...result.data);
        }
      }

      // Create a map for O(1) lookup to preserve the original order
      const grantMap = new Map<string, TransformedGrant>();
      allGrants.forEach(grant => {
        grantMap.set(grant.id, grant);
      });

      // Return grants in the same order as the input IDs
      const orderedGrants: TransformedGrant[] = [];
      grantIds.forEach(id => {
        const grant = grantMap.get(id);
        if (grant) {
          orderedGrants.push(grant);
        }
      });

      return orderedGrants;
    } catch (error) {
      logger.error('Error in getGrantsByIds:', error);
      throw error;
    }
  }

  /**
   * Get grants with their interactions for a specific user
   * @param userId - User ID
   * @param grantIds - Array of grant IDs
   * @param client - Supabase client instance
   * @returns Map of grant IDs to their interaction status
   */
  async getGrantsWithInteractions(
    userId: string, 
    grantIds: string[], 
    client: SupabaseClient = supabaseClient
  ): Promise<Map<string, { grant: TransformedGrant; interaction?: any }>> {
    try {
      // Fetch grants and interactions in parallel
      const [grants, interactions] = await Promise.all([
        this.getGrantsByIds(grantIds, client),
        client
          .from('user_interactions')
          .select('*')
          .eq('user_id', userId)
          .in('grant_id', grantIds)
      ]);

      // Create interaction map
      const interactionMap = new Map<string, any>();
      if (interactions.data) {
        interactions.data.forEach(interaction => {
          interactionMap.set(interaction.grant_id, interaction);
        });
      }

      // Combine grants with their interactions
      const result = new Map<string, { grant: TransformedGrant; interaction?: any }>();
      grants.forEach(grant => {
        result.set(grant.id, {
          grant,
          interaction: interactionMap.get(grant.id)
        });
      });

      return result;
    } catch (error) {
      logger.error('Error in getGrantsWithInteractions:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export default new GrantsService();