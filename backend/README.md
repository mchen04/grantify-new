# Grantify.ai Backend

Express.js API server powering the Grantify.ai grant discovery platform with AI-powered recommendations, automated data collection, and comprehensive security.

## 🏗️ Architecture Overview

The backend is built as a modular, scalable Express.js application with TypeScript, featuring:

- **RESTful API** with batch endpoints for performance optimization
- **AI Integration** with Google Gemini 1.5 Flash and Text-Embedding-004
- **Automated Scraping** pipeline for NIH grants with Puppeteer
- **Vector Search** using pgvector (768-dimensional embeddings)
- **Weighted Recommendation Algorithm** combining multiple scoring factors
- **Enterprise Security** with JWT auth, RBAC, CSRF protection, rate limiting, and audit logging
- **Performance Optimized** with hybrid caching (Redis + in-memory), database indexing, and batch operations
- **Analytics Service** with materialized views for dashboard metrics
- **Error Monitoring** with Sentry integration for production debugging
- **Cache Management** with automatic fallback from Redis to in-memory

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL with pgvector extension (via Supabase)
- Google Cloud account with Gemini API enabled

### Installation

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your credentials
```

4. Start the development server:
```bash
npm run dev
```

The server will start on http://localhost:3001

## 🔧 Configuration

### Environment Variables
```env
# Server
PORT=3001
NODE_ENV=development

# Supabase
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Security
JWT_SECRET=your-32-character-secret
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRY=30d
BCRYPT_ROUNDS=12
SESSION_TIMEOUT=86400000

# Google AI
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-api-key
GOOGLE_AI_API_KEY=your-gemini-api-key  # Alias for above

# CORS (comma-separated origins)
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Redis (optional - falls back to in-memory)
REDIS_URL=redis://localhost:6379
REDIS_ENABLED=false

# Monitoring (optional)
SENTRY_DSN=your-sentry-dsn
SENTRY_ENVIRONMENT=development

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
LOG_DIR=./logs

# AI & Recommendations
RECOMMENDATION_LIMIT=20
RECOMMENDATION_MIN_SCORE=0.3
RECOMMENDATION_WEIGHT_CATEGORY=0.4
RECOMMENDATION_WEIGHT_AGENCY=0.2
RECOMMENDATION_WEIGHT_FUNDING=0.2
RECOMMENDATION_WEIGHT_ELIGIBILITY=0.2

# Performance
MEMORY_WARNING_THRESHOLD=500
MEMORY_CRITICAL_THRESHOLD=800
CACHE_TTL=3600

# Health Checks
HEALTH_CHECK_INTERVAL=30s
HEALTH_CHECK_TIMEOUT=10s
HEALTH_CHECK_RETRIES=3
```

## 📚 API Documentation

### Authentication
All authenticated endpoints require a Supabase JWT token:
```
Authorization: Bearer <supabase-jwt-token>
X-CSRF-Token: <csrf-token> (for state-changing requests)
```

### Core Endpoints

#### Grants

**Search and Filter Grants**
```
GET /api/grants
Query params:
  - search: string (text search)
  - category: string
  - agency_name: string
  - funding_min/max: number
  - deadline_min/max: ISO date
  - include_no_deadline: boolean
  - include_no_funding: boolean
  - page: number (default: 1)
  - limit: number (default: 10, max: 100)
  - sort_by: string (deadline, award_ceiling, post_date)
  - sort_order: asc|desc
  - limit: number (default: 20, max: 100)
  - sort_by: recent|deadline|amount|relevance
  - user_id: string (for interaction filtering)
  - exclude_interaction_types: saved,applied,ignored
```

**Get Grant Details**
```
GET /api/grants/:id
Returns: Grant with contacts
```

**Batch Fetch Grants** (NEW)
```
POST /api/grants/batch
Body: { grant_ids: string[] }
Returns: { grants: Grant[] }
Note: Maximum 100 grants per request
```

**Batch Fetch with Interactions** (NEW)
```
POST /api/grants/batch/interactions (Auth Required)
Body: { grant_ids: string[] }
Returns: { results: { [grantId]: { grant, interaction? } } }
```

**Get Recommended Grants**
```
GET /api/grants/recommended (Auth Required)
Query params:
  - exclude: comma-separated grant IDs
  - limit: number (default: 10, max: 50)
Returns: Grants with recommendation scores
```

**Find Similar Grants**
```
GET /api/grants/similar
Query params:
  - exclude_id: string (required)
  - limit: number (default: 3, max: 20)
  - match_threshold: number (0.1-1.0, default: 0.7)
Returns: Similar grants using vector similarity
```

**Get Filter Metadata**
```
GET /api/grants/metadata
Returns: All available filter options (agencies, categories, etc.)
```

#### Grant Interactions

**Save Grant**
```
POST /api/grants/:id/save (Auth Required)
```

**Mark as Applied**
```
POST /api/grants/:id/apply (Auth Required)
```

**Ignore Grant**
```
POST /api/grants/:id/ignore (Auth Required)
```

**Remove Saved Grant**
```
DELETE /api/grants/:id/save (Auth Required)
```

#### Users

**Get User Preferences**
```
GET /api/users/preferences (Auth Required)
Query params: userId
```

**Update User Preferences**
```
PUT /api/users/preferences (Auth Required)
Body: {
  userId: string,
  preferences: {
    funding_min?: number,
    funding_max?: number,
    agencies?: string[],
    deadline_range?: string,
    project_description_query?: string
  }
}
```

**Get User Interactions**
```
GET /api/users/interactions (Auth Required)
Query params:
  - userId: string
  - action?: saved|applied|ignored
  - grant_id?: string
  - includeGrantDetails?: boolean
```

**Delete Interaction**
```
DELETE /api/users/interactions/delete (Auth Required)
Body: { user_id, grant_id, action }
```

#### Recommendations

**Get AI Recommendations**
```
POST /api/recommendations (Auth Required)
Body: { limit?: number }
Returns: Weighted recommendations based on:
  - Semantic similarity (40%)
  - Funding match (20%)
  - Deadline proximity (15%)
  - Agency preference (10%)
  - Category match (5%)
  - Interaction history
```

#### Analytics

**Dashboard Metrics**
```
GET /api/analytics/dashboard (Auth Required)
Query params: userId
Returns: {
  totalGrants, savedGrants, appliedGrants,
  recentActivity, categoryBreakdown,
  deadlineAlerts, fundingStats
}
```

**Grant Statistics**
```
GET /api/analytics/grants
Returns: Aggregated grant statistics by agency, category, funding
```

**Agency Analytics**
```
GET /api/analytics/agencies
Returns: Grant distribution and funding by agency
```

#### System

**Health Check**
```
GET /api/health
Returns: { status, uptime, environment, memory, nodeVersion }
```

**CSRF Token**
```
GET /api/csrf-token (Auth Required)
Returns: { csrfToken, expiresIn }
```

#### Admin Endpoints

**Get Pipeline Status**
```
GET /api/admin/pipeline/status (Auth Required, Admin Role)
Returns: {
  isRunning: boolean,
  currentStep: string,
  progress: { completed: number, total: number },
  lastRun: { timestamp, success, error? }
}
```

**Run Scraping Pipeline**
```
POST /api/admin/pipeline/run (Auth Required, Admin Role)
Body: {
  scrapeMode?: 'full' | 'incremental',
  maxPages?: number
}
Returns: { message: string, pipelineId: string }
```

#### Maintenance Endpoints (Development Only)

**Get Orphaned Interactions Statistics**
```
GET /api/maintenance/orphaned-interactions-stats (Auth Required, Admin Role)
Returns: {
  totalOrphaned: number,
  byAction: { saved: number, applied: number, ignored: number },
  sampleGrants: Array<{ grant_id, title, action, created_at }>
}
```

**Cleanup Orphaned Interactions**
```
POST /api/maintenance/cleanup-orphaned-interactions (Auth Required, Admin Role)
Body: {
  dryRun?: boolean,  // If true, shows what would be deleted without deleting
  limit?: number     // Max number of records to delete
}
Returns: {
  deletedCount: number,
  dryRun: boolean,
  deletedRecords?: Array<{ user_id, grant_id, action }>
}
```

### Rate Limits
- General API: 100 requests/15 min per IP
- User-specific: 500 requests/15 min
- Auth endpoints: 5 requests/15 min
- Recommendation API: 50 requests/15 min
- Analytics endpoints: 200 requests/15 min
- Admin endpoints: 10 requests/15 min

## 🗄️ Database Schema

### Optimized Tables

#### grants
- Core grant data with 30+ fields
- Vector embeddings (768 dimensions)
- Indexes:
  - `idx_grants_filter_combo` - Compound index for common filters
  - `idx_grants_funding_deadline` - Partial index for funded grants
  - `idx_grants_search_fields` - Full-text search using GIN
  - `idx_grants_id_batch` - Optimized for batch fetching
  - Vector similarity index using IVFFlat

#### user_preferences
- Search preferences and project descriptions
- Stores project description embeddings
- Indexed on user_id

#### user_interactions
- Tracks saved, applied, ignored grants
- Unique constraint on (user_id, grant_id)
- Compound index: `idx_user_interactions_lookup`

#### grant_contacts
- Multiple contacts per grant
- Indexed by grant_id

#### csrf_tokens
- CSRF protection tokens
- Auto-cleanup of expired tokens

#### pipeline_runs
- Tracks scraping pipeline executions
- Stores success/failure metrics

### Materialized Views
- Analytics views for dashboard performance
- Pre-computed aggregations for common queries
- Automatic refresh on data changes

## 🏛️ Architecture & Services

### Service Layers

#### Cache Service
**Hybrid caching with automatic fallback:**
- Primary: Redis (if configured)
- Fallback: In-memory cache
- TTL-based expiration
- Key pattern support
- Located in `src/services/cache/`

#### Analytics Service
**Real-time dashboard metrics:**
- User engagement statistics
- Grant distribution analysis
- Application success tracking
- Materialized view management
- Located in `src/services/analytics/`

#### Monitoring Service
**Sentry integration for production:**
- Error tracking and alerts
- Performance monitoring
- Transaction tracking
- User context capture
- Located in `src/services/monitoring/`

#### CSRF Service
**Token-based CSRF protection:**
- Secure token generation
- Automatic expiration
- Database-backed storage
- Located in `src/services/csrf/`

### Middleware Stack

1. **Security Middleware**
   - Helmet.js for security headers
   - CORS configuration
   - Request sanitization

2. **Authentication Middleware**
   - Supabase JWT validation
   - User context injection
   - Role-based access control

3. **Performance Middleware**
   - Request timing tracking
   - Slow request detection
   - Performance metrics collection

4. **Audit Middleware**
   - Critical operation logging
   - Security event tracking
   - Compliance support

5. **Cache Middleware**
   - Response caching
   - Cache key generation
   - Conditional caching

6. **Validation Middleware**
   - Input validation
   - Type checking
   - Schema validation

## 🤖 AI Services

### Weighted Recommendation Service
Located in `src/services/ai/weightedRecommendationService.ts`

**Scoring Algorithm:**
```typescript
// Base weights (adjustable)
embedding: 0.4      // Semantic similarity
funding: 0.2        // Funding range match
deadline: 0.15      // Deadline proximity
agency: 0.1         // Agency preference
projectPeriod: 0.05 // Project duration
category: 0.05      // Category match
freshnessBonus: 0.03 // Recently posted
interaction: 0.02    // Past interactions

// Dynamic weight redistribution when criteria not applicable
```

### Gemini Service
- Extracts structured grant data from HTML
- Processes unstructured content
- Located in `src/services/ai/geminiService.ts`

### Embedding Service
- Google Text-Embedding-004 (768 dimensions)
- Batch processing support
- Caching for efficiency
- Located in `src/services/ai/googleEmbeddingService.ts`

## 🕷️ Scraping Pipeline

### NIH Scraper Components

1. **List Scraper** (`nihListScraper.ts`)
   - Fetches grant listings
   - Pagination support
   - Rate limiting

2. **Detail Scraper** (`nihDetailScraper.ts`)
   - Extracts full grant details
   - AI-powered data extraction
   - Contact information parsing

3. **Pipeline** (`nihScraperPipeline.ts`)
   - Orchestrates scraping process
   - Progress tracking
   - Error recovery

4. **Scheduler** (`scraperScheduler.ts`)
   - Cron-based scheduling
   - Configurable intervals

### Running Scrapers
```bash
# Production runs
npm run process:nih:all
npm run update:nih
```

## 🛡️ Security Implementation

### Middleware Stack
1. **Helmet** - Security headers (HSTS, CSP, X-Frame-Options)
2. **CORS** - Cross-origin control with whitelisting
3. **Rate Limiting** - DDoS protection with Redis backing
4. **CSRF Protection** - Database-backed token validation
5. **Input Validation** - express-validator with sanitization
6. **Auth Middleware** - Supabase JWT verification
7. **Audit Middleware** - Critical operation logging

### Security Features
- SQL injection prevention via Supabase parameterized queries
- XSS protection with DOMPurify
- Comprehensive input sanitization
- Audit logging for security events  
- Role-based access control (RBAC)
- Session timeout management
- Secure password requirements

## 🚀 Performance Optimizations

### Caching Strategy
- **Hybrid caching** with Redis primary, in-memory fallback
- Configurable TTLs:
  - Short (5 min): Dynamic data
  - Medium (15 min): User preferences  
  - Long (1 hour): Metadata
- Cache invalidation on data updates
- Warm cache on startup for critical data

### Database Optimizations
- Batch endpoints eliminate N+1 queries
- Optimized indexes for common queries
- Connection pooling via Supabase
- Efficient pagination with limits

### API Optimizations
- Request deduplication
- Gzip compression
- ETags for caching
- Parallel processing where applicable

## 📝 Logging & Monitoring

### Winston Configuration
```typescript
// Log levels
error: 0
warn: 1
info: 2
http: 3
debug: 4

// Formats
- JSON for production
- Colorized for development
- Timestamp included
- Error stack traces
- Request ID tracking
```

### Log Files
- `logs/error.log` - Error level only
- `logs/combined.log` - All logs
- `logs/security.log` - Security events
- `logs/performance.log` - Slow requests

### Sentry Integration
- Real-time error tracking
- Performance monitoring
- Release tracking
- User context capture
- Automatic error grouping

## 🧪 Development Scripts

```bash
# Development
npm run dev              # Start with hot reload
npm run build           # TypeScript compilation
npm run lint            # ESLint checking

# Testing
npm test                # Run test suite

# Database
npm run db:migrate      # Run migrations
npm run db:seed         # Seed test data

# Utilities
npm run setup-logs      # Create log directories
```

## 🐳 Docker Deployment

The backend includes Docker configuration:

```bash
# Build image
docker build -f Dockerfile.backend -t grantify-backend .

# Run container
docker run -p 3001:3001 --env-file .env grantify-backend

# Or use docker-compose
docker-compose up backend
```

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/           # App configuration
│   │   └── config.ts     # Environment config
│   ├── db/              # Database layer
│   │   ├── schema.sql   # Database schema
│   │   └── supabaseClient.ts
│   ├── middleware/      # Express middleware
│   │   ├── auth.middleware.ts
│   │   ├── audit.middleware.ts
│   │   ├── cache.middleware.ts
│   │   ├── csrf.middleware.ts
│   │   ├── performance.middleware.ts
│   │   ├── rate-limit.middleware.ts
│   │   ├── security.middleware.ts
│   │   └── validation.middleware.ts
│   ├── models/          # Data models
│   │   ├── grant.ts
│   │   └── user.ts
│   ├── routes/          # API routes
│   │   ├── analytics.route.ts
│   │   ├── grants.route.ts
│   │   ├── recommendations.route.ts
│   │   ├── scraper.route.ts
│   │   └── users.route.ts
│   ├── services/        # Business logic
│   │   ├── ai/          # AI services
│   │   ├── analytics/   # Analytics service
│   │   ├── cache/       # Cache management
│   │   ├── csrf/        # CSRF service
│   │   ├── grants/      # Grant service
│   │   ├── monitoring/  # Sentry integration
│   │   ├── scrapers/    # Web scrapers
│   │   └── users/       # User service
│   ├── types/           # TypeScript types
│   ├── utils/           # Utilities
│   │   ├── logger.ts
│   │   ├── ErrorHandler.ts
│   │   └── validators.ts
│   └── index.ts         # Entry point
├── scripts/             # Utility scripts
├── logs/               # Log files
├── dist/               # Compiled JS
└── package.json
```

## 🐛 Troubleshooting

### Common Issues

1. **Supabase Connection Failed**
   - Verify credentials in .env
   - Check network connectivity
   - Ensure service key has proper permissions

2. **Google AI Rate Limits**
   - Check quota in Google Cloud Console
   - Implement exponential backoff
   - Consider caching embeddings

3. **High Memory Usage**
   - Increase Node heap size: `NODE_OPTIONS="--max-old-space-size=4096"`
   - Check for memory leaks in grant processing
   - Optimize batch sizes

4. **CSRF Token Issues**
   - Ensure frontend sends token in headers
   - Check token expiration (1 hour)
   - Verify auth middleware order

5. **Redis Connection Failed**
   - Falls back to in-memory cache automatically
   - Check Redis URL in .env
   - Verify Redis server is running

6. **Sentry Not Reporting**
   - Verify SENTRY_DSN is set
   - Check environment configuration
   - Ensure errors are not caught silently

## 🚀 Production Deployment

### Recommended: Deploy to Render

1. **Create Web Service** on Render
2. **Set environment variables** in dashboard
3. **Configure build:**
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
4. **Set health check path:** `/api/health`

See [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md) for detailed instructions.

### Environment Variables for Production
- Generate secure JWT_SECRET: `openssl rand -base64 32`
- Use production database credentials
- Enable Redis for better performance
- Configure Sentry for monitoring

## 📄 License

MIT License - see LICENSE file for details