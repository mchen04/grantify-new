import axios from 'axios';
import { BaseApiClient, ApiSyncResult } from '../base/BaseApiClient';
import { GrantNormalizer, NormalizedGrantData, GrantCategory, GrantKeyword, GrantContact, GrantEligibility } from '../base/GrantNormalizer';

import logger from '../../../utils/logger';
export class UsaspendingApiClient extends BaseApiClient {
  constructor() {
    super({
      dataSourceName: 'usaspending',
      baseUrl: 'https://api.usaspending.gov/api/v2/search/spending_by_award/',
      authType: 'none'
    });
  }

  async fetchGrants(params: any = {}): Promise<any[]> {
    try {
      // Check rate limit
      if (!await this.checkRateLimit()) {
        throw new Error('Rate limit exceeded');
      }

      // USAspending uses POST for search
      const searchBody = {
        filters: {
          award_type_codes: params.award_type_codes || ['02', '03', '04', '05'], // Grant types
          time_period: params.time_period || [
            {
              start_date: params.start_date || this.getOneYearAgo(),
              end_date: params.end_date || this.getToday()
            }
          ],
          ...params.filters
        },
        fields: [
          'Award ID', 'Recipient Name', 'Award Amount', 'Total Outlays',
          'Start Date', 'End Date', 'Award Type', 'Awarding Agency',
          'Awarding Sub Agency', 'Contract Award Type', 'recipient_id',
          'prime_award_types', 'Description', 'cfda_number', 'cfda_title'
        ],
        page: params.page || 1,
        limit: params.limit || 100,
        sort: params.sort || 'Award Amount',
        order: params.order || 'desc'
      };

      const response = await axios.post(this.config.baseUrl, searchBody, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      await this.incrementRateLimit();

      return response.data?.results || [];
    } catch (error: any) {
      logger.error('Failed to fetch USAspending awards', error);
      throw error;
    }
  }

  async transformGrant(rawAward: any): Promise<NormalizedGrantData> {
    const grant = {
      data_source_id: this.dataSourceId!,
      source_identifier: rawAward['Award ID'] || rawAward.award_id,
      source_url: `https://www.usaspending.gov/award/${rawAward['Award ID']}`,
      title: rawAward['Description'] || rawAward['cfda_title'] || 'Federal Grant Award',
      status: 'awarded' as const, // USAspending shows awarded grants
      
      // Organization
      funding_organization_name: rawAward['Awarding Agency'] || rawAward.awarding_agency,
      funding_organization_code: rawAward['Awarding Sub Agency'] || rawAward.awarding_sub_agency,
      
      // Funding
      currency: 'USD',
      funding_amount_min: GrantNormalizer.normalizeAmount(rawAward['Award Amount']),
      funding_amount_max: GrantNormalizer.normalizeAmount(rawAward['Award Amount']),
      total_funding_available: GrantNormalizer.normalizeAmount(rawAward['Total Outlays']),
      
      // Dates
      start_date: GrantNormalizer.normalizeDate(rawAward['Start Date']),
      end_date: GrantNormalizer.normalizeDate(rawAward['End Date']),
      
      // Classification
      grant_type: this.mapAwardType(rawAward['Award Type']),
      funding_instrument: rawAward['Award Type'],
      activity_code: rawAward['cfda_number'],
      
      // Raw data
      raw_data: rawAward
    };

    // Details
    const details = {
      description: rawAward['Description'],
      additional_information: {
        award_id: rawAward['Award ID'],
        cfda_number: rawAward['cfda_number'],
        cfda_title: rawAward['cfda_title'],
        award_type: rawAward['Award Type'],
        total_outlays: rawAward['Total Outlays']
      }
    };

    // Recipients
    const recipients = [];
    if (rawAward['Recipient Name']) {
      recipients.push({
        recipient_name: rawAward['Recipient Name'],
        award_amount: GrantNormalizer.normalizeAmount(rawAward['Award Amount']),
        project_start_date: GrantNormalizer.normalizeDate(rawAward['Start Date']),
        project_end_date: GrantNormalizer.normalizeDate(rawAward['End Date']),
        location_country: 'US'
      });
    }

    // Categories
    const categories: GrantCategory[] = [];
    
    // CFDA category
    if (rawAward['cfda_number']) {
      categories.push({
        category_type: 'cfda' as const,
        category_code: rawAward['cfda_number'],
        category_name: rawAward['cfda_title'] || `CFDA ${rawAward['cfda_number']}`
      });
    }

    // Agency category
    if (rawAward['Awarding Agency']) {
      categories.push({
        category_type: 'topic' as const,
        category_name: rawAward['Awarding Agency']
      });
    }

    // Keywords
    const keywords = GrantNormalizer.extractKeywords(
      `${grant.title} ${details.description}`,
      'extracted'
    );

    // Extract CFDA from description if not in field
    if (!rawAward['cfda_number'] && details.description) {
      const cfdaNumber = GrantNormalizer.extractCFDANumber(details.description);
      if (cfdaNumber) {
        grant.activity_code = cfdaNumber;
        categories.push({
          category_type: 'cfda' as const,
          category_code: cfdaNumber,
          category_name: `CFDA ${cfdaNumber}`
        });
      }
    }

    return {
      grant,
      details,
      categories,
      keywords
    };
  }

  private mapAwardType(type: string): string {
    const typeMap: Record<string, string> = {
      '02': 'Block Grant',
      '03': 'Formula Grant',
      '04': 'Project Grant',
      '05': 'Cooperative Agreement',
      '06': 'Direct Payment',
      '07': 'Direct Loan',
      '08': 'Guaranteed/Insured Loan',
      '09': 'Insurance',
      '10': 'Direct Payment with Unrestricted Use',
      '11': 'Other Financial Assistance'
    };
    
    return typeMap[type] || 'Grant';
  }

  private getOneYearAgo(): string {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 1);
    return date.toISOString().split('T')[0];
  }

  private getToday(): string {
    return new Date().toISOString().split('T')[0];
  }

  async sync(options: any = {}): Promise<ApiSyncResult> {
    const result: ApiSyncResult = {
      success: false,
      recordsFetched: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsFailed: 0,
      errors: []
    };

    try {
      await this.initialize();
      await this.startSyncLog(options.syncType);

      // Get last sync state
      const lastPage = await this.getState('last_page') || 1;
      const limit = 100;
      let currentPage = options.fullSync ? 1 : lastPage;
      let hasMore = true;

      // USAspending has massive amounts of data, so limit scope
      const maxPages = options.maxPages || 50;

      while (hasMore && currentPage <= maxPages) {
        try {
          logger.info(`Fetching USAspending awards page ${currentPage}`);
          
          const awards = await this.fetchGrants({
            page: currentPage,
            limit: limit,
            ...options
          });

          if (!awards || awards.length === 0) {
            hasMore = false;
            break;
          }

          result.recordsFetched += awards.length;

          // Process each award
          for (const rawAward of awards) {
            try {
              const normalizedData = await this.transformGrant(rawAward);
              
              // Check if grant exists
              const { data: existingGrant } = await this.supabase
                .from('grants')
                .select('id')
                .eq('data_source_id', this.dataSourceId)
                .eq('source_identifier', normalizedData.grant.source_identifier)
                .single();

              let grantId;
              
              if (existingGrant) {
                // Update existing grant
                const { data: updated } = await this.supabase
                  .from('grants')
                  .update(normalizedData.grant)
                  .eq('id', existingGrant.id)
                  .select('id')
                  .single();
                
                grantId = updated?.id;
                result.recordsUpdated++;
              } else {
                // Insert new grant
                const { data: inserted } = await this.supabase
                  .from('grants')
                  .insert(normalizedData.grant)
                  .select('id')
                  .single();
                
                grantId = inserted?.id;
                result.recordsCreated++;
              }

              // Insert related data
              if (grantId) {
                await this.insertRelatedData(grantId, normalizedData);
              }

            } catch (error: any) {
              result.recordsFailed++;
              result.errors.push(`Award ${rawAward['Award ID']}: ${error.message}`);
              logger.error(`Failed to process USAspending award ${rawAward['Award ID']}`, error);
            }
          }

          // Update state
          currentPage++;
          await this.saveState('last_page', currentPage);
          
          // Update sync log progress
          await this.updateSyncLog({
            status: 'in_progress',
            records_fetched: result.recordsFetched,
            records_created: result.recordsCreated,
            records_updated: result.recordsUpdated,
            records_failed: result.recordsFailed
          });

          // Check if we should continue
          if (awards.length < limit) {
            hasMore = false;
          }

        } catch (error: any) {
          result.errors.push(`Fetch error at page ${currentPage}: ${error.message}`);
          logger.error('USAspending sync batch failed', error);
          
          if (result.errors.length > 10) {
            throw new Error('Too many errors, aborting sync');
          }
        }
      }

      // Reset page if full sync completed
      if (options.fullSync && !result.errors.length) {
        await this.saveState('last_page', 1);
      }

      result.success = result.errors.length === 0;
      
    } catch (error: any) {
      result.errors.push(error.message);
      logger.error('USAspending sync failed', error);
    } finally {
      await this.completeSyncLog(result);
    }

    return result;
  }

  private async insertRelatedData(grantId: string, data: NormalizedGrantData): Promise<void> {
    // Insert details
    if (data.details) {
      await this.supabase
        .from('grant_details')
        .upsert({
          ...data.details,
          grant_id: grantId
        });
    }

    // Insert categories
    if (data.categories && data.categories.length > 0) {
      await this.supabase
        .from('grant_categories')
        .insert(data.categories.map(c => ({ ...c, grant_id: grantId })));
    }

    // Insert keywords
    if (data.keywords && data.keywords.length > 0) {
      await this.supabase
        .from('grant_keywords')
        .insert(data.keywords.map(k => ({ ...k, grant_id: grantId })));
    }

    // Insert recipients
//     if (data.recipients && data.recipients.length > 0) {
//       await this.supabase
//         .from('grant_recipients')
//         .insert(data.recipients.map(r => ({ ...r, grant_id: grantId })));
//     }
  }
}