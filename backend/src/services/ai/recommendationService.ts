import { SupabaseClient } from '@supabase/supabase-js';
import logger from '../../utils/logger';
import { Grant } from '../../models/grant';

export interface RecommendationOptions {
  userId: string;
  limit?: number;
  offset?: number;
  includeFilters?: boolean;
}

export interface RecommendedGrant extends Grant {
  similarity_score?: number;
  match_reason?: string;
}

/**
 * Service for generating grant recommendations using semantic search
 */
class RecommendationService {
  /**
   * Get grant recommendations based on user's project description embedding
   * @param supabase - Supabase client
   * @param options - Recommendation options
   * @returns Array of recommended grants with similarity scores
   */
  async getRecommendations(
    supabase: SupabaseClient,
    options: RecommendationOptions
  ): Promise<{ grants: RecommendedGrant[], total: number }> {
    try {
      const { userId, limit = 20, offset = 0, includeFilters = true } = options;

      // First, get user preferences including embedding
      const { data: preferences, error: prefError } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (prefError || !preferences) {
        logger.error('Failed to fetch user preferences:', prefError);
        throw new Error('User preferences not found');
      }

      // If no embedding exists, fall back to regular filtering
      if (!preferences.project_description_embedding) {
        return this.getFilteredGrants(supabase, preferences, limit, offset);
      }

      // Build the base query for semantic search
      let query = supabase.rpc('get_similar_grants', {
        query_embedding: preferences.project_description_embedding,
        match_threshold: 0.7, // Minimum similarity score
        match_count: limit + offset // Get extra for pagination
      });

      // Apply additional filters if requested
      if (includeFilters) {
        // Apply funding range filter
        if (preferences.funding_min !== null && preferences.funding_min !== undefined) {
          query = query.gte('funding_amount_max', preferences.funding_min);
        }
        if (preferences.funding_max !== null && preferences.funding_max !== undefined) {
          query = query.lte('funding_amount_min', preferences.funding_max);
        }

        // Apply agency filter
        if (preferences.agencies && preferences.agencies.length > 0) {
          query = query.in('funding_organization_name', preferences.agencies);
        }

        // Apply deadline filter based on deadline_range
        if (preferences.deadline_range && preferences.deadline_range !== '0') {
          const deadlineDate = this.calculateDeadlineDate(preferences.deadline_range);
          if (deadlineDate) {
            query = query.gte('application_deadline', deadlineDate.toISOString());
          }
        }
      }

      const { data: grants, error } = await query;

      if (error) {
        logger.error('Error fetching recommendations:', error);
        throw error;
      }

      // Get user interactions to filter out already interacted grants
      const { data: interactions } = await supabase
        .from('user_interactions')
        .select('grant_id')
        .eq('user_id', userId);

      const interactedGrantIds = new Set(interactions?.map(i => i.grant_id) || []);

      // Filter out interacted grants and apply pagination
      const filteredGrants = (grants || [])
        .filter((grant: any) => !interactedGrantIds.has(grant.id))
        .slice(offset, offset + limit);

      // Add match reasons
      const grantsWithReasons = filteredGrants.map((grant: any) => ({
        ...grant,
        match_reason: this.generateMatchReason(grant, preferences)
      }));

      return {
        grants: grantsWithReasons,
        total: filteredGrants.length
      };
    } catch (error) {
      logger.error('Error in recommendation service:', {
        error: error instanceof Error ? error.message : error,
        userId: options.userId
      });
      throw error;
    }
  }

  /**
   * Fallback method for getting grants when no embedding is available
   */
  private async getFilteredGrants(
    supabase: SupabaseClient,
    preferences: any,
    limit: number,
    offset: number
  ): Promise<{ grants: RecommendedGrant[], total: number }> {
    let query = supabase
      .from('grants')
      .select('*', { count: 'exact' });

    // Apply filters
    if (preferences.funding_min !== null && preferences.funding_min !== undefined) {
      query = query.gte('funding_amount_max', preferences.funding_min);
    }
    if (preferences.funding_max !== null && preferences.funding_max !== undefined) {
      query = query.lte('funding_amount_min', preferences.funding_max);
    }
    if (preferences.agencies && preferences.agencies.length > 0) {
      query = query.in('funding_organization_name', preferences.agencies);
    }
    if (preferences.topics && preferences.topics.length > 0) {
      query = query.in('category', preferences.topics);
    }

    // Apply deadline filter
    if (preferences.deadline_range && preferences.deadline_range !== '0') {
      const deadlineDate = this.calculateDeadlineDate(preferences.deadline_range);
      if (deadlineDate) {
        query = query.gte('application_deadline', deadlineDate.toISOString());
      }
    }

    // Order by post date and paginate
    query = query
      .order('posted_date', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: grants, error, count } = await query;

    if (error) {
      throw error;
    }

    return {
      grants: grants || [],
      total: count || 0
    };
  }

  /**
   * Calculate deadline date based on deadline range preference
   */
  private calculateDeadlineDate(deadlineRange: string): Date | null {
    const now = new Date();
    const daysToAdd = parseInt(deadlineRange);
    
    if (isNaN(daysToAdd) || daysToAdd <= 0) {
      return null;
    }

    const deadlineDate = new Date(now);
    deadlineDate.setDate(deadlineDate.getDate() + daysToAdd);
    return deadlineDate;
  }

  /**
   * Generate a human-readable match reason for a grant
   */
  private generateMatchReason(grant: any, preferences: any): string {
    const reasons: string[] = [];

    if (grant.similarity_score && grant.similarity_score > 0.8) {
      reasons.push('Highly relevant to your project interests');
    } else if (grant.similarity_score && grant.similarity_score > 0.7) {
      reasons.push('Good match for your project description');
    }

    if (preferences.agencies?.includes(grant.funding_organization_name)) {
      reasons.push(`From preferred agency: ${grant.funding_organization_name}`);
    }

    if (preferences.topics?.includes(grant.category)) {
      reasons.push(`Matches your interest in ${grant.category}`);
    }

    const fundingInRange = 
      (preferences.funding_min === undefined || grant.funding_amount_max >= preferences.funding_min) &&
      (preferences.funding_max === undefined || grant.funding_amount_min <= preferences.funding_max);
    
    if (fundingInRange && (grant.funding_amount_min || grant.funding_amount_max)) {
      reasons.push('Funding amount within your range');
    }

    return reasons.length > 0 ? reasons.join(' • ') : 'Recommended based on your preferences';
  }
}

// Export singleton instance
export default new RecommendationService();