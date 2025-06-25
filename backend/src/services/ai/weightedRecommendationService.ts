import { SupabaseClient } from '@supabase/supabase-js';
import logger from '../../utils/logger';
import { Grant } from '../../models/grant';
import { UserPreferences } from '../../models/user';

export interface WeightedRecommendationOptions {
  userId: string;
  limit?: number;
  offset?: number;
  excludeOverdue?: boolean;
  minScore?: number;
}

export interface ScoredGrant extends Grant {
  recommendationScore: number;
  scoreBreakdown: {
    embeddingScore: number;
    fundingScore: number;
    deadlineScore: number;
    agencyScore: number;
    categoryScore: number;
    projectPeriodScore: number;
    freshnessBonusScore: number;
    interactionScore: number;
  };
  matchReasons: string[];
}

// Scoring weights configuration
// Weights are based on what matters most to grant seekers
// Note: Eligibility is now part of embedding match (users should include org type in project description)
const SCORING_WEIGHTS = {
  embedding: 0.35,        // 35% - MOST IMPORTANT: Relevance to research/organization match
  deadline: 0.25,         // 25% - CRITICAL: Must have time to prepare application
  funding: 0.20,          // 20% - IMPORTANT: Funding amount compatibility
  category: 0.10,         // 10% - HELPFUL: Activity category/type match
  agency: 0.05,           // 5%  - NICE TO HAVE: Preferred agency
  freshnessBonus: 0.03,   // 3%  - MINOR: Recently posted grants
  projectPeriod: 0.01,    // 1%  - MINIMAL: Project duration flexibility
  interaction: 0.01       // 1%  - MINIMAL: Collaborative filtering
};

/**
 * Advanced weighted recommendation service for grant matching
 */
class WeightedRecommendationService {
  /**
   * Get grant recommendations using weighted scoring algorithm
   */
  async getWeightedRecommendations(
    supabase: SupabaseClient,
    options: WeightedRecommendationOptions
  ): Promise<{ grants: ScoredGrant[], total: number }> {
    try {
      logger.info('WeightedRecommendationService.getWeightedRecommendations called', {
        userId: options.userId,
        limit: options.limit,
        excludeOverdue: options.excludeOverdue
      });

      const { 
        userId, 
        limit = 20, 
        offset = 0, 
        excludeOverdue = true,
        minScore = 0.3 
      } = options;

      // Fetch user preferences
      const preferences = await this.getUserPreferences(supabase, userId);
      if (!preferences) {
        throw new Error('User preferences not found');
      }

      // Fetch user interaction history for collaborative filtering
      const interactionHistory = await this.getUserInteractionHistory(supabase, userId);

      // Build base query
      let query = supabase
        .from('grants')
        .select('*', { count: 'exact' });

      // Exclude overdue grants by default
      if (excludeOverdue) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        query = query.or(`application_deadline.gte.${today.toISOString()},application_deadline.is.null`);
      }

      // IMPORTANT: Exclude ALL grants the user has already interacted with
      // This includes saved, applied, and ignored grants
      const interactedGrantIds = interactionHistory.map(i => i.grant_id);
      if (interactedGrantIds.length > 0) {
        query = query.not('id', 'in', `(${interactedGrantIds.join(',')})`);
        logger.info(`Excluding ${interactedGrantIds.length} already interacted grants from recommendations`);
      }

      // Apply hard filters for mandatory preferences
      query = this.applyMandatoryFilters(query, preferences);

      // Fetch grants
      const { data: grants, error, count } = await query;

      if (error) {
        logger.error('Error fetching grants for recommendations:', error);
        throw error;
      }

      if (!grants || grants.length === 0) {
        return { grants: [], total: 0 };
      }

      // Score and rank grants
      const scoredGrants = await this.scoreGrants(
        supabase,
        grants,
        preferences,
        interactionHistory
      );

      // Filter by minimum score and sort by recommendation score
      const filteredGrants = scoredGrants
        .filter(grant => {
          // Must meet minimum overall score
          if (grant.recommendationScore < minScore) return false;
          
          // If deadline score is 0, grant is overdue
          if (grant.scoreBreakdown.deadlineScore === 0) {
            logger.info(`Filtering out grant ${grant.id} - deadline passed`);
            return false;
          }
          
          return true;
        })
        .sort((a, b) => b.recommendationScore - a.recommendationScore);

      // Apply pagination
      const paginatedGrants = filteredGrants.slice(offset, offset + limit);

      return {
        grants: paginatedGrants,
        total: filteredGrants.length
      };
    } catch (error) {
      logger.error('Error in weighted recommendation service:', {
        error: error instanceof Error ? error.message : error,
        userId: options.userId
      });
      throw error;
    }
  }

  /**
   * Fetch user preferences
   */
  private async getUserPreferences(
    supabase: SupabaseClient,
    userId: string
  ): Promise<UserPreferences | null> {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      logger.error('Failed to fetch user preferences:', error);
      return null;
    }

    return data;
  }

  /**
   * Fetch user interaction history
   */
  private async getUserInteractionHistory(
    supabase: SupabaseClient,
    userId: string
  ): Promise<any[]> {
    const { data, error } = await supabase
      .from('user_interactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to fetch user interactions:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Apply mandatory filters based on user preferences
   */
  private applyMandatoryFilters(query: any, preferences: UserPreferences): any {
    // Cost sharing preference (hard filter)
    if (preferences.cost_sharing_preference && preferences.cost_sharing_preference !== 'any') {
      query = query.eq('cost_sharing', preferences.cost_sharing_preference === 'required');
    }

    // Clinical trial preference (hard filter)
    if (preferences.clinical_trial_preference && preferences.clinical_trial_preference !== 'any') {
      query = query.eq('clinical_trial_allowed', preferences.clinical_trial_preference === 'allowed');
    }

    // Data source filter
    if (preferences.data_sources && preferences.data_sources.length > 0) {
      query = query.in('data_source', preferences.data_sources);
    }

    return query;
  }

  /**
   * Score grants based on weighted criteria
   */
  private async scoreGrants(
    supabase: SupabaseClient,
    grants: Grant[],
    preferences: UserPreferences,
    interactionHistory: any[]
  ): Promise<ScoredGrant[]> {
    const scoredGrants: ScoredGrant[] = [];

    // Calculate dynamic weights based on user preferences
    const dynamicWeights = this.calculateDynamicWeights(preferences);

    // Get embedding similarities if available
    let embeddingSimilarities: Map<string, number> = new Map();
    if (preferences.project_description_embedding) {
      embeddingSimilarities = await this.getEmbeddingSimilarities(
        supabase,
        grants.map(g => g.id).filter((id): id is string => id !== undefined),
        preferences.project_description_embedding
      );
    }

    for (const grant of grants) {
      const scoreBreakdown = {
        embeddingScore: this.calculateEmbeddingScore(grant.id, embeddingSimilarities),
        fundingScore: this.calculateFundingScore(grant, preferences),
        deadlineScore: this.calculateDeadlineScore(grant, preferences),
        agencyScore: this.calculateAgencyScore(grant, preferences),
        categoryScore: this.calculateCategoryScore(grant, preferences),
        projectPeriodScore: this.calculateProjectPeriodScore(grant, preferences),
        freshnessBonusScore: this.calculateFreshnessScore(grant),
        interactionScore: this.calculateInteractionScore(grant, interactionHistory)
      };

      // Calculate weighted total score using dynamic weights
      const recommendationScore = 
        (scoreBreakdown.embeddingScore * dynamicWeights.embedding) +
        (scoreBreakdown.fundingScore * dynamicWeights.funding) +
        (scoreBreakdown.deadlineScore * dynamicWeights.deadline) +
        (scoreBreakdown.agencyScore * dynamicWeights.agency) +
        (scoreBreakdown.categoryScore * dynamicWeights.category) +
        (scoreBreakdown.projectPeriodScore * dynamicWeights.projectPeriod) +
        (scoreBreakdown.freshnessBonusScore * dynamicWeights.freshnessBonus) +
        (scoreBreakdown.interactionScore * dynamicWeights.interaction);

      // Debug logging for the first few grants
      if (scoredGrants.length < 3) {
        logger.info('Grant scoring debug', {
          grantId: grant.id,
          grantTitle: grant.title?.substring(0, 50),
          scoreBreakdown,
          dynamicWeights,
          finalScore: recommendationScore
        });
      }

      // Generate match reasons
      const matchReasons = this.generateMatchReasons(grant, preferences, scoreBreakdown);

      scoredGrants.push({
        ...grant,
        recommendationScore,
        scoreBreakdown,
        matchReasons
      });
    }

    return scoredGrants;
  }

  /**
   * Calculate dynamic weights based on user preferences
   * If user doesn't care about something (null/empty), redistribute its weight to other criteria
   */
  private calculateDynamicWeights(preferences: UserPreferences): typeof SCORING_WEIGHTS {
    const weights = { ...SCORING_WEIGHTS };
    let totalUnusedWeight = 0;
    let activeWeightCount = 0;

    // Identify unused criteria and calculate total unused weight
    const isEmbeddingUsed = preferences.project_description_query && preferences.project_description_query.trim().length > 0;
    const isFundingUsed = preferences.funding_min !== null || preferences.funding_max !== null;
    const isDeadlineUsed = preferences.deadline_range !== null;
    const isAgencyUsed = preferences.agencies && preferences.agencies.length > 0;
    const isProjectPeriodUsed = preferences.project_period_min_years !== null || preferences.project_period_max_years !== null;

    if (!isEmbeddingUsed) {
      totalUnusedWeight += SCORING_WEIGHTS.embedding;
      weights.embedding = 0;
    } else {
      activeWeightCount++;
    }

    if (!isFundingUsed) {
      totalUnusedWeight += SCORING_WEIGHTS.funding;
      weights.funding = 0;
    } else {
      activeWeightCount++;
    }

    if (!isDeadlineUsed) {
      totalUnusedWeight += SCORING_WEIGHTS.deadline;
      weights.deadline = 0;
    } else {
      activeWeightCount++;
    }

    if (!isAgencyUsed) {
      totalUnusedWeight += SCORING_WEIGHTS.agency;
      weights.agency = 0;
    } else {
      activeWeightCount++;
    }

    if (!isProjectPeriodUsed) {
      totalUnusedWeight += SCORING_WEIGHTS.projectPeriod;
      weights.projectPeriod = 0;
    } else {
      activeWeightCount++;
    }

    // Always keep these minimal weights active
    activeWeightCount += 3; // category, freshness, interaction

    // Redistribute unused weight proportionally among active criteria
    if (totalUnusedWeight > 0 && activeWeightCount > 0) {
      const redistributionFactor = (1 + totalUnusedWeight) / (1 - totalUnusedWeight);
      
      if (isEmbeddingUsed) weights.embedding *= redistributionFactor;
      if (isFundingUsed) weights.funding *= redistributionFactor;
      if (isDeadlineUsed) weights.deadline *= redistributionFactor;
      if (isAgencyUsed) weights.agency *= redistributionFactor;
      if (isProjectPeriodUsed) weights.projectPeriod *= redistributionFactor;
      
      // Also boost the always-active criteria
      weights.category *= redistributionFactor;
      weights.freshnessBonus *= redistributionFactor;
      weights.interaction *= redistributionFactor;
    }

    logger.info('Dynamic weights calculated', {
      originalUnusedWeight: totalUnusedWeight,
      finalWeights: weights,
      activePreferences: {
        embedding: isEmbeddingUsed,
        funding: isFundingUsed,
        deadline: isDeadlineUsed,
        agency: isAgencyUsed,
        projectPeriod: isProjectPeriodUsed
      }
    });

    return weights;
  }

  /**
   * Get embedding similarities for grants
   */
  private async getEmbeddingSimilarities(
    supabase: SupabaseClient,
    grantIds: string[],
    userEmbedding: number[]
  ): Promise<Map<string, number>> {
    try {
      // Try the vector-based similarity function first
      const { data, error } = await supabase.rpc('calculate_grant_similarities', {
        grant_ids: grantIds,
        query_embedding: userEmbedding
      });

      if (error) {
        // If the vector function fails, try the fallback function
        logger.warn('Vector similarity function failed, trying fallback:', error);
        
        const { data: fallbackData, error: fallbackError } = await supabase.rpc('calculate_grant_similarities_fallback', {
          grant_ids: grantIds,
          query_embedding: JSON.stringify(userEmbedding) // Convert to JSON to avoid type ambiguity
        });
        
        if (fallbackError) {
          logger.error('Both similarity functions failed:', fallbackError);
          return new Map();
        }
        
        const similarityMap = new Map<string, number>();
        (fallbackData || []).forEach((item: any) => {
          similarityMap.set(item.grant_id, item.similarity);
        });
        
        return similarityMap;
      }

      const similarityMap = new Map<string, number>();
      (data || []).forEach((item: any) => {
        similarityMap.set(item.grant_id, item.similarity);
      });

      return similarityMap;
    } catch (error) {
      logger.error('Failed to get embedding similarities:', error);
      // Return default similarities if the function doesn't exist
      const defaultMap = new Map<string, number>();
      grantIds.forEach(id => defaultMap.set(id, 0.5));
      return defaultMap;
    }
  }

  /**
   * Calculate embedding similarity score (0-1)
   * This now includes organization type matching as users should include it in their project description
   * Example: "As a university researcher..." or "Our nonprofit organization..."
   */
  private calculateEmbeddingScore(grantId: string | undefined, similarities: Map<string, number>): number {
    if (!grantId) return 0.4;
    const similarity = similarities.get(grantId);
    if (!similarity) return 0.4; // Lower default score if no embedding - embeddings are now critical
    
    // Convert cosine similarity to 0-1 score
    // Cosine similarity ranges from -1 to 1, but for text it's usually 0 to 1
    // Since embeddings now carry eligibility information, we need higher thresholds
    const normalizedScore = Math.max(0, Math.min(1, similarity));
    
    // Apply a slight boost to differentiate better matches
    // This helps surface grants that match both research AND organization type
    if (normalizedScore > 0.8) {
      return Math.min(1, normalizedScore * 1.1);
    }
    
    return normalizedScore;
  }

  /**
   * Calculate funding match score (0-1)
   * Grant seekers often apply for amounts slightly outside their ideal range
   */
  private calculateFundingScore(grant: Grant, preferences: UserPreferences): number {
    // No preference set - user doesn't care about funding amount, perfect score
    if (!preferences.funding_min && !preferences.funding_max) {
      return 1.0;
    }

    // No funding info - neutral but not great
    if (!grant.funding_amount_max && !grant.funding_amount_min) {
      return 0.4; // Lower score for unclear funding
    }

    const prefMin = preferences.funding_min || 0;
    const prefMax = preferences.funding_max || Number.MAX_SAFE_INTEGER;
    const grantMin = grant.funding_amount_min || 0;
    const grantMax = grant.funding_amount_max || Number.MAX_SAFE_INTEGER;

    // Perfect match - grant range is within user's preferred range
    if (grantMin >= prefMin && grantMax <= prefMax) {
      return 1.0;
    }

    // Grant is too small (max grant < min preference)
    if (grantMax < prefMin) {
      const ratio = grantMax / prefMin;
      // More forgiving - grants at 70% of min preference still get 0.5 score
      return Math.max(0, ratio * 0.7);
    }

    // Grant is too large (min grant > max preference)
    if (grantMin > prefMax) {
      const ratio = prefMax / grantMin;
      // Less forgiving for grants requiring more than user wants
      return Math.max(0, ratio * 0.5);
    }

    // Partial overlap - calculate how much of the grant range fits preferences
    const overlapMin = Math.max(grantMin, prefMin);
    const overlapMax = Math.min(grantMax, prefMax);
    const overlapRange = overlapMax - overlapMin;
    const prefRange = prefMax - prefMin || 1;
    
    // Score based on what percentage of user's preferred range is covered
    const coverageRatio = overlapRange / prefRange;
    
    // Boost score if grant offers flexibility (wide range)
    const grantRange = grantMax - grantMin;
    const flexibilityBonus = Math.min(0.1, grantRange / 1000000 * 0.1); // Up to 10% bonus
    
    return Math.min(1.0, coverageRatio + flexibilityBonus);
  }

  /**
   * Calculate deadline appropriateness score (0-1)
   * This is CRITICAL - users need adequate time to prepare quality applications
   */
  private calculateDeadlineScore(grant: Grant, preferences: UserPreferences): number {
    if (!grant.application_deadline) {
      return 0.2; // Very low score for grants without deadlines (risky)
    }

    const now = new Date();
    const deadline = new Date(grant.application_deadline);
    const daysUntilDeadline = Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Overdue grants should never be shown
    if (daysUntilDeadline < 0) {
      return 0;
    }

    // Scoring based on preparation time needed:
    // < 14 days: Too rushed (0-0.3)
    // 14-30 days: Challenging but doable (0.3-0.7)
    // 30-90 days: Optimal range (0.7-1.0)
    // 90-180 days: Good but not urgent (0.6-0.9)
    // > 180 days: Too far out (0.3-0.6)

    if (daysUntilDeadline < 14) {
      // Less than 2 weeks - very challenging
      return daysUntilDeadline / 14 * 0.3;
    } else if (daysUntilDeadline < 30) {
      // 2-4 weeks - challenging but doable
      return 0.3 + ((daysUntilDeadline - 14) / 16) * 0.4;
    } else if (daysUntilDeadline <= 90) {
      // 1-3 months - optimal range
      return 0.7 + ((90 - daysUntilDeadline) / 60) * 0.3;
    } else if (daysUntilDeadline <= 180) {
      // 3-6 months - good planning time
      return 0.9 - ((daysUntilDeadline - 90) / 90) * 0.3;
    } else {
      // More than 6 months - too far out
      const monthsOut = daysUntilDeadline / 30;
      return Math.max(0.3, 0.6 - (monthsOut - 6) * 0.05);
    }
  }

  /**
   * Calculate agency preference score (0-1)
   */
  private calculateAgencyScore(grant: Grant, preferences: UserPreferences): number {
    if (!preferences.agencies || preferences.agencies.length === 0) {
      return 1.0; // Perfect score if user doesn't care about specific agencies
    }

    // Primary agency match
    if (preferences.agencies.includes(grant.funding_organization_name)) {
      return 1.0;
    }

    return 0;
  }

  /**
   * Calculate category match score (0-1)
   */
  private calculateCategoryScore(grant: Grant, preferences: UserPreferences): number {
    let score = 0;
    let matches = 0;
    let totalChecks = 0;

    // Grant types
    if (preferences.grant_types && preferences.grant_types.length > 0 && grant.grant_type) {
      totalChecks++;
      if (preferences.grant_types.includes(grant.grant_type)) {
        matches++;
        score += 1;
      }
    }

    // Grant types
    if (preferences.grant_types && preferences.grant_types.length > 0 && grant.grant_type) {
      totalChecks++;
      if (preferences.grant_types.includes(grant.grant_type)) {
        matches++;
        score += 1;
      }
    }

    // Activity codes (closest to CFDA)
    if (preferences.activity_codes && preferences.activity_codes.length > 0 && grant.cfda_numbers) {
      totalChecks++;
      const matchingCodes = grant.cfda_numbers.some(cfda => 
        preferences.activity_codes!.includes(cfda)
      );
      if (matchingCodes) {
        matches++;
        score += 1;
      }
    }

    // Keywords
    if (preferences.keywords && preferences.keywords.length > 0) {
      totalChecks++;
      const description = `${grant.title} ${grant.summary || ''} ${grant.description || ''}`.toLowerCase();
      const matchingKeywords = preferences.keywords.filter(keyword => 
        description.includes(keyword.toLowerCase())
      );
      if (matchingKeywords.length > 0) {
        matches++;
        score += matchingKeywords.length / preferences.keywords.length;
      }
    }

    if (totalChecks === 0) return 0.5; // Neutral if no preferences
    return score / totalChecks;
  }


  /**
   * Calculate project period match score (0-1)
   */
  private calculateProjectPeriodScore(grant: Grant, preferences: UserPreferences): number {
    // If user doesn't care about project period, perfect score
    if (!preferences.project_period_min_years && !preferences.project_period_max_years) {
      return 1.0;
    }

    // Project period info is not in the new schema
    return 1.0; // Perfect score as this field doesn't exist in new schema

    const prefMin = preferences.project_period_min_years || 1;
    const prefMax = preferences.project_period_max_years || 10;
    // Project period is not in new schema
    return 1.0;

    // Removed project period logic as it doesn't exist in new schema
  }

  /**
   * Calculate freshness bonus score (0-1)
   */
  private calculateFreshnessScore(grant: Grant): number {
    if (!grant.posted_date) {
      return 0;
    }

    const now = new Date();
    const postDate = new Date(grant.posted_date);
    const daysSincePosted = Math.floor((now.getTime() - postDate.getTime()) / (1000 * 60 * 60 * 24));

    // Maximum bonus for grants posted within last 7 days
    if (daysSincePosted <= 7) {
      return 1.0;
    }

    // Declining bonus up to 30 days
    if (daysSincePosted <= 30) {
      return 1 - (daysSincePosted - 7) / 23;
    }

    // Minimal bonus for older grants
    if (daysSincePosted <= 90) {
      return 0.3;
    }

    return 0;
  }

  /**
   * Calculate interaction-based score (collaborative filtering)
   */
  private calculateInteractionScore(grant: Grant, interactionHistory: any[]): number {
    if (interactionHistory.length === 0) {
      return 0.5; // Neutral if no history
    }

    // Find similar grants in user's saved/applied history
    const positiveInteractions = interactionHistory.filter(i => 
      i.action === 'saved' || i.action === 'applied'
    );

    if (positiveInteractions.length === 0) {
      return 0.5;
    }

    // Simple similarity based on agency and category
    let similarityScore = 0;
    for (const interaction of positiveInteractions) {
      if (interaction.grant_agency_name === grant.funding_organization_name) {
        similarityScore += 0.5;
      }
      if (interaction.grant_type && grant.grant_type === interaction.grant_type) {
        similarityScore += 0.5;
      }
    }

    return Math.min(1, similarityScore / positiveInteractions.length);
  }

  /**
   * Generate human-readable match reasons
   * Prioritized by importance to grant seekers
   */
  private generateMatchReasons(
    grant: Grant,
    preferences: UserPreferences,
    scores: ScoredGrant['scoreBreakdown']
  ): string[] {
    const reasons: string[] = [];

    // MOST IMPORTANT: Research/Organization relevance (35% weight)
    if (scores.embeddingScore > 0.9) {
      reasons.push('🎯 Exceptionally relevant to your research and organization profile');
    } else if (scores.embeddingScore > 0.8) {
      reasons.push('🎯 Highly relevant to your project interests');
    } else if (scores.embeddingScore > 0.7) {
      reasons.push('🎯 Well-aligned with your research focus');
    } else if (scores.embeddingScore > 0.6) {
      reasons.push('🎯 Good match for your project description');
    }

    // CRITICAL: Deadline (25% weight)
    if (scores.deadlineScore >= 0.9) {
      const daysLeft = grant.application_deadline ? 
        Math.floor((new Date(grant.application_deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;
      reasons.push(`⏰ Perfect timing: ${daysLeft} days to prepare application`);
    } else if (scores.deadlineScore >= 0.7) {
      reasons.push('⏰ Good deadline window for quality preparation');
    } else if (scores.deadlineScore >= 0.3 && scores.deadlineScore < 0.7) {
      reasons.push('⏰ Tight deadline - quick action needed');
    }

    // IMPORTANT: Funding match (20% weight)
    if (scores.fundingScore >= 0.95) {
      reasons.push('💰 Funding perfectly matches your target range');
    } else if (scores.fundingScore >= 0.8) {
      reasons.push('💰 Funding amount within your preferred range');
    } else if (scores.fundingScore >= 0.6) {
      reasons.push('💰 Funding amount reasonably close to your range');
    }

    // HELPFUL: Category match (10% weight)
    if (scores.categoryScore >= 0.8) {
      reasons.push('📋 Strong match with your research categories');
    } else if (scores.categoryScore >= 0.6) {
      reasons.push('📋 Good category alignment');
    }

    // NICE TO HAVE: Agency preference (5% weight)
    if (scores.agencyScore === 1.0) {
      reasons.push(`🏛️ From preferred agency: ${grant.funding_organization_name}`);
    }

    // MINOR: Freshness (3% weight)
    if (scores.freshnessBonusScore === 1.0) {
      reasons.push('🆕 Recently posted opportunity');
    }

    // If no specific reasons, provide general one based on total score
    if (reasons.length === 0) {
      // Calculate the total score from the breakdown to determine the message
      const totalScore = 
        (scores.embeddingScore * SCORING_WEIGHTS.embedding) +
        (scores.fundingScore * SCORING_WEIGHTS.funding) +
        (scores.deadlineScore * SCORING_WEIGHTS.deadline) +
        (scores.agencyScore * SCORING_WEIGHTS.agency) +
        (scores.categoryScore * SCORING_WEIGHTS.category) +
        (scores.projectPeriodScore * SCORING_WEIGHTS.projectPeriod) +
        (scores.freshnessBonusScore * SCORING_WEIGHTS.freshnessBonus) +
        (scores.interactionScore * SCORING_WEIGHTS.interaction);
      
      if (totalScore >= 0.7) {
        reasons.push('Recommended based on multiple matching factors');
      } else if (totalScore >= 0.5) {
        reasons.push('Moderate match with your profile');
      } else {
        reasons.push('Potential opportunity to explore');
      }
    }

    // Add note about checking eligibility
    if (grant.eligibility_criteria) {
      reasons.push(`📝 Check eligibility requirements`);
    }

    return reasons;
  }
}

// Export singleton instance
export default new WeightedRecommendationService();