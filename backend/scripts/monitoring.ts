import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import express from 'express';
import { IncomingWebhook } from '@slack/webhook';
import * as Sentry from '@sentry/node';
import prom from 'prom-client';

config();

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Initialize Sentry for error tracking
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 1.0,
  });
}

// Initialize Slack webhook for alerts
const slackWebhook = process.env.SLACK_WEBHOOK_URL 
  ? new IncomingWebhook(process.env.SLACK_WEBHOOK_URL)
  : null;

// Prometheus metrics
const register = new prom.Registry();

// API sync metrics
const syncDuration = new prom.Histogram({
  name: 'grant_api_sync_duration_seconds',
  help: 'Duration of API sync operations',
  labelNames: ['api_name', 'sync_type'],
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 120, 300]
});

const syncRecords = new prom.Counter({
  name: 'grant_api_sync_records_total',
  help: 'Total number of records processed',
  labelNames: ['api_name', 'action']
});

const syncErrors = new prom.Counter({
  name: 'grant_api_sync_errors_total',
  help: 'Total number of sync errors',
  labelNames: ['api_name', 'error_type']
});

const apiHealth = new prom.Gauge({
  name: 'grant_api_health',
  help: 'Health status of each API (1=healthy, 0=unhealthy)',
  labelNames: ['api_name']
});

const duplicatesFound = new prom.Counter({
  name: 'grant_duplicates_found_total',
  help: 'Total number of duplicate grants found',
  labelNames: ['match_type']
});

const activeGrants = new prom.Gauge({
  name: 'active_grants_total',
  help: 'Total number of active grants',
  labelNames: ['data_source']
});

// Register all metrics
register.registerMetric(syncDuration);
register.registerMetric(syncRecords);
register.registerMetric(syncErrors);
register.registerMetric(apiHealth);
register.registerMetric(duplicatesFound);
register.registerMetric(activeGrants);

// Alert thresholds
const ALERT_THRESHOLDS = {
  errorRate: 0.1, // 10% error rate
  syncDuration: 300, // 5 minutes
  consecutiveFailures: 3,
  staleDataHours: 48,
  lowGrantCount: 1000
};

// Alert manager
class AlertManager {
  private alertHistory: Map<string, Date> = new Map();
  private failureCount: Map<string, number> = new Map();

  async checkAndAlert(apiName: string, metric: string, value: number, threshold: number) {
    const key = `${apiName}-${metric}`;
    const lastAlert = this.alertHistory.get(key);
    
    // Don't alert more than once per hour for the same issue
    if (lastAlert && (Date.now() - lastAlert.getTime()) < 3600000) {
      return;
    }

    if (value > threshold) {
      const message = `⚠️ Alert: ${apiName} - ${metric} exceeded threshold: ${value} > ${threshold}`;
      
      await this.sendAlert({
        title: 'Grant API Alert',
        message,
        severity: 'warning',
        apiName,
        metric,
        value,
        threshold
      });

      this.alertHistory.set(key, new Date());
    }
  }

  trackFailure(apiName: string) {
    const count = (this.failureCount.get(apiName) || 0) + 1;
    this.failureCount.set(apiName, count);

    if (count >= ALERT_THRESHOLDS.consecutiveFailures) {
      this.sendAlert({
        title: 'Critical: API Consecutive Failures',
        message: `${apiName} has failed ${count} times consecutively`,
        severity: 'critical',
        apiName
      });
      this.failureCount.set(apiName, 0);
    }
  }

  clearFailures(apiName: string) {
    this.failureCount.set(apiName, 0);
  }

  async sendAlert(alert: any) {
    console.error('ALERT:', alert);

    // Send to Sentry
    if (process.env.SENTRY_DSN) {
      Sentry.captureMessage(alert.message, alert.severity === 'critical' ? 'error' : 'warning');
    }

    // Send to Slack
    if (slackWebhook) {
      try {
        await slackWebhook.send({
          text: alert.title,
          attachments: [{
            color: alert.severity === 'critical' ? 'danger' : 'warning',
            fields: [
              { title: 'Message', value: alert.message },
              { title: 'API', value: alert.apiName || 'N/A', short: true },
              { title: 'Severity', value: alert.severity, short: true },
              { title: 'Time', value: new Date().toISOString(), short: true }
            ]
          }]
        });
      } catch (error) {
        console.error('Failed to send Slack alert:', error);
      }
    }

    // Log to database
    await supabase.from('system_alerts').insert({
      type: 'api_monitoring',
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      metadata: alert,
      created_at: new Date()
    });
  }
}

const alertManager = new AlertManager();

// Monitoring functions
export async function recordSyncMetrics(
  apiName: string,
  syncType: 'full' | 'incremental',
  result: any,
  duration: number
) {
  // Record Prometheus metrics
  syncDuration.labels(apiName, syncType).observe(duration);
  
  if (result.created) {
    syncRecords.labels(apiName, 'created').inc(result.created);
  }
  if (result.updated) {
    syncRecords.labels(apiName, 'updated').inc(result.updated);
  }
  if (result.error) {
    syncErrors.labels(apiName, result.errorType || 'unknown').inc();
    alertManager.trackFailure(apiName);
  } else {
    alertManager.clearFailures(apiName);
    apiHealth.labels(apiName).set(1);
  }

  // Check thresholds
  if (result.errorRate) {
    await alertManager.checkAndAlert(apiName, 'error_rate', result.errorRate, ALERT_THRESHOLDS.errorRate);
  }
  if (duration > ALERT_THRESHOLDS.syncDuration) {
    await alertManager.checkAndAlert(apiName, 'sync_duration', duration, ALERT_THRESHOLDS.syncDuration);
  }
}

// Health check functions
export async function performHealthChecks() {
  const results = {
    timestamp: new Date(),
    checks: [] as any[]
  };

  // Check 1: API sync status
  const { data: syncLogs } = await supabase
    .from('api_sync_logs')
    .select('*, api_sources(name)')
    .order('started_at', { ascending: false })
    .limit(50);

  const apiStatus = new Map<string, any>();

  for (const log of syncLogs || []) {
    const apiName = log.api_sources?.name;
    if (!apiName || apiStatus.has(apiName)) continue;

    const hoursSinceSync = (Date.now() - new Date(log.started_at).getTime()) / 3600000;
    const isStale = hoursSinceSync > ALERT_THRESHOLDS.staleDataHours;
    const hasErrors = log.status === 'failed' || log.error_count > 0;

    apiStatus.set(apiName, {
      lastSync: log.started_at,
      status: log.status,
      isStale,
      hasErrors,
      errorCount: log.error_count
    });

    // Update health metric
    apiHealth.labels(apiName).set(hasErrors || isStale ? 0 : 1);

    if (isStale) {
      await alertManager.sendAlert({
        title: 'Stale Data Alert',
        message: `${apiName} hasn't synced in ${Math.round(hoursSinceSync)} hours`,
        severity: 'warning',
        apiName
      });
    }
  }

  results.checks.push({
    name: 'api_sync_status',
    status: Array.from(apiStatus.values()).every(s => !s.hasErrors && !s.isStale) ? 'healthy' : 'degraded',
    apis: Object.fromEntries(apiStatus)
  });

  // Check 2: Active grants count
  const { data: grantCounts } = await supabase
    .from('grants')
    .select('data_source', { count: 'exact' })
    .eq('status', 'open')
    .group('data_source');

  let totalGrants = 0;
  for (const source of grantCounts || []) {
    activeGrants.labels(source.data_source).set(source.count);
    totalGrants += source.count;
  }

  if (totalGrants < ALERT_THRESHOLDS.lowGrantCount) {
    await alertManager.sendAlert({
      title: 'Low Grant Count Alert',
      message: `Only ${totalGrants} active grants in database`,
      severity: 'warning'
    });
  }

  results.checks.push({
    name: 'grant_counts',
    status: totalGrants >= ALERT_THRESHOLDS.lowGrantCount ? 'healthy' : 'degraded',
    total: totalGrants,
    bySource: grantCounts
  });

  // Check 3: Database performance
  const { data: dbStats } = await supabase.rpc('get_database_stats');
  
  results.checks.push({
    name: 'database_performance',
    status: 'healthy',
    stats: dbStats
  });

  // Check 4: Duplicate detection
  const { count: duplicateCount } = await supabase
    .from('grant_duplicates')
    .select('*', { count: 'exact', head: true })
    .eq('verified', false);

  if (duplicateCount && duplicateCount > 100) {
    await alertManager.sendAlert({
      title: 'High Unverified Duplicates',
      message: `${duplicateCount} unverified duplicate grants need review`,
      severity: 'info'
    });
  }

  results.checks.push({
    name: 'duplicate_detection',
    status: 'healthy',
    unverifiedCount: duplicateCount
  });

  return results;
}

// Express app for metrics endpoint
const app = express();

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    // Update current metrics
    await performHealthChecks();
    
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    res.status(500).end();
  }
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const health = await performHealthChecks();
    const isHealthy = health.checks.every(c => c.status === 'healthy');
    
    res.status(isHealthy ? 200 : 503).json(health);
  } catch (error) {
    res.status(500).json({ error: 'Health check failed' });
  }
});

// API-specific health endpoints
app.get('/health/:apiName', async (req, res) => {
  try {
    const { apiName } = req.params;
    
    const { data: lastSync } = await supabase
      .from('api_sync_logs')
      .select('*')
      .eq('api_source_id', 
        supabase.from('api_sources').select('id').eq('name', apiName).single()
      )
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    const health = {
      api: apiName,
      lastSync: lastSync?.started_at,
      status: lastSync?.status,
      recordsProcessed: (lastSync?.records_created || 0) + (lastSync?.records_updated || 0),
      lastError: lastSync?.last_error,
      isHealthy: lastSync?.status === 'completed'
    };

    res.json(health);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get API health' });
  }
});

// Database functions for monitoring
const createMonitoringTables = `
-- System alerts table
CREATE TABLE IF NOT EXISTS system_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    metadata JSONB,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- API sync metrics table
CREATE TABLE IF NOT EXISTS api_sync_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    api_name VARCHAR(50) NOT NULL,
    metrics JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(api_name)
);

-- Database stats function
CREATE OR REPLACE FUNCTION get_database_stats() 
RETURNS TABLE (
    table_name TEXT,
    row_count BIGINT,
    size_bytes BIGINT,
    index_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname||'.'||tablename as table_name,
        n_live_tup as row_count,
        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes,
        (SELECT COUNT(*) FROM pg_indexes WHERE tablename = t.tablename)::INTEGER as index_count
    FROM pg_stat_user_tables t
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
END;
$$ LANGUAGE plpgsql;

-- Create index on alerts
CREATE INDEX IF NOT EXISTS idx_system_alerts_created_at ON system_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_alerts_type_severity ON system_alerts(type, severity) WHERE NOT resolved;
`;

// Start monitoring service
export function startMonitoringService(port: number = 3001) {
  app.listen(port, () => {
    console.log(`Monitoring service started on port ${port}`);
    console.log(`Metrics available at http://localhost:${port}/metrics`);
    console.log(`Health check at http://localhost:${port}/health`);
  });

  // Schedule regular health checks
  setInterval(performHealthChecks, 300000); // Every 5 minutes
}

// Export for use in other modules
export { alertManager, createMonitoringTables };

// Run as standalone service
if (require.main === module) {
  startMonitoringService();
}