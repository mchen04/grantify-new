# Grantify.ai Backend

Express.js API server for the Grantify.ai grant discovery platform.

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.18.2 with TypeScript
- **Database**: PostgreSQL 15 with pgvector (Supabase)
- **API Integration**: 13+ grant data sources
- **Caching**: Hybrid Redis + in-memory fallback
- **Security**: JWT auth, RBAC, CSRF protection, rate limiting
- **Monitoring**: Sentry error tracking, Winston logging

## Project Structure

```
backend/
├── src/
│   ├── config/       # Configuration management
│   ├── db/           # Database client and queries
│   ├── middleware/   # Express middleware
│   ├── models/       # TypeScript types
│   ├── routes/       # API endpoints
│   ├── services/     # Business logic
│   └── utils/        # Helper utilities
├── scripts/          # Data collection and maintenance
├── logs/             # Application logs
└── dist/             # Compiled TypeScript
```

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase project with pgvector extension
- Redis (optional)

### Installation

1. Install dependencies:
```bash
cd backend
npm install
```

2. Create `.env` file:
```env
# Server
PORT=3001
NODE_ENV=development

# Supabase
SUPABASE_URL=your-project-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Security
JWT_SECRET=your-32-char-secret

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000

# Redis (optional)
REDIS_URL=redis://localhost:6379
REDIS_ENABLED=false

# Monitoring (optional)
SENTRY_DSN=your-sentry-dsn
```

3. Start development server:
```bash
npm run dev
```

Server runs on `http://localhost:3001`

## API Documentation

### Authentication
Protected endpoints require:
```
Authorization: Bearer <supabase-jwt-token>
```

### Main Endpoints

#### Grants
- `GET /api/grants` - Search and filter grants
- `GET /api/grants/:id` - Get grant details
- `GET /api/grants/recommended` - Get recommendations (auth required)
- `POST /api/grants/batch` - Batch fetch grants
- `GET /api/grants/metadata` - Filter options

#### User Interactions
- `POST /api/grants/:id/save` - Save grant (auth required)
- `POST /api/grants/:id/apply` - Mark as applied (auth required)
- `POST /api/grants/:id/ignore` - Ignore grant (auth required)
- `DELETE /api/grants/:id/save` - Unsave grant (auth required)

#### User Preferences
- `GET /api/users/preferences` - Get preferences (auth required)
- `PUT /api/users/preferences` - Update preferences (auth required)

#### Analytics
- `GET /api/analytics/dashboard` - Dashboard metrics (auth required)
- `GET /api/analytics/grants` - Grant statistics

### Rate Limits
- General API: 100 requests/15 min
- Auth endpoints: 5 requests/15 min
- Recommendation API: 50 requests/15 min

## Key Features

### Smart Recommendations
Weighted scoring algorithm:
- Funding range match (30%)
- Deadline proximity (25%)
- Agency preferences (20%)
- Category matching (15%)
- Interaction history (10%, negative for ignored)

### Performance Optimizations
- Batch API endpoints
- Request deduplication
- Hybrid caching strategy
- Database query optimization
- Materialized views for analytics

### Security Features
- JWT authentication with Supabase
- CSRF token validation
- Rate limiting per endpoint
- Input validation and sanitization
- Audit logging
- RBAC implementation

## Testing

```bash
npm run build          # Compile TypeScript
npm run start          # Production server
npm run dev            # Development with nodemon
npm run logs           # View application logs
```

## Deployment

### Docker
```bash
docker build -f ../Dockerfile.backend -t grantify-backend .
docker run -p 3001:3001 grantify-backend
```

### Production Setup
1. Set `NODE_ENV=production`
2. Configure Redis for caching
3. Enable Sentry monitoring
4. Set up SSL/TLS termination
5. Configure rate limits appropriately

## Data Sources

Automated sync with 13+ grant APIs:
- NIH Reporter
- Grants.gov
- NSF Awards
- SAM.gov
- USASPENDING
- And more...

## Database Schema

### Overview
PostgreSQL 15.8.1 database hosted on Supabase with the following architecture:
- **Primary Schema**: `public`
- **Total Tables**: 10 core tables
- **Key Extensions**: pgvector (0.8.0), pg_trgm (1.6), btree_gin (1.3), pgcrypto (1.3), uuid-ossp (1.1)

### Core Tables

#### 1. `users`
User accounts synced with Supabase Auth.
```sql
- id: uuid (PK, references auth.users)
- email: text (unique, not null)
- created_at: timestamptz
- updated_at: timestamptz
```
**RLS**: Enabled | **Size**: 64 KB

#### 2. `grants` 
Main table storing all grant opportunities from multiple sources.
```sql
- id: uuid (PK)
- data_source_id: uuid (FK to data_sources)
- source_identifier: varchar (unique within source)
- title: text (not null)
- status: varchar (open|active|closed|awarded|forecasted|archived)
- funding_amount_min/max: numeric
- application_deadline: timestamptz
- search_vector: tsvector (for full-text search)
- raw_data: jsonb
- [30+ additional fields for grant details]
```
**RLS**: Enabled | **Size**: 39 MB | **Records**: ~3,874

#### 3. `data_sources`
Configuration for grant data API sources.
```sql
- id: uuid (PK)
- name: varchar (unique)
- api_type: varchar (opportunities|awards|mixed|intelligence|verification)
- base_url: text
- auth_type: varchar (none|api_key|bearer)
- update_frequency: varchar (realtime|hourly|4hours|daily|weekly|monthly)
- geographic_coverage: varchar
- rate_limit_per_minute: integer
```
**RLS**: Enabled | **Size**: 96 KB

#### 4. `user_preferences`
User settings for grant recommendations.
```sql
- user_id: uuid (PK, FK to users)
- funding_min/max: numeric
- preferred_countries: text[]
- preferred_states: text[]
- preferred_categories: jsonb
- project_description: text
- project_description_embedding: vector (1536 dimensions)
- notification_frequency: varchar (realtime|daily|weekly|monthly|never)
```
**RLS**: Enabled | **Size**: 1.2 MB

#### 5. `user_interactions`
Tracks user actions on grants.
```sql
- id: uuid (PK)
- user_id: uuid (FK to users)
- grant_id: uuid (FK to grants)
- action: varchar (viewed|saved|applied|ignored|shared|downloaded)
- action_metadata: jsonb
- notes: text
- created_at: timestamptz
```
**RLS**: Enabled | **Size**: 96 KB

#### 6. `api_sync_schedules`
Defines automated sync jobs for data sources.
```sql
- id: uuid (PK)
- data_source_id: uuid (FK to data_sources)
- schedule_name: varchar
- cron_expression: varchar
- sync_strategy: varchar (full|incremental|differential)
- is_active: boolean
- max_records_per_sync: integer
```
**RLS**: Enabled | **Size**: 80 KB

#### 7. `api_sync_logs`
Detailed logs of all sync operations.
```sql
- id: uuid (PK)
- data_source_id: uuid (FK to data_sources)
- sync_type: varchar (scheduled|manual|webhook|retry)
- status: varchar (started|in_progress|completed|failed|cancelled)
- records_fetched/created/updated/failed: integer
- duration_seconds: integer
- error_details: jsonb
```
**RLS**: Enabled | **Size**: 40 KB

#### 8. `api_sync_state`
Maintains sync state for incremental updates.
```sql
- id: uuid (PK)
- data_source_id: uuid (FK to data_sources)
- state_key: varchar
- state_value: jsonb
- last_updated: timestamptz
```
**RLS**: Enabled | **Size**: 32 KB

#### 9. `user_roles`
Role-based access control.
```sql
- id: uuid (PK)
- user_id: uuid (FK to auth.users)
- role: varchar (user|admin|moderator)
- created_at: timestamptz
- updated_at: timestamptz
```
**RLS**: Enabled | **Size**: 72 KB

#### 10. `csrf_tokens`
CSRF protection tokens.
```sql
- id: uuid (PK)
- user_id: uuid (FK to auth.users, unique)
- token: varchar
- expires_at: timestamptz
- created_at: timestamptz
```
**RLS**: Enabled | **Size**: 136 KB

### Database Features

#### Full-Text Search
- Implemented using `tsvector` on grants.search_vector
- Automatically updated via triggers
- Supports weighted search across title, description, and other fields

#### Vector Embeddings
- pgvector extension for semantic search
- 1536-dimensional embeddings for project descriptions
- Enables similarity-based grant recommendations

#### Indexes
- B-tree indexes on primary keys and foreign keys
- GIN indexes for full-text search
- HNSW indexes for vector similarity search
- Composite indexes for common query patterns

#### Row-Level Security (RLS)
All tables have RLS enabled with policies for:
- Users can only access their own data
- Public read access for grants and metadata
- Admin access for system operations

### Key Extensions

1. **pgvector (0.8.0)**: Vector similarity search for ML-powered recommendations
2. **pg_trgm (1.6)**: Trigram-based fuzzy text matching
3. **btree_gin (1.3)**: GIN indexing for common data types
4. **pgcrypto (1.3)**: Cryptographic functions for security
5. **uuid-ossp (1.1)**: UUID generation
6. **pgjwt (0.2.0)**: JWT token handling
7. **pg_stat_statements (1.10)**: Query performance monitoring
8. **pg_graphql (1.5.11)**: GraphQL API support
9. **pgsodium (3.1.8)**: Encryption functions
10. **supabase_vault (0.2.8)**: Secure secret storage

## Maintenance

### Database
```bash
# Cleanup orphaned data
curl -X POST http://localhost:3001/api/maintenance/cleanup-orphaned-interactions

# Check orphaned data stats
curl http://localhost:3001/api/maintenance/orphaned-interactions-stats
```

### Monitoring
- Health check: `GET /api/health`
- Sentry dashboard for errors
- Winston logs in `logs/` directory

## License

Part of the Grantify.ai project - MIT License