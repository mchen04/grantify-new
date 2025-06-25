import supabaseClient from '../../../db/supabaseClient';
import logger from '../../../utils/logger';

export interface ApiClientConfig {
  dataSourceName: string;
  baseUrl: string;
  authType: 'none' | 'api_key' | 'bearer';
  authCredentials?: any;
  rateLimit?: number;
  timeout?: number;
}

export interface ApiSyncResult {
  success: boolean;
  recordsFetched: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsFailed: number;
  errors: string[];
  metadata?: any;
}

export abstract class BaseApiClient {
  protected supabase;
  protected config: ApiClientConfig;
  protected dataSourceId?: string;
  protected syncLogId?: string;

  constructor(config: ApiClientConfig) {
    this.config = config;
    this.supabase = supabaseClient;
  }

  async initialize(): Promise<void> {
    // Get data source ID
    const { data, error } = await this.supabase
      .from('data_sources')
      .select('id')
      .eq('name', this.config.dataSourceName)
      .single();

    if (error) {
      throw new Error(`Failed to find data source ${this.config.dataSourceName}: ${error.message}`);
    }

    this.dataSourceId = data.id;
  }

  async startSyncLog(syncType: 'scheduled' | 'manual' = 'manual'): Promise<string> {
    const { data, error } = await this.supabase
      .from('api_sync_logs')
      .insert({
        data_source_id: this.dataSourceId,
        sync_type: syncType,
        status: 'started',
        started_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create sync log: ${error.message}`);
    }

    this.syncLogId = data.id;
    return data.id;
  }

  async updateSyncLog(updates: any): Promise<void> {
    if (!this.syncLogId) return;

    await this.supabase
      .from('api_sync_logs')
      .update(updates)
      .eq('id', this.syncLogId);
  }

  async completeSyncLog(result: ApiSyncResult): Promise<void> {
    if (!this.syncLogId) return;

    const endTime = new Date();
    const { data: log } = await this.supabase
      .from('api_sync_logs')
      .select('started_at')
      .eq('id', this.syncLogId)
      .single();

    const duration = log ? Math.round((endTime.getTime() - new Date(log.started_at).getTime()) / 1000) : 0;

    await this.supabase
      .from('api_sync_logs')
      .update({
        status: result.success ? 'completed' : 'failed',
        completed_at: endTime.toISOString(),
        duration_seconds: duration,
        records_fetched: result.recordsFetched,
        records_created: result.recordsCreated,
        records_updated: result.recordsUpdated,
        records_failed: result.recordsFailed,
        error_message: result.errors.length > 0 ? result.errors.join('; ') : null,
        metadata: result.metadata
      })
      .eq('id', this.syncLogId);
  }

  async checkRateLimit(): Promise<boolean> {
    if (!this.config.rateLimit || !this.dataSourceId) return true;

    const windowStart = new Date();
    windowStart.setMinutes(0, 0, 0);

    const { data } = await this.supabase
      .from('api_rate_limits')
      .select('requests_made')
      .eq('data_source_id', this.dataSourceId)
      .eq('window_start', windowStart.toISOString())
      .single();

    if (!data) {
      // Create new rate limit window
      await this.supabase
        .from('api_rate_limits')
        .insert({
          data_source_id: this.dataSourceId,
          window_start: windowStart.toISOString(),
          window_duration_seconds: 3600,
          requests_made: 0,
          requests_limit: this.config.rateLimit
        });
      return true;
    }

    return data.requests_made < this.config.rateLimit;
  }

  async incrementRateLimit(): Promise<void> {
    if (!this.config.rateLimit || !this.dataSourceId) return;

    const windowStart = new Date();
    windowStart.setMinutes(0, 0, 0);

    await this.supabase.rpc('increment', {
      row_id: this.dataSourceId,
      window_start: windowStart.toISOString(),
      table_name: 'api_rate_limits',
      column_name: 'requests_made'
    });
  }

  protected getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    if (this.config.authType === 'api_key' && this.config.authCredentials?.api_key) {
      if (this.config.authCredentials.api_key_header) {
        headers[this.config.authCredentials.api_key_header] = this.config.authCredentials.api_key;
      } else {
        headers['Authorization'] = `Bearer ${this.config.authCredentials.api_key}`;
      }
    }

    return headers;
  }

  async saveState(key: string, value: any): Promise<void> {
    if (!this.dataSourceId) return;

    await this.supabase
      .from('api_sync_state')
      .upsert({
        data_source_id: this.dataSourceId,
        state_key: key,
        state_value: value,
        last_updated: new Date().toISOString()
      });
  }

  async getState(key: string): Promise<any> {
    if (!this.dataSourceId) return null;

    const { data } = await this.supabase
      .from('api_sync_state')
      .select('state_value')
      .eq('data_source_id', this.dataSourceId)
      .eq('state_key', key)
      .single();

    return data?.state_value;
  }

  abstract sync(options?: any): Promise<ApiSyncResult>;
  abstract fetchGrants(params?: any): Promise<any[]>;
  abstract transformGrant(rawGrant: any): Promise<any>;
}