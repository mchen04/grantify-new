import axios from 'axios';
import { BaseApiClient, ApiSyncResult } from '../base/BaseApiClient';
import { GrantNormalizer, NormalizedGrantData, GrantCategory, GrantKeyword, GrantContact, GrantEligibility } from '../base/GrantNormalizer';

import logger from '../../../utils/logger';
export class NsfAwardsApiClient extends BaseApiClient {
  constructor() {
    super({
      dataSourceName: 'nsf_awards',
      baseUrl: 'https://www.research.gov/awardapi-service/v1/awards.json',
      authType: 'none'
    });
  }

  async fetchGrants(params: any = {}): Promise<any[]> {
    try {
      // Check rate limit
      if (!await this.checkRateLimit()) {
        throw new Error('Rate limit exceeded');
      }

      const searchParams = {
        printFields: params.printFields || 'id,title,startDate,expDate,awardeeName,piFirstName,piLastName,piEmail,coPDPI,fundProgramName,awardeeName,awardeeCity,awardeeStateCode,awardeeZipCode,estimatedTotalAmt,fundsObligatedAmt,projectOutComesReport,abstractText,awardeeAddress',
        offset: params.offset || 0,
        rpp: params.rpp || 25, // Results per page
        ...params
      };

      // NSF uses various search parameters
      if (params.keyword) {
        searchParams.keyword = params.keyword;
      }
      if (params.dateStart) {
        searchParams.dateStart = params.dateStart;
      }
      if (params.dateEnd) {
        searchParams.dateEnd = params.dateEnd;
      }

      const response = await axios.get(this.config.baseUrl, {
        params: searchParams,
        timeout: 30000
      });

      await this.incrementRateLimit();

      // NSF returns data in response.response.award array
      return response.data?.response?.award || [];
    } catch (error: any) {
      logger.error('Failed to fetch NSF awards', error);
      throw error;
    }
  }

  async transformGrant(rawGrant: any): Promise<NormalizedGrantData> {
    const grant = {
      data_source_id: this.dataSourceId!,
      source_identifier: rawGrant.id,
      source_url: `https://www.nsf.gov/awardsearch/showAward?AWD_ID=${rawGrant.id}`,
      title: rawGrant.title,
      status: 'awarded' as const, // NSF shows awarded grants
      
      // Organization
      funding_organization_name: 'National Science Foundation',
      funding_organization_code: 'NSF',
      
      // Funding
      currency: 'USD',
      funding_amount_min: GrantNormalizer.normalizeAmount(rawGrant.fundsObligatedAmt),
      funding_amount_max: GrantNormalizer.normalizeAmount(rawGrant.estimatedTotalAmt),
      total_funding_available: GrantNormalizer.normalizeAmount(rawGrant.estimatedTotalAmt),
      
      // Dates
      start_date: GrantNormalizer.normalizeDate(rawGrant.startDate),
      end_date: GrantNormalizer.normalizeDate(rawGrant.expDate),
      
      // Classification
      grant_type: 'Research Grant',
      funding_instrument: rawGrant.fundProgramName,
      
      // Raw data
      raw_data: rawGrant
    };

    // Details
    const details = {
      description: rawGrant.abstractText,
      expected_results: rawGrant.projectOutComesReport,
      additional_information: {
        program_name: rawGrant.fundProgramName,
        award_id: rawGrant.id
      }
    };

    // Recipients
    const recipients = [];
    if (rawGrant.awardeeName) {
      recipients.push({
        recipient_name: rawGrant.awardeeName,
        award_amount: GrantNormalizer.normalizeAmount(rawGrant.estimatedTotalAmt),
        project_start_date: GrantNormalizer.normalizeDate(rawGrant.startDate),
        project_end_date: GrantNormalizer.normalizeDate(rawGrant.expDate),
        location_country: 'US',
        location_state: rawGrant.awardeeStateCode,
        location_city: rawGrant.awardeeCity,
        principal_investigator: `${rawGrant.piFirstName || ''} ${rawGrant.piLastName || ''}`.trim(),
        project_description: rawGrant.abstractText
      });
    }

    // Categories
    const categories: GrantCategory[] = [];
    if (rawGrant.fundProgramName) {
      categories.push({
        category_type: 'research_area' as const,
        category_name: rawGrant.fundProgramName
      });
    }

    // Keywords - extract from abstract
    const keywords = GrantNormalizer.extractKeywords(
      `${grant.title} ${details.description}`,
      'extracted'
    );

    // Contacts
    const contacts: GrantContact[] = [];
    if (rawGrant.piEmail) {
      contacts.push({
        contact_type: 'technical' as const,
        contact_name: `${rawGrant.piFirstName || ''} ${rawGrant.piLastName || ''}`.trim(),
        email: rawGrant.piEmail,
        contact_title: 'Principal Investigator'
      });
    }

    // Co-PIs
    if (rawGrant.coPDPI && Array.isArray(rawGrant.coPDPI)) {
      rawGrant.coPDPI.forEach((copi: any, index: number) => {
        if (copi.email) {
          contacts.push({
            contact_type: 'technical' as const,
            contact_name: `${copi.firstName || ''} ${copi.lastName || ''}`.trim(),
            email: copi.email,
            contact_title: 'Co-Principal Investigator',
            display_order: index + 1
          });
        }
      });
    }

    // Locations
    const locations = [];
    if (rawGrant.awardeeStateCode) {
      locations.push({
        location_type: 'target' as const,
        country_code: 'US',
        state_province: rawGrant.awardeeStateCode,
        city: rawGrant.awardeeCity,
        postal_code: rawGrant.awardeeZipCode
      });
    }

    return {
      grant,
      details,
      categories,
      keywords,
      contacts,
      locations
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
      const resultsPerPage = 25;
      let currentOffset = options.fullSync ? 0 : lastOffset;
      let hasMore = true;

      // Set date range for sync (last year by default)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1);

      while (hasMore) {
        try {
          logger.info(`Fetching NSF awards from offset ${currentOffset}`);
          
          const awards = await this.fetchGrants({
            offset: currentOffset,
            rpp: resultsPerPage,
            dateStart: options.dateStart || startDate.toISOString().split('T')[0],
            dateEnd: options.dateEnd || endDate.toISOString().split('T')[0],
            ...options.filters
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
              result.errors.push(`Award ${rawAward.id}: ${error.message}`);
              logger.error(`Failed to process NSF award ${rawAward.id}`, error);
            }
          }

          // Update state
          currentOffset += resultsPerPage;
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
          if (awards.length < resultsPerPage) {
            hasMore = false;
          }

          // NSF has a lot of data, limit to reasonable amount per sync
          if (currentOffset >= 5000 && !options.fullSync) {
            hasMore = false;
          }

        } catch (error: any) {
          result.errors.push(`Fetch error at offset ${currentOffset}: ${error.message}`);
          logger.error('NSF sync batch failed', error);
          
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
      logger.error('NSF sync failed', error);
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

    // Insert contacts
    if (data.contacts && data.contacts.length > 0) {
      await this.supabase
        .from('grant_contacts')
        .insert(data.contacts.map(c => ({ ...c, grant_id: grantId })));
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
  }
}