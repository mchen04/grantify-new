// Grant type definitions
export interface GrantContact {
  id?: string;
  contact_type: string;
  contact_name?: string;
  contact_role?: string;
  contact_organization?: string;
  email?: string;
  phone?: string;
  url?: string;
  display_order?: number;
  notes?: string;
}

export interface Grant {
  id: string;
  title: string;
  agency_name: string;
  agency_code?: string;
  agency_subdivision?: string;
  opportunity_id: string;
  opportunity_number?: string;
  close_date: string | null;
  post_date: string | null;
  loi_due_date?: string | null;
  expiration_date?: string | null;
  earliest_start_date?: string | null;
  total_funding?: number | null;
  award_ceiling: number | null;
  award_floor?: number | null;
  expected_award_count?: number | null;
  project_period_max_years?: number | null;
  description_short: string;
  description_full: string;
  activity_category: string[];
  activity_code?: string;
  grant_type?: string | null;
  eligible_applicants: string[];
  eligibility_pi?: string;
  cost_sharing: boolean;
  source_url: string | null;
  data_source?: string;
  status?: string;
  contacts?: GrantContact[];
  announcement_type?: string;
  clinical_trial_allowed?: boolean;
  additional_notes?: string;
  keywords?: string[];
  category?: string;
  interactions?: Array<{
    action: 'saved' | 'applied' | 'ignored';
    timestamp: string;
  }> | null;
  match_score?: number;
  similarity_score?: number;
}

export interface GrantFilter {
  // Search
  searchTerm: string;
  // Funding filters
  fundingMin: number;
  fundingMax: number;
  includeFundingNull: boolean;
  onlyNoFunding: boolean;
  totalFundingMin?: number;
  totalFundingMax?: number;
  expectedAwardCountMin?: number;
  expectedAwardCountMax?: number;
  // Date filters
  deadlineMinDays: number;
  deadlineMaxDays: number;
  includeNoDeadline: boolean;
  onlyNoDeadline: boolean;
  showOverdue?: boolean;
  postDateFrom?: string;
  postDateTo?: string;
  loiDueDateFrom?: string;
  loiDueDateTo?: string;
  earliestStartDateFrom?: string;
  earliestStartDateTo?: string;
  // Project period
  projectPeriodMinYears?: number;
  projectPeriodMaxYears?: number;
  // Agency filters
  agencies?: string[];
  agency_name?: string;
  agency_subdivision?: string;
  agency_subdivisions?: string[];
  agency_codes?: string[];
  // Grant type filters
  grant_type?: string;
  grant_types?: string[];
  activity_codes?: string[];
  activity_categories?: string[];
  announcement_types?: string[];
  // Eligibility filters
  eligible_applicant_types?: string[];
  eligibility_pi?: string;
  // Content filters
  keywords?: string[];
  categories?: string[];
  // Other filters
  costSharing?: boolean | null;
  clinicalTrialAllowed?: boolean | null;
  status?: string;
  statuses?: string[];
  sources?: string[];
  data_sources?: string[];
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

export interface SimilarGrant {
  id: string;
  title: string;
  agency: string;
  deadline: string;
  similarity_score?: number;
}