import axios from 'axios';
import { BaseApiClient, ApiSyncResult } from '../base/BaseApiClient';
import { GrantNormalizer, NormalizedGrantData, GrantKeyword, GrantContact, GrantCategory, GrantEligibility } from '../base/GrantNormalizer';

import logger from '../../../utils/logger';
export class NihReporterApiClient extends BaseApiClient {
  constructor() {
    super({
      dataSourceName: 'nih_reporter',
      baseUrl: 'https://api.reporter.nih.gov/v2/projects/search',
      authType: 'none'
    });
  }

  async fetchGrants(params: any = {}): Promise<any[]> {
    try {
      // Check rate limit
      if (!await this.checkRateLimit()) {
        throw new Error('Rate limit exceeded');
      }

      // NIH uses POST for search
      const searchBody = {
        criteria: {
          fiscal_years: params.fiscal_years || [new Date().getFullYear()],
          exclude_subprojects: true,
          ...params.criteria
        },
        offset: params.offset || 0,
        limit: params.limit || 500,
        sort_field: params.sort_field || 'project_start_date',
        sort_order: params.sort_order || 'desc'
      };

      const response = await axios.post(this.config.baseUrl, searchBody, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 60000 // NIH can be slow
      });

      await this.incrementRateLimit();

      return response.data.results || [];
    } catch (error: any) {
      logger.error('Failed to fetch NIH grants', error);
      throw error;
    }
  }

  async transformGrant(rawGrant: any): Promise<NormalizedGrantData> {
    const grant = {
      data_source_id: this.dataSourceId!,
      source_identifier: rawGrant.project_num || rawGrant.application_id,
      source_url: `https://reporter.nih.gov/project-details/${rawGrant.project_num}`,
      title: rawGrant.project_title,
      status: 'awarded' as const, // NIH Reporter shows awarded grants
      
      // Organization
      funding_organization_name: rawGrant.agency_ic_admin?.name || rawGrant.ic_name,
      funding_organization_code: rawGrant.agency_ic_admin?.code || rawGrant.administering_ic,
      
      // Funding
      currency: 'USD',
      funding_amount_min: GrantNormalizer.normalizeAmount(rawGrant.award_amount || rawGrant.total_cost),
      funding_amount_max: GrantNormalizer.normalizeAmount(rawGrant.award_amount || rawGrant.total_cost),
      total_funding_available: GrantNormalizer.normalizeAmount(rawGrant.total_cost_ic),
      
      // Dates
      posted_date: GrantNormalizer.normalizeDate(rawGrant.award_notice_date),
      start_date: GrantNormalizer.normalizeDate(rawGrant.project_start_date),
      end_date: GrantNormalizer.normalizeDate(rawGrant.project_end_date),
      application_deadline: undefined,
      
      // Classification
      grant_type: rawGrant.activity_code,
      funding_instrument: this.mapActivityCode(rawGrant.activity_code),
      activity_code: rawGrant.activity_code,
      
      // Raw data
      raw_data: rawGrant
    };

    // Details
    const details = {
      description: rawGrant.abstract_text || rawGrant.project_abstract,
      abstract: rawGrant.phr_text || rawGrant.public_health_relevance,
      purpose: rawGrant.project_title,
      additional_information: {
        opportunity_number: rawGrant.foa_number,
        serial_number: rawGrant.serial_number,
        support_year: rawGrant.support_year,
        is_covid_response: rawGrant.covid_response || false
      }
    };

    // Recipients (for awarded grants)
    const recipients = [];
    if (rawGrant.organization) {
      recipients.push({
        recipient_name: rawGrant.organization.org_name,
        recipient_organization_type: rawGrant.organization.org_class,
        award_amount: GrantNormalizer.normalizeAmount(rawGrant.award_amount),
        award_date: GrantNormalizer.normalizeDate(rawGrant.award_notice_date),
        project_start_date: GrantNormalizer.normalizeDate(rawGrant.project_start_date),
        project_end_date: GrantNormalizer.normalizeDate(rawGrant.project_end_date),
        location_country: rawGrant.organization.org_country || 'US',
        location_state: rawGrant.organization.org_state,
        location_city: rawGrant.organization.org_city,
        principal_investigator: this.formatPIName(rawGrant.principal_investigators?.[0])
      });
    }

    // Categories - NIH has rich categorization
    const categories: GrantCategory[] = [];
    
    // Activity code category
    if (rawGrant.activity_code) {
      categories.push({
        category_type: 'research_area' as const,
        category_code: rawGrant.activity_code,
        category_name: this.mapActivityCode(rawGrant.activity_code)
      });
    }

    // Study section
    if (rawGrant.study_section) {
      categories.push({
        category_type: 'topic' as const,
        category_code: rawGrant.study_section.sra_code,
        category_name: rawGrant.study_section.sra_name || rawGrant.study_section.group_name
      });
    }

    // Keywords from terms
    const keywords: GrantKeyword[] = [];
    if (rawGrant.terms && Array.isArray(rawGrant.terms)) {
      rawGrant.terms.forEach((term: string) => {
        keywords.push({
          keyword: term,
          keyword_source: 'api_provided' as const,
          relevance_score: 1.0
        });
      });
    }

    // Eligibility - NIH grants have specific requirements
    const eligibility: GrantEligibility[] = [];
    eligibility.push({
      eligibility_type: 'organization_type' as const,
      eligibility_value: 'Research Institutions',
      eligibility_description: 'Universities, hospitals, and other research organizations',
      is_required: true
    });

    // Contacts
    const contacts: GrantContact[] = [];
    if (rawGrant.program_officers && Array.isArray(rawGrant.program_officers)) {
      rawGrant.program_officers.forEach((officer: any, index: number) => {
        contacts.push({
          contact_type: 'program' as const,
          contact_name: officer.full_name || `${officer.first_name} ${officer.last_name}`,
          email: officer.email,
          display_order: index
        });
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

  private mapActivityCode(code: string): string {
    if (!code) return 'Research Grant';
    
    const codeMap: Record<string, string> = {
      'R01': 'Research Project Grant',
      'R21': 'Exploratory/Developmental Research Grant',
      'R03': 'Small Research Grant',
      'P01': 'Research Program Project',
      'P30': 'Center Core Grant',
      'P50': 'Specialized Center',
      'U01': 'Research Project Cooperative Agreement',
      'K01': 'Mentored Research Scientist Career Development Award',
      'K08': 'Mentored Clinical Scientist Research Career Development Award',
      'K99': 'Pathway to Independence Award',
      'F31': 'Predoctoral Individual National Research Service Award',
      'F32': 'Postdoctoral Individual National Research Service Award',
      'T32': 'Institutional National Research Service Award'
    };
    
    return codeMap[code] || `${code} Grant`;
  }

  private formatPIName(pi: any): string {
    if (!pi) return '';
    
    if (pi.full_name) return pi.full_name;
    
    const parts = [];
    if (pi.first_name) parts.push(pi.first_name);
    if (pi.middle_name) parts.push(pi.middle_name);
    if (pi.last_name) parts.push(pi.last_name);
    
    return parts.join(' ');
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

      // NIH has a lot of data, so we'll sync by fiscal year
      const currentYear = new Date().getFullYear();
      const yearsToSync = options.fiscal_years || [currentYear];
      
      for (const year of yearsToSync) {
        const lastOffset = await this.getState(`last_offset_${year}`) || 0;
        const limit = 500;
        let offset = options.fullSync ? 0 : lastOffset;
        let hasMore = true;

        while (hasMore) {
          try {
            logger.info(`Fetching NIH grants for year ${year}, offset ${offset}`);
            
            const grants = await this.fetchGrants({
              criteria: {
                fiscal_years: [year],
                ...options.filters
              },
              offset: offset,
              limit: limit
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
                result.errors.push(`Grant ${rawGrant.project_num}: ${error.message}`);
                logger.error(`Failed to process NIH grant ${rawGrant.project_num}`, error);
              }
            }

            // Update state
            offset += limit;
            await this.saveState(`last_offset_${year}`, offset);
            
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
            result.errors.push(`Fetch error for year ${year} at offset ${offset}: ${error.message}`);
            logger.error('NIH sync batch failed', error);
            
            if (result.errors.length > 10) {
              throw new Error('Too many errors, aborting sync');
            }
          }
        }

        // Reset offset for this year if full sync completed
        if (options.fullSync && !result.errors.length) {
          await this.saveState(`last_offset_${year}`, 0);
        }
      }

      result.success = result.errors.length === 0;
      
    } catch (error: any) {
      result.errors.push(error.message);
      logger.error('NIH sync failed', error);
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

    // Insert eligibility
    if (data.eligibility && data.eligibility.length > 0) {
      await this.supabase
        .from('grant_eligibility')
        .insert(data.eligibility.map(e => ({ ...e, grant_id: grantId })));
    }

    // Insert keywords
    if (data.keywords && data.keywords.length > 0) {
      // Limit keywords to top 50 (NIH can have many)
      const topKeywords = data.keywords.slice(0, 50);
      await this.supabase
        .from('grant_keywords')
        .insert(topKeywords.map(k => ({ ...k, grant_id: grantId })));
    }

    // Insert contacts
    if (data.contacts && data.contacts.length > 0) {
      await this.supabase
        .from('grant_contacts')
        .insert(data.contacts.map(c => ({ ...c, grant_id: grantId })));
    }

    // Insert recipients - removed as not part of NormalizedGrantData
    // Recipients data should be handled separately if needed
  }
}