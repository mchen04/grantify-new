/**
 * Environment configuration for the frontend
 */

// API configuration
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Supabase configuration
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Feature flags
export const FEATURES = {
  AUTH_ENABLED: true,
  RECOMMENDATIONS_ENABLED: true,
};

// Application settings
export const APP_SETTINGS = {
  GRANTS_PER_PAGE: 10,
  MAX_SEARCH_RESULTS: 100,
  DEFAULT_SORT: 'relevance',
};

// Google AdSense configuration
export const ADSENSE_CONFIG = {
  PUBLISHER_ID: process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID || 'ca-pub-XXXXXXXXXXXXXXXX',
  TEST_MODE: process.env.NODE_ENV === 'development' || !process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID,
};

// Default user preferences
export const DEFAULT_USER_PREFERENCES = {
  topics: [],
  funding_min: 0,
  funding_max: 1000000,
  agencies: [],
  locations: [],
  deadline_range: '0',
  show_no_deadline: true,
  show_no_funding: true,
};

// Grant categories
export const GRANT_CATEGORIES = [
  'Research',
  'Education',
  'Health',
  'Arts & Culture',
  'Environment',
  'Community Development',
  'Economic Development',
  'Infrastructure',
  'Social Services',
  'Technology',
  'International Aid',
  'Youth Programs',
  'Animal Welfare',
  'Human Rights',
  'Operating Support',
  'Miscellaneous'
];

// Grant agencies
export const GRANT_AGENCIES = [
  'Grants.gov'
];

// Funding ranges
export const FUNDING_RANGES = [
  { label: 'Any Amount', value: '0-0' },
  { label: 'Up to $50,000', value: '0-50000' },
  { label: '$50,000 - $100,000', value: '50000-100000' },
  { label: '$100,000 - $500,000', value: '100000-500000' },
  { label: '$500,000 - $1,000,000', value: '500000-1000000' },
  { label: '$1,000,000+', value: '1000000-0' },
];

// Deadline ranges
export const DEADLINE_RANGES = [
  { label: 'Any Deadline', value: '0' },
  { label: 'Next 30 Days', value: '30' },
  { label: 'Next 60 Days', value: '60' },
  { label: 'Next 90 Days', value: '90' },
  { label: 'Next 6 Months', value: '180' },
];

// Sort options
export const SORT_OPTIONS = [
  { label: 'Relevance', value: 'relevance' },
  { label: 'Deadline (Soonest)', value: 'deadline_asc' },
  { label: 'Deadline (Latest)', value: 'deadline_desc' },
  { label: 'Funding Amount (Highest)', value: 'funding_desc' },
  { label: 'Funding Amount (Lowest)', value: 'funding_asc' },
  { label: 'Recently Added', value: 'recent' },
];
