import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import { BaseApiClient, ApiSyncResult } from '../base/BaseApiClient';
import { GrantNormalizer, NormalizedGrantData, GrantCategory, GrantKeyword, GrantContact, GrantEligibility } from '../base/GrantNormalizer';
import logger from '../../../utils/logger';

export class GrantsGovApiClient extends BaseApiClient {
  constructor() {
    super({
      dataSourceName: 'grants_gov',
      baseUrl: 'https://api.grants.gov/v1/api/search2',
      authType: 'none'
    });
  }

  async fetchGrants(params: any = {}): Promise<any[]> {
    const searchParams = {
      oppStatuses: params.oppStatuses || 'posted',
      startRecordNum: params.startRecordNum || params.offset || 0,
      rows: params.rows || params.size || 100,
      sortBy: params.sortBy || 'openDate:desc',
      keyword: params.keyword || '',
      fundingCategories: params.fundingCategories || [],
      fundingInstruments: params.fundingInstruments || [],
      eligibilities: params.eligibilities || [],
      agencies: params.agencies || [],
      ...params
    };

    try {
      // Check rate limit
      if (!await this.checkRateLimit()) {
        throw new Error('Rate limit exceeded');
      }

      const response = await axios.post(this.config.baseUrl, searchParams, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      await this.incrementRateLimit();

      // Extract grants from the response
      const data = response.data;
      if (data && data.data && data.data.oppHits) {
        return data.data.oppHits;
      }

      return [];
    } catch (error: any) {
      logger.error('Failed to fetch grants', error);
      throw error;
    }
  }

  async transformGrant(rawGrant: any): Promise<NormalizedGrantData> {
    const grant = {
      data_source_id: this.dataSourceId!,
      source_identifier: rawGrant.id || rawGrant.number,
      source_url: `https://www.grants.gov/search-results-detail/${rawGrant.id || rawGrant.number}`,
      title: rawGrant.title,
      status: GrantNormalizer.normalizeStatus(rawGrant.oppStatus || 'posted'),
      
      // Organization
      funding_organization_name: rawGrant.agency,
      funding_organization_code: rawGrant.agencyCode,
      
      // Funding - Grants.gov API doesn't provide these fields in search response
      currency: 'USD',
      funding_amount_min: undefined, // Field not available in API
      funding_amount_max: undefined, // Field not available in API
      total_funding_available: undefined, // Field not available in API
      expected_awards_count: undefined, // Field not available in API
      
      // Dates
      posted_date: GrantNormalizer.normalizeDate(rawGrant.openDate),
      application_deadline: GrantNormalizer.normalizeDate(rawGrant.closeDate),
      last_updated_date: GrantNormalizer.normalizeDate(rawGrant.modifiedDate || rawGrant.lastUpdatedDate),
      
      // Classification
      grant_type: rawGrant.docType || 'Grant',
      funding_instrument: this.mapFundingInstrument(rawGrant.fundingInstruments),
      activity_code: rawGrant.cfdaList && rawGrant.cfdaList.length > 0 ? rawGrant.cfdaList[0] : null,
      
      // Raw data
      raw_data: rawGrant
    };

    // Details
    const details = {
      description: rawGrant.description || rawGrant.synopsis || '',
      additional_information: {
        opportunity_number: rawGrant.number,
        document_type: rawGrant.docType,
        cfda_list: rawGrant.cfdaList || [],
        funding_categories: rawGrant.fundingCategories || [],
        funding_instruments: rawGrant.fundingInstruments || []
      }
    };

    // Categories
    const categories: GrantCategory[] = [];
    
    // Add funding categories
    if (rawGrant.fundingCategories && Array.isArray(rawGrant.fundingCategories)) {
      rawGrant.fundingCategories.forEach((cat: string) => {
        categories.push({
          category_type: 'theme' as const,
          category_name: cat
        });
      });
    }
    
    // Add CFDA categories
    if (rawGrant.cfdaList && Array.isArray(rawGrant.cfdaList)) {
      rawGrant.cfdaList.forEach((cfda: string) => {
        categories.push({
          category_type: 'cfda' as const,
          category_code: cfda,
          category_name: `CFDA ${cfda}`
        });
      });
    }

    // Eligibility
    const eligibility: any[] = [];
    if (rawGrant.eligibilities) {
      const eligibilityArray = Array.isArray(rawGrant.eligibilities) 
        ? rawGrant.eligibilities 
        : [rawGrant.eligibilities];
      
      eligibilityArray.forEach((elig: any) => {
        eligibility.push({
          eligibility_type: 'organization_type' as const,
          eligibility_code: elig.code,
          eligibility_value: elig.description || elig.code,
          is_required: true
        });
      });
    }

    // Keywords
    const keywords = GrantNormalizer.extractKeywords(
      `${grant.title} ${details.description}`,
      'extracted'
    );

    // Contacts
    const contacts: GrantContact[] = [];
    if (rawGrant.officeContactEmail) {
      contacts.push({
        contact_type: 'general' as const,
        email: rawGrant.officeContactEmail,
        phone: rawGrant.officeContactPhone,
        organization: rawGrant.agencyName
      });
    }

    return {
      grant,
      details,
      categories,
      eligibility,
      keywords,
      contacts
    };
  }

  private mapFundingInstrument(types: any): string {
    if (!types) return 'Grant';
    
    const typeArray = Array.isArray(types) ? types : [types];
    const instruments = typeArray.map((t: any) => {
      const code = t.code || t;
      const map: Record<string, string> = {
        'G': 'Grant',
        'CA': 'Cooperative Agreement',
        'PC': 'Procurement Contract',
        'O': 'Other'
      };
      return map[code] || code;
    });
    
    return instruments.join(', ');
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
      const lastOffset = await this.getState('last_offset') || 0;
      const pageSize = 100;
      let currentOffset = options.fullSync ? 0 : lastOffset;
      let hasMore = true;

      while (hasMore) {
        try {
          logger.info(`Fetching grants from offset ${currentOffset}`);
          
          const grants = await this.fetchGrants({
            rows: pageSize,
            startRecordNum: currentOffset,
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
                .select('id, last_updated_date')
                .eq('data_source_id', this.dataSourceId)
                .eq('source_identifier', normalizedData.grant.source_identifier)
                .single();

              let grantId;
              
              if (existingGrant) {
                // Update if changed
                if (normalizedData.grant.last_updated_date && 
                    existingGrant.last_updated_date !== normalizedData.grant.last_updated_date) {
                  const { data: updated } = await this.supabase
                    .from('grants')
                    .update(normalizedData.grant)
                    .eq('id', existingGrant.id)
                    .select('id')
                    .single();
                  
                  grantId = updated?.id;
                  result.recordsUpdated++;
                } else {
                  grantId = existingGrant.id;
                }
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

              // Insert related data if we have a grant ID
              if (grantId) {
                // Insert details
                if (normalizedData.details) {
                  await this.supabase
                    .from('grant_details')
                    .upsert({
                      ...normalizedData.details,
                      grant_id: grantId
                    });
                }

                // Insert other related data...
                await this.insertRelatedData(grantId, normalizedData);
              }

            } catch (error: any) {
              result.recordsFailed++;
              result.errors.push(`Grant ${rawGrant.id}: ${error.message}`);
              logger.error(`Failed to process grant ${rawGrant.id}`, error);
            }
          }

          // Update state
          currentOffset += pageSize;
          await this.saveState('last_offset', currentOffset);
          
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
          result.errors.push(`Fetch error at offset ${currentOffset}: ${error.message}`);
          logger.error('Sync batch failed', error);
          
          if (result.errors.length > 10) {
            throw new Error('Too many errors, aborting sync');
          }
        }
      }

      // Reset offset if full sync completed
      if (options.fullSync && !result.errors.length) {
        await this.saveState('last_offset', 0);
      }

      result.success = result.errors.length === 0;
      
    } catch (error: any) {
      result.errors.push(error.message);
      logger.error('Sync failed', error);
    } finally {
      await this.completeSyncLog(result);
    }

    return result;
  }

  private async insertRelatedData(grantId: string, data: NormalizedGrantData): Promise<void> {
    // Insert categories
    if (data.categories && data.categories.length > 0) {
      await this.supabase
        .from('grant_categories')
        .insert(data.categories.map(c => ({ ...c, grant_id: grantId })));
    }

    // Insert eligibility
    if (data.eligibility && data.eligibility.length > 0) {
      await this.supabase
        .from('grant_eligibility')
        .insert(data.eligibility.map(e => ({ ...e, grant_id: grantId })));
    }

    // Insert keywords
    if (data.keywords && data.keywords.length > 0) {
      await this.supabase
        .from('grant_keywords')
        .insert(data.keywords.map(k => ({ ...k, grant_id: grantId })));
    }

    // Insert contacts
    if (data.contacts && data.contacts.length > 0) {
      await this.supabase
        .from('grant_contacts')
        .insert(data.contacts.map(c => ({ ...c, grant_id: grantId })));
    }
  }
}