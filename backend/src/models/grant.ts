// Grant model matching the optimized database schema
export interface Grant {
  // Core identification
  id?: string;
  data_source_id: string;
  source_identifier: string;
  source_url?: string | null;
  
  // Basic information
  title: string;
  status: 'open' | 'active' | 'forecasted' | 'closed' | 'awarded' | 'archived';
  
  // Organization information
  funding_organization_name: string;
  
  // Financial information
  currency?: string;
  funding_amount_min?: number | null;
  funding_amount_max?: number | null;
  total_funding_available?: number | null;
  
  // Important dates
  posted_date?: string | null;
  application_deadline?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  
  // Grant details
  grant_type?: string | null;
  funding_instrument?: string | null;
  summary?: string | null;
  description?: string | null;
  eligibility_criteria?: string | null;
  
  // Geographic information
  geographic_scope?: string | null;
  countries?: string[] | null;
  states?: string[] | null;
  
  // Additional information
  cfda_numbers?: string[] | null;
  opportunity_number?: string | null;
  cost_sharing_required?: boolean | null;
  application_url?: string | null;
  guidelines_url?: string | null;
  
  // Metadata
  raw_data?: any;
  created_at?: string;
  updated_at?: string;
  
  // Search optimization
  search_vector?: string | null;
}

export interface GrantFilter {
  // Search and pagination
  search?: string;
  page?: number;
  limit?: number;
  
  // Status filters
  status?: string | string[];
  
  // Organization filters
  funding_organization_name?: string | string[];
  
  // Financial filters
  funding_min?: number;
  funding_max?: number;
  
  // Date filters
  posted_date_start?: Date | string;
  posted_date_end?: Date | string;
  deadline_start?: Date | string;
  deadline_end?: Date | string;
  include_no_deadline?: boolean;
  include_no_funding?: boolean;
  show_overdue?: boolean;
  
  // Type filters
  grant_type?: string | string[];
  funding_instrument?: string | string[];
  
  // Geographic filters
  geographic_scope?: string | string[];
  countries?: string | string[];
  states?: string | string[];
  
  // Other filters
  cost_sharing_required?: boolean;
  cfda_numbers?: string | string[];
  opportunity_number?: string;
  currency?: string | string[];
  is_featured?: boolean;
  min_view_count?: number;
  min_save_count?: number;
  
  // Sorting
  sort_by?: 'posted_date' | 'application_deadline' | 'funding_amount_max' | 'created_at' | 'title';
  sort_direction?: 'asc' | 'desc';
  
  // User-specific filters
  user_id?: string;
  exclude_interaction_types?: ('saved' | 'applied' | 'ignored')[];
  exclude_id?: string; // For similar grants
  
  // Additional filters for null checks
  funding_null?: boolean;
  deadline_null?: boolean;
  data_source_ids?: string[];
  
  // Posted date filter
  posted_date?: string;
}

// Simplified Grant Response for API responses
export interface GrantResponse {
  id: string;
  title: string;
  funding_organization_name: string;
  status: string;
  application_deadline?: string | null;
  funding_amount_min?: number | null;
  funding_amount_max?: number | null;
  summary?: string | null;
  application_url?: string | null;
  geographic_scope?: string | null;
  created_at?: string;
}

// Grant statistics
export interface GrantStats {
  total_grants: number;
  active_grants: number;
  forecasted_grants: number;
  urgent_deadlines: number;
  grants_with_amounts: number;
  avg_funding_amount: number;
}