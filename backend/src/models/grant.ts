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
  opportunity_id: string;
  opportunity_number: string;
  category: string;
  grant_type: string;  // Renamed from funding_type
  activity_code?: string;
  activity_category: string[];
  eligible_applicants: string[];
  agency_name: string;
  agency_subdivision?: string;
  agency_code?: string;
  post_date: Date | null;
  close_date: Date | null;
  loi_due_date?: Date | null;
  expiration_date?: Date | null;
  earliest_start_date?: Date | null;
  total_funding: number | null;
  award_ceiling: number | null;
  award_floor: number | null;
  expected_award_count?: number | null;
  project_period_max_years?: number | null;
  cost_sharing: boolean;
  description_short: string;  // Renamed from description
  description_full: string;   // New field for full description
  source_url: string;         // Renamed from additional_info_url
  data_source?: string;
  status?: string;
  contacts?: GrantContact[];
  eligibility_pi?: string;
  announcement_type?: string;
  clinical_trial_allowed?: boolean;
  additional_notes?: string;
  keywords?: string[];
  created_at?: Date;
  updated_at?: Date;
}

export interface GrantFilter {
  search?: string;
  category?: string;
  agency_name?: string;
  agency_subdivision?: string;
  funding_min?: number;
  funding_max?: number;
  post_date_start?: Date;
  post_date_end?: Date;
  close_date_start?: Date;
  close_date_end?: Date;
  eligible_applicant_types?: string[];
  cost_sharing?: boolean;
  activity_categories?: string[];
  grant_type?: string;  // Renamed from funding_type
  status?: string;
  keywords?: string[];
  page?: number;
  limit?: number;
  user_id?: string;  // Added to filter out grants the user has already interacted with
  exclude_interaction_types?: ('saved' | 'applied' | 'ignored')[];  // Specify which interaction types to exclude
}