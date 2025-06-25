# Grantify.ai

A grant discovery platform that helps researchers and organizations find relevant funding opportunities using advanced search and intelligent recommendations.

## 🚀 Overview

Grantify.ai transforms how researchers discover and apply for grants by combining automated data collection from official sources, advanced search capabilities, and personalized recommendations to make grant discovery efficient and effective.

### Key Features

- **🔍 Advanced Search**: Full-text search across grant titles and descriptions
- **🤖 Smart Recommendations**: Algorithm that matches grants based on user preferences and interaction history
- **📊 Advanced Filtering**: Filter by 20+ criteria including funding amount, deadlines, eligibility, and agencies
- **🔄 Real-time Updates**: Direct API integration with 13+ official grant data sources
- **📱 Responsive Design**: Full mobile support with comprehensive accessibility features
- **🔐 Enterprise Security**: Supabase Auth with Google OAuth, RBAC, CSRF protection, rate limiting, and audit logging
- **⚡ Performance Optimized**: Batch API endpoints, database indexing, hybrid caching (Redis + in-memory)
- **📈 Analytics Dashboard**: Real-time metrics with materialized views for performance insights
- **🛡️ Error Monitoring**: Integrated Sentry for error tracking and performance monitoring

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 15.3.4 with App Router
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 3.4
- **UI Components**: Custom accessible components with ARIA support
- **Auth**: Supabase Authentication with Google OAuth
- **State**: React Context API with custom hooks
- **Performance**: Optimized with Turbopack, image optimization, and caching
- **Monitoring**: Sentry integration for error tracking and session replay
- **Testing**: Jest + React Testing Library + Playwright for E2E

### Backend
- **Runtime**: Node.js 18+ 
- **Framework**: Express.js 4.18.2 with TypeScript
- **Database**: PostgreSQL 15 with pgvector extension (Supabase)
- **API Integration**: Direct integration with 13+ grant data sources
- **Caching**: Hybrid caching with Redis (optional) and in-memory fallback
- **Security**: Helmet, CORS, express-rate-limit, express-validator, audit logging
- **Logging**: Winston with JSON formatting
- **Monitoring**: Sentry for error tracking and performance monitoring

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
│   │   ├── middleware/   # Express middleware
│   │   ├── models/       # Data models and types
│   │   ├── routes/       # API route handlers
│   │   ├── services/     # Business logic and integrations
│   │   └── utils/        # Helper utilities
│   └── dist/             # Compiled TypeScript output
└── scripts/              # Deployment and maintenance scripts
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account with project created
- Google OAuth configured in Google Cloud Console

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/Grantify.ai.git
cd Grantify.ai
```

2. Install dependencies:
```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend && npm install

# Install backend dependencies
cd ../backend && npm install
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

4. Configure Google OAuth:
   - Follow the guide in [OAUTH_SETUP_GUIDE.md](./OAUTH_SETUP_GUIDE.md)
   - Add redirect URI in Google Console: `https://your-project.supabase.co/auth/v1/callback`
   - Add redirect URL in Supabase: `http://localhost:3000/auth/callback`

5. Start development servers:
```bash
# From root directory
npm run dev

# Or start individually
cd frontend && npm run dev    # http://localhost:3000
cd backend && npm run dev     # http://localhost:3001
```

## 🗄️ Database Schema

See [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) for detailed schema documentation.

### Core Tables
- **grants**: Grant opportunities with comprehensive metadata
- **users**: User authentication and profiles (managed by Supabase Auth)
- **user_preferences**: Search preferences and project descriptions
- **user_interactions**: Tracks saved, applied, and ignored grants
- **data_sources**: API data source configuration and management

## 🔧 Key Features

### Smart Recommendations Algorithm
- Funding range matching (30% weight)
- Deadline proximity (25% weight)
- Agency preferences (20% weight)
- Category matching (15% weight)
- Interaction history (10% weight, negative for ignored)

### Performance Optimizations
- Request deduplication in API client
- Hybrid caching with Redis and in-memory fallback
- Database query optimization with proper indexing
- Materialized views for analytics queries
- Batch API endpoints to prevent N+1 queries

### Security Implementation
- JWT-based authentication with Supabase
- Google OAuth integration
- CSRF token validation
- Rate limiting per endpoint
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- Security headers (HSTS, CSP, X-Frame-Options)
- Audit logging for security events

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
- `POST /api/grants/batch` - Batch fetch grants

#### User Interactions
- `POST /api/grants/:id/save` - Save a grant
- `POST /api/grants/:id/apply` - Mark as applied
- `POST /api/grants/:id/ignore` - Ignore a grant

#### User Preferences
- `GET /api/users/preferences` - Get preferences
- `PUT /api/users/preferences` - Update preferences

## 🚀 Deployment

See the comprehensive [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for production deployment instructions.

### Recommended: Vercel (Frontend) + Render (Backend)

#### Frontend to Vercel
1. Connect GitHub repo to Vercel
2. Set root directory to `frontend`
3. Add environment variables
4. Deploy automatically

#### Backend to Render
1. Create Web Service on Render
2. Set root directory to `backend`
3. Build: `npm install && npm run build`
4. Start: `npm start`
5. Add environment variables

## 🧪 Testing

```bash
# Frontend tests
cd frontend
npm test               # Unit tests
npm run test:e2e      # E2E tests with Playwright
npm run test:coverage # Coverage report

# Backend tests
cd backend
# Tests not yet implemented
```

## 📊 Monitoring

- **Error Tracking**: Sentry integration for both frontend and backend
- **Performance Monitoring**: Real-time metrics and profiling
- **Health Checks**: `GET /api/health` endpoint
- **Analytics Dashboard**: User engagement and grant metrics

## 🛡️ Security Best Practices

1. **Environment Variables**: Never commit .env files
2. **API Keys**: Rotate regularly, use least privilege
3. **Database**: Enable RLS policies in Supabase
4. **HTTPS**: Always use in production
5. **Dependencies**: Regular updates with `npm audit`

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- NIH for providing public grant data
- Google Cloud for AI/ML services
- Supabase for database infrastructure
- The open-source community

---

Built with ❤️ by the Grantify.ai team

**Status**: Production Ready ✅
**Version**: 1.2.0
**Last Updated**: January 2025