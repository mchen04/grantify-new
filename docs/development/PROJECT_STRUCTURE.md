# Project Structure

This document describes the improved organization of the Grantify.ai codebase after the migration to Supabase.

## Directory Structure

```
grantify.ai/
├── frontend/                     # Next.js React application
│   ├── src/
│   │   ├── app/                  # Next.js app router pages
│   │   ├── components/           # React components
│   │   │   ├── ui/               # Reusable UI components
│   │   │   ├── features/         # Feature-specific components
│   │   │   └── layout/           # Layout components
│   │   ├── hooks/                # Custom React hooks
│   │   ├── lib/                  # Frontend utilities & configs
│   │   ├── providers/            # React context providers
│   │   ├── types/                # Frontend-specific types
│   │   └── utils/                # Frontend helper functions
│   ├── __tests__/                # Unit and integration tests
│   ├── e2e/                      # End-to-end tests
│   └── public/                   # Static assets
├── supabase/                     # Supabase configuration
│   ├── functions/                # Edge functions
│   ├── migrations/               # Database migrations
│   ├── scripts/                  # Database utilities and setup
│   └── config/                   # Supabase client configurations
├── shared/                       # Shared utilities across all parts
│   ├── types/                    # Shared TypeScript definitions
│   ├── constants/                # Shared constants
│   └── utils/                    # Shared helper functions
├── docs/                         # All project documentation
│   ├── api/                      # API documentation
│   ├── deployment/               # Deployment guides
│   ├── development/              # Development setup & workflows
│   └── architecture/             # System design documents
├── configs/                      # Project-wide configurations
│   ├── environments/             # Environment-specific configs
│   ├── ci/                       # CI/CD configurations
│   └── docker/                   # Docker configurations
└── backend/                      # Legacy backend (minimal remaining files)
    ├── package.json              # Dependencies for utility scripts
    └── tsconfig.json             # TypeScript configuration
```

## Architecture Overview

The project follows a **frontend → Supabase** architecture:

- **Frontend**: Next.js application handling UI, authentication, and user interactions
- **Supabase**: Backend-as-a-Service providing database, authentication, and edge functions
- **Edge Functions**: Server-side logic for API integrations and cron jobs
- **Database**: PostgreSQL hosted by Supabase with RLS policies

## Key Changes from Previous Structure

### Removed
- Express.js backend server
- Backend API routes and middleware
- Dedicated backend testing infrastructure
- Scattered documentation across multiple locations

### Added
- Centralized `supabase/` directory for all backend logic
- `shared/` directory for cross-cutting concerns
- Consolidated `docs/` directory
- Improved component organization

### Improved
- Logical grouping of related functionality
- Consistent naming conventions
- Reduced nesting depth
- Clear separation of concerns

## Development Workflow

1. **Frontend Development**: Work in `frontend/src/`
2. **Database Changes**: Create migrations in `supabase/migrations/`
3. **Server Logic**: Implement as edge functions in `supabase/functions/`
4. **Documentation**: Update relevant files in `docs/`
5. **Shared Code**: Add to `shared/` for cross-cutting concerns

## Testing Strategy

- **Unit Tests**: `frontend/__tests__/` for component and hook testing
- **Integration Tests**: `frontend/__tests__/integration/` for feature testing
- **E2E Tests**: `frontend/e2e/` for full user journey testing
- **Edge Function Tests**: Consider adding to `supabase/functions/` as needed

## Migration Benefits

- **Simplified Architecture**: Fewer moving parts and dependencies
- **Better Organization**: Logical grouping and clear separation
- **Improved Maintainability**: Easier to find and modify code
- **Enhanced Developer Experience**: Consistent structure and naming
- **Reduced Complexity**: No more Express server to maintain