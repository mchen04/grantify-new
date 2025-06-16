import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import crypto from 'crypto';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

/**
 * Get environment-specific CSP directives
 */
function getCSPDirectives() {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  const baseDirectives = {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for CSS-in-JS
    imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
    connectSrc: [
      "'self'",
      'https://*.supabase.co',
      'https://*.supabase.com',
      'https://api.openai.com',
      'https://generativelanguage.googleapis.com'
    ],
    fontSrc: ["'self'", 'data:', 'https:'],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"],
    childSrc: ["'none'"],
    manifestSrc: ["'self'"],
    workerSrc: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
    baseUri: ["'self'"],
    upgradeInsecureRequests: []
  };
  
  if (isDevelopment) {
    // More permissive in development
    baseDirectives.connectSrc.push('http://localhost:*', 'ws://localhost:*');
    baseDirectives.scriptSrc.push("'unsafe-eval'"); // For dev tools
  }
  
  return baseDirectives;
}

/**
 * Security middleware that adds various security headers
 */
export const securityMiddleware = helmet({
  contentSecurityPolicy: {
    directives: getCSPDirectives(),
    reportOnly: process.env.NODE_ENV !== 'production' // Report-only in dev
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: {
    policy: ['strict-origin-when-cross-origin']
  },
  permittedCrossDomainPolicies: false,
  crossOriginEmbedderPolicy: false, // Disable for API
  crossOriginOpenerPolicy: {
    policy: 'same-origin'
  },
  crossOriginResourcePolicy: {
    policy: 'cross-origin' // Allow cross-origin for API
  }
});

/**
 * Additional security headers not covered by helmet
 */
export const additionalSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Generate a unique nonce for this request
  const nonce = crypto.randomBytes(16).toString('base64');
  res.locals.nonce = nonce;
  
  // Additional security headers
  res.setHeader('Expect-CT', 'max-age=86400, enforce, report-uri="/api/csp-report"');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('Permissions-Policy', [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'interest-cohort=()',
    'payment=()',
    'usb=()',
    'autoplay=()',
    'fullscreen=(self)',
    'picture-in-picture=()'
  ].join(', '));
  
  // Security-focused cache control for sensitive endpoints
  if (req.path.includes('/api/users') || req.path.includes('/api/admin')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  } else {
    // Less strict for public endpoints
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  }
  
  // Remove potentially dangerous headers
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  res.removeHeader('X-AspNet-Version');
  res.removeHeader('X-AspNetMvc-Version');
  
  // Add custom server identification (optional)
  res.setHeader('X-API-Version', '1.0.0');
  
  next();
};

/**
 * CSP violation reporting endpoint
 */
export const cspReportHandler = (req: Request, res: Response) => {
  const report = req.body;
  
  // Log CSP violations for security monitoring
  // In production, this should be sent to a logging service
  
  res.status(204).end();
};

/**
 * Middleware to add request ID for tracking
 */
export const addRequestId = (req: Request, res: Response, next: NextFunction) => {
  const requestId = crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};

/**
 * Security-focused CORS middleware
 */
export const securityCORS = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.get('origin');
  const allowedOrigins = [
    'http://localhost:3000',
    'https://grantify.ai',
    'https://www.grantify.ai',
    ...(process.env.CORS_ALLOWED_ORIGINS?.split(',') || [])
  ];
  
  // Validate origin
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  // Secure CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', [
    'Content-Type',
    'Authorization',
    'X-CSRF-Token',
    'X-Requested-With',
    'Cache-Control'
  ].join(', '));
  res.setHeader('Access-Control-Expose-Headers', [
    'X-CSRF-Token',
    'X-Request-ID',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset'
  ].join(', '));
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  
  next();
};