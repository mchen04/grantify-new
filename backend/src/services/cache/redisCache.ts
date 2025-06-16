import Redis from 'ioredis';
import config from '../../config/config';
import logger from '../../utils/logger';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string; // Key prefix for namespacing
}

class RedisCache {
  private client: Redis | null = null;
  private isConnected: boolean = false;
  private readonly defaultTTL = 3600; // 1 hour
  private readonly keyPrefix = 'grantify:';

  constructor() {
    this.initializeClient();
  }

  private initializeClient(): void {
    try {
      // Parse Redis URL or use individual config
      const redisUrl = process.env.REDIS_URL;
      
      if (redisUrl) {
        this.client = new Redis(redisUrl, {
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
          enableOfflineQueue: false,
          lazyConnect: true,
          retryStrategy: (times: number) => {
            const delay = Math.min(times * 100, 3000);
            return delay;
          },
        });
      } else if (config.redis?.enabled) {
        // Fallback to individual config
        this.client = new Redis({
          host: config.redis.host,
          port: config.redis.port,
          password: config.redis.password,
          db: config.redis.db,
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
          enableOfflineQueue: false,
          lazyConnect: true,
          retryStrategy: (times: number) => {
            const delay = Math.min(times * 100, 3000);
            return delay;
          },
        });
      }

      // Set up event handlers if client was created
      if (this.client) {
        this.client.on('connect', () => {
          logger.info('Redis client connected');
          this.isConnected = true;
        });

        this.client.on('error', (error) => {
          logger.error('Redis client error:', error);
          this.isConnected = false;
        });

        this.client.on('close', () => {
          logger.warn('Redis client connection closed');
          this.isConnected = false;
        });

        this.client.on('reconnecting', () => {
          logger.info('Redis client reconnecting...');
        });

        // Connect to Redis
        this.client.connect().catch((error) => {
          logger.error('Failed to connect to Redis:', error);
          this.isConnected = false;
        });
      }
    } catch (error) {
      logger.error('Failed to initialize Redis client:', error);
      this.client = null;
      this.isConnected = false;
    }
  }

  private getKey(key: string, prefix?: string): string {
    const finalPrefix = prefix || this.keyPrefix;
    return `${finalPrefix}${key}`;
  }

  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    if (!this.isConnected || !this.client) {
      logger.debug('Redis not connected, skipping cache get');
      return null;
    }

    try {
      const fullKey = this.getKey(key, options?.prefix);
      const value = await this.client.get(fullKey);
      
      if (value === null) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      logger.error(`Redis get error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, options?: CacheOptions): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      logger.debug('Redis not connected, skipping cache set');
      return false;
    }

    try {
      const fullKey = this.getKey(key, options?.prefix);
      const ttl = options?.ttl || this.defaultTTL;
      const stringValue = JSON.stringify(value);

      await this.client.setex(fullKey, ttl, stringValue);
      return true;
    } catch (error) {
      logger.error(`Redis set error for key ${key}:`, error);
      return false;
    }
  }

  async delete(key: string, options?: CacheOptions): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      logger.debug('Redis not connected, skipping cache delete');
      return false;
    }

    try {
      const fullKey = this.getKey(key, options?.prefix);
      const result = await this.client.del(fullKey);
      return result > 0;
    } catch (error) {
      logger.error(`Redis delete error for key ${key}:`, error);
      return false;
    }
  }

  async deletePattern(pattern: string, options?: CacheOptions): Promise<number> {
    if (!this.isConnected || !this.client) {
      logger.debug('Redis not connected, skipping pattern delete');
      return 0;
    }

    try {
      const fullPattern = this.getKey(pattern, options?.prefix);
      const keys = await this.client.keys(fullPattern);
      
      if (keys.length === 0) {
        return 0;
      }

      const result = await this.client.del(...keys);
      return result;
    } catch (error) {
      logger.error(`Redis delete pattern error for pattern ${pattern}:`, error);
      return 0;
    }
  }

  async clear(prefix?: string): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      logger.debug('Redis not connected, skipping cache clear');
      return false;
    }

    try {
      const pattern = `${prefix || this.keyPrefix}*`;
      const keys = await this.client.keys(pattern);
      
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
      
      return true;
    } catch (error) {
      logger.error('Redis clear error:', error);
      return false;
    }
  }

  async exists(key: string, options?: CacheOptions): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const fullKey = this.getKey(key, options?.prefix);
      const result = await this.client.exists(fullKey);
      return result === 1;
    } catch (error) {
      logger.error(`Redis exists error for key ${key}:`, error);
      return false;
    }
  }

  async ttl(key: string, options?: CacheOptions): Promise<number> {
    if (!this.isConnected || !this.client) {
      return -1;
    }

    try {
      const fullKey = this.getKey(key, options?.prefix);
      return await this.client.ttl(fullKey);
    } catch (error) {
      logger.error(`Redis ttl error for key ${key}:`, error);
      return -1;
    }
  }

  async expire(key: string, seconds: number, options?: CacheOptions): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const fullKey = this.getKey(key, options?.prefix);
      const result = await this.client.expire(fullKey, seconds);
      return result === 1;
    } catch (error) {
      logger.error(`Redis expire error for key ${key}:`, error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      logger.info('Redis client disconnected');
    }
  }

  isReady(): boolean {
    return this.isConnected && this.client !== null;
  }

  getStatus(): { connected: boolean; ready: boolean; host?: string; port?: number } {
    return {
      connected: this.isConnected,
      ready: this.isReady(),
      host: this.client?.options.host,
      port: this.client?.options.port,
    };
  }
}

// Export singleton instance
export const redisCache = new RedisCache();

// Export type for dependency injection
export type RedisCacheType = typeof redisCache;