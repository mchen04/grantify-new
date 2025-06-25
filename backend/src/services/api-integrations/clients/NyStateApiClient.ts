import axios from 'axios';
import { BaseApiClient, ApiSyncResult } from '../base/BaseApiClient';
import { GrantNormalizer, NormalizedGrantData } from '../base/GrantNormalizer';
import logger from '../../../utils/logger';

export class NyStateApiClient extends BaseApiClient {
  // Dataset IDs for different grant programs
  private currentDatasetId?: string;
  private readonly DATASETS = {
    LOCAL_DEV_GRANTS: 'j5ab-5nj2',
    EFFICIENCY_GRANTS: 'fc8g-rgwz',
    ESTUARY_GRANTS: 'a828-8j32'
  };

  constructor() {
    super({
      dataSourceName: 'ny_state',
      baseUrl: 'https://data.ny.gov/api/views',
      authType: 'none'
    });
  }

  async fetchGrants(params: any = {}): Promise<any[]> {
    try {
      // Check rate limit
      if (!await this.checkRateLimit()) {
        throw new Error('Rate limit exceeded');
      }

      const datasetId = params.datasetId || this.DATASETS.LOCAL_DEV_GRANTS;
      const searchParams = {
        $limit: params.limit || 1000,
        $offset: params.offset || 0,
        $order: params.order || 'fiscal_year_end_date DESC',
        ...params.filters
      };

      // Add date filter for recent grants
      if (params.daysBack) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - params.daysBack);
        searchParams.$where = `fiscal_year_end_date > '${cutoffDate.toISOString().split('T')[0]}'`;
      }

      const response = await axios.get(`${this.config.baseUrl}/${datasetId}/rows.json`, {
        params: searchParams,
        timeout: 30000
      });

      await this.incrementRateLimit();

      return response.data?.data || [];
    } catch (error: any) {
      logger.error('Failed to fetch NY State grants', error);
      throw error;
    }
  }

  async transformGrant(rawGrant: any): Promise<NormalizedGrantData | null> {
    // Get datasetId from raw grant data
    const datasetId = rawGrant._datasetId || this.currentDatasetId || this.DATASETS.LOCAL_DEV_GRANTS;
    // Transform based on dataset structure
    const grantData = this.parseGrantByDataset(rawGrant, datasetId);
    if (!grantData || !grantData.has_grants) return null;

    const grant = {
      data_source_id: this.dataSourceId!,
      source_identifier: `${datasetId}_${grantData.recipient_name}_${grantData.fiscal_year}`,
      source_url: `https://data.ny.gov/Government-Finance/Local-Development-Corporations-Grants/j5ab-5nj2`,
      title: `${grantData.authority} Grant to ${grantData.recipient_name}`,
      status: 'awarded' as const, // NY State data shows awarded grants
      
      // Organization
      funding_organization_name: grantData.authority,
      funding_organization_code: 'NYS',
      
      // Funding
      currency: 'USD',
      funding_amount_min: grantData.amount,
      funding_amount_max: grantData.amount,
      
      // Dates
      end_date: GrantNormalizer.normalizeDate(grantData.fiscal_year_end),
      
      // Classification
      grant_type: this.getGrantTypeByDataset(datasetId),
      funding_instrument: 'State Grant',
      
      // Raw data
      raw_data: rawGrant
    };

    // Details
    const details = {
      description: grantData.purpose || grantData.description,
      additional_information: {
        program: this.getProgramNameByDataset(datasetId),
        fund_source: grantData.fund_source,
        fiscal_year: grantData.fiscal_year,
        dataset_id: datasetId
      }
    };

    // Recipients
    const recipients = [];
    if (grantData.recipient_name) {
      recipients.push({
        recipient_name: grantData.recipient_name,
        recipient_type: 'Organization',
        award_amount: grantData.amount,
        location_city: grantData.recipient_city,
        location_state: grantData.recipient_state || 'NY',
        location_postal_code: grantData.recipient_zip,
        location_country: 'US'
      });
    }

    // Categories
    const categories = [{
      category_type: 'topic' as const,
      category_name: this.getProgramNameByDataset(datasetId)
    }];

    if (grantData.authority) {
      categories.push({
        category_type: 'topic' as const,
        category_name: grantData.authority
      });
    }

    // Keywords
    const keywords = GrantNormalizer.extractKeywords(
      `${grant.title} ${details.description}`,
      'extracted'
    );

    // Add program-specific keywords
    keywords.push({
      keyword: 'New York State',
      keyword_source: 'api_provided' as const
    });

    // Locations
    const locations = [];
    if (grantData.recipient_city || grantData.recipient_state) {
      locations.push({
        location_type: 'target' as const,
        country_code: 'US',
        state_province: grantData.recipient_state || 'NY',
        city: grantData.recipient_city,
        postal_code: grantData.recipient_zip
      });
    }

    return {
      grant,
      details,
      categories,
      keywords,
      locations
    };
  }

  private parseGrantByDataset(row: any[], datasetId: string): any {
    switch (datasetId) {
      case this.DATASETS.LOCAL_DEV_GRANTS:
        return {
          authority: row[8],
          fiscal_year: row[9],
          fiscal_year_end: row[9], // Use fiscal year as date
          has_grants: row[10] === 'Yes',
          fund_source: row[11],
          recipient_name: row[12],
          recipient_city: row[13],
          recipient_state: row[14],
          recipient_zip: row[15],
          amount: this.parseAmount(row[16]),
          purpose: row[17] || 'Local development grant'
        };
      
      case this.DATASETS.EFFICIENCY_GRANTS:
        // Adapt based on actual column structure
        return {
          authority: 'Local Government Efficiency Program',
          fiscal_year: row[0],
          fiscal_year_end: row[0],
          has_grants: true,
          recipient_name: row[1],
          amount: this.parseAmount(row[2]),
          purpose: row[3] || 'Government efficiency improvement'
        };
      
      case this.DATASETS.ESTUARY_GRANTS:
        // Adapt based on actual column structure
        return {
          authority: 'Hudson River Estuary Program',
          fiscal_year: row[0],
          fiscal_year_end: row[0],
          has_grants: true,
          recipient_name: row[1],
          amount: this.parseAmount(row[2]),
          purpose: row[3] || 'Environmental protection and restoration'
        };
      
      default:
        return null;
    }
  }

  private parseAmount(amountStr: any): number | undefined {
    if (!amountStr) return undefined;
    
    const clean = String(amountStr).replace(/[$,]/g, '');
    const amount = parseFloat(clean);
    
    return isNaN(amount) ? undefined : amount;
  }

  private getGrantTypeByDataset(datasetId: string): string {
    const typeMap: Record<string, string> = {
      [this.DATASETS.LOCAL_DEV_GRANTS]: 'Economic Development Grant',
      [this.DATASETS.EFFICIENCY_GRANTS]: 'Government Efficiency Grant',
      [this.DATASETS.ESTUARY_GRANTS]: 'Environmental Grant'
    };
    
    return typeMap[datasetId] || 'State Grant';
  }

  private getProgramNameByDataset(datasetId: string): string {
    const programMap: Record<string, string> = {
      [this.DATASETS.LOCAL_DEV_GRANTS]: 'Local Development Corporation Grants',
      [this.DATASETS.EFFICIENCY_GRANTS]: 'Local Government Efficiency Program',
      [this.DATASETS.ESTUARY_GRANTS]: 'Hudson River Estuary Grants'
    };
    
    return programMap[datasetId] || 'NY State Grant Program';
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

      // Sync all datasets
      const datasets = Object.entries(this.DATASETS);
      
      for (const [datasetName, datasetId] of datasets) {
        try {
          this.currentDatasetId = datasetId;
          logger.info(`Syncing NY State dataset: ${datasetName}`);
          
          const datasetResult = await this.syncDataset(datasetId, options);
          
          // Aggregate results
          result.recordsFetched += datasetResult.recordsFetched;
          result.recordsCreated += datasetResult.recordsCreated;
          result.recordsUpdated += datasetResult.recordsUpdated;
          result.recordsFailed += datasetResult.recordsFailed;
          result.errors.push(...datasetResult.errors);
          
        } catch (error: any) {
          result.errors.push(`Dataset ${datasetName}: ${error.message}`);
          logger.error(`Failed to sync dataset ${datasetName}`, error);
        }
      }

      result.success = result.errors.length === 0;
      
    } catch (error: any) {
      result.errors.push(error.message);
      logger.error('NY State sync failed', error);
    } finally {
      await this.completeSyncLog(result);
    }

    return result;
  }

  private async syncDataset(datasetId: string, options: any): Promise<ApiSyncResult> {
    const result: ApiSyncResult = {
      success: false,
      recordsFetched: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsFailed: 0,
      errors: []
    };

    // Get last sync state for this dataset
    const stateKey = `last_offset_${datasetId}`;
    const lastOffset = await this.getState(stateKey) || 0;
    const limit = 1000;
    let currentOffset = options.fullSync ? 0 : lastOffset;
    let hasMore = true;

    // Limit to recent data (past 2 years by default)
    const daysBack = options.daysBack || 730;

    while (hasMore) {
      try {
        const grants = await this.fetchGrants({
          datasetId,
          offset: currentOffset,
          limit,
          daysBack,
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
            // Attach datasetId to rawGrant for transformGrant method
            rawGrant._datasetId = datasetId;
            const normalizedData = await this.transformGrant(rawGrant);
            if (!normalizedData) continue; // Skip if not a grant record

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
            result.errors.push(`Grant in ${datasetId}: ${error.message}`);
            logger.error(`Failed to process NY State grant`, error);
          }
        }

        // Update state
        currentOffset += limit;
        await this.saveState(stateKey, currentOffset);

        // Check if we should continue
        if (grants.length < limit) {
          hasMore = false;
        }

        // Limit total records per dataset
        if (currentOffset >= 10000 && !options.fullSync) {
          hasMore = false;
        }

      } catch (error: any) {
        result.errors.push(`Fetch error at offset ${currentOffset}: ${error.message}`);
        logger.error('NY State dataset sync batch failed', error);
        
        if (result.errors.length > 10) {
          throw new Error('Too many errors, aborting dataset sync');
        }
      }
    }

    // Reset offset if full sync completed
    if (options.fullSync && !result.errors.length) {
      await this.saveState(stateKey, 0);
    }

    result.success = result.errors.length === 0;
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