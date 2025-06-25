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