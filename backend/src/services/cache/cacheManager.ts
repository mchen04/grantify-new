import NodeCache from 'node-cache';
import { redisCache, CacheOptions } from './redisCache';
import logger from '../../utils/logger';

interface CacheManagerOptions extends CacheOptions {
  useRedis?: boolean;
  fallbackToMemory?: boolean;
}

class CacheManager {
  private memoryCache: NodeCache;
  private useRedis: boolean;
  private fallbackToMemory: boolean;

  constructor() {
    // Initialize in-memory cache as fallback
    this.memoryCache = new NodeCache({
      stdTTL: 3600, // 1 hour default
      checkperiod: 600, // Check for expired keys every 10 minutes
      useClones: false, // For better performance
      maxKeys: 10000, // Limit memory usage
    });

    // Configuration
    this.useRedis = process.env.USE_REDIS !== 'false';
    this.fallbackToMemory = process.env.CACHE_FALLBACK_TO_MEMORY !== 'false';

    logger.info('Cache manager initialized', {
      useRedis: this.useRedis,
      fallbackToMemory: this.fallbackToMemory,
    });
  }

  async get<T>(key: string, options?: CacheManagerOptions): Promise<T | null> {
    // Try Redis first if enabled
    if (this.useRedis && (options?.useRedis !== false)) {
      const redisValue = await redisCache.get<T>(key, options);
      if (redisValue !== null) {
        return redisValue;
      }
    }

    // Fall back to memory cache if enabled
    if (this.fallbackToMemory || !this.useRedis) {
      try {
        const memoryValue = this.memoryCache.get<T>(key);
        return memoryValue || null;
      } catch (error) {
        logger.error('Memory cache get error:', error);
        return null;
      }
    }

    return null;
  }

  async set(key: string, value: any, options?: CacheManagerOptions): Promise<boolean> {
    let redisSuccess = false;
    let memorySuccess = false;

    // Try Redis if enabled
    if (this.useRedis && (options?.useRedis !== false)) {
      redisSuccess = await redisCache.set(key, value, options);
    }

    // Also set in memory cache if Redis failed or as a backup
    if (this.fallbackToMemory || !redisSuccess) {
      try {
        const ttl = options?.ttl || 3600;
        memorySuccess = this.memoryCache.set(key, value, ttl);
      } catch (error) {
        logger.error('Memory cache set error:', error);
        memorySuccess = false;
      }
    }

    return redisSuccess || memorySuccess;
  }

  async delete(key: string, options?: CacheManagerOptions): Promise<boolean> {
    let redisSuccess = false;
    let memorySuccess = false;

    // Delete from Redis if enabled
    if (this.useRedis && (options?.useRedis !== false)) {
      redisSuccess = await redisCache.delete(key, options);
    }

    // Delete from memory cache
    try {
      const deleted = this.memoryCache.del(key);
      memorySuccess = deleted > 0;
    } catch (error) {
      logger.error('Memory cache delete error:', error);
      memorySuccess = false;
    }

    return redisSuccess || memorySuccess;
  }

  async deletePattern(pattern: string, options?: CacheManagerOptions): Promise<number> {
    let deletedCount = 0;

    // Delete from Redis if enabled
    if (this.useRedis && (options?.useRedis !== false)) {
      deletedCount += await redisCache.deletePattern(pattern, options);
    }

    // Delete from memory cache (convert pattern to regex)
    try {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      const keys = this.memoryCache.keys();
      const matchingKeys = keys.filter(key => regex.test(key));
      
      if (matchingKeys.length > 0) {
        const deleted = this.memoryCache.del(matchingKeys);
        deletedCount += deleted;
      }
    } catch (error) {
      logger.error('Memory cache delete pattern error:', error);
    }

    return deletedCount;
  }

  async clear(prefix?: string): Promise<boolean> {
    let redisSuccess = false;
    let memorySuccess = false;

    // Clear Redis if enabled
    if (this.useRedis) {
      redisSuccess = await redisCache.clear(prefix);
    }

    // Clear memory cache
    try {
      if (prefix) {
        const keys = this.memoryCache.keys();
        const matchingKeys = keys.filter(key => key.startsWith(prefix));
        if (matchingKeys.length > 0) {
          this.memoryCache.del(matchingKeys);
        }
      } else {
        this.memoryCache.flushAll();
      }
      memorySuccess = true;
    } catch (error) {
      logger.error('Memory cache clear error:', error);
      memorySuccess = false;
    }

    return redisSuccess || memorySuccess;
  }

  async exists(key: string, options?: CacheManagerOptions): Promise<boolean> {
    // Check Redis first if enabled
    if (this.useRedis && (options?.useRedis !== false)) {
      const redisExists = await redisCache.exists(key, options);
      if (redisExists) {
        return true;
      }
    }

    // Check memory cache
    return this.memoryCache.has(key);
  }

  async ttl(key: string, options?: CacheManagerOptions): Promise<number> {
    // Check Redis first if enabled
    if (this.useRedis && (options?.useRedis !== false)) {
      const redisTtl = await redisCache.ttl(key, options);
      if (redisTtl > 0) {
        return redisTtl;
      }
    }

    // Check memory cache
    const memoryTtl = this.memoryCache.getTtl(key);
    if (memoryTtl) {
      const now = Date.now();
      const remainingMs = memoryTtl - now;
      return Math.max(0, Math.floor(remainingMs / 1000));
    }

    return -1;
  }

  getStats(): {
    redis: { connected: boolean; ready: boolean };
    memory: { keys: number; hits: number; misses: number };
  } {
    return {
      redis: redisCache.getStatus(),
      memory: {
        keys: this.memoryCache.keys().length,
        hits: this.memoryCache.getStats().hits,
        misses: this.memoryCache.getStats().misses,
      },
    };
  }

  async healthCheck(): Promise<{
    healthy: boolean;
    redis: { connected: boolean; ready: boolean };
    memory: { available: boolean; keys: number };
  }> {
    const redisStatus = redisCache.getStatus();
    const memoryKeys = this.memoryCache.keys().length;

    return {
      healthy: redisStatus.ready || this.fallbackToMemory,
      redis: redisStatus,
      memory: {
        available: true,
        keys: memoryKeys,
      },
    };
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();

// Export type for dependency injection
export type CacheManagerType = typeof cacheManager;