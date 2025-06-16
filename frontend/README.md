# Grantify.ai Frontend

Modern Next.js 15 application providing an intuitive interface for grant discovery with AI-powered search, personalized recommendations, and comprehensive accessibility features.

## 🎨 Features

- **🔍 Semantic Search**: Natural language grant discovery with vector embeddings
- **📊 Advanced Filtering**: 20+ filter criteria with real-time updates
- **🤖 AI Recommendations**: Weighted algorithm combining semantic similarity and preferences
- **📱 Responsive Design**: Mobile-first with full touch support
- **♿ Accessibility**: WCAG 2.1 AA compliant with screen reader optimization
- **⚡ Performance**: Batch API calls, request deduplication, and intelligent caching
- **🎯 Smart Tracking**: Save, apply, and ignore grants with instant UI updates
- **📦 PWA Support**: Progressive Web App with offline capabilities
- **🛡️ Error Monitoring**: Integrated Sentry for production debugging

## 🛠️ Tech Stack

- **Framework**: Next.js 15.3.1 with App Router
- **Language**: TypeScript 5 (strict mode)
- **Styling**: Tailwind CSS 3.4 with custom design system
- **State Management**: React Context API with custom hooks
- **Authentication**: Supabase Auth with magic links
- **API Client**: Custom client with caching and deduplication
- **Performance**: React 19, Turbopack, image optimization
- **Accessibility**: ARIA support, keyboard navigation, screen reader guides
- **Monitoring**: Sentry integration with session replay
- **SEO**: Optimized meta tags, structured data, sitemap generation

## 🚀 Getting Started

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

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# API
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Optional
NEXT_PUBLIC_GOOGLE_ADSENSE_ID=your-adsense-id
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
SENTRY_AUTH_TOKEN=your-sentry-auth-token
```

4. Start the development server:
```bash
npm run dev
```

5. Open http://localhost:3000 in your browser

## 📁 Project Structure

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

## 🎯 Key Features Implementation

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

### Advanced Filtering System
Comprehensive filter options:
- **Funding Range**: Min/max with "include no funding" option
- **Deadline Range**: Date pickers with "include no deadline"
- **Agencies**: Multi-select from 50+ agencies
- **Categories**: Research areas and grant types
- **Interaction Exclusion**: Hide saved/applied/ignored grants

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

## 🧩 Custom Hooks

### useFetchDashboardData
Manages all dashboard data with optimizations:
```typescript
const {
  recommendedGrants,  // AI recommendations
  savedGrants,        // User's saved grants
  appliedGrants,      // Grants user applied to
  ignoredGrants,      // Hidden grants
  loading,
  error,
  refetch,
  fetchReplacementRecommendations
} = useFetchDashboardData({ targetRecommendedCount: 10 });
```

### useGrantInteractions
Handles grant actions with optimistic updates:
```typescript
const {
  saveGrant,      // Save for later
  applyToGrant,   // Mark as applied
  ignoreGrant,    // Hide from results
  removeSaved,    // Unsave grant
  isProcessing
} = useGrantInteractions();
```

### useKeyboardShortcuts
Global keyboard navigation:
```typescript
useKeyboardShortcuts({
  'cmd+k': openSearch,
  'cmd+s': saveCurrentGrant,
  'escape': closeModal,
  '?': showHelp
});
```

## 🎨 Component Library

### Grant Cards
- **DashboardGrantCard**: Optimized for list views
- **GrantCard**: Full details with actions
- **GrantCardIcons**: Visual indicators for grant attributes
- **GrantCardFooter**: Action buttons with loading states

### Filters
- **CompactAdvancedFilterPanel**: Optimized filter interface
- **ActiveFilters**: Shows applied filters with removal
- **FundingRangeFilter**: Dual slider with validation
- **DeadlineFilter**: Date range picker
- **CheckboxGrid**: Multi-select filter options

### UI Components
- **Button**: Accessible button with loading states
- **Badge**: Status and category indicators  
- **Container**: Responsive layout wrapper
- **SkipLink**: Accessibility navigation
- **ErrorBoundary**: Graceful error handling
- **AriaLiveAnnouncer**: Screen reader announcements

## ⚡ Performance Optimizations

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

## 🔐 Security Implementation

### Authentication Flow
1. **Magic Link**: Passwordless email authentication
2. **OAuth**: Google sign-in support
3. **Session Management**: Automatic token refresh
4. **Protected Routes**: Middleware-based protection

### Security Headers
```typescript
// Configured in next.config.ts
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff  
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: origin-when-cross-origin
- Content-Security-Policy: Configured for production
- Strict-Transport-Security: HSTS enabled
```

### CSRF Protection
- Token-based CSRF protection
- Automatic token refresh
- Secure cookie handling

### Input Sanitization
- DOMPurify for HTML content
- Input validation on all forms
- SQL injection prevention via Supabase

## 🧪 Development Scripts

```bash
# Development
npm run dev              # Start with Turbopack
npm run build           # Production build
npm run start           # Production server
npm run lint            # ESLint checking

# Type checking
npm run type-check      # TypeScript validation

# Testing
npm test                # Run test suite
```

## 🚀 Deployment

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

### Environment Variables for Production
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com/api
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
SENTRY_AUTH_TOKEN=your-sentry-auth-token
```

See [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md) for detailed instructions.

## 🔍 SEO & Analytics

### SEO Implementation
- Dynamic meta tags per page
- Structured data for grants (JSON-LD)
- Auto-generated sitemap.xml
- Open Graph tags for social sharing
- Twitter Card meta tags
- Canonical URLs for all pages
- robots.txt configuration

### Analytics Integration
- Google AdSense support (optional)
- Sentry performance monitoring
- Custom analytics events
- User behavior tracking (privacy-compliant)

```tsx
// components/ui/GoogleAdSense.tsx
<GoogleAdSense adSlot="your-ad-slot" />
```

## 📱 Progressive Web App (PWA)

### PWA Features
- **Offline Support**: Service worker caching
- **Install Prompt**: Add to home screen
- **App Manifest**: Native app experience
- **Push Notifications**: Grant deadline reminders (planned)

### Configuration
```json
// public/manifest.json
{
  "name": "Grantify.ai",
  "short_name": "Grantify",
  "theme_color": "#1a73e8",
  "background_color": "#ffffff",
  "display": "standalone",
  "start_url": "/dashboard"
}
```

### Service Worker
- Caches static assets
- Network-first strategy for API calls
- Offline fallback pages

## 🐛 Common Issues & Solutions

### Hydration Errors
- Ensure consistent server/client rendering
- Check for browser-only APIs in SSR

### Authentication Issues
- Verify Supabase URL and keys
- Check email configuration in Supabase

### Performance Issues
- Run `npm run analyze` to check bundle size
- Enable React DevTools Profiler
- Check for unnecessary re-renders

### Build Errors
- Clear `.next` directory and `node_modules/.cache`
- Run `npm run type-check`
- Check for missing environment variables
- Verify all dynamic imports are properly typed

### NaN Display Issues
- Check API response parsing
- Verify prop types and defaults
- Use Number.isFinite() for validation

## 📦 Monitoring & Debugging

### Sentry Integration
- Error tracking with source maps
- Performance monitoring
- Session replay for debugging
- User context capture
- Release tracking

### Debug Tools
```bash
# Check bundle size
npm run analyze

# Type checking
npm run type-check

# Performance profiling
NEXT_PUBLIC_PROFILE=true npm run dev
```

## 🤝 Contributing

1. Follow TypeScript strict mode
2. Maintain accessibility standards
3. Write meaningful component names
4. Update types when adding features
5. Test on mobile devices
6. Run linting before commits
7. Check Sentry for errors before deploying

## 📄 License

MIT License - see LICENSE file for details

## 📊 Project Status

- **Framework**: Next.js 15.3.1 (latest)
- **React**: Version 19 with new optimizations
- **TypeScript**: Strict mode enabled
- **Production Ready**: ✅ Yes
- **PWA Support**: ✅ Enabled
- **Accessibility**: WCAG 2.1 AA compliant
- **Browser Support**: Modern browsers (ES2017+)
- **Mobile**: Fully responsive design