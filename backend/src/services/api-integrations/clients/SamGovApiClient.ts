import axios from 'axios';
import { BaseApiClient, ApiSyncResult } from '../base/BaseApiClient';
import { GrantNormalizer, NormalizedGrantData, GrantCategory, GrantKeyword, GrantContact, GrantEligibility } from '../base/GrantNormalizer';

import logger from '../../../utils/logger';
export class SamGovApiClient extends BaseApiClient {
  private readonly apiKey: string;

  constructor() {
    super({
      dataSourceName: 'sam_gov',
      baseUrl: 'https://api.sam.gov',
      authType: 'api_key'
    });
    
    // API key from documentation
    this.apiKey = process.env.SAM_GOV_API_KEY || 'hZGb0TZNwLTGyb6NbFjGLPFS9Ox7XJCOiUoQ48CY';
  }

  async fetchGrants(params: any = {}): Promise<any[]> {
    try {
      // Check rate limit
      if (!await this.checkRateLimit()) {
        throw new Error('Rate limit exceeded');
      }

      // SAM.gov Contract Opportunities API - look for grant-adjacent opportunities
      const searchParams = {
        api_key: this.apiKey,
        postedFrom: params.postedFrom || this.getDateDaysAgo(30),
        postedTo: params.postedTo || this.getToday(),
        limit: params.limit || 100,
        offset: params.offset || 0,
        ptype: params.ptype || 's,p,r', // Special notices, pre-solicitations, sources sought
        ...params.filters
      };

      // Look for keywords that might indicate grants
      if (!params.title && !params.description) {
        searchParams.title = 'grant OR cooperative agreement OR assistance OR funding opportunity';
      }

      const response = await axios.get(`${this.config.baseUrl}/opportunities/v2/search`, {
        params: searchParams,
        timeout: 30000
      });

      await this.incrementRateLimit();

      // Also fetch entity information for grant-eligible organizations
      if (params.includeEntities) {
        await this.fetchGrantEligibleEntities(params);
      }

      return response.data?.opportunitiesData || [];
    } catch (error: any) {
      logger.error('Failed to fetch SAM.gov opportunities', error);
      throw error;
    }
  }

  async fetchGrantEligibleEntities(params: any = {}): Promise<any[]> {
    try {
      const entityParams = {
        api_key: this.apiKey,
        samRegistered: 'Yes',
        registrationStatus: 'Active',
        purposeOfRegistrationCode: 'Z1,Z2,Z4,Z5', // Grant-eligible codes
        limit: params.limit || 100,
        offset: params.offset || 0
      };

      const response = await axios.get(`${this.config.baseUrl}/entity-information/v2/entities`, {
        params: entityParams,
        timeout: 30000
      });

      return response.data?.entityData || [];
    } catch (error: any) {
      logger.error('Failed to fetch SAM.gov entities', error);
      return [];
    }
  }

  async transformGrant(rawOpportunity: any): Promise<NormalizedGrantData | null> {
    // Only process if it looks grant-related
    if (!this.isGrantRelated(rawOpportunity)) {
      return null;
    }

    const grant = {
      data_source_id: this.dataSourceId!,
      source_identifier: rawOpportunity.noticeId,
      source_url: rawOpportunity.uiLink || `https://sam.gov/opp/${rawOpportunity.noticeId}`,
      title: rawOpportunity.title,
      status: this.mapOpportunityStatus(rawOpportunity),
      
      // Organization
      funding_organization_name: rawOpportunity.department?.[0]?.name || rawOpportunity.organizationHierarchy?.[0]?.name,
      funding_organization_code: rawOpportunity.department?.[0]?.code,
      
      // Dates
      posted_date: GrantNormalizer.normalizeDate(rawOpportunity.postedDate),
      funding_amount_min: GrantNormalizer.normalizeAmount(rawOpportunity.awardFloor),
      funding_amount_max: GrantNormalizer.normalizeAmount(rawOpportunity.awardCeiling),
      response_deadline: GrantNormalizer.normalizeDate(rawOpportunity.responseDeadLine),
      archive_date: GrantNormalizer.normalizeDate(rawOpportunity.archiveDate),
      
      // Classification
      grant_type: this.mapNoticeType(rawOpportunity.type),
      funding_instrument: 'Potential Grant Opportunity',
      
      // Raw data
      raw_data: rawOpportunity
    };

    // If there's an award info, extract funding amounts
    if (rawOpportunity.award) {
      grant.funding_amount_min = GrantNormalizer.normalizeAmount(rawOpportunity.award.amount);
      grant.funding_amount_max = GrantNormalizer.normalizeAmount(rawOpportunity.award.amount);
    }

    // Details
    const details = {
      description: rawOpportunity.description,
      additional_information: {
        notice_id: rawOpportunity.noticeId,
        notice_type: rawOpportunity.type,
        notice_subtype: rawOpportunity.subtype,
        classification_code: rawOpportunity.classificationCode,
        naics_codes: rawOpportunity.naicsCode,
        set_aside: rawOpportunity.typeOfSetAside,
        organization_hierarchy: rawOpportunity.organizationHierarchy
      }
    };

    // Categories
    const categories: GrantCategory[] = [];
    
    // Department/Agency
    if (rawOpportunity.department && Array.isArray(rawOpportunity.department)) {
      rawOpportunity.department.forEach((dept: any) => {
        categories.push({
          category_type: 'topic' as const,
          category_code: dept.code,
          category_name: dept.name
        });
      });
    }

    // NAICS codes
    if (rawOpportunity.naicsCode && Array.isArray(rawOpportunity.naicsCode)) {
      rawOpportunity.naicsCode.forEach((naics: any) => {
        categories.push({
          category_type: 'sector' as const,
          category_code: naics,
          category_name: `NAICS ${naics}`
        });
      });
    }

    // Keywords
    const keywords = GrantNormalizer.extractKeywords(
      `${grant.title} ${details.description}`,
      'extracted'
    );

    // Add grant-related keywords if found
    const grantKeywords = ['grant', 'cooperative agreement', 'assistance', 'funding'];
    grantKeywords.forEach(keyword => {
      if (grant.title.toLowerCase().includes(keyword) || 
          (details.description && details.description.toLowerCase().includes(keyword))) {
        keywords.push({
          keyword: keyword,
          keyword_source: 'extracted' as const,
          relevance_score: 0.9
        });
      }
    });

    // Locations
    const locations = [];
    if (rawOpportunity.placeOfPerformance) {
      const pop = rawOpportunity.placeOfPerformance;
      locations.push({
        location_type: 'target' as const,
        country_code: pop.country?.code || 'US',
        state_province: pop.state?.code,
        city: pop.city?.name,
        geographic_description: pop.city?.name || pop.state?.name
      });
    }

    // Contacts
    const contacts: GrantContact[] = [];
    if (rawOpportunity.pointOfContact) {
      rawOpportunity.pointOfContact.forEach((poc: any) => {
        contacts.push({
          contact_type: poc.type || 'primary' as const,
          contact_name: poc.fullName,
          email: poc.email,
          phone: poc.phone,
          organization: grant.funding_organization_name
        });
      });
    }

    // Documents
    const documents: any[] = [];
    if (rawOpportunity.attachments && Array.isArray(rawOpportunity.attachments)) {
      rawOpportunity.attachments.forEach((attachment: any) => {
        documents.push({
          document_type: 'attachment' as const,
          document_name: attachment.name,
          document_url: attachment.link
        });
      });
    }

    // Eligibility - if set-aside information exists
    const eligibility: GrantEligibility[] = [];
    if (rawOpportunity.typeOfSetAside && rawOpportunity.typeOfSetAside !== 'N/A') {
      eligibility.push({
        eligibility_type: 'other' as const,
        eligibility_value: rawOpportunity.typeOfSetAside,
        eligibility_description: this.getSetAsideDescription(rawOpportunity.typeOfSetAside),
        is_required: true
      });
    }

    return {
      grant,
      details,
      categories,
      keywords,
      locations,
      contacts,
      eligibility
    };
  }

  private isGrantRelated(opportunity: any): boolean {
    const grantIndicators = [
      'grant', 'cooperative agreement', 'assistance', 'funding opportunity',
      'financial assistance', 'award', 'subsidy', 'fellowship',
      'scholarship', 'research funding', 'program funding'
    ];
    
    const text = `${opportunity.title} ${opportunity.description}`.toLowerCase();
    
    // Check if it's a special notice or sources sought that mentions grants
    if (opportunity.type === 's' || opportunity.type === 'r') {
      return grantIndicators.some(indicator => text.includes(indicator));
    }
    
    return false;
  }

  private mapOpportunityStatus(opportunity: any): NormalizedGrantData['grant']['status'] {
    if (opportunity.active === 'Yes') {
      return 'open';
    }
    
    const now = new Date();
    const responseDeadline = opportunity.responseDeadLine ? new Date(opportunity.responseDeadLine) : null;
    
    if (responseDeadline && responseDeadline < now) {
      return 'closed';
    }
    
    return 'active';
  }

  private mapNoticeType(type: string): string {
    const typeMap: Record<string, string> = {
      'p': 'Pre-solicitation',
      'o': 'Solicitation',
      'r': 'Sources Sought',
      's': 'Special Notice',
      'k': 'Combined Synopsis/Solicitation',
      'g': 'Sale of Surplus Property',
      'i': 'Intent to Bundle'
    };
    
    return typeMap[type] || 'Notice';
  }

  private getSetAsideDescription(setAside: string): string {
    const descriptions: Record<string, string> = {
      'SBA': 'Small Business Set-Aside',
      'SBP': 'Small Business Set-Aside (Partial)',
      '8A': '8(a) Business Development Program',
      '8AN': '8(a) Sole Source',
      'HZC': 'HUBZone Set-Aside',
      'HZS': 'HUBZone Sole Source',
      'SDVOSBC': 'Service-Disabled Veteran-Owned Small Business',
      'SDVOSBS': 'SDVO Small Business Sole Source',
      'WOSB': 'Women-Owned Small Business',
      'WOSBSS': 'WOSB Sole Source',
      'EDWOSB': 'Economically Disadvantaged WOSB',
      'EDWOSBSS': 'EDWOSB Sole Source',
      'LAS': 'Local Area Set-Aside'
    };
    
    return descriptions[setAside] || setAside;
  }

  private getDateDaysAgo(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
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
      const lastOffset = await this.getState('last_offset') || 0;
      const limit = 100;
      let currentOffset = options.fullSync ? 0 : lastOffset;
      let hasMore = true;

      // Limit scope since this is primarily for grant-adjacent opportunities
      const maxRecords = options.maxRecords || 1000;

      while (hasMore && currentOffset < maxRecords) {
        try {
          logger.info(`Fetching SAM.gov opportunities from offset ${currentOffset}`);
          
          const opportunities = await this.fetchGrants({
            offset: currentOffset,
            limit: limit,
            ...options.filters
          });

          if (!opportunities || opportunities.length === 0) {
            hasMore = false;
            break;
          }

          result.recordsFetched += opportunities.length;

          // Process each opportunity
          for (const rawOpportunity of opportunities) {
            try {
              const normalizedData = await this.transformGrant(rawOpportunity);
              if (!normalizedData) continue; // Skip non-grant opportunities

              // Check if opportunity exists
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
              result.errors.push(`Opportunity ${rawOpportunity.noticeId}: ${error.message}`);
              logger.error(`Failed to process SAM.gov opportunity ${rawOpportunity.noticeId}`, error);
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
          if (opportunities.length < limit) {
            hasMore = false;
          }

        } catch (error: any) {
          result.errors.push(`Fetch error at offset ${currentOffset}: ${error.message}`);
          logger.error('SAM.gov sync batch failed', error);
          
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
      logger.error('SAM.gov sync failed', error);
    } finally {
      await this.completeSyncLog(result);
    }

    return result;
  }

  // Entity verification methods
  async verifyOrganizationEligibility(orgName?: string, uei?: string): Promise<any> {
    try {
      const params: any = {
        api_key: this.apiKey,
        samRegistered: 'Yes',
        registrationStatus: 'Active'
      };

      if (uei) {
        params.ueiSAM = uei;
      } else if (orgName) {
        params.legalBusinessName = orgName;
      }

      const response = await axios.get(`${this.config.baseUrl}/entity-information/v2/entities`, {
        params,
        timeout: 30000
      });

      const data = response.data;
      
      if (data.totalRecords > 0) {
        const entity = data.entityData[0];
        const registration = entity.entityRegistration;
        
        return {
          eligible: this.checkGrantEligibility(registration),
          uei: registration.ueiSAM,
          legalName: registration.legalBusinessName,
          status: registration.registrationStatus,
          expirationDate: registration.registrationExpirationDate,
          purposeOfRegistration: registration.purposeOfRegistrationDesc,
          businessTypes: entity.assertions?.businessTypeList,
          certifications: this.extractCertifications(entity)
        };
      }

      return { eligible: false, reason: 'Organization not found in SAM.gov' };
    } catch (error: any) {
      logger.error('Failed to verify organization', error);
      throw error;
    }
  }

  private checkGrantEligibility(registration: any): boolean {
    // Check if purpose of registration includes grant eligibility
    const grantEligibleCodes = ['Z1', 'Z2', 'Z4', 'Z5'];
    return grantEligibleCodes.includes(registration.purposeOfRegistrationCode);
  }

  private extractCertifications(entity: any): string[] {
    const certs = [];
    const assertions = entity.assertions;
    
    if (assertions) {
      if (assertions.sbaBusinessTypeList?.includes('8(a) Program Participant')) {
        certs.push('8(a)');
      }
      if (assertions.sbaBusinessTypeList?.includes('HUBZone')) {
        certs.push('HUBZone');
      }
      if (assertions.veteranOwnedBusiness === 'Y') {
        certs.push('Veteran-Owned');
      }
      if (assertions.serviceDisabledVeteranOwnedBusiness === 'Y') {
        certs.push('Service-Disabled Veteran-Owned');
      }
      if (assertions.womenOwnedBusiness === 'Y') {
        certs.push('Women-Owned');
      }
      if (assertions.minorityOwnedBusiness === 'Y') {
        certs.push('Minority-Owned');
      }
    }
    
    return certs;
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

    // Insert documents
//     if (data.documents && data.documents.length > 0) {
//       await this.supabase
//         .from('grant_documents')
//         .insert(data.documents.map(d => ({ ...d, grant_id: grantId })));
//     }

    // Insert eligibility
    if (data.eligibility && data.eligibility.length > 0) {
      await this.supabase
        .from('grant_eligibility')
        .insert(data.eligibility.map(e => ({ ...e, grant_id: grantId })));
    }
  }
}