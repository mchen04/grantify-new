import { createClient, SupabaseClient } from '@supabase/supabase-js';
import 'dotenv/config';
import { getConnectionPool, withDatabaseConnection } from '../services/database/ThreadSafeConnectionPoolManager';
import { getDatabasePoolConfig } from './connectionPoolConfig';
import logger from '../utils/logger';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase credentials. Please check your .env file.');
}

// Get database pool configuration
const poolConfig = getDatabasePoolConfig();
logger.info('Database connection pool initialized', {
  maxConnections: poolConfig.maxConnections,
  minConnections: poolConfig.minConnections,
  environment: process.env.NODE_ENV || 'development'
});

// Create public client for general operations (respects RLS)
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false,
    detectSessionInUrl: false
  }
});

// Connection pool-based service role client access
// WARNING: This bypasses RLS - use only when absolutely necessary

/**
 * Get a pooled service role client (RECOMMENDED)
 * Uses the connection pool to prevent resource exhaustion
 */
export const getServiceRoleClient = async (): Promise<SupabaseClient> => {
  const connectionPool = getConnectionPool();
  return await connectionPool.acquireConnection();
};

/**
 * Release a service role client back to the pool
 * IMPORTANT: Always call this after using getServiceRoleClient()
 */
export const releaseServiceRoleClient = async (client: SupabaseClient): Promise<void> => {
  const connectionPool = getConnectionPool();
  return await connectionPool.releaseConnection(client);
};

/**
 * Execute an operation with a pooled service role client (RECOMMENDED)
 * Automatically handles connection acquisition and release
 */
export const withServiceRoleClient = async <T>(
  operation: (client: SupabaseClient) => Promise<T>
): Promise<T> => {
  return withDatabaseConnection(operation);
};

// Legacy service role client manager for backward compatibility
class LegacyServiceRoleClientManager {
  private client: SupabaseClient | null = null;
  private warningShown = false;

  getClientSync(): SupabaseClient {
    if (!this.warningShown) {
      logger.warn('DEPRECATED: getServiceRoleClientSync() creates unmanaged connections. Use withServiceRoleClient() instead.');
      this.warningShown = true;
    }

    if (!supabaseServiceKey) {
      throw new Error('Service role key not available');
    }

    if (this.client) {
      return this.client;
    }

    // Create a legacy client for backward compatibility
    this.client = createClient(supabaseUrl!, supabaseServiceKey!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    });

    return this.client;
  }

  async shutdown(): Promise<void> {
    if (this.client) {
      this.client = null;
    }
  }

  getStatus(): { hasClient: boolean; isCreating: boolean; pendingPromises: number } {
    return {
      hasClient: this.client !== null,
      isCreating: false,
      pendingPromises: 0
    };
  }
}

// Legacy singleton instance
const legacyServiceRoleManager = new LegacyServiceRoleClientManager();

/**
 * DEPRECATED: Synchronous service role client access
 * Creates unmanaged connections that can lead to pool exhaustion
 * Use withServiceRoleClient() instead
 */
export const getServiceRoleClientSync = (): SupabaseClient => {
  return legacyServiceRoleManager.getClientSync();
};

// Export legacy manager for backward compatibility
export const serviceRoleClientManager = legacyServiceRoleManager;

// Create authenticated client for user-specific operations
export const createAuthenticatedClient = (userToken: string) => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${userToken}`
      }
    }
  });
};

// Connection pool management and monitoring utilities
export const connectionPoolUtils = {
  /**
   * Get connection pool statistics
   */
  getPoolStats: () => {
    return getConnectionPool().getStats();
  },

  /**
   * Execute multiple database operations in batches
   */
  withBatchOperations: async <T>(
    operations: Array<(client: SupabaseClient) => Promise<T>>,
    batchSize?: number
  ): Promise<T[]> => {
    const connectionPool = getConnectionPool();
    return connectionPool.withBatchOperations(operations, batchSize);
  },

  /**
   * Gracefully shutdown the connection pool
   */
  shutdown: async (): Promise<void> => {
    const connectionPool = getConnectionPool();
    await connectionPool.shutdown();
    await legacyServiceRoleManager.shutdown();
  },

  /**
   * Health check for the connection pool
   */
  healthCheck: async (): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    stats: any;
    issues: string[];
  }> => {
    const stats = getConnectionPool().getStats();
    const issues: string[] = [];
    
    // Check for potential issues
    if (stats.activeConnections / stats.config.maxConnections > 0.8) {
      issues.push('High connection usage (>80%)');
    }
    
    if (stats.waitingRequests > 5) {
      issues.push('High number of waiting requests');
    }
    
    if (stats.connectionFailures > 0) {
      issues.push('Recent connection failures detected');
    }
    
    if (stats.healthCheckFailures > 0) {
      issues.push('Health check failures detected');
    }
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (issues.length > 0) {
      status = issues.length > 2 ? 'unhealthy' : 'degraded';
    }
    
    return { status, stats, issues };
  }
};

// Default export is the public client
export default supabaseClient;