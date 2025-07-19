// Shared utilities and types exports
// Usage: import { Grant, MAX_FUNDING, logger } from '@/shared'

// Types
export type {
  Grant,
  GrantFilter,
  SelectOption,
  ScoredGrant,
  AuthenticatedUser
} from './types/grant';

// Constants
export {
  MAX_FUNDING,
  MIN_DEADLINE_DAYS,
  MAX_DEADLINE_DAYS,
  SEARCH_GRANTS_PER_PAGE,
  DASHBOARD_GRANTS_PER_PAGE,
  GRANTS_PER_PAGE,
  DEFAULT_FILTER_VALUES,
  API_TIMEOUT,
  RATE_LIMIT_REQUESTS_PER_MINUTE,
  MAX_SEARCH_RESULTS,
  DEFAULT_PAGE_SIZE
} from './constants/app';

// Utilities
export { validateInput } from './utils/inputValidator';
export { logger } from './utils/logger';