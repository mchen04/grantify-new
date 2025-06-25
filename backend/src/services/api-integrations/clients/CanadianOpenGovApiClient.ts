import axios from 'axios';
import { BaseApiClient, ApiSyncResult } from '../base/BaseApiClient';
import { GrantNormalizer, NormalizedGrantData, GrantCategory, GrantKeyword, GrantContact, GrantEligibility } from '../base/GrantNormalizer';

import logger from '../../../utils/logger';
export class CanadianOpenGovApiClient extends BaseApiClient {
  constructor() {
    super({
      dataSourceName: 'canadian_open_gov',
      baseUrl: 'https://open.canada.ca/data/api/3/action/datastore_search_sql',
      authType: 'none'
    });
  }

  async fetchGrants(params: any = {}): Promise<any[]> {
    try {
      // Check rate limit
      if (!await this.checkRateLimit()) {
        throw new Error('Rate limit exceeded');
      }

      // Canadian API uses SQL queries
      const limit = params.limit || 1000;
      const offset = params.offset || 0;
      
      // Build SQL query
      let sql = `
        SELECT * FROM "432516d7-b1db-42f7-b7e1-cbb0e6b71d2e"
        WHERE 1=1
      `;

      // Add filters if provided
      if (params.year) {
        sql += ` AND year >= ${params.year}`;
      }
      if (params.recipient_legal_name) {
        sql += ` AND recipient_legal_name ILIKE '%${params.recipient_legal_name}%'`;
      }

      sql += ` ORDER BY agreement_start_date DESC LIMIT ${limit} OFFSET ${offset}`;

      const response = await axios.get(this.config.baseUrl, {
        params: { sql },
        timeout: 30000
      });

      await this.incrementRateLimit();

      // Canadian API returns data in result.records
      return response.data?.result?.records || [];
    } catch (error: any) {
      logger.error('Failed to fetch Canadian grants', error);
      throw error;
    }
  }

  async transformGrant(rawGrant: any): Promise<NormalizedGrantData> {
    // Determine grant status based on dates
    const currentDate = new Date();
    const endDate = rawGrant.agreement_end_date ? new Date(rawGrant.agreement_end_date) : null;
    let status: NormalizedGrantData['grant']['status'] = 'awarded';
    if (endDate && endDate < currentDate) {
      status = 'closed';
    }

    const grant = {
      data_source_id: this.dataSourceId!,
      source_identifier: rawGrant.ref_number || `${rawGrant.fowner_org_name}_${rawGrant.agreement_number}`,
      title: rawGrant.program_name_en || rawGrant.program_name_fr || 'Canadian Government Grant',
      status: status,
      
      // Organization
      funding_organization_name: rawGrant.fowner_org_name || rawGrant.owner_org,
      funding_organization_code: rawGrant.owner_org,
      
      // Funding
      currency: 'CAD',
      funding_amount_min: GrantNormalizer.normalizeAmount(rawGrant.agreement_value),
      funding_amount_max: GrantNormalizer.normalizeAmount(rawGrant.agreement_value),
      total_funding_available: GrantNormalizer.normalizeAmount(rawGrant.total_value),
      
      // Dates
      posted_date: GrantNormalizer.normalizeDate(rawGrant.agreement_start_date),
      start_date: GrantNormalizer.normalizeDate(rawGrant.agreement_start_date),
      end_date: GrantNormalizer.normalizeDate(rawGrant.agreement_end_date),
      
      // Classification
      grant_type: this.mapAgreementType(rawGrant.agreement_type),
      funding_instrument: rawGrant.agreement_type,
      
      // Raw data
      raw_data: rawGrant
    };

    // Details (bilingual support)
    const details = {
      description: rawGrant.description_en || rawGrant.description_fr || rawGrant.expected_results_en,
      purpose: rawGrant.purpose_en || rawGrant.purpose_fr,
      expected_results: rawGrant.expected_results_en || rawGrant.expected_results_fr,
      additional_information: {
        agreement_number: rawGrant.agreement_number,
        amendment_number: rawGrant.amendment_number,
        federal_riding_name: rawGrant.fed_riding_name_en,
        naics_identifier: rawGrant.naics_identifier
      }
    };

    // Recipients
    const recipients = [];
    if (rawGrant.recipient_legal_name) {
      recipients.push({
        recipient_name: rawGrant.recipient_legal_name,
        recipient_type: rawGrant.recipient_type,
        award_amount: GrantNormalizer.normalizeAmount(rawGrant.agreement_value),
        award_date: GrantNormalizer.normalizeDate(rawGrant.agreement_start_date),
        project_start_date: GrantNormalizer.normalizeDate(rawGrant.agreement_start_date),
        project_end_date: GrantNormalizer.normalizeDate(rawGrant.agreement_end_date),
        location_country: rawGrant.recipient_country || 'CA',
        location_state: rawGrant.recipient_province,
        location_city: rawGrant.recipient_city
      });
    }

    // Categories
    const categories: GrantCategory[] = [];
    if (rawGrant.program_name_en) {
      categories.push({
        category_type: 'topic' as const,
        category_name: rawGrant.program_name_en
      });
    }
    if (rawGrant.naics_identifier) {
      categories.push({
        category_type: 'sector' as const,
        category_code: rawGrant.naics_identifier,
        category_name: `NAICS ${rawGrant.naics_identifier}`
      });
    }

    // Locations
    const locations = [];
    if (rawGrant.recipient_province) {
      locations.push({
        location_type: 'target' as const,
        country_code: rawGrant.recipient_country || 'CA',
        state_province: rawGrant.recipient_province,
        city: rawGrant.recipient_city,
        postal_code: rawGrant.recipient_postal_code
      });
    }

    // Keywords
    const keywords = GrantNormalizer.extractKeywords(
      `${grant.title} ${details.description} ${details.purpose}`,
      'extracted'
    );

    // Eligibility
    const eligibility: GrantEligibility[] = [];
    if (rawGrant.recipient_type) {
      eligibility.push({
        eligibility_type: 'organization_type' as const,
        eligibility_value: rawGrant.recipient_type,
        is_required: true
      });
    }

    return {
      grant,
      details,
      categories,
      keywords,
      locations,
      eligibility
    };
  }

  private mapAgreementType(type: string): string {
    if (!type) return 'Grant';
    
    const typeMap: Record<string, string> = {
      'G': 'Grant',
      'C': 'Contribution',
      'L': 'Loan',
      'S': 'Subsidy',
      'O': 'Other'
    };
    
    return typeMap[type] || type;
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
      const limit = 1000;
      let currentOffset = options.fullSync ? 0 : lastOffset;
      let hasMore = true;

      // Default to current year if not specified
      const currentYear = new Date().getFullYear();
      const year = options.year || currentYear;

      while (hasMore) {
        try {
          logger.info(`Fetching Canadian grants from offset ${currentOffset}`);
          
          const grants = await this.fetchGrants({
            offset: currentOffset,
            limit: limit,
            year: year,
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
              result.errors.push(`Grant ${rawGrant.ref_number}: ${error.message}`);
              logger.error(`Failed to process Canadian grant ${rawGrant.ref_number}`, error);
            }
          }

          // Update state
          currentOffset += limit;
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
          if (grants.length < limit) {
            hasMore = false;
          }

        } catch (error: any) {
          result.errors.push(`Fetch error at offset ${currentOffset}: ${error.message}`);
          logger.error('Canadian sync batch failed', error);
          
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
      logger.error('Canadian sync failed', error);
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

    // Insert locations
    if (data.locations && data.locations.length > 0) {
      await this.supabase
        .from('grant_locations')
        .insert(data.locations.map(l => ({ ...l, grant_id: grantId })));
    }

    // Insert eligibility
    if (data.eligibility && data.eligibility.length > 0) {
      await this.supabase
        .from('grant_eligibility')
        .insert(data.eligibility.map(e => ({ ...e, grant_id: grantId })));
    }
  }
}