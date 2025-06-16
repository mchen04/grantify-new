import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * General API rate limiter
 * Limits each IP to 1000 requests per 15 minutes in production
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 1000 : 5000, // Limit each IP to 1000 requests per window in production
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { 
    error: 'Too Many Requests',
    message: 'Too many requests from this IP, please try again after 15 minutes',
    retryAfter: 15
  },
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  keyGenerator: (req: Request) => {
    // Use both IP and user ID if authenticated for better rate limiting
    const userId = (req as any).user?.id;
    return userId ? `${req.ip}-${userId}` : req.ip || 'unknown';
  }
});

/**
 * Stricter rate limiter for authentication routes
 * Limits each IP to 5 requests per 15 minutes
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 auth attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { 
    error: 'Too Many Authentication Attempts',
    message: 'Too many authentication attempts from this IP, please try again after 15 minutes',
    retryAfter: 15
  },
  skipSuccessfulRequests: true, // Don't count successful logins against the limit
  skipFailedRequests: false,
  // Store rate limit data in memory with prefix to avoid conflicts
  keyGenerator: (req: Request) => `auth:${req.ip || 'unknown'}`
});

/**
 * Rate limiter for user preference updates
 * Limits each user to 20 updates per hour
 */
export const userPreferencesLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each user to 20 preference updates per hour
  standardHeaders: true,
  legacyHeaders: false, 
  message: { 
    error: 'Too Many Updates',
    message: 'Too many preference updates, please try again later',
    retryAfter: 60
  },
  skipSuccessfulRequests: false,
  skipFailedRequests: true, // Don't count failed requests
  keyGenerator: (req: Request) => {
    // Use user ID for authenticated routes
    const userId = (req as any).user?.id;
    return userId ? `pref:${userId}` : `pref:${req.ip || 'unknown'}`;
  }
});

/**
 * Stricter rate limiter for password reset requests
 * Limits each IP to 3 requests per hour
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 password reset requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { 
    error: 'Too Many Password Reset Attempts',
    message: 'Too many password reset requests, please try again after 1 hour',
    retryAfter: 60
  },
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  keyGenerator: (req: Request) => `reset:${req.ip || 'unknown'}`
});

/**
 * Rate limiter for grant search/filter operations
 * More lenient as these are read operations
 */
export const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 searches per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { 
    error: 'Too Many Search Requests',
    message: 'Too many search requests, please slow down',
    retryAfter: 1
  },
  skipSuccessfulRequests: false,
  skipFailedRequests: true
});