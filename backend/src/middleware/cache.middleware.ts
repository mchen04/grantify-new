import { Request, Response, NextFunction } from 'express';
import NodeCache from 'node-cache';

// Create cache instances with different TTLs
const shortCache = new NodeCache({ stdTTL: 300 }); // 5 minutes
const mediumCache = new NodeCache({ stdTTL: 900 }); // 15 minutes
const longCache = new NodeCache({ stdTTL: 3600 }); // 1 hour

interface CacheOptions {
  ttl?: number;
  duration?: number; // Alternative name for ttl
  keyGenerator?: (req: Request) => string;
  condition?: (req: Request) => boolean;
}

/**
 * Cache middleware factory
 * @param options - Cache configuration options
 */
export const cacheMiddleware = (options: CacheOptions = {}) => {
  const { 
    ttl = 300, // Default 5 minutes
    duration = ttl, // Use duration if provided, otherwise fall back to ttl
    keyGenerator = defaultKeyGenerator,
    condition = () => true
  } = options;
  
  const actualTTL = duration || ttl;

  return (req: Request, res: Response, next: NextFunction) => {
    // Skip caching for non-GET requests (except specific POST endpoints we want to cache)
    const isCacheablePost = req.method === 'POST' && (req.path.includes('/batch') || req.path.includes('/search'));
    if ((req.method !== 'GET' && !isCacheablePost) || !condition(req)) {
      return next();
    }

    const key = keyGenerator(req);
    const cachedData = getCacheByTTL(actualTTL).get(key);

    if (cachedData) {
      // Add cache hit header
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Cache-Control', `public, max-age=${actualTTL}`);
      return res.json(cachedData);
    }

    // Store original json method
    const originalJson = res.json;

    // Override json method to cache the response
    res.json = function(data: any) {
      // Add cache miss header
      res.setHeader('X-Cache', 'MISS');
      res.setHeader('Cache-Control', `public, max-age=${actualTTL}`);
      
      // Cache the response
      getCacheByTTL(actualTTL).set(key, data);
      
      // Call original json method
      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Get cache instance based on TTL
 */
function getCacheByTTL(ttl: number): NodeCache {
  if (ttl <= 300) return shortCache;
  if (ttl <= 900) return mediumCache;
  return longCache;
}

/**
 * Default cache key generator
 */
function defaultKeyGenerator(req: Request): string {
  const userId = req.query.userId || 'anonymous';
  
  // For POST requests, we can't reliably use body in key generation
  // because body parsing might not have happened yet
  // Instead, use a hash of the stringified body if available
  if (req.method === 'POST' && req.body) {
    try {
      // Create a stable key from the body content
      const bodyStr = JSON.stringify(req.body, Object.keys(req.body).sort());
      // Simple hash function for cache key
      let hash = 0;
      for (let i = 0; i < bodyStr.length; i++) {
        const char = bodyStr.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return `${req.originalUrl || req.url}-${userId}-body${hash}`;
    } catch (e) {
      // If body serialization fails, fall back to URL-based key
      console.warn('[Cache] Failed to generate cache key from body:', e);
    }
  }
  
  return `${req.originalUrl || req.url}-${userId}`;
}


// Predefined cache configurations
export const cacheConfigs = {
  // Short cache for frequently changing data
  short: cacheMiddleware({ ttl: 180 }), // 3 minutes
  
  // Medium cache for moderately changing data
  medium: cacheMiddleware({ ttl: 900 }), // 15 minutes
  
  // Cache for recommendations
  recommendations: cacheMiddleware({
    ttl: 300, // 5 minutes
    keyGenerator: (req) => `recommendations-${req.query.userId}-${req.query.limit || 20}`
  })
};