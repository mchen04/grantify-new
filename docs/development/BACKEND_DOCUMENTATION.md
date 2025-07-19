# Grantify.ai Backend Documentation

## Overview

The Grantify.ai backend is a robust Express.js application built with TypeScript, providing comprehensive grant management, user authentication, and search functionality. Serves 3,874 grants from international sources with full-text search, user interaction tracking, and enterprise-grade security.

*Based on Live Database Analysis - January 2025*

## Architecture

### Technology Stack
- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.18.2 with TypeScript 5
- **Database**: PostgreSQL 15 (Supabase)
- **Authentication**: Supabase Auth with JWT tokens
- **Search**: PostgreSQL tsvector for full-text search
- **Caching**: Hybrid Redis + in-memory caching
- **Monitoring**: Sentry for error tracking and performance
- **Security**: Helmet, CORS, rate limiting, CSRF protection

### Directory Structure

```
backend/
├── src/
│   ├── config/           # Configuration management
│   │   └── config.ts     # Centralized app configuration
│   ├── db/               # Database layer
│   │   ├── schema.sql    # Database schema definition (differs from live)
│   │   ├── supabaseClient.ts  # Database connection management
│   │   └── functions/    # PostgreSQL functions
│   ├── middleware/       # Express middleware
│   │   ├── auth.middleware.ts      # JWT authentication
│   │   ├── cache.middleware.ts     # Caching layer
│   │   ├── rate-limit.middleware.ts # Rate limiting
│   │   ├── security.middleware.ts  # Security headers
│   │   ├── audit.middleware.ts     # Audit logging
│   │   └── performance.middleware.ts # Performance monitoring
│   ├── models/           # Data models and types
│   │   ├── grant.ts      # Grant data structures
│   │   ├── user.ts       # User data structures
│   │   └── interaction.ts # Interaction types
│   ├── routes/           # API route handlers
│   │   ├── grants.route.ts        # Grant endpoints
│   │   ├── users.route.ts         # User management
│   │   ├── recommendations.route.ts # Recommendations
│   │   ├── analytics.route.ts     # Analytics and stats
│   │   └── api-sync.route.ts      # Data synchronization
│   ├── services/         # Business logic
│   │   ├── grants/       # Grant management services
│   │   ├── users/        # User management services
│   │   ├── auth/         # Authentication services
│   │   ├── database/     # Database utilities
│   │   ├── csrf/         # CSRF protection
│   │   └── api-integrations/ # External API clients
│   └── utils/            # Helper utilities
│       ├── logger.ts     # Winston logging configuration
│       ├── ErrorHandler.ts # Error handling utilities
│       └── inputValidator.ts # Input validation
├── docs/                 # Documentation
└── scripts/              # Utility scripts
```

## Live Database Architecture

### Current Schema Tables ✅

Based on live database analysis:

#### Deployed Tables
- **grants**: 3,874 grant opportunities from international sources
- **users**: 1 user profile (synchronized with Supabase Auth)
- **user_preferences**: User search preferences (empty - 0 records)
- **user_interactions**: 33 grant interactions (saved, applied, ignored)
- **user_roles**: 2 role assignments (role-based access control)
- **csrf_tokens**: 1 CSRF protection token

#### Missing Tables (Referenced in Code) ❌
- **grant_contacts**: Contact information for grants (not deployed)
- **pipeline_runs**: Data synchronization tracking (not deployed)

### Current Database Features
- **Full-text Search**: PostgreSQL tsvector for grant title and description search
- **Row Level Security**: Enabled on all tables with comprehensive policies
- **Multi-source Data**: Grants from EU Commission, World Bank, and other international organizations
- **User Interaction Tracking**: Save, apply, and ignore actions with metadata
- **CSRF Protection**: Token-based protection for form submissions
- **Role-based Access**: User, admin, and moderator role system

### Missing Features (Referenced in Code)
- **Vector Search**: pgvector extension not deployed, no semantic embeddings
- **Contact Management**: Grant contacts functionality not implemented
- **Pipeline Monitoring**: Data sync tracking not available

See [DATABASE_SCHEMA.md](../../DATABASE_SCHEMA.md) for complete live schema documentation.

## API Endpoints

### Authentication
- JWT-based authentication using Supabase tokens
- Optional authentication for public endpoints
- Service role bypass for system operations

### Core Routes

#### Grants API (`/api/grants`)
- `GET /` - Advanced search with filtering across 3,874 grants
- `GET /:id` - Detailed grant information (no contacts due to missing table)
- `GET /recommended` - Rule-based personalized recommendations (no vector search)
- `POST /:id/interactions` - Create/update user interactions
- `DELETE /:id/interactions` - Remove user interactions

#### Users API (`/api/users`)
- `GET /preferences` - Get user search preferences (currently empty)
- `PUT /preferences` - Update user preferences
- `GET /interactions` - Get user's grant interactions (33 current interactions)

#### Analytics API (`/api/analytics`)
- `GET /stats` - Platform statistics and insights

#### System API (`/api`)
- `GET /health` - Health check endpoint
- `GET /csrf-token` - CSRF token generation

See [API_DOCUMENTATION.md](../../API_DOCUMENTATION.md) for complete API documentation.

## Services Architecture

### Grants Service
**Location**: `src/services/grants/grantsService.ts`

Handles all grant-related operations including:
- Advanced search with filtering across live grant data
- Full-text search using PostgreSQL tsvector
- Grant data retrieval and formatting
- Performance optimization for 3,874 grant dataset

```typescript
class GrantsService {
  async getGrants(filters: GrantFilter): Promise<{grants: Grant[], totalCount: number}>
  async getGrantById(id: string): Promise<Grant | null>
  // Note: Vector similarity not available - no embeddings deployed
}
```

### Users Service
**Location**: `src/services/users/usersService.ts`

Manages user data and preferences:
- User profile management (1 current user)
- Preference storage (currently empty table)
- Interaction tracking (33 current interactions)

```typescript
class UsersService {
  async getUserPreferences(userId: string): Promise<UserPreferences | null>
  async updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<UserPreferences>
  async getUserInteractions(userId: string): Promise<UserInteraction[]>
}
```

### Authentication Services
**Location**: `src/services/auth/`

#### ThreadSafeAuthCache
Implements race-condition-free authentication caching:
- Token validation and caching
- User session management
- Automatic cleanup and TTL handling

```typescript
class ThreadSafeAuthCache {
  async validateToken(token: string): Promise<User | null>
  async cacheUser(token: string, user: User): Promise<void>
  async invalidateUser(userId: string): Promise<void>
}
```

### Database Services
**Location**: `src/services/database/`

#### ThreadSafeConnectionPoolManager
Prevents database connection race conditions:
- Connection pool management
- Health monitoring
- Automatic cleanup

```typescript
class ThreadSafeConnectionPoolManager {
  async acquireConnection(): Promise<SupabaseClient>
  async releaseConnection(client: SupabaseClient): Promise<void>
  getStats(): ConnectionPoolStats
}
```

### CSRF Protection
**Location**: `src/services/csrf/`

#### ThreadSafeCSRFService
Implements distributed CSRF protection:
- Token generation and validation (1 current token)
- Cross-instance synchronization
- Automatic cleanup

```typescript
class ThreadSafeCSRFService {
  async generateToken(userId: string): Promise<string>
  async validateToken(userId: string, token: string): Promise<boolean>
  async invalidateToken(userId: string): Promise<void>
}
```

## Current Data Sources

### External API Integration
The backend integrates with multiple official grant data sources:

**Currently Active Sources** (based on live data):
1. **European Commission** - EU Funding & Tenders Portal
2. **World Bank** - International development funding
3. **Government Agencies** - Various national sources
4. **International Organizations** - Multilateral funding sources

### Data Characteristics
- **Total Grants**: 3,874 opportunities
- **Primary Currencies**: EUR (72%), USD (26%), Others (2%)
- **Geographic Scope**: Primarily European Union with global opportunities
- **Update Frequency**: Regular synchronization with source APIs
- **Languages**: English with some multilingual content

### Data Synchronization
**Location**: `src/services/api-integrations/`

- **BaseApiClient**: Common interface for all data sources
- **GrantNormalizer**: Standardizes data from different sources
- **Rate Limiting**: Respects API limits for each source
- **Error Handling**: Robust error handling with retries

```typescript
abstract class BaseApiClient {
  abstract fetchGrants(params: ApiParams): Promise<RawGrant[]>
  abstract normalizeGrant(rawGrant: RawGrant): Grant
  async sync(): Promise<SyncResult>
}
```

## Security Implementation

### Authentication & Authorization
- **JWT Validation**: Supabase-issued tokens with automatic verification
- **Role-Based Access**: User, admin, and moderator roles (2 current role assignments)
- **Service Role**: Bypass authentication for system operations
- **Row Level Security**: Database-level access control

### Input Validation
- **Comprehensive Validation**: All user inputs validated using express-validator
- **Type Safety**: TypeScript interfaces for all data structures
- **SQL Injection Prevention**: Parameterized queries and ORM usage
- **XSS Protection**: Input sanitization and output encoding

### Rate Limiting
```typescript
// Different limits for different endpoint types
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // limit each IP to 5 requests per windowMs
  skipSuccessfulRequests: true
});
```

### CSRF Protection
- **Token-based CSRF**: Unique tokens for each user session (1 current token)
- **Database Storage**: Tokens stored in database for multi-instance support
- **Automatic Cleanup**: Expired tokens removed automatically

### Security Headers
```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

## Performance Optimization

### Current Performance Characteristics

#### Database Performance
- **Dataset Size**: 3,874 grants - manageable for current operations
- **Query Performance**: Standard B-tree indexes on key fields
- **Search Performance**: tsvector-based full-text search
- **Connection Management**: Thread-safe connection pooling

#### Caching Strategy
- **Multi-level Caching**: Redis primary, in-memory fallback
- **Cache Tiers**: Short (5min), Medium (1hr), Long (24hr)
- **Smart Invalidation**: Coordinated cache clearing

#### Search Optimization
```typescript
// Full-text search implementation
async function searchGrants(query: string): Promise<Grant[]> {
  return await client
    .from('grants')
    .select('*')
    .textSearch('search_vector', query)
    .order('created_at', { ascending: false });
}
```

### Limitations and Recommendations

#### Current Limitations
- **No Vector Search**: pgvector extension not deployed
- **Basic Indexing**: No specialized indexes for large-scale operations
- **Missing Features**: Contact management and pipeline monitoring not implemented

#### Scaling Recommendations
- Implement proper indexing strategy as data grows beyond 10,000 grants
- Deploy vector embeddings for semantic search capabilities
- Add proper foreign key constraints for data integrity
- Implement data archiving for old grants

## Monitoring & Observability

### Logging
**Configuration**: `src/utils/logger.ts`
- **Structured Logging**: JSON format with correlation IDs
- **Log Levels**: Error, warn, info, debug
- **Log Rotation**: Daily rotation with compression
- **Performance Logging**: Request timing and database query metrics

```typescript
// Example usage
logger.info('User interaction created', {
  userId,
  grantId,
  action,
  responseTime: endTime - startTime,
  correlationId: req.correlationId
});
```

### Error Tracking
- **Sentry Integration**: Automatic error capture and performance monitoring
- **Error Context**: Rich error context with user data and request information
- **Performance Metrics**: Database query performance and API response times

### Health Monitoring
```typescript
// Health check endpoint
app.get('/api/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: {
      status: 'connected',
      grants_count: 3874,
      users_count: 1,
      interactions_count: 33
    },
    redis: cacheService.isHealthy() ? 'connected' : 'disconnected'
  };
  
  res.json(health);
});
```

### Current Metrics
Based on live database:
- **Active Grants**: 3,874 opportunities
- **User Activity**: 1 user with 33 interactions
- **System Health**: All core services operational
- **Response Times**: Optimized for current dataset size

## Development Workflow

### Environment Setup
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

### Environment Variables
```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database (Live Supabase)
SUPABASE_URL=your-project-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Security
JWT_SECRET=your-32-char-secret
CORS_ALLOWED_ORIGINS=http://localhost:3000

# Caching (optional)
REDIS_URL=redis://localhost:6379
REDIS_ENABLED=false

# Monitoring (optional)
SENTRY_DSN=your-sentry-dsn
```

### Build & Deployment
```bash
# Type checking
npm run type-check

# Build for production
npm run build

# Start production server
npm start

# Run tests (when available)
npm test
```

## Migration Considerations

### Schema Synchronization Issues

The current codebase has significant differences between:

1. **schema.sql file**: Contains vector embeddings, grant_contacts, pipeline_runs
2. **Live database**: Missing vector features, contacts, and pipeline tables

### Deployment Recommendations

1. **Sync Schema Files**: Update schema.sql to match live database structure
2. **Deploy Missing Features**: Implement grant_contacts and pipeline_runs if needed
3. **Vector Search**: Consider deploying pgvector extension for semantic search
4. **Data Migration**: Plan migration strategy for new features

### Code vs. Database Alignment

#### Mismatched Features
- Vector search code exists but no embeddings in database
- Contact management endpoints but no contacts table
- Pipeline monitoring services but no pipeline_runs table

#### Working Features
- User authentication and role management
- Grant search and filtering
- User interaction tracking
- CSRF protection
- Full-text search

## Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check Supabase connection
npm run db:check

# Verify environment variables
echo $SUPABASE_URL
```

#### Performance Issues
```bash
# Monitor database performance in Supabase dashboard
# Check query performance for large datasets

# Monitor memory usage
npm run monitoring
```

#### Feature Mismatches
```bash
# Check which features are actually deployed
node scripts/detailed-schema-check.js

# Compare with code expectations
```

### Performance Debugging
```typescript
// Enable detailed logging
LOG_LEVEL=debug npm run dev

// Monitor specific operations
logger.debug('Database query performance', {
  query: 'grants_search',
  duration: queryTime,
  rows: resultCount
});
```

## Future Enhancements

### Immediate Priorities
1. **Schema Synchronization**: Align codebase with live database
2. **Missing Tables**: Deploy grant_contacts and pipeline_runs if needed
3. **Vector Search**: Implement semantic search capabilities
4. **Performance**: Add proper indexing for scale

### Planned Features
1. **Enhanced Search**: Vector embeddings for semantic similarity
2. **Real-time Updates**: WebSocket support for live grant updates
3. **Advanced Analytics**: Enhanced user behavior analytics
4. **Multi-language Support**: Internationalization for global grants
5. **Contact Management**: Deploy grant contact functionality

### Scalability Considerations
1. **Horizontal Scaling**: Design for multi-instance deployment
2. **Database Optimization**: Implement proper indexing and partitioning
3. **Caching Strategy**: Enhanced caching for larger datasets
4. **API Versioning**: Structured versioning for breaking changes

---

## Summary

The Grantify.ai backend successfully serves 3,874 grants from international sources with robust authentication, search, and user interaction capabilities. While some advanced features referenced in the codebase (vector search, contacts, pipeline monitoring) are not yet deployed, the current implementation provides a solid foundation for grant discovery and management.

**Current Strengths:**
- Functional grant search and filtering
- User authentication and interaction tracking
- Security and rate limiting
- Full-text search capabilities
- Thread-safe service architecture

**Areas for Alignment:**
- Sync schema files with live database
- Deploy missing table structures
- Implement vector search capabilities
- Complete contact management features