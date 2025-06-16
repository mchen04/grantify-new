import { supabaseClient } from '../../db/supabaseClient';
import logger from '../../utils/logger';

/**
 * Analytics Service
 * Provides access to materialized views and analytics data
 */
export class AnalyticsService {
  
  /**
   * Get overall grant statistics
   */
  static async getGrantStatistics() {
    try {
      const { data, error } = await supabaseClient
        .from('grant_statistics')
        .select('*')
        .single();

      if (error) {
        logger.error('Error fetching grant statistics:', error);
        throw error;
      }

      return {
        success: true,
        data: {
          totalGrants: data.total_grants,
          activeGrants: data.active_grants,
          expiredGrants: data.expired_grants,
          noDeadlineGrants: data.no_deadline_grants,
          avgFunding: data.avg_funding,
          totalAvailableFunding: data.total_available_funding,
          minFunding: data.min_funding,
          maxFunding: data.max_funding,
          uniqueAgencies: data.unique_agencies,
          uniqueCategories: data.unique_categories,
          lastUpdated: data.last_updated
        }
      };
    } catch (error) {
      logger.error('Analytics service error - grant statistics:', error);
      throw error;
    }
  }

  /**
   * Get agency analytics
   */
  static async getAgencyAnalytics(limit = 20) {
    try {
      const { data, error } = await supabaseClient
        .from('agency_analytics')
        .select('*')
        .order('total_grants', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error('Error fetching agency analytics:', error);
        throw error;
      }

      return {
        success: true,
        data: data.map(agency => ({
          agencyName: agency.agency_name,
          agencySubdivision: agency.agency_subdivision,
          totalGrants: agency.total_grants,
          activeGrants: agency.active_grants,
          avgFundingPerGrant: agency.avg_funding_per_grant,
          totalFundingAvailable: agency.total_funding_available,
          avgAwardsPerGrant: agency.avg_awards_per_grant,
          avgApplicationWindowDays: agency.avg_application_window_days,
          commonCategories: agency.common_categories,
          usersSaved: agency.users_saved,
          usersApplied: agency.users_applied,
          lastUpdated: agency.last_updated
        }))
      };
    } catch (error) {
      logger.error('Analytics service error - agency analytics:', error);
      throw error;
    }
  }

  /**
   * Get user interaction analytics
   */
  static async getUserInteractionAnalytics(days = 30) {
    try {
      const { data, error } = await supabaseClient
        .from('user_interaction_analytics')
        .select('*')
        .gte('activity_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
        .order('activity_date', { ascending: false });

      if (error) {
        logger.error('Error fetching user interaction analytics:', error);
        throw error;
      }

      // Calculate totals
      const totals = data.reduce((acc, day) => ({
        totalActiveUsers: Math.max(acc.totalActiveUsers, day.daily_active_users || 0),
        totalInteractions: acc.totalInteractions + (day.daily_interactions || 0),
        totalSaves: acc.totalSaves + (day.total_saves || 0),
        totalApplications: acc.totalApplications + (day.total_applications || 0),
        totalIgnores: acc.totalIgnores + (day.total_ignores || 0)
      }), {
        totalActiveUsers: 0,
        totalInteractions: 0,
        totalSaves: 0,
        totalApplications: 0,
        totalIgnores: 0
      });

      return {
        success: true,
        data: {
          dailyData: data.map(day => ({
            date: day.activity_date,
            activeUsers: day.daily_active_users,
            interactions: day.daily_interactions,
            saves: day.total_saves,
            applications: day.total_applications,
            ignores: day.total_ignores,
            avgSavesPerUser: day.avg_saves_per_user,
            avgApplicationsPerUser: day.avg_applications_per_user,
            saveToApplyConversion: day.save_to_apply_conversion_rate
          })),
          summary: totals
        }
      };
    } catch (error) {
      logger.error('Analytics service error - user interaction analytics:', error);
      throw error;
    }
  }

  /**
   * Get top performing grants
   */
  static async getTopPerformingGrants(limit = 10) {
    try {
      const { data, error } = await supabaseClient
        .from('grant_performance_analytics')
        .select('*')
        .order('interest_score_percentage', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error('Error fetching grant performance analytics:', error);
        throw error;
      }

      return {
        success: true,
        data: data.map(grant => ({
          id: grant.id,
          title: grant.title,
          agencyName: grant.agency_name,
          awardCeiling: grant.award_ceiling,
          closeDate: grant.close_date,
          totalInteractions: grant.total_interactions,
          timesSaved: grant.times_saved,
          timesApplied: grant.times_applied,
          timesIgnored: grant.times_ignored,
          dailyEngagementRate: grant.daily_engagement_rate,
          interestScore: grant.interest_score_percentage,
          interactionsPer1kFunding: grant.interactions_per_1k_funding,
          daysUntilClose: grant.days_until_close
        }))
      };
    } catch (error) {
      logger.error('Analytics service error - grant performance analytics:', error);
      throw error;
    }
  }

  /**
   * Get system performance metrics
   */
  static async getSystemMetrics() {
    try {
      const { data, error } = await supabaseClient
        .from('system_performance_metrics')
        .select('*')
        .order('snapshot_time', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        logger.error('Error fetching system metrics:', error);
        throw error;
      }

      return {
        success: true,
        data: {
          totalGrants: data.total_grants_count,
          totalUsers: data.total_users_count,
          totalInteractions: data.total_interactions_count,
          interactionsLast24h: data.interactions_last_24h,
          interactionsLastHour: data.interactions_last_hour,
          latestGrantAdded: data.latest_grant_added,
          latestInteraction: data.latest_interaction,
          activeOpportunities: data.active_opportunities,
          weeklyActiveUsers: data.weekly_active_users,
          snapshotTime: data.snapshot_time
        }
      };
    } catch (error) {
      logger.error('Analytics service error - system metrics:', error);
      throw error;
    }
  }

  /**
   * Get search analytics for trending patterns
   */
  static async getSearchAnalytics(hours = 24) {
    try {
      const { data, error } = await supabaseClient
        .from('search_analytics')
        .select('*')
        .gte('hour_bucket', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
        .order('hour_bucket', { ascending: false });

      if (error) {
        logger.error('Error fetching search analytics:', error);
        throw error;
      }

      return {
        success: true,
        data: data.map(item => ({
          hourBucket: item.hour_bucket,
          dayBucket: item.day_bucket,
          agencyName: item.agency_name,
          categories: item.categories,
          uniqueUsersInteracting: item.unique_users_interacting,
          savesInPeriod: item.saves_in_period,
          applicationsInPeriod: item.applications_in_period,
          topGrantTitles: item.top_grant_titles?.slice(0, 3) // Top 3 only
        }))
      };
    } catch (error) {
      logger.error('Analytics service error - search analytics:', error);
      throw error;
    }
  }

  /**
   * Refresh all materialized views
   */
  static async refreshAnalyticsViews() {
    try {
      const { data, error } = await supabaseClient
        .rpc('refresh_analytics_views');

      if (error) {
        logger.error('Error refreshing analytics views:', error);
        throw error;
      }

      logger.info('Analytics views refreshed successfully');
      return { success: true, message: 'Analytics views refreshed' };
    } catch (error) {
      logger.error('Analytics service error - refresh views:', error);
      throw error;
    }
  }

  /**
   * Get analytics dashboard data (combined view)
   */
  static async getDashboardAnalytics() {
    try {
      const [
        grantStats,
        topAgencies,
        userInteractions,
        topGrants,
        systemMetrics
      ] = await Promise.all([
        this.getGrantStatistics(),
        this.getAgencyAnalytics(5),
        this.getUserInteractionAnalytics(7),
        this.getTopPerformingGrants(5),
        this.getSystemMetrics()
      ]);

      return {
        success: true,
        data: {
          grantStatistics: grantStats.data,
          topAgencies: topAgencies.data,
          userInteractions: userInteractions.data,
          topPerformingGrants: topGrants.data,
          systemMetrics: systemMetrics.data,
          generatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('Analytics service error - dashboard analytics:', error);
      throw error;
    }
  }
}

export default AnalyticsService;