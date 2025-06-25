import axios from 'axios';
import { BaseApiClient, ApiSyncResult } from '../base/BaseApiClient';
import { GrantNormalizer, NormalizedGrantData, GrantCategory, GrantKeyword, GrantContact, GrantEligibility } from '../base/GrantNormalizer';

import logger from '../../../utils/logger';
export class FederalRegisterApiClient extends BaseApiClient {
  constructor() {
    super({
      dataSourceName: 'federal_register',
      baseUrl: 'https://www.federalregister.gov/api/v1/documents.json',
      authType: 'none'
    });
  }

  async fetchGrants(params: any = {}): Promise<any[]> {
    try {
      // Check rate limit
      if (!await this.checkRateLimit()) {
        throw new Error('Rate limit exceeded');
      }

      // Federal Register - search for grant-related notices
      const queryParams: any = {
        'conditions[term]': params.term || 'grant OR "funding opportunity" OR "cooperative agreement"',
        'per_page': params.per_page || 100,
        'page': params.page || 1,
        'order': params.order || 'newest'
      };

      // Add document type filter
      if (params.type || !params.type) {
        queryParams['conditions[type][]'] = 'Notice';
      }

      // Add agency filter if provided
      if (params.agencies && params.agencies.length > 0) {
        params.agencies.forEach((agency: string, index: number) => {
          queryParams[`conditions[agencies][${index}]`] = agency;
        });
      }

      // Add date range if provided
      if (params.publication_date_gte) {
        queryParams['conditions[publication_date][gte]'] = params.publication_date_gte;
      }
      if (params.publication_date_lte) {
        queryParams['conditions[publication_date][lte]'] = params.publication_date_lte;
      }

      const response = await axios.get(this.config.baseUrl, {
        params: queryParams,
        timeout: 30000
      });

      await this.incrementRateLimit();

      return response.data?.results || [];
    } catch (error: any) {
      logger.error('Failed to fetch Federal Register documents', error);
      throw error;
    }
  }

  async transformGrant(rawDocument: any): Promise<NormalizedGrantData> {
    // Federal Register provides early warnings about grants
    const grant: any = {
      data_source_id: this.dataSourceId!,
      source_identifier: rawDocument.document_number,
      source_url: rawDocument.html_url,
      title: rawDocument.title,
      status: this.determineStatus(rawDocument), // Determine based on content
      
      // Organization
      funding_organization_name: rawDocument.agencies?.[0]?.name || rawDocument.agencies?.[0]?.raw_name || 'Federal Agency',
      funding_organization_code: rawDocument.agencies?.[0]?.id || rawDocument.agencies?.[0]?.slug,
      
      // Dates
      posted_date: GrantNormalizer.normalizeDate(rawDocument.publication_date),
      
      // Classification
      grant_type: 'Funding Announcement',
      funding_instrument: rawDocument.subtype || rawDocument.type,
      
      // Raw data
      raw_data: rawDocument
    };

    // Add missing properties to grant after creation
    (grant as any).application_deadline = undefined;
    (grant as any).total_funding_available = undefined;

    // Details
    const details = {
      description: rawDocument.abstract || rawDocument.excerpts || '',
      additional_information: {
        document_number: rawDocument.document_number,
        document_type: rawDocument.type,
        pdf_url: rawDocument.pdf_url,
        json_url: rawDocument.json_url,
        public_inspection_pdf_url: rawDocument.public_inspection_pdf_url,
        regulation_id_numbers: rawDocument.regulation_id_numbers,
        docket_ids: rawDocument.docket_ids
      }
    };

    // Categories based on agencies
    const categories: GrantCategory[] = [];
    if (rawDocument.agencies && Array.isArray(rawDocument.agencies)) {
      rawDocument.agencies.forEach((agency: any) => {
        categories.push({
          category_type: 'topic' as const,
          category_code: agency.slug,
          category_name: agency.name
        });
      });
    }

    // Keywords - extract from title and abstract
    const keywords = GrantNormalizer.extractKeywords(
      `${grant.title} ${details.description}`,
      'extracted'
    );

    // Look for grant-specific keywords
    const grantKeywords = [
      'grant', 'funding', 'opportunity', 'application', 'award',
      'rfp', 'rfa', 'nofo', 'notice', 'announcement'
    ];
    
    grantKeywords.forEach(keyword => {
      if (grant.title.toLowerCase().includes(keyword) || 
          (details.description && details.description.toLowerCase().includes(keyword))) {
        keywords.push({
          keyword: keyword,
          keyword_source: 'extracted' as const,
          relevance_score: 0.8
        });
      }
    });

    // Try to extract funding amounts from abstract
    const amountMatch = details.description?.match(/\$[\d,]+(?:\.\d{2})?(?:\s*(?:million|billion))?/gi);
    if (amountMatch) {
      const amount = this.parseAmount(amountMatch[0]);
      if (amount) {
        grant.total_funding_available = amount;
      }
    }

    // Try to extract deadline from abstract
    const deadlinePatterns = [
      /deadline[:\s]+([A-Za-z]+ \d{1,2},? \d{4})/i,
      /due date[:\s]+([A-Za-z]+ \d{1,2},? \d{4})/i,
      /applications? due[:\s]+([A-Za-z]+ \d{1,2},? \d{4})/i
    ];
    
    for (const pattern of deadlinePatterns) {
      const match = details.description?.match(pattern);
      if (match) {
        grant.application_deadline = GrantNormalizer.normalizeDate(match[1]);
        break;
      }
    }

    return {
      grant,
      details,
      categories,
      keywords
    };
  }

  private parseAmount(amountStr: string): number | undefined {
    if (!amountStr) return undefined;
    
    // Remove $ and commas
    let amount = amountStr.replace(/[$,]/g, '');
    
    // Handle millions/billions
    if (amount.includes('million')) {
      amount = amount.replace(/\s*million/i, '');
      return parseFloat(amount) * 1000000;
    }
    if (amount.includes('billion')) {
      amount = amount.replace(/\s*billion/i, '');
      return parseFloat(amount) * 1000000000;
    }
    
    return parseFloat(amount);
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

      // For Federal Register, we typically want recent documents
      const maxPages = options.maxPages || 10; // Limit pages since it's for early warnings

      while (hasMore && currentPage <= maxPages) {
        try {
          logger.info(`Fetching Federal Register documents page ${currentPage}`);
          
          const documents = await this.fetchGrants({
            page: currentPage,
            per_page: perPage,
            ...options.filters
          });

          if (!documents || documents.length === 0) {
            hasMore = false;
            break;
          }

          result.recordsFetched += documents.length;

          // Process each document
          for (const rawDocument of documents) {
            try {
              // Only process if it looks grant-related
              if (!this.isGrantRelated(rawDocument)) {
                continue;
              }

              const normalizedData = await this.transformGrant(rawDocument);
              
              // Check if document exists
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
              result.errors.push(`Document ${rawDocument.document_number}: ${error.message}`);
              logger.error(`Failed to process Federal Register document ${rawDocument.document_number}`, error);
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
          if (documents.length < perPage) {
            hasMore = false;
          }

        } catch (error: any) {
          result.errors.push(`Fetch error at page ${currentPage}: ${error.message}`);
          logger.error('Federal Register sync batch failed', error);
          
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
      logger.error('Federal Register sync failed', error);
    } finally {
      await this.completeSyncLog(result);
    }

    return result;
  }

  private isGrantRelated(document: any): boolean {
    const grantTerms = [
      'grant', 'funding', 'award', 'assistance', 'cooperative agreement',
      'financial assistance', 'funding opportunity', 'rfp', 'rfa', 'nofo',
      'notice of funding', 'funding announcement', 'grant program'
    ];
    
    const text = `${document.title} ${document.abstract}`.toLowerCase();
    
    return grantTerms.some(term => text.includes(term));
  }

  private determineStatus(document: any): 'open' | 'closed' | 'forecasted' {
    const title = document.title?.toLowerCase() || '';
    const abstract = document.abstract?.toLowerCase() || '';
    const text = `${title} ${abstract}`;
    
    if (text.includes('notice of funding opportunity') || 
        text.includes('applications are now being accepted') ||
        text.includes('accepting applications')) {
      return 'open';
    }
    
    if (text.includes('forecast') || 
        text.includes('anticipated') ||
        text.includes('upcoming')) {
      return 'forecasted';
    }
    
    if (text.includes('closed') || 
        text.includes('deadline has passed')) {
      return 'closed';
    }
    
    // Default to forecasted for Federal Register notices
    return 'forecasted';
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
  }
}