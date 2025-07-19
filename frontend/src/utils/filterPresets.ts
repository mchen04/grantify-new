import { GrantFilter } from '@/shared/types/grant';
import { MAX_FUNDING, MIN_DEADLINE_DAYS, MAX_DEADLINE_DAYS } from '@/shared/constants/app';

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
  // Don't apply funding filters by default to show all grants
  // fundingMin and fundingMax undefined means "Any" funding amount
  fundingMin: undefined,
  fundingMax: undefined,
  includeFundingNull: true,
  onlyNoFunding: false,
  // Don't apply ANY deadline filters by default - show ALL grants  
  // deadlineMinDays and deadlineMaxDays undefined means "Any" deadline
  deadlineMinDays: undefined,
  deadlineMaxDays: undefined,
  includeNoDeadline: true,
  onlyNoDeadline: false,
  showOverdue: true, // Show overdue grants by default to see all grants
  sortBy: 'relevance',
  page: 1,
  organizations: [],
  organization_subdivisions: [],
  grant_types: [],
  activity_categories: [],
  eligible_applicant_types: undefined, // undefined means "all applicant types"
  keywords: [],
  // costSharingRequired: REMOVED - all grants have same value (false)
  // Show active and forecasted grants by default (most relevant - 84% of available grants)
  statuses: ['active', 'forecasted'],
  data_source_ids: undefined, // undefined means "all data sources"
  // Show all currencies by default (only USD and EUR exist in database)
  currencies: undefined, // undefined means "all available currencies"
  includeNoCurrency: true, // Include grants without currency data
  // Geographic scope default
  geographic_scope: undefined, // undefined means "all locations"
  includeNoGeographicScope: true // Include grants without location data
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