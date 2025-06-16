import { Request, Response, NextFunction } from 'express';
import logger, { logSecurityEvent } from '../utils/logger';

// Track failed login attempts
const failedLoginAttempts = new Map<string, { count: number; lastAttempt: number }>();

// Clean up old entries every hour
setInterval(() => {
  const oneHourAgo = Date.now() - 3600000;
  for (const [key, data] of failedLoginAttempts.entries()) {
    if (data.lastAttempt < oneHourAgo) {
      failedLoginAttempts.delete(key);
    }
  }
}, 3600000);

/**
 * Middleware to audit critical operations
 */
export const auditMiddleware = (operation: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    
    // Log the operation attempt
    logSecurityEvent(req.user?.id || 'anonymous', `${operation}_ATTEMPT`, {
      operation,
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Override res.json to capture the response
    const originalJson = res.json;
    res.json = function(data: any) {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;
      
      // Log the operation result
      logSecurityEvent(req.user?.id || 'anonymous', `${operation}_${statusCode < 400 ? 'SUCCESS' : 'FAILURE'}`, {
        operation,
        statusCode,
        duration,
        path: req.path
      });
      
      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Track failed authentication attempts
 */
export const trackFailedAuth = (identifier: string) => {
  const key = identifier.toLowerCase();
  const current = failedLoginAttempts.get(key) || { count: 0, lastAttempt: 0 };
  
  current.count++;
  current.lastAttempt = Date.now();
  
  failedLoginAttempts.set(key, current);
  
  // Alert on suspicious activity
  if (current.count >= 5) {
    logSecurityEvent(null, 'SUSPICIOUS_AUTH_ACTIVITY', {
      identifier: key,
      failedAttempts: current.count,
      message: 'Multiple failed login attempts detected'
    });
  }
  
  return current.count;
};

/**
 * Check if an account is temporarily locked due to failed attempts
 */
export const isAccountLocked = (identifier: string): boolean => {
  const key = identifier.toLowerCase();
  const attempts = failedLoginAttempts.get(key);
  
  if (!attempts) return false;
  
  // Lock account for 15 minutes after 10 failed attempts
  if (attempts.count >= 10) {
    const timeSinceLastAttempt = Date.now() - attempts.lastAttempt;
    return timeSinceLastAttempt < 900000; // 15 minutes
  }
  
  return false;
};

/**
 * Clear failed attempts on successful login
 */
export const clearFailedAttempts = (identifier: string) => {
  failedLoginAttempts.delete(identifier.toLowerCase());
};

/**
 * Monitor rate limit breaches
 */
export const monitorRateLimit = (req: Request, res: Response, next: NextFunction) => {
  if (res.statusCode === 429) {
    logSecurityEvent(req.user?.id || req.ip, 'RATE_LIMIT_EXCEEDED', {
      path: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
  }
  next();
};