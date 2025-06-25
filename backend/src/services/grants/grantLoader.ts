import { getServiceRoleClient } from '../../db/supabaseClient';
import { GrantNormalizer } from '../api-integrations/base/GrantNormalizer';
import logger from '../../utils/logger';
import {
  GrantsGovApiClient,
  FederalRegisterApiClient,
  NihReporterApiClient,
  NsfAwardsApiClient,
  CaliforniaGrantsApiClient,
  SamGovApiClient,
  UsaspendingApiClient,
  CanadianOpenGovApiClient,
  EuFundingApiClient,
  UkriGatewayApiClient,
  WorldBankApiClient,
  NyStateApiClient,
  OpenAlexApiClient
} from '../api-integrations/clients';

interface LoaderConfig {
  batchSize: number;
  maxRetries: number;
  retryDelay: number;
}

interface LoadResult {
  source: string;
  total: number;
  loaded: number;
  updated: number;
  errors: number;
  duration: number;
}

export class GrantLoader {
  private supabase = getServiceRoleClient();
  private normalizer = new GrantNormalizer();
  private config: LoaderConfig = {
    batchSize: 50,
    maxRetries: 3,
    retryDelay: 1000
  };

  private apiClients = [
    { name: 'grants_gov', client: new GrantsGovApiClient(), batchSize: 1000 },
    { name: 'federal_register', client: new FederalRegisterApiClient(), batchSize: 1000 },
    { name: 'nih_reporter', client: new NihReporterApiClient(), batchSize: 500 },
    { name: 'nsf_awards', client: new NsfAwardsApiClient(), batchSize: 1000 },
    { name: 'california_grants', client: new CaliforniaGrantsApiClient(), batchSize: 1000 },
    { name: 'sam_gov', client: new SamGovApiClient(), batchSize: 1000 },
    { name: 'usaspending', client: new UsaspendingApiClient(), batchSize: 100 },
    { name: 'canadian_open_gov', client: new CanadianOpenGovApiClient(), batchSize: 1000 },
    { name: 'eu_funding_portal', client: new EuFundingApiClient(), batchSize: 50 },
    { name: 'ukri_gateway', client: new UkriGatewayApiClient(), batchSize: 100 },
    { name: 'world_bank', client: new WorldBankApiClient(), batchSize: 500 },
    { name: 'ny_state', client: new NyStateApiClient(), batchSize: 1000 },
    { name: 'openalex', client: new OpenAlexApiClient(), batchSize: 200 }
  ];

  /**
   * Load all grants from all configured sources
   */
  async loadAll(): Promise<LoadResult[]> {
    logger.info('Starting comprehensive grant loading...');
    const results: LoadResult[] = [];

    // Get active data sources
    const { data: dataSources, error } = await this.supabase
      .from('data_sources')
      .select('*')
      .eq('is_active', true);

    if (error) {
      logger.error('Failed to fetch data sources:', error);
      throw new Error('Failed to fetch data sources');
    }

    const dataSourceMap = new Map(dataSources.map(ds => [ds.name, ds]));

    // Process each API client
    for (const { name, client, batchSize } of this.apiClients) {
      const dataSource = dataSourceMap.get(name);
      if (!dataSource) {
        logger.info(`Skipping ${name} - not found in data sources`);
        continue;
      }

      const result = await this.loadFromSource(name, client, dataSource.id, batchSize);
      results.push(result);
    }

    return results;
  }

  /**
   * Load grants from a specific source
   */
  async loadFromSource(
    sourceName: string,
    client: any,
    dataSourceId: string,
    batchSize: number
  ): Promise<LoadResult> {
    const startTime = Date.now();
    const result: LoadResult = {
      source: sourceName,
      total: 0,
      loaded: 0,
      updated: 0,
      errors: 0,
      duration: 0
    };

    try {
      logger.info(`Loading grants from ${sourceName}...`);
      
      // Initialize client
      client.dataSourceId = dataSourceId;
      await client.initialize();

      let hasMore = true;
      let offset = 0;
      let page = 1;

      while (hasMore) {
        try {
          // Fetch batch
          const params = {
            limit: batchSize,
            offset,
            page
          };

          const grants = await client.fetchGrants(params);
          
          if (!grants || grants.length === 0) {
            hasMore = false;
            break;
          }

          result.total += grants.length;

          // Process grants in smaller batches
          for (let i = 0; i < grants.length; i += this.config.batchSize) {
            const batch = grants.slice(i, i + this.config.batchSize);
            const processed = await this.processBatch(batch, client, dataSourceId);
            
            result.loaded += processed.loaded;
            result.updated += processed.updated;
            result.errors += processed.errors;
          }

          // Update pagination
          offset += grants.length;
          page++;

          // Save progress
          await client.saveState('last_offset', offset);
          await client.saveState('last_page', page);

          logger.info(`${sourceName}: Processed ${offset} grants`);

          // Check if we should continue
          if (grants.length < batchSize) {
            hasMore = false;
          }

        } catch (error) {
          logger.error(`Error fetching batch from ${sourceName}:`, error);
          result.errors++;
          
          // Try to continue with next batch
          offset += batchSize;
          page++;
        }
      }

      // Update last successful sync
      await this.supabase
        .from('data_sources')
        .update({ 
          last_successful_sync: new Date().toISOString(),
          total_grants_fetched: result.total,
          total_grants_loaded: result.loaded
        })
        .eq('id', dataSourceId);

    } catch (error) {
      logger.error(`Fatal error loading from ${sourceName}:`, error);
      result.errors++;
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Process a batch of grants
   */
  private async processBatch(
    grants: any[],
    client: any,
    dataSourceId: string
  ): Promise<{ loaded: number; updated: number; errors: number }> {
    const result = { loaded: 0, updated: 0, errors: 0 };
    const normalizedGrants = [];

    // Normalize each grant
    for (const grant of grants) {
      try {
        const normalized = await client.transformGrant(grant);
        if (normalized?.grant) {
          normalizedGrants.push({
            ...normalized,
            grant: {
              ...normalized.grant,
              data_source_id: dataSourceId
            }
          });
        }
      } catch (error) {
        logger.error('Failed to normalize grant:', error);
        result.errors++;
      }
    }

    // Bulk upsert grants
    if (normalizedGrants.length > 0) {
      try {
        // Upsert main grants
        const grantsToUpsert = normalizedGrants.map(n => n.grant);
        
        const { data: upserted, error } = await this.supabase
          .from('grants')
          .upsert(grantsToUpsert, {
            onConflict: 'data_source_id,source_identifier',
            ignoreDuplicates: false
          })
          .select('id, source_identifier, created_at, updated_at');

        if (error) {
          logger.error('Batch upsert error:', error);
          result.errors += normalizedGrants.length;
          return result;
        }

        // Count new vs updated
        for (const grant of upserted) {
          if (grant.created_at === grant.updated_at) {
            result.loaded++;
          } else {
            result.updated++;
          }
        }

        // Insert related data
        await this.insertRelatedData(upserted, normalizedGrants);

      } catch (error) {
        logger.error('Failed to process batch:', error);
        result.errors += normalizedGrants.length;
      }
    }

    return result;
  }

  /**
   * Insert related grant data (details, categories, etc.)
   */
  private async insertRelatedData(grants: any[], normalizedGrants: any[]) {
    for (let i = 0; i < grants.length; i++) {
      const grantId = grants[i].id;
      const normalized = normalizedGrants[i];

      try {
        // Details
        if (normalized.details) {
          await this.supabase
            .from('grant_details')
            .upsert({
              grant_id: grantId,
              ...normalized.details
            });
        }

        // Categories
        if (normalized.categories?.length > 0) {
          await this.supabase
            .from('grant_categories')
            .delete()
            .eq('grant_id', grantId);

          await this.supabase
            .from('grant_categories')
            .insert(normalized.categories.map((c: any) => ({
              grant_id: grantId,
              ...c
            })));
        }

        // Keywords
        if (normalized.keywords?.length > 0) {
          await this.supabase
            .from('grant_keywords')
            .delete()
            .eq('grant_id', grantId);

          const topKeywords = normalized.keywords.slice(0, 50);
          await this.supabase
            .from('grant_keywords')
            .insert(topKeywords.map((k: any) => ({
              grant_id: grantId,
              ...k
            })));
        }

        // Contacts
        if (normalized.contacts?.length > 0) {
          await this.supabase
            .from('grant_contacts')
            .delete()
            .eq('grant_id', grantId);

          await this.supabase
            .from('grant_contacts')
            .insert(normalized.contacts.map((c: any) => ({
              grant_id: grantId,
              ...c
            })));
        }

        // Eligibility
        if (normalized.eligibility?.length > 0) {
          await this.supabase
            .from('grant_eligibility')
            .delete()
            .eq('grant_id', grantId);

          await this.supabase
            .from('grant_eligibility')
            .insert(normalized.eligibility.map((e: any) => ({
              grant_id: grantId,
              ...e
            })));
        }

        // Locations
        if (normalized.locations?.length > 0) {
          await this.supabase
            .from('grant_locations')
            .delete()
            .eq('grant_id', grantId);

          await this.supabase
            .from('grant_locations')
            .insert(normalized.locations.map((l: any) => ({
              grant_id: grantId,
              ...l
            })));
        }

      } catch (error) {
        logger.error(`Failed to insert related data for grant ${grantId}:`, error);
      }
    }
  }

  /**
   * Update grants (incremental load - last 7 days)
   */
  async update(): Promise<LoadResult[]> {
    logger.info('Running incremental grant update...');
    
    // Create a separate loadAll with update parameters
    const results: LoadResult[] = [];

    // Get active data sources
    const { data: dataSources, error } = await this.supabase
      .from('data_sources')
      .select('*')
      .eq('is_active', true);

    if (error) {
      logger.error('Failed to fetch data sources:', error);
      throw new Error('Failed to fetch data sources');
    }

    const dataSourceMap = new Map(dataSources.map(ds => [ds.name, ds]));

    // Process each API client with update parameters
    for (const { name, client, batchSize } of this.apiClients) {
      const dataSource = dataSourceMap.get(name);
      if (!dataSource) {
        logger.info(`Skipping ${name} - not found in data sources`);
        continue;
      }

      // Create a wrapper client that adds update parameters
      const updateClient = {
        ...client,
        fetchGrants: async (params: any) => {
          const updateParams = {
            ...params,
            updated_since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
            posted_since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          };
          return client.fetchGrants(updateParams);
        }
      };

      const result = await this.loadFromSource(name, updateClient, dataSource.id, batchSize);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Get grant loading statistics
   */
  async getStats(): Promise<any> {
    const { data: summary } = await this.supabase.rpc('get_grants_summary');
    
    const { data: sources } = await this.supabase
      .from('data_sources')
      .select('name, last_successful_sync, total_grants_fetched, total_grants_loaded')
      .order('last_successful_sync', { ascending: false });

    const { count } = await this.supabase
      .from('grants')
      .select('*', { count: 'exact', head: true });

    return {
      totalGrants: count,
      bySource: summary,
      dataSources: sources
    };
  }
}