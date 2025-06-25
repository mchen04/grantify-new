import axios from 'axios';
import { BaseApiClient, ApiSyncResult } from '../base/BaseApiClient';
import { GrantNormalizer, NormalizedGrantData, GrantCategory, GrantKeyword, GrantContact, GrantEligibility } from '../base/GrantNormalizer';

import logger from '../../../utils/logger';
export class UkriGatewayApiClient extends BaseApiClient {
  constructor() {
    super({
      dataSourceName: 'ukri_gateway',
      baseUrl: 'https://gtr.ukri.org/api/projects',
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
        q: params.q || '*',
        s: params.s || 100, // size
        p: params.p || 1, // page
        f: params.f || 'json' // format
      };

      const response = await axios.get(this.config.baseUrl, {
        params: searchParams,
        headers: {
          'Accept': 'application/json'
        },
        timeout: 30000
      });

      await this.incrementRateLimit();

      // UKRI returns data in project array
      return response.data?.project || [];
    } catch (error: any) {
      logger.error('Failed to fetch UKRI projects', error);
      throw error;
    }
  }

  async transformGrant(rawGrant: any): Promise<NormalizedGrantData> {
    // Extract project details
    const project = rawGrant.projectComposition || rawGrant;
    const leadOrg = project.leadResearchOrganisation;
    const fund = project.fund || {};

    const grant = {
      data_source_id: this.dataSourceId!,
      source_identifier: project.id || rawGrant.id,
      source_url: rawGrant.href || `https://gtr.ukri.org/projects?ref=${project.id}`,
      title: project.title,
      status: this.mapProjectStatus(project.status),
      
      // Organization
      funding_organization_name: fund.funder?.name || 'UK Research and Innovation',
      funding_organization_code: fund.funder?.id || 'UKRI',
      
      // Funding
      currency: 'GBP',
      funding_amount_min: GrantNormalizer.normalizeAmount(fund.valuePounds),
      funding_amount_max: GrantNormalizer.normalizeAmount(fund.valuePounds),
      total_funding_available: GrantNormalizer.normalizeAmount(fund.valuePounds),
      
      // Dates
      start_date: GrantNormalizer.normalizeDate(fund.start),
      end_date: GrantNormalizer.normalizeDate(fund.end),
      
      // Classification
      grant_type: 'Research Grant',
      funding_instrument: project.grantCategory || 'Research Grant',
      
      // Raw data
      raw_data: rawGrant
    };

    // Details
    const details = {
      description: project.abstractText,
      purpose: project.potentialImpactText,
      additional_information: {
        project_reference: project.grantReference,
        research_topics: project.researchTopics,
        research_subjects: project.researchSubjects
      }
    };

    // Recipients
    const recipients = [];
    if (leadOrg) {
      recipients.push({
        recipient_name: leadOrg.name,
        recipient_organization_type: 'Research Institution',
        award_amount: GrantNormalizer.normalizeAmount(fund.valuePounds),
        project_start_date: GrantNormalizer.normalizeDate(fund.start),
        project_end_date: GrantNormalizer.normalizeDate(fund.end),
        location_country: 'GB',
        location_city: leadOrg.address?.city,
        principal_investigator: this.extractPIName(project.principalInvestigator),
        project_description: project.abstractText
      });
    }

    // Categories
    const categories: GrantCategory[] = [];
    
    // Research topics
    if (project.researchTopics && Array.isArray(project.researchTopics)) {
      project.researchTopics.forEach((topic: any) => {
        categories.push({
          category_type: 'research_area' as const,
          category_code: topic.id,
          category_name: topic.text || topic.name
        });
      });
    }

    // Research subjects
    if (project.researchSubjects && Array.isArray(project.researchSubjects)) {
      project.researchSubjects.forEach((subject: any) => {
        categories.push({
          category_type: 'subject' as const,
          category_code: subject.id,
          category_name: subject.text || subject.name
        });
      });
    }

    // Health categories
    if (project.healthCategories && Array.isArray(project.healthCategories)) {
      project.healthCategories.forEach((health: any) => {
        categories.push({
          category_type: 'theme' as const,
          category_code: health.id,
          category_name: health.text || health.name
        });
      });
    }

    // Keywords
    const keywords: GrantKeyword[] = [];
    if (project.keywords) {
      const keywordList = Array.isArray(project.keywords) 
        ? project.keywords 
        : project.keywords.split(',');
      
      keywordList.forEach((keyword: string) => {
        keywords.push({
          keyword: keyword.trim(),
          keyword_source: 'api_provided' as const
        });
      });
    }

    // Contacts
    const contacts: GrantContact[] = [];
    if (project.principalInvestigator) {
      const pi = project.principalInvestigator;
      contacts.push({
        contact_type: 'technical' as const,
        contact_name: this.extractPIName(pi),
        organization: leadOrg?.name,
        contact_title: 'Principal Investigator'
      });
    }

    // Locations
    const locations = [];
    if (leadOrg?.address) {
      locations.push({
        location_type: 'target' as const,
        country_code: 'GB',
        city: leadOrg.address.city,
        postal_code: leadOrg.address.postCode,
        region: leadOrg.address.region
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

  private mapProjectStatus(status: string): NormalizedGrantData['grant']['status'] {
    if (!status) return 'active';
    
    const statusLower = status.toLowerCase();
    if (statusLower.includes('active')) return 'active';
    if (statusLower.includes('closed') || statusLower.includes('completed')) return 'closed';
    if (statusLower.includes('awarded')) return 'awarded';
    
    return 'active';
  }

  private extractPIName(pi: any): string {
    if (!pi) return '';
    if (typeof pi === 'string') return pi;
    
    if (pi.firstName && pi.surname) {
      return `${pi.firstName} ${pi.surname}`;
    }
    if (pi.name) return pi.name;
    
    return '';
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
      const pageSize = 100;
      let currentPage = options.fullSync ? 1 : lastPage;
      let hasMore = true;

      while (hasMore && currentPage <= 100) { // Limit pages for safety
        try {
          logger.info(`Fetching UKRI projects page ${currentPage}`);
          
          const projects = await this.fetchGrants({
            p: currentPage,
            s: pageSize,
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
              // For detailed data, we might need to fetch individual project
              let projectData = rawProject;
              if (rawProject.href && !rawProject.projectComposition) {
                try {
                  const detailResponse = await axios.get(rawProject.href, {
                    headers: { 'Accept': 'application/json' },
                    timeout: 15000
                  });
                  projectData = detailResponse.data;
                } catch (detailError) {
                  logger.warn(`Failed to fetch project details for ${rawProject.id}`, detailError);
                }
              }

              const normalizedData = await this.transformGrant(projectData);
              
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
              logger.error(`Failed to process UKRI project ${rawProject.id}`, error);
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
          if (projects.length < pageSize) {
            hasMore = false;
          }

        } catch (error: any) {
          result.errors.push(`Fetch error at page ${currentPage}: ${error.message}`);
          logger.error('UKRI sync batch failed', error);
          
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
      logger.error('UKRI sync failed', error);
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