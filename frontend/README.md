# Grantify.ai Frontend

Modern Next.js frontend application for the Grantify.ai grant discovery platform, built with a clean skeleton architecture focusing on performance and developer experience.

## Features

- **Smart Search**: Full-text grant discovery with advanced filtering
- **Modern UI**: Clean, responsive design with Tailwind CSS
- **Authentication**: Supabase Auth with Google OAuth integration
- **Real-time Updates**: Live data synchronization with Supabase
- **Accessibility**: WCAG 2.1 AA compliant with comprehensive support
- **Performance Optimized**: Modern React patterns and data fetching
- **PWA Ready**: Progressive Web App capabilities

## Tech Stack

- **Framework**: Next.js 15.3+ with App Router
- **Language**: TypeScript 5 with strict mode
- **Styling**: Tailwind CSS 3.4+ with custom design system
- **State Management**: React Context API with TanStack Query
- **Authentication**: Supabase Auth with RLS policies
- **Database**: Direct Supabase client integration
- **Performance**: React 19, optimized builds, modern patterns

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase project with authentication configured

### Installation

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.local` file:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

4. Start the development server:
```bash
npm run dev
```

5. Open http://localhost:3000 in your browser

## Project Structure

```
frontend/
├── src/
│   ├── app/                      # Next.js App Router pages
│   │   ├── (auth)/              # Authentication pages
│   │   ├── (info)/              # Information pages
│   │   ├── (legal)/             # Legal pages
│   │   ├── dashboard/           # Main dashboard
│   │   ├── grants/[grantId]/    # Grant detail pages
│   │   ├── search/              # Search interface
│   │   ├── profile/             # User profile
│   │   └── settings/            # User settings
│   ├── components/              # React components
│   │   ├── ui/                  # Reusable UI components
│   │   ├── features/            # Feature-specific components
│   │   ├── layout/              # Layout components
│   │   ├── common/              # Shared components
│   │   └── index.ts             # Barrel exports
│   ├── hooks/                   # Custom React hooks
│   ├── lib/                     # Core utilities and configs
│   ├── providers/               # React context providers
│   ├── types/                   # TypeScript type definitions
│   └── utils/                   # Helper functions
├── public/                      # Static assets
├── next.config.ts              # Next.js configuration
└── tailwind.config.ts          # Tailwind CSS configuration
```

## Architecture

### Clean Skeleton Benefits
- **Simplified Stack**: Frontend → Supabase (no separate backend server)
- **Modern Patterns**: Latest React and Next.js best practices
- **Shared Types**: Common types in `shared/` directory for consistency
- **Component Organization**: Barrel exports for cleaner imports
- **TypeScript Paths**: Configured for optimal developer experience

### Data Flow
```
Frontend → Supabase Client → Database (with RLS)
       → Edge Functions → External APIs
```

## Key Features Implementation

### Component Library with Barrel Exports
```typescript
// Clean imports using barrel exports
import { Button, Badge, GrantCard } from '@/components';
import { Grant, GrantFilter } from '@/shared/types/grant';
```

### Authentication Flow
- Google OAuth through Supabase Auth
- Automatic session management
- Row Level Security (RLS) for data access
- Protected routes and pages

### Real-time Data
- Direct Supabase client integration
- TanStack Query for optimized data fetching
- Real-time subscriptions for live updates
- Optimistic updates for better UX

### Search & Filtering
Modern search experience with:
- Full-text search across grant data
- Advanced filtering with inclusive options
- Real-time results updates
- Search state management

### Accessibility Features
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader**: ARIA labels and live regions  
- **Skip Links**: Quick navigation
- **Focus Management**: Proper focus handling
- **High Contrast**: System preference support
- **Reduced Motion**: Respect user preferences

## Development Scripts

```bash
npm run dev          # Development server with hot reload
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint code checking
npm run bundle-analyzer  # Analyze bundle size
```

## Performance Optimizations

### Implemented Features
1. **Modern React Patterns**: Latest hooks and patterns
2. **TanStack Query**: Optimized data fetching and caching
3. **Component Optimization**: Efficient re-rendering
4. **Image Optimization**: Next.js Image with modern formats
5. **Code Splitting**: Dynamic imports for better loading
6. **Bundle Optimization**: Tree shaking and dead code elimination

### Bundle Configuration
```typescript
// next.config.ts optimizations
experimental: {
  optimizePackageImports: ['@supabase/supabase-js', '@tanstack/react-query']
}
```

## Security

- **Authentication**: Supabase Auth with JWT tokens
- **Authorization**: Row Level Security policies  
- **Session Management**: Automatic token refresh
- **Input Validation**: Client-side validation with server verification
- **Security Headers**: Comprehensive security headers via Next.js

## Component Architecture

### Shared Components
- **UI Components**: Button, Badge, Container (reusable primitives)
- **Layout Components**: Navbar, Footer, Layout (structural)
- **Feature Components**: GrantCard, SearchBar, Filters (domain-specific)

### Hooks Pattern
```typescript
// Custom hooks for business logic
const { grants, loading, error } = useFetchGrants(filters);
const { user, signOut } = useAuth();
const { saveGrant } = useGrantInteractions();
```

### Context Providers
```typescript
// Clean context organization
<AuthProvider>
  <SearchProvider>
    <QueryProvider>
      <App />
    </QueryProvider>
  </SearchProvider>
</AuthProvider>
```

## Deployment

### Vercel (Recommended)
1. Connect GitHub repository to Vercel
2. Set build settings:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
3. Add environment variables
4. Deploy automatically on git push

### Environment Variables for Production
```env
NEXT_PUBLIC_SUPABASE_URL=your-production-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

## Supabase Integration

### Client Configuration
```typescript
// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

### Database Access
- Direct client access with RLS policies
- TypeScript types generated from schema
- Real-time subscriptions for live data
- Optimistic updates for better UX

## Progressive Web App

- **Service Worker**: Caching for offline support
- **App Manifest**: Native app experience
- **Install Prompt**: Add to home screen capability
- **Responsive Design**: Works on all device sizes

## Troubleshooting

### Common Issues
- **Hydration Errors**: Check for browser-only code in SSR
- **Auth Issues**: Verify Supabase configuration and RLS policies
- **Build Errors**: Clear `.next` directory and check environment variables
- **Performance Issues**: Use `npm run bundle-analyzer` to inspect bundle

### Development Tips
- Use React DevTools for debugging
- Check Network tab for API calls
- Verify RLS policies in Supabase dashboard
- Test accessibility with screen reader

## Contributing

1. Follow the component patterns established in the codebase
2. Use TypeScript strict mode for all new code
3. Add proper accessibility attributes
4. Follow the established file organization
5. Update documentation for new features

## License

Part of the Grantify.ai project - MIT License

---

**Architecture**: Frontend → Supabase
**Status**: Clean Skeleton - Ready for Development  
**Version**: 2.0.0