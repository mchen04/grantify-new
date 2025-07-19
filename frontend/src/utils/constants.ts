/**
 * Frontend-specific constants
 * For shared constants, see ../../../shared/constants/app.ts
 */

// Environment check
export const isDevelopment = process.env.NODE_ENV === 'development';

// Re-export shared constants for backward compatibility
export {
  MAX_FUNDING,
  MIN_DEADLINE_DAYS,
  MAX_DEADLINE_DAYS,
  SEARCH_GRANTS_PER_PAGE,
  DASHBOARD_GRANTS_PER_PAGE,
  GRANTS_PER_PAGE,
  DEFAULT_FILTER_VALUES
} from '../../../shared/constants/app';
