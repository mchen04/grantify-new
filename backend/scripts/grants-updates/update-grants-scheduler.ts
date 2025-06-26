import * as cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { loadAllGrants } from './load-all-grants';
import logger from '../src/utils/logger';

dotenv.config();

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

interface UpdateSchedule {
  dataSourceName: string;
  cronExpression: string;
  description: string;
  enabled: boolean;
}

// Define update schedules for each data source
const updateSchedules: UpdateSchedule[] = [
  {
    dataSourceName: 'grants_gov',
    cronExpression: '0 2 * * *', // Daily at 2 AM
    description: 'Daily update for Grants.gov',
    enabled: true
  },
  {
    dataSourceName: 'federal_register',
    cronExpression: '0 */6 * * *', // Every 6 hours
    description: 'Federal Register updates 4 times daily',
    enabled: true
  },
  {
    dataSourceName: 'nih_reporter',
    cronExpression: '0 3 * * 1', // Weekly on Monday at 3 AM
    description: 'Weekly NIH Reporter update',
    enabled: true
  },
  {
    dataSourceName: 'nsf_awards',
    cronExpression: '0 4 * * 2', // Weekly on Tuesday at 4 AM
    description: 'Weekly NSF Awards update',
    enabled: true
  },
  {
    dataSourceName: 'california_grants',
    cronExpression: '0 1 * * *', // Daily at 1 AM
    description: 'Daily California grants update',
    enabled: true
  },
  {
    dataSourceName: 'sam_gov',
    cronExpression: '0 */8 * * *', // Every 8 hours
    description: 'SAM.gov updates 3 times daily',
    enabled: true
  },
  {
    dataSourceName: 'usaspending',
    cronExpression: '0 5 * * 1,4', // Monday and Thursday at 5 AM
    description: 'Bi-weekly USAspending update',
    enabled: true
  },
  {
    dataSourceName: 'canadian_open_gov',
    cronExpression: '0 6 * * 3', // Weekly on Wednesday at 6 AM
    description: 'Weekly Canadian grants update',
    enabled: true
  },
  {
    dataSourceName: 'eu_funding_portal',
    cronExpression: '0 7 * * 2,5', // Tuesday and Friday at 7 AM
    description: 'Bi-weekly EU funding update',
    enabled: true
  },
  {
    dataSourceName: 'ukri_gateway',
    cronExpression: '0 8 * * 3', // Weekly on Wednesday at 8 AM
    description: 'Weekly UKRI update',
    enabled: true
  },
  {
    dataSourceName: 'world_bank',
    cronExpression: '0 9 * * 1', // Weekly on Monday at 9 AM
    description: 'Weekly World Bank update',
    enabled: true
  },
  {
    dataSourceName: 'ny_state',
    cronExpression: '0 10 * * *', // Daily at 10 AM
    description: 'Daily NY State grants update',
    enabled: true
  },
  {
    dataSourceName: 'openalex',
    cronExpression: '0 11 * * 0', // Weekly on Sunday at 11 AM
    description: 'Weekly OpenAlex update',
    enabled: true
  }
];

class GrantUpdateScheduler {
  private tasks: Map<string, cron.ScheduledTask> = new Map();
  private isRunning: boolean = false;

  async start() {
    if (this.isRunning) {
      logger.warn('Scheduler is already running');
      return;
    }

    logger.info('Starting grant update scheduler...');
    this.isRunning = true;

    // Schedule individual data source updates
    for (const schedule of updateSchedules) {
      if (!schedule.enabled) continue;

      const task = cron.schedule(schedule.cronExpression, async () => {
        await this.updateDataSource(schedule.dataSourceName);
      }, {
        timezone: 'UTC'
      });

      this.tasks.set(schedule.dataSourceName, task);
      logger.info(`Scheduled ${schedule.description} with cron: ${schedule.cronExpression}`);
    }

    // Schedule a full sync once a week (Sunday at midnight)
    const fullSyncTask = cron.schedule('0 0 * * 0', async () => {
      logger.info('Starting weekly full sync...');
      await this.runFullSync();
    }, {
      timezone: 'UTC'
    });

    this.tasks.set('full_sync', fullSyncTask);

    logger.info('Grant update scheduler started successfully');
  }

  async stop() {
    logger.info('Stopping grant update scheduler...');
    
    for (const [name, task] of this.tasks) {
      task.stop();
      logger.info(`Stopped scheduled task: ${name}`);
    }
    
    this.tasks.clear();
    this.isRunning = false;
    
    logger.info('Grant update scheduler stopped');
  }

  private async updateDataSource(dataSourceName: string) {
    logger.info(`Starting update for ${dataSourceName}...`);
    
    try {
      // Create sync log
      const { data: syncLog } = await supabase
        .from('api_sync_logs')
        .insert({
          data_source_name: dataSourceName,
          sync_type: 'incremental',
          status: 'in_progress',
          started_at: new Date()
        })
        .select()
        .single();

      const startTime = Date.now();
      
      // Import the specific client dynamically
      const clientModule = await import(`../src/services/api-integrations/clients/${this.getClientFileName(dataSourceName)}`);
      const ClientClass = Object.values(clientModule)[0] as any;
      const client = new ClientClass();

      // Get data source ID
      const { data: dataSource } = await supabase
        .from('data_sources')
        .select('id')
        .eq('name', dataSourceName)
        .single();

      if (!dataSource) {
        throw new Error(`Data source not found: ${dataSourceName}`);
      }

      client.dataSourceId = dataSource.id;
      await client.initialize();

      // Run incremental sync
      const result = await client.sync({
        syncType: 'incremental',
        fullSync: false
      });

      const duration = Date.now() - startTime;

      // Update sync log
      await supabase
        .from('api_sync_logs')
        .update({
          status: result.success ? 'completed' : 'failed',
          completed_at: new Date(),
          records_fetched: result.recordsFetched,
          records_created: result.recordsCreated,
          records_updated: result.recordsUpdated,
          records_failed: result.recordsFailed,
          error_message: result.errors.length > 0 ? result.errors.join('; ') : null,
          metadata: {
            duration_ms: duration,
            errors: result.errors
          }
        })
        .eq('id', syncLog.id);

      // Update data source last sync time
      if (result.success) {
        await supabase
          .from('data_sources')
          .update({ last_successful_sync: new Date() })
          .eq('id', dataSource.id);
      }

      logger.info(`Update completed for ${dataSourceName}: ${result.recordsCreated} created, ${result.recordsUpdated} updated`);

    } catch (error) {
      logger.error(`Failed to update ${dataSourceName}:`, error);
      
      // Update sync log with error
      await supabase
        .from('api_sync_logs')
        .update({
          status: 'failed',
          completed_at: new Date(),
          error_message: error.message
        })
        .eq('data_source_name', dataSourceName)
        .eq('status', 'in_progress');
    }
  }

  private async runFullSync() {
    try {
      await loadAllGrants(true);
    } catch (error) {
      logger.error('Full sync failed:', error);
    }
  }

  private getClientFileName(dataSourceName: string): string {
    // Convert snake_case to PascalCase
    const pascalCase = dataSourceName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
    
    return `${pascalCase}ApiClient`;
  }

  getStatus() {
    const status = {
      isRunning: this.isRunning,
      scheduledTasks: [] as any[]
    };

    for (const schedule of updateSchedules) {
      const task = this.tasks.get(schedule.dataSourceName);
      status.scheduledTasks.push({
        dataSource: schedule.dataSourceName,
        cronExpression: schedule.cronExpression,
        description: schedule.description,
        enabled: schedule.enabled,
        isRunning: task ? true : false
      });
    }

    return status;
  }

  async runManualUpdate(dataSourceName: string) {
    logger.info(`Running manual update for ${dataSourceName}...`);
    await this.updateDataSource(dataSourceName);
  }
}

// Create singleton instance
const scheduler = new GrantUpdateScheduler();

// Start scheduler if running as main module
if (require.main === module) {
  scheduler.start()
    .then(() => {
      logger.info('Scheduler is running. Press Ctrl+C to stop.');
      
      // Handle graceful shutdown
      process.on('SIGINT', async () => {
        logger.info('Received SIGINT, shutting down gracefully...');
        await scheduler.stop();
        process.exit(0);
      });
      
      process.on('SIGTERM', async () => {
        logger.info('Received SIGTERM, shutting down gracefully...');
        await scheduler.stop();
        process.exit(0);
      });
    })
    .catch(error => {
      logger.error('Failed to start scheduler:', error);
      process.exit(1);
    });
}

export { scheduler, GrantUpdateScheduler };