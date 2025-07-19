// Component exports for better import organization
// Usage: import { Button, GrantCard } from '@/components'

// UI Components
export { Button } from './ui/Button';
export { Badge } from './ui/Badge';
export { default as GoogleAdSense } from './ui/GoogleAdSense';

// Layout Components
export { default as Layout } from './layout/Layout';
export { default as ClientLayout } from './layout/ClientLayout';
export { Container } from './layout/Container';
export { default as Footer } from './layout/Footer';
export { default as Navbar } from './layout/Navbar';
export { default as NavSearchBar } from './layout/navbar/NavSearchBar';

// Common Components
export { default as AriaLiveAnnouncer, announce } from './common/AriaLiveAnnouncer';
export { default as CookieConsent } from './common/CookieConsent';
export { ErrorBoundary, withErrorBoundary } from './common/ErrorBoundary';
export { default as SkipLink } from './common/SkipLink';

// Feature Components - Grants
export { default as GrantCard } from './features/grants/GrantCard';
export { default as GrantCardFooter } from './features/grants/GrantCardFooter';
export { default as GrantCardIcons } from './features/grants/GrantCardIcons';
export { default as ActionButton } from './features/grants/ActionButton';
export { default as ApplyConfirmationPopup } from './features/grants/ApplyConfirmationPopup';

// Feature Components - Search
export { default as SearchBar } from './features/search/SearchBar';
export { default as SearchContainer } from './features/search/SearchContainer';
export { default as SearchFilters } from './features/search/SearchFilters';
export { default as SearchResults } from './features/search/SearchResults';
export { default as ThreadSafeSearchContainer } from './features/search/ThreadSafeSearchContainer';

// Feature Components - Filters
export { default as ActiveFilters } from './features/filters/ActiveFilters';
export { default as CompactAdvancedFilterPanel } from './features/filters/CompactAdvancedFilterPanel';
export { default as DeadlineFilter } from './features/filters/DeadlineFilter';
export { default as FundingRangeFilter } from './features/filters/FundingRangeFilter';

// Feature Components - Dashboard
export { default as CollapsibleFilterPanel } from './features/dashboard/CollapsibleFilterPanel';
export { default as Pagination } from './features/dashboard/Pagination';

// Feature Components - Auth
export { default as KeyboardShortcutsModal } from './features/auth/KeyboardShortcutsModal';

// Feature Components - Home
export { default as InteractiveDemo } from './features/home/InteractiveDemo';

// Feature Components - Settings
export { default as SettingsLayout } from './features/settings/SettingsLayout';

// SEO Components
export { default as StructuredData } from './seo/StructuredData';