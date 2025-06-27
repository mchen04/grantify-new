import axios from 'axios';
import { BaseApiClient, ApiSyncResult } from '../base/BaseApiClient';
import { GrantNormalizer, NormalizedGrantData, GrantKeyword, GrantCategory } from '../base/GrantNormalizer';

import logger from '../../../utils/logger';
export class EuFundingApiClient extends BaseApiClient {
  constructor() {
    super({
      dataSourceName: 'eu_funding_portal',
      baseUrl: 'https://api.tech.ec.europa.eu/search-api/prod/rest/search',
      authType: 'api_key',
      authCredentials: {
        api_key: 'SEDIA',
        api_key_header: 'X-API-Key'
      }
    });
  }

  async fetchGrants(params: any = {}): Promise<any[]> {
    try {
      // Check rate limit
      if (!await this.checkRateLimit()) {
        throw new Error('Rate limit exceeded');
      }

      const searchParams = {
        apiKey: 'SEDIA',
        text: params.text || '*',
        pageNumber: params.pageNumber || 1,
        pageSize: params.pageSize || 50,
        sortBy: params.sortBy || 'relevance',
        // Filter for grants/funding opportunities
        type: 'FUNDING',
        status: params.status || 'OPEN'
      };

      const response = await axios.get(this.config.baseUrl, {
        params: searchParams,
        headers: this.getAuthHeaders(),
        timeout: 30000
      });

      await this.incrementRateLimit();

      return response.data.results || [];
    } catch (error: any) {
      logger.error('Failed to fetch EU grants', error);
      throw error;
    }
  }

  private extractFundingAmount(rawGrant: any): number | undefined {
    // Try multiple sources for funding information
    
    // 1. Check cftEstimatedTotalProcedureValue (most common for tenders)
    if (rawGrant.metadata?.cftEstimatedTotalProcedureValue?.[0]) {
      return GrantNormalizer.normalizeAmount(rawGrant.metadata.cftEstimatedTotalProcedureValue[0]);
    }
    
    // 2. Check budgetOverview for grants (contains structured budget data)
    if (rawGrant.metadata?.budgetOverview?.[0]) {
      try {
        const budgetData = JSON.parse(rawGrant.metadata.budgetOverview[0]);
        // Sum all budget years for total funding
        let totalBudget = 0;
        for (const [key, actions] of Object.entries(budgetData.budgetTopicActionMap)) {
          if (Array.isArray(actions)) {
            actions.forEach((action: any) => {
              if (action.budgetYearMap) {
                Object.values(action.budgetYearMap).forEach((amount: any) => {
                  totalBudget += Number(amount) || 0;
                });
              }
            });
          }
        }
        if (totalBudget > 0) {
          return totalBudget;
        }
      } catch (e) {
        // Failed to parse budget overview
      }
    }
    
    // 3. Check additionalInfos for budget mentions
    if (rawGrant.metadata?.additionalInfos?.[0]) {
      try {
        const infoData = JSON.parse(rawGrant.metadata.additionalInfos[0]);
        const budgetMatch = infoData.staticAdditionalInfo?.match(/EUR\s*([\d,]+(?:\.\d+)?)\s*(?:million|thousand)?/i);
        if (budgetMatch) {
          let amount = parseFloat(budgetMatch[1].replace(/,/g, ''));
          if (infoData.staticAdditionalInfo.toLowerCase().includes('million')) {
            amount *= 1000000;
          } else if (infoData.staticAdditionalInfo.toLowerCase().includes('thousand')) {
            amount *= 1000;
          }
          return amount;
        }
      } catch (e) {
        // Failed to parse additional infos
      }
    }
    
    return undefined;
  }

  async transformGrant(rawGrant: any): Promise<NormalizedGrantData> {
    const grant = {
      data_source_id: this.dataSourceId!,
      source_identifier: rawGrant.identifier || rawGrant.id,
      source_url: rawGrant.url || `https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/topic-details/${rawGrant.identifier}`,
      title: rawGrant.title || rawGrant.topicTitle,
      status: this.mapStatus(rawGrant.status),
      
      // Organization
      funding_organization_name: 'European Commission',
      funding_organization_code: rawGrant.programmeName,
      
      // Funding
      currency: 'EUR',
      funding_amount_min: undefined, // Usually not provided separately
      funding_amount_max: this.extractFundingAmount(rawGrant),
      total_funding_available: this.extractFundingAmount(rawGrant),
      
      // Dates
      posted_date: GrantNormalizer.normalizeDate(rawGrant.openingDate),
      application_deadline: GrantNormalizer.normalizeDate(rawGrant.deadlineDate || rawGrant.submissionDeadline),
      
      // Classification
      grant_type: rawGrant.type || 'Research and Innovation',
      funding_instrument: rawGrant.fundingScheme,
      
      // Raw data
      raw_data: rawGrant
    };

    // Details
    const details = {
      description: rawGrant.description || rawGrant.topicDescription,
      abstract: rawGrant.callAbstract,
      expected_results: rawGrant.expectedImpact,
      additional_information: {
        call_identifier: rawGrant.callIdentifier,
        topic_identifier: rawGrant.topicIdentifier,
        keywords: rawGrant.keywords,
        programme: rawGrant.programmeName
      }
    };

    // Categories
    const categories: GrantCategory[] = [];
    if (rawGrant.destinationGroup) {
      categories.push({
        category_type: 'theme' as const,
        category_name: rawGrant.destinationGroup
      });
    }
    if (rawGrant.programmeName) {
      categories.push({
        category_type: 'topic' as const,
        category_name: rawGrant.programmeName
      });
    }

    // Locations - EU grants are typically multi-country
    const locations = [];
    if (rawGrant.countriesEligible) {
      rawGrant.countriesEligible.forEach((country: string) => {
        locations.push({
          location_type: 'eligible' as const,
          country_code: country
        });
      });
    } else {
      // Default EU member states
      locations.push({
        location_type: 'eligible' as const,
        region: 'European Union',
        geographic_description: 'Open to EU member states and associated countries'
      });
    }

    // Keywords
    const keywords: GrantKeyword[] = [];
    if (rawGrant.keywords) {
      const keywordArray = Array.isArray(rawGrant.keywords) 
        ? rawGrant.keywords 
        : rawGrant.keywords.split(',');
      
      keywordArray.forEach((keyword: string) => {
        keywords.push({
          keyword: keyword.trim(),
          keyword_source: 'api_provided'
        });
      });
    }

    return {
      grant,
      details,
      categories,
      locations,
      keywords
    };
  }

  private mapStatus(status: string): NormalizedGrantData['grant']['status'] {
    const statusMap: Record<string, NormalizedGrantData['grant']['status']> = {
      'OPEN': 'open',
      'FORTHCOMING': 'forecasted',
      'CLOSED': 'closed',
      'AWARDED': 'awarded'
    };
    
    return statusMap[status?.toUpperCase()] || 'active';
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
      const pageSize = 50;
      let currentPage = options.fullSync ? 1 : lastPage;
      let hasMore = true;

      while (hasMore && currentPage <= 100) { // Limit to 100 pages for safety
        try {
          logger.info(`Fetching EU grants page ${currentPage}`);
          
          const grants = await this.fetchGrants({
            pageNumber: currentPage,
            pageSize: pageSize,
            ...options.filters
          });

          if (!grants || grants.length === 0) {
            hasMore = false;
            break;
          }

          result.recordsFetched += grants.length;

          // Process each grant
          for (const rawGrant of grants) {
            try {
              const normalizedData = await this.transformGrant(rawGrant);
              
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
              result.errors.push(`Grant ${rawGrant.identifier}: ${error.message}`);
              logger.error(`Failed to process EU grant ${rawGrant.identifier}`, error);
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
          if (grants.length < pageSize) {
            hasMore = false;
          }

        } catch (error: any) {
          result.errors.push(`Fetch error at page ${currentPage}: ${error.message}`);
          logger.error('EU sync batch failed', error);
          
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
      logger.error('EU sync failed', error);
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
          grant_id: grantId,
          language_code: 'en'
        });
    }

    // Insert categories
    if (data.categories && data.categories.length > 0) {
      await this.supabase
        .from('grant_categories')
        .insert(data.categories.map(c => ({ ...c, grant_id: grantId })));
    }

    // Insert locations
    if (data.locations && data.locations.length > 0) {
      await this.supabase
        .from('grant_locations')
        .insert(data.locations.map(l => ({ ...l, grant_id: grantId })));
    }

    // Insert keywords
    if (data.keywords && data.keywords.length > 0) {
      await this.supabase
        .from('grant_keywords')
        .insert(data.keywords.map(k => ({ ...k, grant_id: grantId })));
    }
  }
}