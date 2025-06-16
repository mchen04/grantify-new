import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * Performance monitoring middleware
 * Tracks request timing and logs slow requests
 */

interface RequestWithTiming extends Request {
  startTime?: number;
}

export const performanceMiddleware = (req: RequestWithTiming, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  req.startTime = startTime;

  // Capture original end method
  const originalEnd = res.end;

  // Override end method to capture timing
  res.end = function(chunk?: any, encoding?: any, cb?: any): Response {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Log performance metrics
    const performanceData = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: req.user?.id || null,
      contentLength: res.get('content-length') || 0,
      timestamp: new Date().toISOString()
    };

    // Log all requests with timing
    logger.info('Request performance', performanceData);

    // Log slow requests as warnings (>2 seconds)
    if (duration > 2000) {
      logger.warn('Slow request detected', {
        ...performanceData,
        slowRequestAlert: true
      });
    }

    // Log very slow requests as errors (>5 seconds)
    if (duration > 5000) {
      logger.error('Very slow request detected', {
        ...performanceData,
        verySlowRequestAlert: true
      });
    }

    // Log error responses
    if (res.statusCode >= 400) {
      logger.warn('Error response', performanceData);
    }

    // Set performance headers for debugging
    res.setHeader('X-Response-Time', `${duration}ms`);
    
    // Call original end method and return the response
    return originalEnd.call(this, chunk, encoding, cb);
  };

  next();
};

/**
 * Health check endpoint with system metrics
 */
export const healthCheckEndpoint = (req: Request, res: Response) => {
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();
  
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(uptime / 60)} minutes`,
    memory: {
      used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
      total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`
    },
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development'
  };

  logger.debug('Health check requested', healthData);
  
  res.status(200).json(healthData);
};

/**
 * Memory monitoring function to track memory usage
 */
export const monitorMemoryUsage = () => {
  const memoryUsage = process.memoryUsage();
  const memoryData = {
    heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
    heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
    rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
    external: Math.round(memoryUsage.external / 1024 / 1024), // MB
    timestamp: new Date().toISOString()
  };

  logger.debug('Memory usage', memoryData);

  // Alert if memory usage is high (>500MB heap)
  if (memoryData.heapUsed > 500) {
    logger.warn('High memory usage detected', {
      ...memoryData,
      memoryAlert: true
    });
  }

  // Alert if memory usage is critical (>1GB heap)
  if (memoryData.heapUsed > 1000) {
    logger.error('Critical memory usage detected', {
      ...memoryData,
      criticalMemoryAlert: true
    });
  }

  return memoryData;
};

/**
 * Start memory monitoring interval
 */
export const startMemoryMonitoring = () => {
  // Monitor memory every 5 minutes
  setInterval(monitorMemoryUsage, 5 * 60 * 1000);
  
  logger.info('Memory monitoring started - checking every 5 minutes');
};