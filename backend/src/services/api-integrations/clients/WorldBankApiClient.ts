import axios from 'axios';
import { BaseApiClient, ApiSyncResult } from '../base/BaseApiClient';
import { GrantNormalizer, NormalizedGrantData, GrantCategory, GrantKeyword, GrantContact, GrantEligibility, GrantLocation } from '../base/GrantNormalizer';

import logger from '../../../utils/logger';
export class WorldBankApiClient extends BaseApiClient {
  constructor() {
    super({
      dataSourceName: 'world_bank',
      baseUrl: 'https://search.worldbank.org/api/v2/projects',
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
        format: 'json',
        rows: params.rows || 100,
        os: params.os || 0, // offset
        apilang: 'en',
        // Filter for active projects
        status: params.status || 'Active',
        // Look for grant-related lending instruments
        lendinginstr_exact: params.lendinginstr || 'Investment Project Financing',
        ...params
      };

      const response = await axios.get(this.config.baseUrl, {
        params: searchParams,
        timeout: 30000
      });

      await this.incrementRateLimit();

      // World Bank returns data in projects.project array
      return response.data?.projects?.project || [];
    } catch (error: any) {
      logger.error('Failed to fetch World Bank projects', error);
      throw error;
    }
  }

  async transformGrant(rawProject: any): Promise<NormalizedGrantData> {
    // World Bank projects can include loans, but we'll focus on grant components
    const isGrant = this.isGrantProject(rawProject);
    
    const grant = {
      data_source_id: this.dataSourceId!,
      source_identifier: rawProject.id,
      source_url: rawProject.url || `https://projects.worldbank.org/en/projects-operations/project-detail/${rawProject.id}`,
      title: rawProject.project_name,
      status: this.mapProjectStatus(rawProject.status),
      
      // Organization
      funding_organization_name: 'World Bank',
      funding_organization_code: 'WB',
      
      // Funding
      currency: 'USD', // World Bank typically reports in USD
      funding_amount_min: GrantNormalizer.normalizeAmount(rawProject.totalcommamt),
      funding_amount_max: GrantNormalizer.normalizeAmount(rawProject.totalamt),
      total_funding_available: GrantNormalizer.normalizeAmount(rawProject.totalamt),
      
      // Dates
      posted_date: GrantNormalizer.normalizeDate(rawProject.boardapprovaldate),
      start_date: GrantNormalizer.normalizeDate(rawProject.boardapprovaldate),
      end_date: GrantNormalizer.normalizeDate(rawProject.closingdate),
      
      // Classification
      grant_type: isGrant ? 'Development Grant' : 'Development Financing',
      funding_instrument: rawProject.lendinginstr,
      
      // Raw data
      raw_data: rawProject
    };

    // Details
    const details = {
      description: rawProject.project_abstract || rawProject.pdo,
      purpose: rawProject.pdo, // Project Development Objective
      additional_information: {
        project_id: rawProject.project_id,
        lending_instrument: rawProject.lendinginstr,
        product_line: rawProject.productline,
        theme: rawProject.theme_exact,
        sector: rawProject.sector_exact
      }
    };

    // Recipients - World Bank projects go to countries/regions
    const recipients = [];
    if (rawProject.countryname) {
      recipients.push({
        recipient_name: rawProject.borrower || rawProject.countryname,
        recipient_type: 'Government',
        award_amount: GrantNormalizer.normalizeAmount(rawProject.totalamt),
        project_start_date: GrantNormalizer.normalizeDate(rawProject.boardapprovaldate),
        project_end_date: GrantNormalizer.normalizeDate(rawProject.closingdate),
        location_country: rawProject.countrycode,
        project_description: rawProject.project_abstract
      });
    }

    // Categories
    const categories: GrantCategory[] = [];
    
    // Sectors
    if (rawProject.sector_exact) {
      const sectors = Array.isArray(rawProject.sector_exact) 
        ? rawProject.sector_exact 
        : [rawProject.sector_exact];
      
      sectors.forEach((sector: string) => {
        categories.push({
          category_type: 'sector' as const,
          category_name: sector
        });
      });
    }

    // Themes
    if (rawProject.theme_exact) {
      const themes = Array.isArray(rawProject.theme_exact) 
        ? rawProject.theme_exact 
        : [rawProject.theme_exact];
      
      themes.forEach((theme: string) => {
        categories.push({
          category_type: 'theme' as const,
          category_name: theme
        });
      });
    }

    // SDGs
    if (rawProject.goal) {
      const goals = Array.isArray(rawProject.goal) 
        ? rawProject.goal 
        : [rawProject.goal];
      
      goals.forEach((goal: string) => {
        categories.push({
          category_type: 'sdg' as const,
          category_name: goal
        });
      });
    }

    // Keywords
    const keywords = GrantNormalizer.extractKeywords(
      `${grant.title} ${details.description}`,
      'extracted'
    );

    // Locations - countries/regions
    const locations: GrantLocation[] = [];
    if (rawProject.countrycode) {
      const countries = Array.isArray(rawProject.countrycode) 
        ? rawProject.countrycode 
        : [rawProject.countrycode];
      
      countries.forEach((country: string, index: number) => {
        const countryName = Array.isArray(rawProject.countryname) 
          ? rawProject.countryname[index] 
          : rawProject.countryname;
        
        locations.push({
          location_type: 'target' as const,
          country_code: country,
          region: rawProject.regionname,
          geographic_description: countryName
        });
      });
    }

    // Contacts
    const contacts: GrantContact[] = [];
    if (rawProject.teamleadname) {
      contacts.push({
        contact_type: 'program' as const,
        contact_name: rawProject.teamleadname,
        contact_title: 'Team Lead',
        organization: 'World Bank'
      });
    }

    // Eligibility - World Bank projects typically go to governments
    const eligibility = [{
      eligibility_type: 'organization_type' as const,
      eligibility_value: 'Government',
      eligibility_description: 'National, regional, or local government entities',
      is_required: true
    }];

    return {
      grant,
      details,
      categories,
      keywords,
      contacts,
      locations,
      eligibility
    };
  }

  private isGrantProject(project: any): boolean {
    // Check if this is a grant-type project based on lending instrument
    const grantInstruments = [
      'Grant',
      'Development Policy Grant',
      'Emergency Recovery Grant',
      'Trust Fund Grant'
    ];
    
    return grantInstruments.some(instrument => 
      project.lendinginstr?.toLowerCase().includes(instrument.toLowerCase())
    );
  }

  private mapProjectStatus(status: string): NormalizedGrantData['grant']['status'] {
    if (!status) return 'active';
    
    const statusMap: Record<string, NormalizedGrantData['grant']['status']> = {
      'Active': 'active',
      'Closed': 'closed',
      'Pipeline': 'forecasted',
      'Dropped': 'closed',
      'Completed': 'closed'
    };
    
    return statusMap[status] || 'active';
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
      const rowsPerPage = 100;
      let currentOffset = options.fullSync ? 0 : lastOffset;
      let hasMore = true;

      while (hasMore) {
        try {
          logger.info(`Fetching World Bank projects from offset ${currentOffset}`);
          
          const projects = await this.fetchGrants({
            os: currentOffset,
            rows: rowsPerPage,
            ...options.filters
          });

          if (!projects || projects.length === 0) {
            hasMore = false;
            break;
          }

          result.recordsFetched += projects.length;

          // Process each project
          for (const rawProject of projects) {
            try {
              // Only process grant-like projects unless specified otherwise
              if (!options.includeLoans && !this.isGrantProject(rawProject)) {
                continue;
              }

              const normalizedData = await this.transformGrant(rawProject);
              
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
              result.errors.push(`Project ${rawProject.id}: ${error.message}`);
              logger.error(`Failed to process World Bank project ${rawProject.id}`, error);
            }
          }

          // Update state
          currentOffset += rowsPerPage;
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
          if (projects.length < rowsPerPage) {
            hasMore = false;
          }

          // Limit to reasonable amount for non-full syncs
          if (currentOffset >= 2000 && !options.fullSync) {
            hasMore = false;
          }

        } catch (error: any) {
          result.errors.push(`Fetch error at offset ${currentOffset}: ${error.message}`);
          logger.error('World Bank sync batch failed', error);
          
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
      logger.error('World Bank sync failed', error);
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

    // Insert eligibility
    if (data.eligibility && data.eligibility.length > 0) {
      await this.supabase
        .from('grant_eligibility')
        .insert(data.eligibility.map(e => ({ ...e, grant_id: grantId })));
    }
  }
}