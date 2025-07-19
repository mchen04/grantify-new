# Development Setup Guide

This guide helps you set up the Grantify.ai development environment for the clean skeleton architecture (Frontend → Supabase).

## Prerequisites

- **Node.js 18+** and npm
- **Git** for version control  
- **Supabase account** for backend services
- **Google Cloud Console** access for OAuth setup

## Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/yourusername/Grantify.ai.git
cd Grantify.ai

# Install frontend dependencies
cd frontend
npm install
```

### 2. Supabase Setup

#### Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note your project URL and anon key
4. Enable the required database extensions:
   - `pgvector` (for semantic search)
   - `pg_trgm` (for fuzzy text matching)

#### Configure Authentication
1. In Supabase Dashboard → Authentication → Providers
2. Enable Google OAuth provider
3. Add your Google OAuth credentials (see step 3)

### 3. Google OAuth Setup

#### Create OAuth Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to Credentials → Create Credentials → OAuth 2.0 Client ID
5. Application type: Web application
6. Add authorized redirect URIs:
   - `https://your-project.supabase.co/auth/v1/callback`
   - `http://localhost:3000/auth/callback` (for development)

### 4. Environment Configuration

Create `frontend/.env.local`:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Optional: Analytics and monitoring
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=your-analytics-id
```

### 5. Database Setup

#### Option A: Use Supabase CLI (Recommended)
```bash
# Install Supabase CLI
npm install -g supabase

# Initialize in project root
supabase init

# Link to your project
supabase link --project-ref your-project-ref

# Push schema and functions
supabase db push
supabase functions deploy
```

#### Option B: Manual Setup
1. Copy SQL from `/supabase/migrations/` files
2. Run in Supabase SQL Editor
3. Deploy Edge Functions manually via dashboard

### 6. Start Development

```bash
# From frontend directory
npm run dev
```

Visit `http://localhost:3000` to see the application.

## Project Structure Overview

```
Grantify.ai/
├── frontend/                     # Next.js application
│   ├── src/app/                  # App router pages
│   ├── src/components/           # React components
│   ├── src/hooks/                # Custom hooks
│   └── src/lib/                  # Utilities and configs
├── supabase/                     # Backend configuration
│   ├── functions/                # Edge functions
│   ├── migrations/               # Database schema
│   └── scripts/                  # Database utilities
├── shared/                       # Shared utilities
│   ├── types/                    # TypeScript types
│   ├── constants/                # Shared constants
│   └── utils/                    # Helper functions
└── docs/                         # Documentation
```

## Development Workflow

### Frontend Development
```bash
cd frontend

# Development server
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Analyze bundle size
npm run bundle-analyzer
```

### Database Development
```bash
# Create new migration
supabase migration new add_new_feature

# Apply migrations
supabase db push

# Reset local database
supabase db reset

# Generate TypeScript types
supabase gen types typescript --local > shared/types/supabase.ts
```

### Edge Functions Development
```bash
# Create new function
supabase functions new my-function

# Serve functions locally
supabase functions serve

# Deploy functions
supabase functions deploy my-function

# View function logs
supabase functions logs my-function
```

## Common Development Tasks

### Adding a New Page
```bash
# Create new page in app router
touch frontend/src/app/my-page/page.tsx
```

### Adding a New Component
```bash
# Create component
touch frontend/src/components/features/my-feature/MyComponent.tsx

# Add to barrel exports
# Edit frontend/src/components/index.ts
```

### Adding Shared Types
```bash
# Add types to shared directory
touch shared/types/my-types.ts

# Export from shared index
# Edit shared/index.ts
```

### Database Changes
```bash
# Create migration
supabase migration new my_change

# Edit the generated SQL file
# Apply changes
supabase db push
```

## Configuration Files

### Frontend Configuration
- `frontend/next.config.ts` - Next.js configuration
- `frontend/tailwind.config.ts` - Tailwind CSS setup
- `frontend/tsconfig.json` - TypeScript configuration

### Supabase Configuration  
- `supabase/config.toml` - Supabase project config
- `supabase/migrations/` - Database schema changes
- `supabase/functions/` - Edge function code

### Shared Configuration
- `shared/tsconfig.json` - Shared TypeScript config
- `shared/constants/app.ts` - Application constants

## Environment Variables Reference

### Required Variables
```env
NEXT_PUBLIC_SUPABASE_URL=        # Your Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Your Supabase anon key
NEXT_PUBLIC_SITE_URL=            # Your site URL (for redirects)
```

### Optional Variables
```env
NEXT_PUBLIC_VERCEL_ANALYTICS_ID= # Vercel Analytics ID
NEXT_PUBLIC_GA_MEASUREMENT_ID=   # Google Analytics ID
```

## Troubleshooting

### Common Issues

#### Environment Variables Not Loading
- Ensure `.env.local` is in the `frontend/` directory
- Restart the development server after changes
- Check that variables start with `NEXT_PUBLIC_` for client-side access

#### Authentication Issues
- Verify Google OAuth redirect URIs match exactly
- Check Supabase Auth provider configuration
- Ensure RLS policies are properly configured

#### Database Connection Issues  
- Verify Supabase URL and keys are correct
- Check that required extensions are enabled
- Ensure RLS policies allow access

#### Build Issues
- Clear `.next` directory: `rm -rf frontend/.next`
- Check for TypeScript errors: `npm run lint`
- Verify all environment variables are set

### Getting Help

1. **Check Documentation**: Look in `/docs/` directory
2. **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
3. **Next.js Docs**: [nextjs.org/docs](https://nextjs.org/docs)
4. **Create Issue**: Use GitHub issues for bugs

## Best Practices

### Code Organization
- Use barrel exports for cleaner imports
- Keep components focused and reusable
- Put business logic in custom hooks
- Use shared types from `/shared/` directory

### Database Best Practices
- Always use migrations for schema changes
- Test RLS policies thoroughly
- Use TypeScript types generated from schema
- Keep functions focused and testable

### Performance
- Use Next.js Image component for images
- Implement proper loading states
- Use TanStack Query for data fetching
- Optimize bundle size regularly

### Security
- Never commit environment variables
- Use RLS policies for data access
- Validate inputs on client and server
- Keep dependencies updated

## Next Steps

After setup, consider:
1. **Customize the UI** - Modify components and styling
2. **Add Features** - Implement new functionality
3. **Configure Analytics** - Set up tracking and monitoring
4. **Deploy to Production** - See deployment documentation

Happy coding! 🚀