// User-related type definitions
import { Grant } from './grant';

export interface UserProfile {
  user_id: string;
  first_name?: string;
  last_name?: string;
  organization?: string;
  job_title?: string;
  phone?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface UserInteraction {
  id: string;
  user_id: string;
  grant_id: string;
  action: 'saved' | 'applied' | 'ignored';
  timestamp: string;
  grants?: Grant; // Reference to the related grant
}

// UserPreferences matches the schema user_preferences table
export interface UserPreferences {
  user_id: string;
  // Funding preferences
  funding_min?: number | null;
  funding_max?: number | null;
  // Time preferences
  deadline_range?: string;
  project_period_min_years?: number | null;
  project_period_max_years?: number | null;
  // Eligibility preferences
  eligible_applicant_types?: string[] | null;
  // Agency preferences
  agencies?: string[] | null;
  agency_subdivisions?: string[] | null;
  // Grant type preferences
  grant_types?: string[] | null;
  activity_codes?: string[] | null;
  activity_categories?: string[] | null;
  announcement_types?: string[] | null;
  // Content preferences
  keywords?: string[] | null;
  categories?: string[] | null;
  // Other preferences
  cost_sharing_preference?: 'required' | 'not_required' | 'any' | null;
  clinical_trial_preference?: 'allowed' | 'not_allowed' | 'any' | null;
  data_sources?: string[] | null;
  // AI matching
  project_description_query?: string | null;
  project_description_embedding?: number[]; // Vector type - handled by backend
  // Auto-refresh settings
  auto_refresh_enabled?: boolean | null;
  auto_refresh_interval?: number | null; // in minutes
  created_at?: string;
  updated_at?: string;
}