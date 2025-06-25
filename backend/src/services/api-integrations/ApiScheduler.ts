import * as cron from 'node-cron';
import supabaseClient from '../../db/supabaseClient';
import logger from '../../utils/logger';
import { BaseApiClient } from './base/BaseApiClient';

// Import all API clients
import { GrantsGovApiClient } from './clients/GrantsGovApiClient';
import { EuFundingApiClient } from './clients/EuFundingApiClient';
import { NihReporterApiClient } from './clients/NihReporterApiClient';
import { NsfAwardsApiClient } from './clients/NsfAwardsApiClient';
import { CanadianOpenGovApiClient } from './clients/CanadianOpenGovApiClient';
import { UkriGatewayApiClient } from './clients/UkriGatewayApiClient';
import { WorldBankApiClient } from './clients/WorldBankApiClient';
import { FederalRegisterApiClient } from './clients/FederalRegisterApiClient';
import { UsaspendingApiClient } from './clients/UsaspendingApiClient';
import { CaliforniaGrantsApiClient } from './clients/CaliforniaGrantsApiClient';
import { OpenAlexApiClient } from './clients/OpenAlexApiClient';
import { NyStateApiClient } from './clients/NyStateApiClient';
import { SamGovApiClient } from './clients/SamGovApiClient';

export class ApiScheduler {
  private supabase;
  private scheduledJobs: Map<string, cron.ScheduledTask>;
  private apiClients: Map<string, BaseApiClient>;

  constructor() {
    this.supabase = supabaseClient;
    this.scheduledJobs = new Map();
    this.apiClients = new Map();
    
    // Register all API clients
    this.registerApiClients();
  }

  private registerApiClients(): void {
    // Register all available API clients
    this.apiClients.set('grants_gov', new GrantsGovApiClient());
    this.apiClients.set('eu_funding_portal', new EuFundingApiClient());
    this.apiClients.set('nih_reporter', new NihReporterApiClient());
    this.apiClients.set('nsf_awards', new NsfAwardsApiClient());
    this.apiClients.set('canadian_open_gov', new CanadianOpenGovApiClient());
    this.apiClients.set('ukri_gateway', new UkriGatewayApiClient());
    this.apiClients.set('world_bank', new WorldBankApiClient());
    this.apiClients.set('federal_register', new FederalRegisterApiClient());
    this.apiClients.set('usaspending', new UsaspendingApiClient());
    this.apiClients.set('california_grants', new CaliforniaGrantsApiClient());
    this.apiClients.set('openalex', new OpenAlexApiClient());
    this.apiClients.set('ny_state', new NyStateApiClient());
    this.apiClients.set('sam_gov', new SamGovApiClient());
  }

  async initialize(): Promise<void> {
    logger.info('Initializing API Scheduler...');
    
    try {
      // Load all active schedules
      const { data: schedules, error } = await this.supabase
        .from('api_sync_schedules')
        .select(`
          *,
          data_sources (
            name,
            display_name,
            is_active
          )
        `)
        .eq('is_active', true);

      if (error) {
        throw error;
      }

      if (!schedules || schedules.length === 0) {
        logger.warn('No active schedules found');
        return;
      }

      // Schedule each job
      for (const schedule of schedules) {
        if (schedule.data_sources?.is_active) {
          await this.scheduleJob(schedule);
        }
      }

      logger.info(`Scheduled ${this.scheduledJobs.size} jobs`);
      
      // Set up real-time subscription for schedule changes
      this.setupRealtimeSubscription();
      
    } catch (error) {
      logger.error('Failed to initialize scheduler', error);
      throw error;
    }
  }

  private async scheduleJob(schedule: any): Promise<void> {
    const jobId = `${schedule.data_source_id}_${schedule.schedule_name}`;
    
    // Cancel existing job if any
    if (this.scheduledJobs.has(jobId)) {
      this.scheduledJobs.get(jobId)?.stop();
      this.scheduledJobs.delete(jobId);
    }

    // Get the API client
    const apiClient = this.apiClients.get(schedule.data_sources.name);
    if (!apiClient) {
      logger.warn(`No API client found for ${schedule.data_sources.name}`);
      return;
    }

    // Validate cron expression
    if (!cron.validate(schedule.cron_expression)) {
      logger.error(`Invalid cron expression for ${jobId}: ${schedule.cron_expression}`);
      return;
    }

    // Create the scheduled task
    const task = cron.schedule(schedule.cron_expression, async () => {
      await this.runSync(schedule, apiClient);
    }, {
      timezone: 'UTC'
    });

    // Store and start the task
    this.scheduledJobs.set(jobId, task);
    task.start();
    
    logger.info(`Scheduled job ${jobId} with cron: ${schedule.cron_expression}`);
    
    // Update next run time
    await this.updateNextRunTime(schedule.id, schedule.cron_expression);
  }

  private async runSync(schedule: any, apiClient: BaseApiClient): Promise<void> {
    const startTime = new Date();
    logger.info(`Starting sync for ${schedule.data_sources.display_name}`);
    
    try {
      // Check if we should run (in case of manual trigger while scheduled run is in progress)
      const canRun = await this.checkCanRun(schedule.data_source_id);
      if (!canRun) {
        logger.warn(`Sync already in progress for ${schedule.data_sources.name}`);
        return;
      }

      // Initialize the API client
      await apiClient.initialize();
      
      // Run the sync
      const result = await apiClient.sync({
        syncType: 'scheduled',
        scheduleId: schedule.id,
        filters: schedule.filters,
        fullSync: schedule.sync_strategy === 'full',
        maxRecords: schedule.max_records_per_sync
      });

      // Log the result
      logger.info(`Sync completed for ${schedule.data_sources.display_name}`, {
        success: result.success,
        recordsFetched: result.recordsFetched,
        recordsCreated: result.recordsCreated,
        recordsUpdated: result.recordsUpdated,
        recordsFailed: result.recordsFailed,
        duration: (new Date().getTime() - startTime.getTime()) / 1000
      });

      // Update last successful sync
      if (result.success) {
        await this.supabase
          .from('data_sources')
          .update({ last_successful_sync: new Date().toISOString() })
          .eq('id', schedule.data_source_id);
      }

    } catch (error) {
      logger.error(`Sync failed for ${schedule.data_sources.display_name}`, error);
    } finally {
      // Update next run time
      await this.updateNextRunTime(schedule.id, schedule.cron_expression);
    }
  }

  private async checkCanRun(dataSourceId: string): Promise<boolean> {
    // Check if there's already a sync in progress
    const { data } = await this.supabase
      .from('api_sync_logs')
      .select('id')
      .eq('data_source_id', dataSourceId)
      .in('status', ['started', 'in_progress'])
      .order('started_at', { ascending: false })
      .limit(1);

    return !data || data.length === 0;
  }

  private async updateNextRunTime(scheduleId: string, cronExpression: string): Promise<void> {
    // node-cron v4 doesn't have parseExpression - would need cron-parser library
    // For now, just set next run to now + 1 hour as placeholder
    const nextRun = new Date();
    nextRun.setHours(nextRun.getHours() + 1);
    
    await this.supabase
      .from('api_sync_schedules')
      .update({ next_run_at: nextRun.toISOString() })
      .eq('id', scheduleId);
  }

  private setupRealtimeSubscription(): void {
    // Subscribe to changes in sync schedules
    this.supabase
      .channel('sync_schedules_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'api_sync_schedules'
        },
        async (payload) => {
          logger.info('Schedule change detected', payload);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const schedule = payload.new;
            if (schedule.is_active) {
              // Fetch full schedule with relations
              const { data } = await this.supabase
                .from('api_sync_schedules')
                .select(`
                  *,
                  data_sources (
                    name,
                    display_name,
                    is_active
                  )
                `)
                .eq('id', schedule.id)
                .single();
              
              if (data && data.data_sources?.is_active) {
                await this.scheduleJob(data);
              }
            } else {
              // Cancel job if it exists
              const jobId = `${schedule.data_source_id}_${schedule.schedule_name}`;
              if (this.scheduledJobs.has(jobId)) {
                this.scheduledJobs.get(jobId)?.stop();
                this.scheduledJobs.delete(jobId);
                logger.info(`Cancelled job ${jobId}`);
              }
            }
          } else if (payload.eventType === 'DELETE') {
            const schedule = payload.old;
            const jobId = `${schedule.data_source_id}_${schedule.schedule_name}`;
            if (this.scheduledJobs.has(jobId)) {
              this.scheduledJobs.get(jobId)?.stop();
              this.scheduledJobs.delete(jobId);
              logger.info(`Removed job ${jobId}`);
            }
          }
        }
      )
      .subscribe();
  }

  async manualSync(dataSourceName: string, options: any = {}): Promise<any> {
    const apiClient = this.apiClients.get(dataSourceName);
    if (!apiClient) {
      throw new Error(`No API client found for ${dataSourceName}`);
    }

    // Get data source info
    const { data: dataSource } = await this.supabase
      .from('data_sources')
      .select('*')
      .eq('name', dataSourceName)
      .single();

    if (!dataSource || !dataSource.is_active) {
      throw new Error(`Data source ${dataSourceName} is not active`);
    }

    // Check if sync is already running
    const canRun = await this.checkCanRun(dataSource.id);
    if (!canRun) {
      throw new Error(`Sync already in progress for ${dataSourceName}`);
    }

    // Initialize and run sync
    await apiClient.initialize();
    return await apiClient.sync({
      ...options,
      syncType: 'manual'
    });
  }

  stop(): void {
    logger.info('Stopping API Scheduler...');
    
    // Stop all scheduled jobs
    for (const [jobId, task] of this.scheduledJobs) {
      task.stop();
      logger.info(`Stopped job ${jobId}`);
    }
    
    this.scheduledJobs.clear();
  }

  getStatus(): any {
    const jobs = Array.from(this.scheduledJobs.entries()).map(([id, task]) => ({
      id,
      // node-cron v4 doesn't have a running property
      running: true // All stored tasks are considered running
    }));

    return {
      activeJobs: jobs.length,
      jobs
    };
  }
}