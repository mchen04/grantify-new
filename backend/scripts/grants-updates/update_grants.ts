import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import pLimit from 'p-limit';
import { CronJob } from 'cron';
import winston from 'winston';
import nodemailer from 'nodemailer';

// Import all API clients
import { GrantsGovApiClient } from '../../src/services/api-integrations/clients/GrantsGovApiClient';
import { EuFundingApiClient } from '../../src/services/api-integrations/clients/EuFundingApiClient';
import { NihReporterApiClient } from '../../src/services/api-integrations/clients/NihReporterApiClient';
import { NsfAwardsApiClient } from '../../src/services/api-integrations/clients/NsfAwardsApiClient';
import { FederalRegisterApiClient } from '../../src/services/api-integrations/clients/FederalRegisterApiClient';
import { UsaSpendingApiClient } from '../../src/services/api-integrations/clients/UsaspendingApiClient';
import { CanadianOpenGovApiClient } from '../../src/services/api-integrations/clients/CanadianOpenGovApiClient';
import { UkriGatewayApiClient } from '../../src/services/api-integrations/clients/UkriGatewayApiClient';
import { WorldBankApiClient } from '../../src/services/api-integrations/clients/WorldBankApiClient';
import { CaliforniaGrantsApiClient } from '../../src/services/api-integrations/clients/CaliforniaGrantsApiClient';
import { NyStateApiClient } from '../../src/services/api-integrations/clients/NyStateApiClient';
import { SamGovApiClient } from '../../src/services/api-integrations/clients/SamGovApiClient';
import { OpenAlexApiClient } from '../../src/services/api-integrations/clients/OpenAlexApiClient';

config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/update-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/update-combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Email configuration for alerts
const emailTransporter = process.env.SMTP_HOST ? nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
}) : null;

// API configurations with update schedules
interface ApiUpdateConfig {
  name: string;
  client: any;
  schedule: string; // Cron format
  priority: number;
  enabled: boolean;
  incrementalOptions?: any;
}

const updateConfigs: ApiUpdateConfig[] = [
  {
    name: 'grants_gov',
    client: GrantsGovApiClient,
    schedule: '0 */4 * * *', // Every 4 hours
    priority: 10,
    enabled: true,
    incrementalOptions: { 
      fullSync: false,
      daysBack: 7 // Check last 7 days for updates
    }
  },
  {
    name: 'eu_funding',
    client: EuFundingApiClient,
    schedule: '0 2,14 * * *', // Twice daily at 2 AM and 2 PM
    priority: 9,
    enabled: true,
    incrementalOptions: { 
      fullSync: false,
      maxPages: 10
    }
  },
  {
    name: 'federal_register',
    client: FederalRegisterApiClient,
    schedule: '0 */6 * * *', // Every 6 hours
    priority: 8,
    enabled: true,
    incrementalOptions: { 
      fullSync: false,
      daysBack: 3
    }
  },
  {
    name: 'california_grants',
    client: CaliforniaGrantsApiClient,
    schedule: '0 6,18 * * *', // Twice daily
    priority: 7,
    enabled: true,
    incrementalOptions: { fullSync: false }
  },
  {
    name: 'nih_reporter',
    client: NihReporterApiClient,
    schedule: '0 3 * * *', // Daily at 3 AM
    priority: 6,
    enabled: true,
    incrementalOptions: { 
      fullSync: false,
      fiscalYears: [new Date().getFullYear()]
    }
  },
  {
    name: 'nsf_awards',
    client: NsfAwardsApiClient,
    schedule: '0 4 * * *', // Daily at 4 AM
    priority: 6,
    enabled: true,
    incrementalOptions: { fullSync: false }
  },
  {
    name: 'canadian_gov',
    client: CanadianOpenGovApiClient,
    schedule: '0 5 * * *', // Daily at 5 AM
    priority: 5,
    enabled: true,
    incrementalOptions: { fullSync: false }
  },
  {
    name: 'ukri_gateway',
    client: UkriGatewayApiClient,
    schedule: '0 6 * * *', // Daily at 6 AM
    priority: 5,
    enabled: true,
    incrementalOptions: { fullSync: false }
  },
  {
    name: 'ny_state',
    client: NyStateApiClient,
    schedule: '0 7 * * *', // Daily at 7 AM
    priority: 4,
    enabled: true,
    incrementalOptions: { fullSync: false }
  },
  {
    name: 'usaspending',
    client: UsaSpendingApiClient,
    schedule: '0 0 */2 * *', // Every 2 days
    priority: 3,
    enabled: true,
    incrementalOptions: { 
      fullSync: false,
      maxPages: 20
    }
  },
  {
    name: 'world_bank',
    client: WorldBankApiClient,
    schedule: '0 0 */2 * *', // Every 2 days
    priority: 3,
    enabled: true,
    incrementalOptions: { fullSync: false }
  },
  {
    name: 'sam_gov',
    client: SamGovApiClient,
    schedule: '0 8 * * *', // Daily at 8 AM
    priority: 2,
    enabled: true,
    incrementalOptions: { 
      fullSync: false,
      maxPages: 10
    }
  },
  {
    name: 'openalex',
    client: OpenAlexApiClient,
    schedule: '0 0 * * 0', // Weekly on Sunday
    priority: 1,
    enabled: true,
    incrementalOptions: { 
      fullSync: false,
      maxPages: 5
    }
  }
];

// Metrics tracking
class UpdateMetrics {
  private metrics: Map<string, any> = new Map();

  recordSync(apiName: string, result: any) {
    const existing = this.metrics.get(apiName) || {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      totalRecords: 0,
      totalDuration: 0,
      errors: []
    };

    existing.totalSyncs++;
    if (result.success) {
      existing.successfulSyncs++;
      existing.totalRecords += (result.created || 0) + (result.updated || 0);
      existing.totalDuration += result.duration || 0;
    } else {
      existing.failedSyncs++;
      existing.errors.push({
        timestamp: new Date(),
        error: result.error
      });
    }

    existing.lastSync = new Date();
    existing.successRate = (existing.successfulSyncs / existing.totalSyncs * 100).toFixed(2);
    existing.avgDuration = (existing.totalDuration / existing.successfulSyncs).toFixed(2);

    this.metrics.set(apiName, existing);
  }

  getMetrics() {
    return Object.fromEntries(this.metrics);
  }

  async saveToDatabase() {
    try {
      const metrics = this.getMetrics();
      for (const [apiName, data] of Object.entries(metrics)) {
        await supabase.from('api_sync_metrics').upsert({
          api_name: apiName,
          metrics: data,
          updated_at: new Date()
        });
      }
    } catch (error) {
      logger.error('Failed to save metrics:', error);
    }
  }
}

const metrics = new UpdateMetrics();

// Update single API
async function updateApi(config: ApiUpdateConfig): Promise<any> {
  const startTime = Date.now();
  const syncId = await createSyncLog(config.name, 'incremental');

  try {
    logger.info(`Starting update for ${config.name}`);

    // Check rate limits
    const canProceed = await checkRateLimit(config.name);
    if (!canProceed) {
      throw new Error('Rate limit exceeded');
    }

    // Create client and run incremental sync
    const client = new config.client(supabase);
    const result = await client.sync(config.incrementalOptions);

    const duration = Math.round((Date.now() - startTime) / 1000);

    // Update sync log
    await updateSyncLog(syncId, {
      status: 'completed',
      records_fetched: result.total || 0,
      records_created: result.created || 0,
      records_updated: result.updated || 0,
      total_duration_seconds: duration
    });

    // Record metrics
    metrics.recordSync(config.name, {
      success: true,
      ...result,
      duration
    });

    logger.info(`Update completed for ${config.name}: ${result.created} new, ${result.updated} updated`);

    return { success: true, ...result };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Update sync log with error
    await updateSyncLog(syncId, {
      status: 'failed',
      error_count: 1,
      last_error: errorMessage,
      error_details: { error: errorMessage, stack: error instanceof Error ? error.stack : null }
    });

    // Record metrics
    metrics.recordSync(config.name, {
      success: false,
      error: errorMessage
    });

    logger.error(`Update failed for ${config.name}:`, error);

    // Send alert for high priority APIs
    if (config.priority >= 8) {
      await sendAlert(config.name, errorMessage);
    }

    return { success: false, error: errorMessage };
  }
}

// Create sync log entry
async function createSyncLog(apiName: string, syncType: string): Promise<string> {
  const { data, error } = await supabase
    .from('api_sync_logs')
    .insert({
      api_source_id: await getApiSourceId(apiName),
      sync_type: syncType,
      status: 'in_progress'
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

// Update sync log
async function updateSyncLog(syncId: string, updates: any) {
  await supabase
    .from('api_sync_logs')
    .update({
      ...updates,
      completed_at: new Date()
    })
    .eq('id', syncId);
}

// Get API source ID
async function getApiSourceId(apiName: string): Promise<string> {
  const { data, error } = await supabase
    .from('api_sources')
    .select('id')
    .eq('name', apiName)
    .single();

  if (error) throw error;
  return data.id;
}

// Check rate limits
async function checkRateLimit(apiName: string): Promise<boolean> {
  // Implement rate limit checking based on api_sources configuration
  const { data } = await supabase
    .from('api_sources')
    .select('rate_limit_requests, rate_limit_window_seconds')
    .eq('name', apiName)
    .single();

  if (!data?.rate_limit_requests) return true;

  // Check recent requests
  const windowStart = new Date(Date.now() - data.rate_limit_window_seconds * 1000);
  const { count } = await supabase
    .from('api_sync_logs')
    .select('*', { count: 'exact', head: true })
    .eq('api_source_id', await getApiSourceId(apiName))
    .gte('started_at', windowStart.toISOString());

  return (count || 0) < data.rate_limit_requests;
}

// Send alert email
async function sendAlert(apiName: string, error: string) {
  if (!emailTransporter || !process.env.ALERT_EMAIL) return;

  try {
    await emailTransporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@grantify.ai',
      to: process.env.ALERT_EMAIL,
      subject: `[Grantify] API Update Failed: ${apiName}`,
      html: `
        <h2>API Update Failure</h2>
        <p><strong>API:</strong> ${apiName}</p>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        <p><strong>Error:</strong> ${error}</p>
        <p>Please check the logs for more details.</p>
      `
    });
  } catch (err) {
    logger.error('Failed to send alert email:', err);
  }
}

// Run post-update tasks
async function runPostUpdateTasks() {
  logger.info('Running post-update tasks...');

  try {
    // Run deduplication
    await supabase.rpc('detect_recent_duplicates', { hours_back: 24 });

    // Update search vectors for modified grants
    await supabase.rpc('update_recent_search_vectors', { hours_back: 24 });

    // Refresh materialized views
    await supabase.rpc('refresh_grant_statistics');

    // Clean up old grants
    await supabase.rpc('archive_expired_grants');

    logger.info('Post-update tasks completed');
  } catch (error) {
    logger.error('Post-update tasks failed:', error);
  }
}

// Create cron jobs for each API
const cronJobs: CronJob[] = [];

function setupCronJobs() {
  for (const config of updateConfigs.filter(c => c.enabled)) {
    const job = new CronJob(
      config.schedule,
      async () => {
        logger.info(`Cron triggered for ${config.name}`);
        await updateApi(config);
      },
      null,
      false,
      'America/New_York'
    );

    cronJobs.push(job);
    logger.info(`Scheduled ${config.name} with cron: ${config.schedule}`);
  }

  // Post-update tasks - run hourly
  const postUpdateJob = new CronJob(
    '0 * * * *',
    runPostUpdateTasks,
    null,
    false,
    'America/New_York'
  );
  cronJobs.push(postUpdateJob);

  // Metrics save - run every 30 minutes
  const metricsJob = new CronJob(
    '*/30 * * * *',
    () => metrics.saveToDatabase(),
    null,
    false,
    'America/New_York'
  );
  cronJobs.push(metricsJob);
}

// Manual update function
export async function manualUpdate(apiNames?: string[]) {
  const configs = apiNames 
    ? updateConfigs.filter(c => apiNames.includes(c.name))
    : updateConfigs.filter(c => c.enabled);

  logger.info(`Running manual update for ${configs.length} APIs`);

  // Run updates with concurrency limit
  const limit = pLimit(3);
  const results = await Promise.all(
    configs.map(config => limit(() => updateApi(config)))
  );

  await runPostUpdateTasks();

  return results;
}

// Health check endpoint data
export async function getHealthStatus() {
  const metricsData = metrics.getMetrics();
  const { data: recentSyncs } = await supabase
    .from('api_sync_logs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(20);

  return {
    metrics: metricsData,
    recentSyncs,
    cronJobs: cronJobs.map(job => ({
      running: job.running,
      nextDate: job.nextDate()
    }))
  };
}

// Start the update service
export function startUpdateService() {
  logger.info('Starting Grant Update Service');
  
  setupCronJobs();
  
  // Start all cron jobs
  cronJobs.forEach(job => job.start());
  
  logger.info(`Started ${cronJobs.length} cron jobs`);

  // Run initial update for high-priority APIs
  const highPriorityApis = updateConfigs
    .filter(c => c.enabled && c.priority >= 8)
    .map(c => c.name);
  
  manualUpdate(highPriorityApis).then(() => {
    logger.info('Initial high-priority update completed');
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('Shutting down update service...');
  cronJobs.forEach(job => job.stop());
  process.exit(0);
});

// Export for use as a module or standalone script
if (require.main === module) {
  startUpdateService();
}