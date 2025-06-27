import axios from 'axios';
import { BaseApiClient, ApiSyncResult } from '../base/BaseApiClient';
import { GrantNormalizer, NormalizedGrantData, GrantCategory, GrantKeyword, GrantContact, GrantEligibility } from '../base/GrantNormalizer';

import logger from '../../../utils/logger';

interface ParsedAmountRange {
  min: number | undefined;
  max: number | undefined;
}

export class CaliforniaGrantsApiClient extends BaseApiClient {
  constructor() {
    super({
      dataSourceName: 'california_grants',
      baseUrl: 'https://data.ca.gov/api/3/action/datastore_search',
      authType: 'none'
    });
  }

  /**
   * Parses amount ranges from California Grants EstAmounts field
   * Handles formats like:
   * - "$1,000,000" (single amount)
   * - "Between $10,000 and $100,000" (range)
   * - "Between $1 and $2,000,000" (range)
   */
  private parseAmountRange(estAmounts: string | undefined): ParsedAmountRange {
    if (!estAmounts) {
      return { min: undefined, max: undefined };
    }

    // Handle "Between X and Y" format
    const betweenMatch = estAmounts.match(/Between\s+\$([0-9,]+)\s+and\s+\$([0-9,]+)/i);
    if (betweenMatch) {
      const minStr = betweenMatch[1].replace(/,/g, '');
      const maxStr = betweenMatch[2].replace(/,/g, '');
      return {
        min: parseFloat(minStr) || undefined,
        max: parseFloat(maxStr) || undefined
      };
    }

    // Handle single amount format "$X"
    const singleMatch = estAmounts.match(/^\$([0-9,]+)$/);
    if (singleMatch) {
      const amount = parseFloat(singleMatch[1].replace(/,/g, '')) || undefined;
      return { min: amount, max: amount };
    }

    // Fallback to undefined if no pattern matches
    return { min: undefined, max: undefined };
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
        searchParams.sort = 'ApplicationDeadline asc';
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
      const closeDate = rawGrant['ApplicationDeadline'];
      const openDate = rawGrant['OpenDate'];
      
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

    // Parse funding amounts from EstAmounts field
    const amountRange = this.parseAmountRange(rawGrant['EstAmounts']);

    const grant = {
      data_source_id: this.dataSourceId!,
      source_identifier: rawGrant['PortalID'] || rawGrant['GrantID'] || rawGrant._id?.toString(),
      source_url: rawGrant['GrantURL'],
      title: rawGrant['Title'],
      status: status,
      
      // Organization
      funding_organization_name: rawGrant['AgencyDept'],
      funding_organization_code: rawGrant['AgencyCode'],
      
      // Funding - Fixed parsing logic
      currency: 'USD',
      funding_amount_min: amountRange.min,
      funding_amount_max: amountRange.max,
      total_funding_available: GrantNormalizer.normalizeAmount(rawGrant['EstAvailFunds']),
      expected_awards_count: parseInt(rawGrant['EstAwards']?.replace(/[^0-9]/g, '') || '0'),
      
      // Dates
      posted_date: GrantNormalizer.normalizeDate(rawGrant['OpenDate']),
      application_deadline: GrantNormalizer.normalizeDate(rawGrant['ApplicationDeadline']),
      last_updated_date: GrantNormalizer.normalizeDate(rawGrant['LastUpdated']),
      
      // Classification
      grant_type: rawGrant['Type'] || 'Grant',
      funding_instrument: rawGrant['FundingSource'],
      
      // Raw data
      raw_data: rawGrant
    };

    // Details
    const details = {
      description: rawGrant['Description'] || '',
      purpose: rawGrant['Purpose'] || '',
      application_process: rawGrant['ApplicantTypeNotes'],
      evaluation_criteria: rawGrant['AwardStats'],
      special_requirements: rawGrant['MatchingFundsNotes'],
      additional_information: {
        grant_id: rawGrant['GrantID'],
        portal_id: rawGrant['PortalID'],
        matching_funds_required: rawGrant['MatchingFunds'] === 'Required',
        funding_method: rawGrant['FundingMethod'],
        funding_method_notes: rawGrant['FundingMethodNotes'],
        award_period: rawGrant['AwardPeriod'],
        expected_award_date: rawGrant['ExpAwardDate'],
        loi_required: rawGrant['LOI'] === 'Yes',
        electronic_submission: rawGrant['ElecSubmission'],
        agency_url: rawGrant['AgencyURL'],
        grant_events_url: rawGrant['GrantEventsURL'],
        agency_subscribe_url: rawGrant['AgencySubscribeURL']
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
    }

    // Keywords
    const keywords: GrantKeyword[] = [];
    
    // Extract additional keywords from title and description
    const extractedKeywords = GrantNormalizer.extractKeywords(
      `${grant.title} ${details.description} ${details.purpose}`,
      'extracted'
    );
    keywords.push(...extractedKeywords);

    // Eligibility
    const eligibility: GrantEligibility[] = [];
    if (rawGrant['ApplicantType']) {
      const applicants = rawGrant['ApplicantType'].split(';').map((a: string) => a.trim());
      applicants.forEach((applicant: string) => {
        if (applicant) {
          eligibility.push({
            eligibility_type: 'organization_type' as const,
            eligibility_value: applicant,
            is_required: true
          });
        }
      });
    }

    // Additional eligibility from notes
    if (rawGrant['ApplicantTypeNotes']) {
      eligibility.push({
        eligibility_type: 'other' as const,
        eligibility_description: rawGrant['ApplicantTypeNotes'],
        is_required: false
      });
    }

    // Geographic eligibility
    if (rawGrant['Geography']) {
      eligibility.push({
        eligibility_type: 'geographic' as const,
        eligibility_value: rawGrant['Geography'],
        eligibility_description: 'Geographic areas eligible for this grant',
        is_required: true
      });
    }

    // Locations
    const locations = [];
    const geography = rawGrant['Geography'];
    if (geography && geography !== 'Statewide') {
      locations.push({
        location_type: 'eligible' as const,
        country_code: 'US',
        state_province: 'CA',
        geographic_description: geography
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
    if (rawGrant['ContactInfo']) {
      // Parse contact info which may contain name, email, phone
      const contactInfo = rawGrant['ContactInfo'];
      const emailMatch = contactInfo.match(/email:\s*([^\s;,]+)/i);
      const phoneMatch = contactInfo.match(/tel:\s*([^\s;,]+)/i);
      const nameMatch = contactInfo.match(/name:\s*([^;,]+)/i);
      
      contacts.push({
        contact_type: 'general' as const,
        contact_name: nameMatch ? nameMatch[1].trim() : undefined,
        email: emailMatch ? emailMatch[1].trim() : undefined,
        phone: phoneMatch ? phoneMatch[1].trim() : undefined,
        notes: contactInfo,
        organization: rawGrant['AgencyDept']
      });
    }

    // Documents
    const documents = [];
    if (rawGrant['GrantURL']) {
      documents.push({
        document_type: 'guidelines' as const,
        document_name: 'Grant Details',
        document_url: rawGrant['GrantURL']
      });
    }
    if (rawGrant['AgencyURL']) {
      documents.push({
        document_type: 'other' as const,
        document_name: 'Agency Website',
        document_url: rawGrant['AgencyURL']
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
              result.errors.push(`Grant ${rawGrant.PortalID || rawGrant._id}: ${error.message}`);
              logger.error(`Failed to process California grant ${rawGrant.PortalID || rawGrant._id}`, error);
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