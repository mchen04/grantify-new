import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import csrfService from '../services/csrf/csrfService';

/**
 * Generate a CSRF token for the authenticated user
 */
export const generateCSRFToken = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication Required',
        message: 'You must be logged in to generate a CSRF token' 
      });
    }

    const token = await csrfService.generateToken(req.user.id);
    
    // Set token in both response body and header for flexibility
    res.setHeader('X-CSRF-Token', token);
    res.json({ 
      csrfToken: token,
      expiresIn: 3600 // 1 hour in seconds
    });
  } catch (error) {
    logger.error('Failed to generate CSRF token', { 
      error, 
      userId: req.user?.id 
    });
    
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: 'Failed to generate CSRF token' 
    });
  }
};

/**
 * Middleware to validate CSRF tokens on state-changing requests
 */
export const validateCSRFToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Skip CSRF validation for safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication Required',
        message: 'You must be logged in to perform this action' 
      });
    }

    // Check multiple sources for CSRF token
    const csrfToken = 
      req.headers['x-csrf-token'] as string ||
      req.headers['x-xsrf-token'] as string ||
      req.body?._csrf ||
      req.query?._csrf as string;

    if (!csrfToken) {
      logger.warn('CSRF token missing', {
        userId: req.user.id,
        method: req.method,
        path: req.path,
        ip: req.ip
      });
      return res.status(403).json({ 
        error: 'CSRF Token Required',
        message: 'This request requires a valid CSRF token' 
      });
    }

    // Validate token
    const isValid = await csrfService.validateToken(req.user.id, csrfToken);

    if (!isValid) {
      logger.warn('Invalid CSRF token', {
        userId: req.user.id,
        method: req.method,
        path: req.path,
        ip: req.ip
      });
      return res.status(403).json({ 
        error: 'Invalid CSRF Token',
        message: 'The provided CSRF token is invalid or expired' 
      });
    }

    // Token is valid, continue
    next();
  } catch (error) {
    logger.error('CSRF validation error', { 
      error, 
      userId: req.user?.id,
      path: req.path 
    });
    
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: 'Failed to validate CSRF token' 
    });
  }
};

/**
 * Apply CSRF protection to specific routes that modify state
 */
export const csrfProtection = async (req: Request, res: Response, next: NextFunction) => {
  // List of paths that require CSRF protection
  const protectedPaths = [
    '/api/users/preferences',
    '/api/users/profile',
    '/api/users/interactions',
    '/api/users/password',
    '/api/grants/save',
    '/api/grants/unsave',
    '/api/grants/apply',
    '/api/grants/ignore',
    '/api/admin',
    '/api/recommendations/feedback'
  ];

  // Check if current path needs CSRF protection
  const needsProtection = protectedPaths.some(path => req.path.startsWith(path));

  if (needsProtection && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return validateCSRFToken(req, res, next);
  }

  next();
};

/**
 * Middleware to add CSRF token to response for authenticated users
 */
export const addCSRFTokenToResponse = async (req: Request, res: Response, next: NextFunction) => {
  if (req.user && req.method === 'GET') {
    try {
      // Generate a new token for GET requests to protected resources
      const token = await csrfService.generateToken(req.user.id);
      res.setHeader('X-CSRF-Token', token);
    } catch (error) {
      // Don't fail the request if token generation fails
      logger.error('Failed to add CSRF token to response', { 
        error, 
        userId: req.user.id 
      });
    }
  }
  next();
};