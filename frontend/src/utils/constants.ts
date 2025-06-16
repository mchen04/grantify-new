/**
 * Application-wide constants
 */

// Environment check
export const isDevelopment = process.env.NODE_ENV === 'development';

// Maximum funding amount for grant filters
export const MAX_FUNDING = 100000000; // $100,000,000 (100 million) - reasonable maximum

// Deadline days range for grant filters
export const MIN_DEADLINE_DAYS = -90; // Show overdue grants up to 90 days back
export const MAX_DEADLINE_DAYS = 365; // 1 year

// Number of grants to show per page
export const SEARCH_GRANTS_PER_PAGE = 6;
export const DASHBOARD_GRANTS_PER_PAGE = 10;

// Legacy constant for backward compatibility
export const GRANTS_PER_PAGE = SEARCH_GRANTS_PER_PAGE;

// Default filter values for search functionality
export const DEFAULT_FILTER_VALUES = {
  searchTerm: '',
  sortBy: 'relevance',
  page: 1,
  limit: 20,
  fundingMin: null,
  fundingMax: null,
  deadlineMinDays: null,
  deadlineMaxDays: null
};
