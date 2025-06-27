# Grantify.ai Frontend

Next.js-based frontend application for the Grantify.ai grant discovery platform.

## Features

- **Smart Search**: Full-text grant discovery across 13+ API data sources
- **Optimized Filtering**: Streamlined 6-filter system with inclusive data handling
- **Smart Recommendations**: Algorithm based on user preferences and interaction history
- **Responsive Design**: Mobile-first with full touch support
- **Accessibility**: WCAG 2.1 AA compliant with screen reader optimization
- **Performance**: Batch API calls, request deduplication, and intelligent caching
- **Smart Tracking**: Save, apply, and ignore grants with instant UI updates
- **PWA Support**: Progressive Web App with offline capabilities
- **Error Monitoring**: Integrated Sentry for production debugging

## Tech Stack

- **Framework**: Next.js 15.3.4 with App Router
- **Language**: TypeScript 5 (strict mode)
- **Styling**: Tailwind CSS 3.4 with custom design system
- **State Management**: React Context API with custom hooks
- **Authentication**: Supabase Auth with Google OAuth
- **API Client**: Custom client with caching and deduplication
- **Performance**: React 19, Turbopack, image optimization
- **Accessibility**: ARIA support, keyboard navigation, screen reader guides
- **Monitoring**: Sentry integration with session replay
- **Testing**: Jest + React Testing Library + Playwright

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account with project created
- Backend API running on port 3001

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
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# API
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Optional - for monitoring
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
SENTRY_AUTH_TOKEN=your-sentry-auth-token
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
│   ├── app/                    # Next.js App Router pages
│   │   ├── (auth)/            # Auth pages (login, signup)
│   │   ├── (info)/            # Info pages (about, accessibility)
│   │   ├── (legal)/           # Legal pages (privacy, terms)
│   │   ├── ai-grant-discovery/ # AI search showcase
│   │   ├── dashboard/         # Main dashboard with tabs
│   │   ├── grants/[grantId]/  # Grant detail pages
│   │   ├── search/            # Advanced search interface
│   │   ├── smart-grant-matching/ # Smart matching feature
│   │   ├── profile/           # User profile management
│   │   ├── preferences/       # Preference settings
│   │   └── settings/          # Account settings
│   ├── components/
│   │   ├── common/            # Shared components (ErrorBoundary, SkipLink)
│   │   ├── features/          # Feature components
│   │   │   ├── auth/          # Auth components
│   │   │   ├── dashboard/     # Dashboard components
│   │   │   ├── filters/       # Filter components
│   │   │   ├── grants/        # Grant cards and actions
│   │   │   ├── search/        # Search bar and results
│   │   │   └── settings/      # Settings layout
│   │   ├── layout/            # Layout components (Navbar, Footer)
│   │   └── ui/                # UI primitives (Button, Badge)
│   ├── contexts/              # React Contexts
│   │   ├── AuthContext.tsx    # Authentication state
│   │   ├── SearchContext.tsx  # Search filters state
│   │   └── InteractionContext.tsx # Grant interactions
│   ├── hooks/                 # Custom React hooks
│   │   ├── useFetchDashboardData.ts # Dashboard data with batching
│   │   ├── useGrantInteractions.ts  # Grant action handlers
│   │   ├── useKeyboardShortcuts.ts  # Keyboard navigation
│   │   └── useUserPreferences.ts    # Preference management
│   ├── lib/                   # Core utilities
│   │   ├── apiClient.ts       # API client with caching
│   │   ├── supabaseClient.ts  # Supabase configuration
│   │   └── grantRecommendations.ts # Client-side scoring
│   ├── types/                 # TypeScript definitions
│   └── utils/                 # Helper functions
├── public/                    # Static assets
├── next.config.ts            # Next.js configuration
└── tailwind.config.ts        # Tailwind configuration
```

## Key Features Implementation

### Dashboard with Batch Loading
The dashboard efficiently loads grant data using batch endpoints:
```typescript
// Fetches multiple grants in one request instead of N individual requests
const { data } = await apiClient.grants.getGrantsBatch(grantIds);
```

### API Client with Caching
Advanced API client features:
- **Request Deduplication**: Prevents duplicate concurrent requests
- **Intelligent Caching**: TTL-based cache with automatic invalidation
- **CSRF Protection**: Automatic token management
- **Error Handling**: Comprehensive error messages

### Real-time Interaction Updates
Grant interactions update instantly across all tabs:
```typescript
// Context manages interaction state globally
const { interactionsMap, updateInteraction } = useInteractions();
```

### Weighted Recommendation Display
Recommendations show AI-calculated scores:
- Semantic similarity
- Funding range match
- Deadline proximity
- Agency preferences
- Category alignment

### Optimized Filtering System (v1.3.0)
Streamlined filter options with inclusive data handling:
- **Funding Range**: Min/max amounts with "include grants without funding data" option
- **Deadline Range**: Date pickers with "include grants without deadlines" option  
- **Grant Status**: Active, forecasted, open, closed (defaults to active + forecasted)
- **Geographic Scope**: Region selection with "include grants without location data" option
- **Currency**: USD/EUR selection with "include grants without currency data" option
- **Posted Date**: Filter by grant posting date

**Key Improvements:**
- Fixed currency filter bug (unchecking currencies now works correctly)
- Removed ineffective filters (cost sharing, featured, applicant types) 
- Added data coverage warnings for filters with limited data
- All filters include "show all" options to prevent data exclusion
- Cleaner UI with real grant count indicators

### Accessibility Features
- **Skip Links**: Jump to main content
- **ARIA Live Regions**: Screen reader announcements
- **Keyboard Shortcuts**: 
  - `Cmd/Ctrl + K`: Open search
  - `Cmd/Ctrl + S`: Save current grant
  - `?`: Show keyboard shortcuts
  - `Escape`: Close modals/dialogs
  - `Tab/Shift+Tab`: Navigate through elements
- **Focus Management**: Proper focus trapping in modals
- **High Contrast**: Support for system preferences
- **Reduced Motion**: Respects prefers-reduced-motion
- **Screen Reader Guides**: Dedicated pages for NVDA/JAWS
- **Form Labels**: All inputs properly labeled
- **Error Announcements**: Clear error messages for screen readers
- **Alt Text**: Meaningful descriptions for all images
- **Semantic HTML**: Proper heading hierarchy and landmarks

## Key Components & Hooks

### Custom Hooks
- **useFetchDashboardData**: Manages dashboard data with batch loading
- **useGrantInteractions**: Handles grant actions with optimistic updates
- **useKeyboardShortcuts**: Global keyboard navigation
- **useUserPreferences**: Preference management

### Component Library
- **Grant Components**: GrantCard, GrantCardIcons, GrantCardFooter, ActionButton
- **Filter Components**: CompactAdvancedFilterPanel, ActiveFilters, FundingRangeFilter, DeadlineFilter
- **UI Components**: Button, Badge, Container, SkipLink, ErrorBoundary

## Performance Optimizations

### Implemented Optimizations
1. **Batch API Calls**: Reduced requests by 90%+
2. **Request Deduplication**: Prevents redundant API calls
3. **Smart Caching**: 5-minute TTL for dynamic data
4. **Lazy Loading**: Components loaded on demand
5. **Image Optimization**: Next.js Image with AVIF/WebP
6. **Turbopack**: Fast development builds
7. **React Compiler**: Optimized bundle size
8. **Dynamic Imports**: Code splitting for better performance
9. **Prefetching**: Link prefetching for instant navigation

### Bundle Optimization
```javascript
// next.config.ts
experimental: {
  optimizePackageImports: ['@supabase/supabase-js']
}
```

## Security

- **Authentication**: Google OAuth via Supabase
- **Session Management**: Automatic token refresh
- **CSRF Protection**: Token-based protection
- **Security Headers**: X-Frame-Options, CSP, HSTS, etc.
- **Input Sanitization**: DOMPurify for HTML content

## Testing

```bash
npm test                 # Run unit tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
npm run test:e2e        # E2E tests with Playwright
npm run test:e2e:ui     # Playwright UI mode
npm run test:perf       # Performance tests
npm run test:a11y       # Accessibility tests
```

## Deployment

### Docker Deployment
```bash
# Build and run with Docker
docker build -f Dockerfile.frontend -t grantify-frontend .
docker run -p 3000:3000 grantify-frontend
```

### Vercel Deployment
```bash
vercel deploy --prod
```

See the main [README.md](../README.md) for detailed deployment instructions.

## Progressive Web App

- **Offline Support**: Service worker caching
- **Install Prompt**: Add to home screen
- **App Manifest**: Native app experience
- **Push Notifications**: Grant deadline reminders (planned)

## Troubleshooting

- **Hydration Errors**: Check for browser-only APIs in SSR
- **Auth Issues**: Verify Supabase URL and keys
- **Build Errors**: Clear `.next` directory and check environment variables
- **Performance**: Run `npm run build:analyze` to check bundle size

## License

Part of the Grantify.ai project - MIT License