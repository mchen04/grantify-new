# Grantify.ai

A clean, modern grant discovery platform that helps researchers and organizations find relevant funding opportunities using advanced search and intelligent recommendations.

## Overview

Grantify.ai transforms how researchers discover and apply for grants by combining automated data collection from official sources, advanced search capabilities, and personalized recommendations to make grant discovery efficient and effective.

### Key Features

- **Advanced Search**: Full-text search across grant titles and descriptions
- **Smart Recommendations**: Algorithm that matches grants based on user preferences and interaction history
- **Optimized Filtering**: Streamlined filter system with effective filters and inclusive data handling
- **Real-time Updates**: Direct API integration with official grant data sources via Supabase Edge Functions
- **Responsive Design**: Full mobile support with comprehensive accessibility features
- **Enterprise Security**: Supabase Auth with Google OAuth, RLS policies, and audit logging
- **Performance Optimized**: Modern React patterns with optimized data fetching and caching
- **Analytics Dashboard**: Real-time metrics with database views for performance insights

## Tech Stack

### Frontend
- **Framework**: Next.js 15.3+ with App Router
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 3.4 with custom components
- **UI Components**: Custom accessible components with ARIA support
- **Auth**: Supabase Authentication with Google OAuth
- **State**: React Context API with TanStack Query
- **Performance**: Optimized with modern React patterns and data fetching

### Backend/Database
- **Database**: PostgreSQL 15 with Supabase
- **Backend Logic**: Supabase Edge Functions (Deno runtime)
- **Vector Search**: pgvector extension for semantic search
- **Authentication**: Supabase Auth with Row Level Security
- **Cron Jobs**: Supabase cron for automated data updates
- **API Integration**: Direct integration with grant data sources via Edge Functions

## Project Structure

```
Grantify.ai/
├── frontend/                     # Next.js React application
│   ├── src/
│   │   ├── app/                  # Next.js app router pages
│   │   ├── components/           # React components with barrel exports
│   │   │   ├── ui/               # Reusable UI components
│   │   │   ├── features/         # Feature-specific components
│   │   │   └── layout/           # Layout components
│   │   ├── hooks/                # Custom React hooks
│   │   ├── lib/                  # Frontend utilities & configs
│   │   ├── providers/            # React context providers
│   │   ├── types/                # Frontend-specific types
│   │   └── utils/                # Frontend helper functions
│   └── public/                   # Static assets
├── supabase/                     # Supabase configuration
│   ├── functions/                # Edge functions for server logic
│   ├── migrations/               # Database migrations
│   ├── scripts/                  # Database utilities and setup
│   └── config/                   # Supabase client configurations
├── shared/                       # Shared utilities across all parts
│   ├── types/                    # Shared TypeScript definitions
│   ├── constants/                # Shared constants
│   └── utils/                    # Shared helper functions
├── docs/                         # All project documentation
│   ├── development/              # Development setup & workflows
│   └── architecture/             # System design documents
├── backend/                      # Legacy utilities (minimal)
│   └── package.json              # Dependencies for utility scripts
└── configs/                      # Project-wide configurations
```

## Quick Start

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

2. Install frontend dependencies:
```bash
cd frontend
npm install
```

3. Set up environment variables:

**Frontend (.env.local)**:
```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

4. Configure Google OAuth:
   - Create OAuth 2.0 credentials in Google Cloud Console
   - Add redirect URI: `https://your-project.supabase.co/auth/v1/callback`
   - Configure in Supabase Auth settings
   - Add redirect URL: `http://localhost:3000/auth/callback`

5. Start development:
```bash
npm run dev    # http://localhost:3000
```

## Database Schema

### Core Tables
- **grants**: Grant opportunities with vector embeddings and comprehensive metadata
- **users**: User authentication and profiles (synchronized with Supabase Auth)
- **user_preferences**: Search preferences with semantic project descriptions
- **user_interactions**: User grant interactions (saved, applied, ignored)
- **grant_contacts**: Contact information for grant opportunities

### Database Features
- **Vector Search**: 768-dimensional embeddings for semantic search
- **Row Level Security**: Comprehensive RLS policies on all tables
- **Performance Optimization**: Specialized indexes including vector similarity
- **Audit Trails**: Complete tracking of user interactions

## Key Features

### Smart Recommendations Algorithm
- Funding range matching (30% weight)
- Deadline proximity (25% weight)
- Agency preferences (20% weight)
- Category matching (15% weight)
- Interaction history (10% weight)

### Performance Optimizations
- Modern React patterns with TanStack Query
- Optimized data fetching and caching
- Database query optimization with proper indexing
- Edge function-based server logic
- Component-level optimization

### Security Implementation
- Supabase Authentication with JWT
- Google OAuth integration
- Row Level Security (RLS) policies
- Input validation and sanitization
- Security headers and HTTPS enforcement

## API Architecture

### Supabase Edge Functions
- **Grant Data Sync**: Automated data collection from official sources
- **AI Recommendations**: Personalized grant matching algorithms
- **Search Processing**: Advanced search and filtering logic
- **Cron Jobs**: Scheduled data updates and maintenance

### Frontend API Integration
- **Supabase Client**: Direct database access with RLS
- **TanStack Query**: Optimized data fetching and caching
- **Real-time Updates**: Supabase real-time subscriptions

## Deployment

### Recommended: Vercel (Frontend) + Supabase (Backend)

#### Frontend to Vercel
1. Connect GitHub repo to Vercel
2. Set root directory to `frontend`
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL`
4. Deploy automatically on git push

#### Supabase Setup
1. Create Supabase project
2. Deploy edge functions: `supabase functions deploy`
3. Run migrations: `supabase db push`
4. Configure authentication providers
5. Set up cron jobs for data sync

## Development

### Frontend Development
```bash
cd frontend
npm run dev          # Development server
npm run build        # Production build
npm run lint         # ESLint check
```

### Database Development
```bash
# Using Supabase CLI
supabase start                    # Local development
supabase db diff                  # Generate migrations
supabase functions serve          # Local edge functions
```

## Security Best Practices

1. **Environment Variables**: Never commit .env files
2. **API Keys**: Use anon key for client, service role for server
3. **Database**: Enable RLS policies in Supabase
4. **HTTPS**: Always use in production
5. **Dependencies**: Regular updates with `npm audit`

## Architecture Benefits

### Simplified Stack
- **No separate backend server** - Supabase handles all backend logic
- **Edge functions** - Server logic runs close to users globally
- **Built-in auth** - No custom authentication implementation needed
- **Real-time** - Live updates without WebSocket management
- **Scalable** - Supabase handles scaling automatically

### Developer Experience
- **TypeScript throughout** - Full type safety across the stack
- **Modern React** - Latest patterns and best practices
- **Clean structure** - Logical organization with shared utilities
- **Fast development** - Hot reload and optimized build process

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

---

**Status**: Clean Skeleton - Ready for Development
**Version**: 2.0.0
**Architecture**: Frontend → Supabase (Edge Functions + Database)
**Last Updated**: January 2025

## Recent Updates (v2.0.0)

### Architecture Modernization
- **Migrated to Supabase-first architecture** - Removed Express.js backend
- **Edge Functions** - Server logic now runs on Supabase Edge Functions
- **Simplified stack** - Frontend → Supabase (no separate backend server)
- **Clean skeleton** - Removed all testing infrastructure for focused development

### Project Reorganization
- **Shared utilities** - Common types and constants in `shared/` directory
- **Consolidated documentation** - All docs in `docs/` directory
- **Component organization** - Barrel exports for cleaner imports
- **TypeScript paths** - Configured for modern import patterns

### Developer Experience
- **Faster setup** - Single `npm install` in frontend directory
- **Cleaner builds** - No test compilation overhead
- **Modern patterns** - Latest React and Next.js best practices
- **Streamlined dependencies** - 80% fewer packages to manage