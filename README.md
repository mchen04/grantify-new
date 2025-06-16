# Grantify.ai

An AI-powered grant discovery platform that helps researchers and organizations find relevant funding opportunities using semantic search and intelligent recommendations.

## 🚀 Overview

Grantify.ai leverages advanced AI technologies to transform how researchers discover and apply for grants. By combining automated data collection, semantic search, and personalized recommendations, we make grant discovery efficient and effective.

### Key Features

- **🔍 Semantic Search**: Find grants using natural language queries powered by vector embeddings
- **🤖 AI-Powered Recommendations**: Weighted recommendation algorithm combining embeddings, preferences, and interaction history
- **📊 Advanced Filtering**: Filter by 20+ criteria including funding amount, deadlines, eligibility, and agencies
- **🔄 Real-time Updates**: Automated grant scraping and database updates
- **📱 Responsive Design**: Full mobile support with comprehensive accessibility features
- **🔐 Enterprise Security**: Supabase Auth, RBAC, CSRF protection, rate limiting, and audit logging
- **⚡ Performance Optimized**: Batch API endpoints, database indexing, hybrid caching (Redis + in-memory)
- **📈 Analytics Dashboard**: Real-time metrics with materialized views for performance insights
- **🛡️ Error Monitoring**: Integrated Sentry for error tracking and performance monitoring

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 15.3.1 with App Router
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 3.4
- **UI Components**: Custom accessible components with ARIA support
- **Auth**: Supabase Authentication with magic links and OAuth
- **State**: React Context API with custom hooks
- **Performance**: Optimized with Turbopack, image optimization, and caching
- **Monitoring**: Sentry integration for error tracking and session replay
- **PWA**: Progressive Web App support for mobile installation

### Backend
- **Runtime**: Node.js 18+ 
- **Framework**: Express.js 4.18 with TypeScript
- **Database**: PostgreSQL 15 with pgvector extension (Supabase)
- **Vector Search**: 768-dimensional embeddings with IVFFlat indexing
- **AI Integration**: 
  - Google Gemini 1.5 Flash for grant analysis
  - Google Text-Embedding-004 for semantic search
- **Web Scraping**: Puppeteer for NIH grant data
- **Caching**: Hybrid caching with Redis (optional) and in-memory fallback
- **Security**: Helmet, CORS, express-rate-limit, express-validator, audit logging
- **Logging**: Winston with JSON formatting
- **Monitoring**: Sentry for error tracking and performance monitoring
- **Analytics**: Custom analytics service with materialized views

## 📁 Project Structure

```
Grantify.ai/
├── frontend/              # Next.js frontend application
│   ├── src/
│   │   ├── app/          # App router pages and layouts
│   │   ├── components/   # Reusable UI components
│   │   ├── contexts/     # React contexts (Auth, Search, Interactions)
│   │   ├── hooks/        # Custom React hooks
│   │   ├── lib/          # Utilities and API client
│   │   └── types/        # TypeScript type definitions
│   └── public/           # Static assets
├── backend/              # Express.js API server
│   ├── src/
│   │   ├── config/       # Configuration management
│   │   ├── db/           # Database client and migrations
│   │   ├── middleware/   # Express middleware (auth, cache, security, audit, performance)
│   │   ├── models/       # Data models and types
│   │   ├── routes/       # API route handlers
│   │   ├── services/     # Business logic and integrations
│   │   └── utils/        # Helper utilities
│   └── dist/             # Compiled TypeScript output
├── supabase/             # Database configuration
├── Dockerfile.backend    # Backend container configuration
├── Dockerfile.frontend   # Frontend container configuration
├── docker-compose.yml    # Multi-container orchestration
└── nginx.conf           # Production reverse proxy config
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account with project created
- Google Cloud account with Gemini API enabled
- (Optional) Docker for containerized deployment

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/Grantify.ai.git
cd Grantify.ai
```

2. Install all dependencies:
```bash
npm run install:all
```

3. Set up environment variables:

**Backend (.env)**:
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

# Google AI
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-api-key

# CORS (comma-separated)
CORS_ALLOWED_ORIGINS=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Redis (optional)
REDIS_URL=redis://localhost:6379
REDIS_ENABLED=false

# Monitoring (optional)
SENTRY_DSN=your-sentry-dsn
```

**Frontend (.env.local)**:
```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Monitoring (optional)
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
SENTRY_AUTH_TOKEN=your-sentry-auth-token
```

4. Start development servers:
```bash
# Start both frontend and backend concurrently
npm run dev

# Or start individually
npm run frontend      # http://localhost:3000
npm run backend       # http://localhost:3001
```

## 🗄️ Database Schema

### Core Tables

- **grants**: Grant opportunities with metadata and vector embeddings
  - Optimized indexes for filtering, searching, and batch operations
  - Full-text search on title and descriptions
  - Vector similarity search using pgvector

- **users**: User authentication and profiles (managed by Supabase Auth)

- **user_preferences**: Search preferences and project descriptions
  - Stores project description embeddings for AI matching

- **user_interactions**: Tracks saved, applied, and ignored grants
  - Unique constraint on (user_id, grant_id) for data integrity

- **grant_contacts**: Contact information for each grant

- **user_roles**: RBAC implementation (user, admin, moderator)

- **csrf_tokens**: CSRF protection token storage

- **pipeline_runs**: Tracks scraping pipeline execution history

### Key Indexes
- Compound indexes for common filter combinations
- Full-text search indexes using GIN
- Vector indexes using IVFFlat for similarity search
- Optimized indexes for batch operations

## 🔧 Key Features Implementation

### Analytics & Materialized Views
Pre-computed analytics for dashboard performance:
- User engagement metrics
- Grant statistics by agency and category
- Application trends over time

### Batch API Endpoints
Eliminates N+1 query problems:
- `POST /api/grants/batch` - Fetch multiple grants by IDs
- `POST /api/grants/batch/interactions` - Fetch grants with user interactions

### Weighted Recommendation Algorithm
Combines multiple signals with configurable weights:
- Semantic similarity (40% weight)
- Funding range match (20% weight)
- Deadline proximity (15% weight)
- Agency preferences (10% weight)
- Category matching (5% weight)
- Interaction history (negative weight for ignored)

### Performance Optimizations
- Request deduplication in API client
- Hybrid caching with Redis and in-memory fallback
- Batch processing for large datasets
- Database query optimization with proper indexing
- Image optimization with Next.js
- Materialized views for analytics queries
- Performance monitoring middleware

### Security Implementation
- JWT-based authentication with Supabase
- CSRF token validation for state-changing operations
- Rate limiting (customizable per endpoint)
- Input validation and sanitization
- SQL injection prevention via parameterized queries
- XSS protection with DOMPurify
- Security headers (HSTS, CSP, X-Frame-Options)
- Audit logging for security events
- Role-based access control (RBAC)

## 📚 API Documentation

### Authentication
All protected endpoints require Bearer token:
```
Authorization: Bearer <supabase-jwt-token>
```

### Core Endpoints

#### Grants
- `GET /api/grants` - Search and filter grants
- `GET /api/grants/:id` - Get grant details
- `GET /api/grants/recommended` - Get AI recommendations
- `GET /api/grants/similar` - Find similar grants
- `POST /api/grants/batch` - Batch fetch grants
- `GET /api/grants/metadata` - Get filter options

#### User Interactions
- `POST /api/grants/:id/save` - Save a grant
- `POST /api/grants/:id/apply` - Mark as applied
- `POST /api/grants/:id/ignore` - Ignore a grant
- `DELETE /api/grants/:id/save` - Unsave a grant

#### User Preferences
- `GET /api/users/preferences` - Get preferences
- `PUT /api/users/preferences` - Update preferences
- `GET /api/users/interactions` - Get interaction history

#### Analytics
- `GET /api/analytics/dashboard` - Dashboard metrics
- `GET /api/analytics/grants` - Grant statistics
- `GET /api/analytics/agencies` - Agency analytics

#### Admin & Maintenance
- `GET /api/admin/pipeline/status` - Check pipeline status (admin only)
- `POST /api/admin/pipeline/run` - Run grant pipeline (admin only)
- `POST /api/maintenance/cleanup-orphaned-interactions` - Clean orphaned data
- `GET /api/maintenance/orphaned-interactions-stats` - Orphaned data statistics

### Rate Limits
- General API: 100 requests/15 min
- Auth endpoints: 5 requests/15 min
- Recommendation API: 50 requests/15 min

## 🚀 Deployment

**🎯 Recommended Platform: Vercel (Frontend) + Render (Backend)**

See the comprehensive [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed production deployment instructions.

### Quick Deploy Summary

#### Frontend to Vercel
1. Connect your GitHub repo to Vercel
2. Set root directory to `frontend`
3. Add environment variables
4. Deploy automatically

#### Backend to Render
1. Create a Web Service on Render
2. Set root directory to `backend`
3. Build: `npm install && npm run build`
4. Start: `npm start`
5. Add environment variables

### Docker Deployment (Alternative)

1. Build and run with Docker Compose:
```bash
docker-compose up -d
```

2. Access services:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Nginx Proxy: http://localhost:80

### Production Scripts
```bash
# Build for production
npm run build:all

# Start production server
npm start

# Run basic deployment script
./deploy-production.sh

# Run comprehensive deployment with SSL setup
./scripts/deploy.sh
```

### Environment Variables Summary

#### Required
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Public anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (backend only)
- `JWT_SECRET` - 32+ character secret for JWT signing
- `GOOGLE_GENERATIVE_AI_API_KEY` - For AI features

#### Optional
- `REDIS_URL` - Redis connection string (falls back to in-memory)
- `SENTRY_DSN` - Error tracking and monitoring
- `NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT_ID` - For monetization

## 📊 Monitoring & Analytics

### Error Tracking
- Sentry integration for both frontend and backend
- Real-time error notifications
- Performance monitoring and profiling
- Session replay for debugging

### Analytics Dashboard
- User engagement metrics
- Grant discovery patterns
- Application success rates
- API performance metrics

### Monitoring Commands
```bash
# View backend logs
cd backend && npm run logs

# Check API health
curl http://localhost:3001/api/health

# View analytics dashboard
open http://localhost:3000/dashboard
```

## 🧪 Testing

```bash
# Run frontend tests
cd frontend
npm test

# Run E2E tests with Playwright
npm run test:e2e

# Note: Backend tests not yet implemented
```

## 🛡️ Security Best Practices

1. **Environment Variables**: Never commit .env files
2. **API Keys**: Rotate regularly, use least privilege
3. **Database**: Enable RLS policies in Supabase
4. **HTTPS**: Always use in production
5. **Dependencies**: Regular updates with `npm audit`
6. **Monitoring**: Set up alerts for suspicious activity

## 🛠️ Maintenance

### Database Maintenance
```bash
# Update grant data
cd backend
npm run update:nih

# Process all NIH grants with embeddings
npm run process:nih:all

# Clean up orphaned interactions
curl -X POST http://localhost:3001/api/maintenance/cleanup-orphaned-interactions
```

### Cache Management
- Redis cache automatically expires
- In-memory cache cleared on restart
- Manual cache clear: `POST /api/admin/cache/clear` (admin only)

### Monitoring Health
```bash
# Check system health
curl http://localhost:3001/api/health

# View error logs in Sentry
open https://sentry.io/organizations/your-org/issues/
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write meaningful commit messages
- Add tests for new features
- Update documentation
- Ensure accessibility compliance

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- NIH for providing public grant data
- Google Cloud for AI/ML services
- Supabase for database infrastructure
- The open-source community

---

Built with ❤️ by the Grantify.ai team

## 📊 Status

- **Current Version**: 1.0.0
- **Database**: 588 grants indexed with embeddings
- **AI Models**: Google Gemini 1.5 Flash + text-embedding-004
- **Production Ready**: ✅ Yes (see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md))
- **Last Updated**: January 2025