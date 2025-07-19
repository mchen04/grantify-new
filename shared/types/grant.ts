// Shared Grant type definitions
// This file contains types that are used across frontend and backend

export interface Grant {
  id: string;
  title: string;
  funding_organization_name: string;
  funding_organization_code?: string;
  funding_organization_subdivision?: string;
  source_identifier: string;
  opportunity_number?: string;
  application_deadline: string | null;
  posted_date: string | null;
  loi_due_date?: string | null;
  expiration_date?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  total_funding_available?: number | null;
  funding_amount_max: number | null;
  funding_amount_min?: number | null;
  expected_award_count?: number | null;
  project_period_max_years?: number | null;
  summary: string;
  description: string;
  activity_categories?: string[];
  cfda_numbers?: string[];
  grant_type?: string | null;
  eligible_applicants: string[];
  eligibility_criteria?: string;
  cost_sharing_required: boolean;
  source_url: string | null;
  application_url?: string | null;
  guidelines_url?: string | null;
  data_source_id?: string;
  status?: string;
  funding_instrument?: string;
  geographic_scope?: string;
  countries?: string[];
  states?: string[];
  keywords?: string[];
  category?: string;
  interactions?: Array<{
    action: 'saved' | 'applied' | 'ignored';
    timestamp: string;
  }> | null;
  created_at?: string;
  updated_at?: string;
}

export interface GrantFilter {
  // Search
  searchTerm: string;
  // Funding filters
  fundingMin?: number;
  fundingMax?: number;
  includeFundingNull: boolean;
  onlyNoFunding: boolean;
  totalFundingMin?: number;
  totalFundingMax?: number;
  expectedAwardCountMin?: number;
  expectedAwardCountMax?: number;
  // Date filters
  deadlineMinDays?: number;
  deadlineMaxDays?: number;
  includeNoDeadline: boolean;
  onlyNoDeadline: boolean;
  showOverdue?: boolean;
  loiDueDateFrom?: string;
  loiDueDateTo?: string;
  startDateFrom?: string;
  startDateTo?: string;
  // Project period
  projectPeriodMinYears?: number;
  projectPeriodMaxYears?: number;
  // Organization filters
  organizations?: string[];
  funding_organization_name?: string;
  organization_subdivision?: string;
  organization_subdivisions?: string[];
  organization_codes?: string[];
  // Grant type filters
  grant_type?: string;
  grant_types?: string[];
  cfda_numbers?: string[];
  activity_categories?: string[];
  funding_instruments?: string[];
  opportunity_number?: string;
  // Eligibility filters
  eligible_applicant_types?: string[];
  eligibility_criteria?: string;
  // Geographic filters
  geographic_scope?: string;
  includeNoGeographicScope?: boolean;
  countries?: string[];
  states?: string[];
  // Content filters
  keywords?: string[];
  categories?: string[];
  // Other filters
  costSharingRequired?: boolean | null;
  statuses?: string[];
  sources?: string[];
  data_source_ids?: string[];
  // Currency filter
  currencies?: string[];
  includeNoCurrency?: boolean;
  // Featured/popularity filters
  onlyFeatured?: boolean;
  minViewCount?: number;
  minSaveCount?: number;
  // Pagination and sorting
  sortBy: string;
  page: number;
  limit?: number;
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface ScoredGrant extends Grant {
  matchScore?: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  created_at?: string;
  updated_at?: string;
  last_sign_in_at?: string;
}