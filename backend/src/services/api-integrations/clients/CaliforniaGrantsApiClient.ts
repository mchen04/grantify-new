import axios from 'axios';
import { BaseApiClient, ApiSyncResult } from '../base/BaseApiClient';
import { GrantNormalizer, NormalizedGrantData, GrantCategory, GrantKeyword, GrantContact, GrantEligibility } from '../base/GrantNormalizer';

import logger from '../../../utils/logger';
export class CaliforniaGrantsApiClient extends BaseApiClient {
  constructor() {
    super({
      dataSourceName: 'california_grants',
      baseUrl: 'https://data.ca.gov/api/3/action/datastore_search',
      authType: 'none'
    });
  }

  async fetchGrants(params: any = {}): Promise<any[]> {
    try {
      // Check rate limit
      if (!await this.checkRateLimit()) {
        throw new Error('Rate limit exceeded');
      }

      // California uses CKAN API with updated resource ID
      const searchParams: any = {
        resource_id: '111c8c88-21f6-453c-ae2c-b4785a0624f5', // Updated California grants dataset ID
        limit: params.limit || 100,
        offset: params.offset || 0
      };

      // Add filters if provided
      if (params.filters) {
        searchParams.filters = JSON.stringify(params.filters);
      } else if (params.status) {
        searchParams.filters = JSON.stringify({ Status: params.status });
      }

      // Add search query if provided
      if (params.q) {
        searchParams.q = params.q;
      }

      // Add sort if provided
      if (params.sort) {
        searchParams.sort = params.sort;
      } else {
        searchParams.sort = 'Application Due Date asc';
      }

      const response = await axios.get(this.config.baseUrl, {
        params: searchParams,
        timeout: 30000
      });

      await this.incrementRateLimit();

      return response.data?.result?.records || [];
    } catch (error: any) {
      logger.error('Failed to fetch California grants', error);
      throw error;
    }
  }

  async transformGrant(rawGrant: any): Promise<NormalizedGrantData> {
    // Determine status based on Status field or dates
    let status: NormalizedGrantData['grant']['status'] = 'open';
    
    if (rawGrant['Status']) {
      const statusMap: Record<string, NormalizedGrantData['grant']['status']> = {
        'active': 'open',
        'closed': 'closed',
        'forecasted': 'forecasted',
        'archived': 'closed'
      };
      status = statusMap[rawGrant['Status'].toLowerCase()] || 'open';
    } else {
      // Fallback to date-based status
      const now = new Date();
      const closeDate = rawGrant['Application Due Date'] || rawGrant.grantCloseDate;
      const openDate = rawGrant['Open Date'] || rawGrant.grantOpenDate;
      
      if (closeDate) {
        const closeDateObj = new Date(closeDate);
        if (closeDateObj < now) {
          status = 'closed';
        }
      }
      if (openDate && status !== 'closed') {
        const openDateObj = new Date(openDate);
        if (openDateObj > now) {
          status = 'forecasted';
        }
      }
    }

    const grant = {
      data_source_id: this.dataSourceId!,
      source_identifier: rawGrant['Grant ID'] || rawGrant.grantId || rawGrant._id?.toString(),
      source_url: rawGrant['Resource URL'] || rawGrant.grantDetailsUrl || rawGrant.applyUrl,
      title: rawGrant['Grant Title'] || rawGrant.title,
      status: status,
      
      // Organization
      funding_organization_name: rawGrant['Agency Name'] || rawGrant.funder,
      funding_organization_code: rawGrant['Agency Code'] || rawGrant.adminAgency,
      
      // Funding
      currency: 'USD',
      funding_amount_min: GrantNormalizer.normalizeAmount(rawGrant['Estimated Funding Per Award'] || rawGrant.estimatedFundingperAward),
      funding_amount_max: GrantNormalizer.normalizeAmount(rawGrant['Estimated Funding Per Award'] || rawGrant.estimatedFundingperAward),
      total_funding_available: GrantNormalizer.normalizeAmount(rawGrant['Fund Amount'] || rawGrant.totalEstimatedFunding),
      expected_awards_count: parseInt(rawGrant['Estimated Number Of Awards'] || rawGrant.estimatedNumofAwards || '0'),
      
      // Dates
      posted_date: GrantNormalizer.normalizeDate(rawGrant['Open Date'] || rawGrant.grantOpenDate),
      application_deadline: GrantNormalizer.normalizeDate(rawGrant['Application Due Date'] || rawGrant.grantCloseDate),
      last_updated_date: GrantNormalizer.normalizeDate(rawGrant['Last Modified Date']),
      
      // Classification
      grant_type: rawGrant['Loan Or Grant'] || rawGrant.grantType || 'Grant',
      funding_instrument: rawGrant['Funding Source'] || rawGrant.fundingMethod,
      
      // Raw data
      raw_data: rawGrant
    };

    // Details
    const details = {
      description: rawGrant['Purpose'] || rawGrant.purpose || '',
      application_process: rawGrant['Application Process'] || rawGrant.applicationProcess,
      evaluation_criteria: rawGrant['Selection Criteria'] || rawGrant.selectionCriteria,
      special_requirements: rawGrant['Matching Funds'] || rawGrant.matchingFundsNotes,
      additional_information: {
        grant_id: rawGrant['Grant ID'] || rawGrant.grantId,
        matching_funds_required: rawGrant['Matching Funds'] === 'Yes' || rawGrant.matchingFunds === 'Yes',
        agency_contact_email: rawGrant['Agency Contact Email'],
        agency_contact_phone: rawGrant['Agency Contact Phone'],
        application_url: rawGrant['Resource URL'] || rawGrant.applyUrl,
        details_url: rawGrant['Grant Details URL'] || rawGrant.grantDetailsUrl
      }
    };

    // Categories
    const categories: GrantCategory[] = [];
    if (rawGrant['Categories']) {
      const categoryList = rawGrant['Categories'].split(',').map((c: string) => c.trim());
      categoryList.forEach((cat: string) => {
        if (cat) {
          categories.push({
            category_type: 'theme' as const,
            category_name: cat
          });
        }
      });
    } else if (rawGrant.category) {
      categories.push({
        category_type: 'theme' as const,
        category_name: rawGrant.category
      });
    }

    // Keywords
    const keywords: GrantKeyword[] = [];
    if (rawGrant.keywords) {
      const keywordList = Array.isArray(rawGrant.keywords) 
        ? rawGrant.keywords 
        : rawGrant.keywords.split(',');
      
      keywordList.forEach((keyword: string) => {
        keywords.push({
          keyword: keyword.trim(),
          keyword_source: 'api_provided' as const
        });
      });
    }

    // Extract additional keywords
    const extractedKeywords = GrantNormalizer.extractKeywords(
      `${grant.title} ${details.description}`,
      'extracted'
    );
    keywords.push(...extractedKeywords);

    // Eligibility
    const eligibility: GrantEligibility[] = [];
    if (rawGrant['Applicant Type Eligibility']) {
      const applicants = rawGrant['Applicant Type Eligibility'].split(',').map((a: string) => a.trim());
      applicants.forEach((applicant: string) => {
        if (applicant) {
          eligibility.push({
            eligibility_type: 'organization_type' as const,
            eligibility_value: applicant,
            is_required: true
          });
        }
      });
    } else if (rawGrant.eligibleApplicants) {
      const applicants = Array.isArray(rawGrant.eligibleApplicants) 
        ? rawGrant.eligibleApplicants 
        : [rawGrant.eligibleApplicants];
      
      applicants.forEach((applicant: string) => {
        eligibility.push({
          eligibility_type: 'organization_type' as const,
          eligibility_value: applicant,
          is_required: true
        });
      });
    }

    // Geographic eligibility
    const geoEligibility = rawGrant['Geographic Eligibility'] || rawGrant.geographicEligibility;
    if (geoEligibility) {
      eligibility.push({
        eligibility_type: 'geographic' as const,
        eligibility_value: geoEligibility,
        eligibility_description: 'Geographic areas eligible for this grant',
        is_required: true
      });
    }

    // Locations
    const locations = [];
    const geoDesc = rawGrant['Geographic Eligibility'] || rawGrant.geographicEligibility;
    if (geoDesc && geoDesc !== 'Statewide') {
      locations.push({
        location_type: 'eligible' as const,
        country_code: 'US',
        state_province: 'CA',
        geographic_description: geoDesc
      });
    } else {
      locations.push({
        location_type: 'eligible' as const,
        country_code: 'US',
        state_province: 'CA',
        geographic_description: 'California Statewide'
      });
    }

    // Contacts
    const contacts: GrantContact[] = [];
    if (rawGrant['Agency Contact Email'] || rawGrant['Agency Contact Phone']) {
      contacts.push({
        contact_type: 'general' as const,
        email: rawGrant['Agency Contact Email'],
        phone: rawGrant['Agency Contact Phone'],
        organization: rawGrant['Agency Name'] || rawGrant.funder
      });
    } else if (rawGrant.contactInfo) {
      contacts.push({
        contact_type: 'general' as const,
        notes: rawGrant.contactInfo,
        organization: rawGrant.funder
      });
    }

    // Documents
    const documents = [];
    if (rawGrant.grantDetailsUrl) {
      documents.push({
        document_type: 'guidelines' as const,
        document_name: 'Grant Details',
        document_url: rawGrant.grantDetailsUrl
      });
    }
    if (rawGrant.applyUrl && rawGrant.applyUrl !== rawGrant.grantDetailsUrl) {
      documents.push({
        document_type: 'application_form' as const,
        document_name: 'Application Portal',
        document_url: rawGrant.applyUrl
      });
    }

    return {
      grant,
      details,
      categories,
      keywords,
      eligibility,
      locations,
      contacts,
    };
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
      const limit = 100;
      let currentOffset = options.fullSync ? 0 : lastOffset;
      let hasMore = true;

      while (hasMore) {
        try {
          logger.info(`Fetching California grants from offset ${currentOffset}`);
          
          const grants = await this.fetchGrants({
            offset: currentOffset,
            limit: limit,
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
              result.errors.push(`Grant ${rawGrant.grantId}: ${error.message}`);
              logger.error(`Failed to process California grant ${rawGrant.grantId}`, error);
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
          logger.error('California sync batch failed', error);
          
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
      logger.error('California sync failed', error);
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

    // Insert eligibility
    if (data.eligibility && data.eligibility.length > 0) {
      await this.supabase
        .from('grant_eligibility')
        .insert(data.eligibility.map(e => ({ ...e, grant_id: grantId })));
    }

    // Insert locations
    if (data.locations && data.locations.length > 0) {
      await this.supabase
        .from('grant_locations')
        .insert(data.locations.map(l => ({ ...l, grant_id: grantId })));
    }

    // Insert contacts
    if (data.contacts && data.contacts.length > 0) {
      await this.supabase
        .from('grant_contacts')
        .insert(data.contacts.map(c => ({ ...c, grant_id: grantId })));
    }

//     if (data.documents && data.documents.length > 0) {
//       await this.supabase
//         .from('grant_documents')
//         .insert(data.documents.map(d => ({ ...d, grant_id: grantId })));
//     }
  }
}