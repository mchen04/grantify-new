import axios from 'axios';
import { BaseApiClient, ApiSyncResult } from '../base/BaseApiClient';
import { GrantNormalizer, NormalizedGrantData, GrantCategory, GrantKeyword, GrantContact, GrantEligibility, GrantLocation } from '../base/GrantNormalizer';

import logger from '../../../utils/logger';
export class OpenAlexApiClient extends BaseApiClient {
  constructor() {
    super({
      dataSourceName: 'openalex',
      baseUrl: 'https://api.openalex.org/works',
      authType: 'none',
      rateLimit: 100000 // 100k requests per day with polite email
    });
  }

  async fetchGrants(params: any = {}): Promise<any[]> {
    try {
      // Check rate limit
      if (!await this.checkRateLimit()) {
        throw new Error('Rate limit exceeded');
      }

      // OpenAlex - search for works that mention grants/funding
      const searchParams = {
        filter: params.filter || 'has_fulltext:true,publication_year:>2020',
        search: params.search || 'grant OR funding OR "supported by" OR "funded by"',
        page: params.page || 1,
        per_page: params.per_page || 100,
        mailto: 'support@grantify.ai' // Polite email for higher rate limits
      };

      const response = await axios.get(this.config.baseUrl, {
        params: searchParams,
        headers: {
          'User-Agent': 'Grantify.ai/1.0 (mailto:support@grantify.ai)'
        },
        timeout: 30000
      });

      await this.incrementRateLimit();

      return response.data?.results || [];
    } catch (error: any) {
      logger.error('Failed to fetch OpenAlex works', error);
      throw error;
    }
  }

  async transformGrant(rawWork: any): Promise<NormalizedGrantData | null> {
    // Extract grant information from the work
    const grantInfo = this.extractGrantInfo(rawWork);
    if (!grantInfo) return null;

    const grant = {
      data_source_id: this.dataSourceId!,
      source_identifier: `${rawWork.id}_${grantInfo.funder}`,
      source_url: rawWork.doi || rawWork.id,
      title: `${grantInfo.funder} Grant - ${rawWork.title}`,
      status: 'awarded' as const, // OpenAlex shows publications from awarded grants
      
      // Organization
      funding_organization_name: grantInfo.funder,
      
      // Dates
      posted_date: GrantNormalizer.normalizeDate(rawWork.publication_date),
      
      // Classification
      grant_type: 'Research Grant',
      funding_instrument: 'Research Grant',
      
      // Raw data
      raw_data: rawWork
    };

    // Details
    const details = {
      description: rawWork.abstract || `Research grant mentioned in: ${rawWork.title}`,
      additional_information: {
        work_id: rawWork.id,
        doi: rawWork.doi,
        grant_numbers: grantInfo.grantNumbers,
        publication_title: rawWork.title,
        publication_date: rawWork.publication_date,
        cited_by_count: rawWork.cited_by_count
      }
    };

    // Categories based on concepts
    const categories: GrantCategory[] = [];
    if (rawWork.concepts && Array.isArray(rawWork.concepts)) {
      rawWork.concepts.slice(0, 5).forEach((concept: any) => {
        if (concept.score > 0.3) {
          categories.push({
            category_type: 'research_area' as const,
            category_name: concept.display_name,
            category_hierarchy: concept.ancestors?.map((a: any) => a.display_name).join(' > ')
          });
        }
      });
    }

    // Keywords from topics
    const keywords: GrantKeyword[] = [];
    if (rawWork.topics && Array.isArray(rawWork.topics)) {
      rawWork.topics.forEach((topic: any) => {
        keywords.push({
          keyword: topic.display_name,
          keyword_source: 'api_provided' as const,
          relevance_score: topic.score
        });
      });
    }

    // Recipients - extract from authorships
    const recipients: any[] = [];
    if (rawWork.authorships && Array.isArray(rawWork.authorships)) {
      const institutions = new Set();
      rawWork.authorships.forEach((authorship: any) => {
        authorship.institutions?.forEach((inst: any) => {
          if (!institutions.has(inst.id)) {
            institutions.add(inst.id);
            recipients.push({
              recipient_name: inst.display_name,
              recipient_type: inst.type || 'Research Institution',
              location_country: inst.country_code,
              principal_investigator: authorship.author?.display_name
            });
          }
        });
      });
    }

    // Locations from institutions
    const locations: GrantLocation[] = [];
    const locationSet = new Set();
    recipients.forEach(recipient => {
      if (recipient.location_country && !locationSet.has(recipient.location_country)) {
        locationSet.add(recipient.location_country);
        locations.push({
          location_type: 'target' as const,
          country_code: recipient.location_country
        });
      }
    });

    return {
      grant,
      details,
      categories,
      keywords,
      locations
    };
  }

  private extractGrantInfo(work: any): { funder: string; grantNumbers: string[] } | null {
    const grantInfo = {
      funder: '',
      grantNumbers: [] as string[]
    };

    // Check grants field
    if (work.grants && Array.isArray(work.grants)) {
      work.grants.forEach((grant: any) => {
        if (grant.funder_display_name) {
          grantInfo.funder = grant.funder_display_name;
        }
        if (grant.award_id) {
          grantInfo.grantNumbers.push(grant.award_id);
        }
      });
    }

    // If no grants field, try to extract from abstract or title
    if (!grantInfo.funder) {
      const text = `${work.title} ${work.abstract || ''}`;
      
      // Common funder patterns
      const funderPatterns = [
        /(?:funded|supported) by (?:the )?([A-Z][A-Za-z\s&]+?)(?:\s*\(|,|\.|$)/,
        /([A-Z][A-Za-z\s&]+?) (?:grant|award|contract)/,
        /(?:NSF|NIH|DOE|NASA|DARPA|ONR|AFOSR|ARO) grant/i
      ];

      for (const pattern of funderPatterns) {
        const match = text.match(pattern);
        if (match) {
          grantInfo.funder = match[1].trim();
          break;
        }
      }

      // Extract grant numbers
      const grantNumberPatterns = [
        /(?:grant|award|contract)\s*(?:no\.?|number|#)?\s*([A-Z0-9-]+)/gi,
        /\b([A-Z]{2,4}-?\d{2,}-?\d{3,})\b/g
      ];

      grantNumberPatterns.forEach(pattern => {
        const matches = text.matchAll(pattern);
        for (const match of matches) {
          if (match[1]) {
            grantInfo.grantNumbers.push(match[1]);
          }
        }
      });
    }

    return grantInfo.funder ? grantInfo : null;
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
      const perPage = 100;
      let currentPage = options.fullSync ? 1 : lastPage;
      let hasMore = true;

      // OpenAlex has millions of works, so limit scope
      const maxPages = options.maxPages || 20;

      while (hasMore && currentPage <= maxPages) {
        try {
          logger.info(`Fetching OpenAlex works page ${currentPage}`);
          
          const works = await this.fetchGrants({
            page: currentPage,
            per_page: perPage,
            ...options.filters
          });

          if (!works || works.length === 0) {
            hasMore = false;
            break;
          }

          result.recordsFetched += works.length;

          // Process each work
          for (const rawWork of works) {
            try {
              const normalizedData = await this.transformGrant(rawWork);
              if (!normalizedData) continue; // Skip if no grant info found

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
              result.errors.push(`Work ${rawWork.id}: ${error.message}`);
              logger.error(`Failed to process OpenAlex work ${rawWork.id}`, error);
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
          if (works.length < perPage) {
            hasMore = false;
          }

        } catch (error: any) {
          result.errors.push(`Fetch error at page ${currentPage}: ${error.message}`);
          logger.error('OpenAlex sync batch failed', error);
          
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
      logger.error('OpenAlex sync failed', error);
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
  }
}