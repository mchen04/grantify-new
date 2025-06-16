import { GrantFilter } from '@/types/grant';
import { MAX_FUNDING, MIN_DEADLINE_DAYS, MAX_DEADLINE_DAYS } from './constants';

// Centralized filter preset definitions
export const FILTER_PRESETS = {
  // Funding presets
  HIGH_FUNDING: {
    label: 'High Funding (>$100k)',
    value: 'high-funding',
    filters: {
      fundingMin: 100000,
      fundingMax: MAX_FUNDING,
      includeFundingNull: false,
      onlyNoFunding: false
    }
  },
  LOW_FUNDING: {
    label: 'Low Funding (<$50k)',
    value: 'low-funding',
    filters: {
      fundingMin: 0,
      fundingMax: 50000,
      includeFundingNull: true,
      onlyNoFunding: false
    }
  },
  
  // Deadline presets
  OVERDUE: {
    label: 'Overdue Grants',
    value: 'overdue',
    filters: {
      deadlineMinDays: MIN_DEADLINE_DAYS,
      deadlineMaxDays: -1,
      includeNoDeadline: false,
      onlyNoDeadline: false,
      showOverdue: true
    }
  },
  NO_DEADLINE: {
    label: 'No Deadline',
    value: 'no-deadline',
    filters: {
      onlyNoDeadline: true,
      includeNoDeadline: true,
      showOverdue: false,
      deadlineMinDays: MIN_DEADLINE_DAYS,
      deadlineMaxDays: MAX_DEADLINE_DAYS
    }
  },
  
  // Sort presets
};

// Default filter state - single source of truth
export const DEFAULT_FILTER_STATE: Partial<GrantFilter> = {
  searchTerm: '',
  fundingMin: 0,
  fundingMax: MAX_FUNDING,
  includeFundingNull: true,
  onlyNoFunding: false,
  deadlineMinDays: 0, // Start from today, not overdue grants
  deadlineMaxDays: MAX_DEADLINE_DAYS,
  includeNoDeadline: true,
  onlyNoDeadline: false,
  showOverdue: false, // Don't show overdue grants by default
  sortBy: 'relevance',
  page: 1,
  agencies: [],
  agency_subdivisions: [],
  grant_types: [],
  activity_categories: [],
  announcement_types: [],
  eligible_applicant_types: [],
  keywords: [],
  costSharing: null,
  clinicalTrialAllowed: null,
  status: undefined, // Explicitly set to undefined - no default status filter
  statuses: [], // No default status filters
  data_sources: ['NIH'] // Include NIH by default since it's the primary data source
};

// Helper function to apply preset and handle conflicts
export function applyFilterPreset(
  currentFilters: GrantFilter, 
  preset: keyof typeof FILTER_PRESETS
): Partial<GrantFilter> {
  const presetConfig = FILTER_PRESETS[preset];
  if (!presetConfig) return {};
  
  const newFilters = { ...presetConfig.filters };
  
  // Handle logical conflicts
  if ('onlyNoFunding' in newFilters && (newFilters as any).onlyNoFunding) {
    // If showing ONLY no funding, other funding filters are irrelevant
    (newFilters as any).fundingMin = 0;
    (newFilters as any).fundingMax = MAX_FUNDING;
    (newFilters as any).includeFundingNull = true; // Must be true to show anything
  }
  
  if ('onlyNoDeadline' in newFilters && (newFilters as any).onlyNoDeadline) {
    // If showing ONLY no deadline, other deadline filters are irrelevant
    (newFilters as any).deadlineMinDays = MIN_DEADLINE_DAYS;
    (newFilters as any).deadlineMaxDays = MAX_DEADLINE_DAYS;
    (newFilters as any).includeNoDeadline = true; // Must be true to show anything
    (newFilters as any).showOverdue = false; // Overdue is irrelevant
  }
  
  return newFilters;
}

// Validate filter state for conflicts
export function validateFilterState(filters: Partial<GrantFilter>): Partial<GrantFilter> {
  const validated = { ...filters };
  
  // Fix funding conflicts
  if (validated.onlyNoFunding && !validated.includeFundingNull) {
    validated.includeFundingNull = true; // Must include null to show only null
  }
  
  // Fix deadline conflicts
  if (validated.onlyNoDeadline && !validated.includeNoDeadline) {
    validated.includeNoDeadline = true; // Must include null to show only null
  }
  
  // If showing overdue, make sure deadline range allows it
  if (validated.showOverdue && validated.deadlineMinDays !== undefined && validated.deadlineMinDays >= 0) {
    validated.deadlineMinDays = MIN_DEADLINE_DAYS;
  }
  
  return validated;
}