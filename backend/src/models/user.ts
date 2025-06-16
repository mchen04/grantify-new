export interface User {
  id: string;
  email: string;
  preferences: UserPreferences;
  created_at?: Date;
  updated_at?: Date;
}

export interface UserPreferences {
  user_id?: string;
  // Funding preferences
  funding_min?: number;
  funding_max?: number;
  // Time preferences
  deadline_range?: string;
  project_period_min_years?: number;
  project_period_max_years?: number;
  // Agency preferences
  agencies?: string[];
  agency_subdivisions?: string[];
  // Grant type preferences
  grant_types?: string[];
  activity_codes?: string[];
  activity_categories?: string[];
  announcement_types?: string[];
  // Content preferences
  keywords?: string[];
  categories?: string[];
  // Other preferences
  cost_sharing_preference?: 'required' | 'not_required' | 'any';
  clinical_trial_preference?: 'allowed' | 'not_allowed' | 'any';
  data_sources?: string[];
  // AI matching - project description should include organization type
  project_description_query?: string;
  project_description_embedding?: number[];
  created_at?: Date;
  updated_at?: Date;
}


export interface UserInteraction {
  user_id: string;
  grant_id: string;
  action: 'saved' | 'applied' | 'ignored';
  timestamp: Date;
  notes?: string;
}