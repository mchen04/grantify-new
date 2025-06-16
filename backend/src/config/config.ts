/**
 * Application configuration
 */

// Validate required environment variables
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_KEY'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Validate JWT secret
const jwtSecret = process.env.JWT_SECRET;
const isProduction = process.env.NODE_ENV === 'production';

// List of insecure JWT secrets to check against
const insecureSecrets = [
  'your-secret-key',
  'dev-secret-key-only-for-development',
  'secret',
  'password',
  '12345',
  'admin',
  'default'
];

if (isProduction) {
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable must be set in production');
  }
  
  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long in production');
  }
  
  if (insecureSecrets.includes(jwtSecret.toLowerCase())) {
    throw new Error('JWT_SECRET contains a known insecure value. Please use a cryptographically secure random string');
  }
}

// Generate a secure random secret for development if not provided
const getJwtSecret = () => {
  if (jwtSecret) {
    return jwtSecret;
  }
  
  if (!isProduction) {
    // Generate a random secret for development
    const crypto = require('crypto');
    const devSecret = crypto.randomBytes(32).toString('hex');
    console.warn(`⚠️  No JWT_SECRET provided. Generated temporary secret for development: ${devSecret.substring(0, 10)}...`);
    console.warn('⚠️  Please set JWT_SECRET environment variable for production use');
    return devSecret;
  }
  
  throw new Error('JWT_SECRET is required');
};

export default {
  // Server configuration
  server: {
    port: process.env.PORT || 3001,
    host: process.env.HOST || 'localhost',
    cors: {
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Allow specific origins
        const allowedOrigins = [
          'http://localhost:3000',
          'http://localhost:3001',
          'https://grantify.ai',
          'https://www.grantify.ai',
          ...(process.env.CORS_ALLOWED_ORIGINS?.split(',') || [])
        ];
        
        // Allow requests with no origin (like mobile apps)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'Cache-Control', 'Pragma'],
      credentials: true,
      maxAge: 86400 // 24 hours
    }
  },
  
  // Database configuration
  database: {
    url: process.env.DATABASE_URL || '',
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseKey: process.env.SUPABASE_ANON_KEY || ''
  },
  
  // Grants.gov API configuration
  grantsGov: {
    baseUrl: 'https://www.grants.gov/grantsws/rest',
    extractUrl: 'https://www.grants.gov/extract/',
    extractV2Url: 'https://www.grants.gov/xml-extract/XMLExtract_Public.zip',
    userAgent: 'Grantify.ai/1.0'
  },
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
    directory: process.env.LOG_DIR || './logs'
  },
  
  // Authentication configuration
  auth: {
    jwtSecret: getJwtSecret(),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '86400000'), // 24 hours in ms
    refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY || '30d'
  },
  
  // Rate limiting configuration
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '5000') // 100 requests per windowMs
  },
  
  // Recommendation engine configuration
  recommendations: {
    // Number of grants to recommend per user
    limit: parseInt(process.env.RECOMMENDATION_LIMIT || '20'),
    // Minimum similarity score (0-1) for a grant to be recommended
    minScore: parseFloat(process.env.RECOMMENDATION_MIN_SCORE || '0.3'),
    // Weights for different factors in recommendation algorithm
    weights: {
      categoryMatch: parseFloat(process.env.RECOMMENDATION_WEIGHT_CATEGORY || '0.4'),
      agencyMatch: parseFloat(process.env.RECOMMENDATION_WEIGHT_AGENCY || '0.2'),
      fundingMatch: parseFloat(process.env.RECOMMENDATION_WEIGHT_FUNDING || '0.2'),
      eligibilityMatch: parseFloat(process.env.RECOMMENDATION_WEIGHT_ELIGIBILITY || '0.2')
    }
  },

  // Redis configuration
  redis: {
    enabled: process.env.REDIS_ENABLED === 'true' || false,
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0')
  }
};