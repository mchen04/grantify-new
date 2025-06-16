import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Export helper functions
export const supabaseHelpers = {
  // User profiles
  getUserProfile: async (userId: string) => {
    return supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
  },

  updateUserProfile: async (userId: string, profileData: any) => {
    return supabase
      .from('user_profiles')
      .upsert({
        user_id: userId,
        ...profileData,
        updated_at: new Date().toISOString(),
      });
  },
  
  // User interactions
  getUserInteractions: async (userId: string, action?: 'saved' | 'applied' | 'ignored') => {
    let query = supabase.from('user_interactions').select('*').eq('user_id', userId);
    
    if (action) {
      query = query.eq('action', action);
    }
    
    return await query;
  }
};

export default supabase;

// Auth helpers
export const auth = {
  // Sign in with Google
  signInWithGoogle: async () => {
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  },
  
  // Sign out
  signOut: async () => {
    return supabase.auth.signOut();
  },
  
  // Get current user
  getCurrentUser: async () => {
    const { data } = await supabase.auth.getUser();
    return data.user;
  },
  
  // Get session
  getSession: async () => {
    const { data } = await supabase.auth.getSession();
    return data.session;
  },
};

// Database helpers
export const db = {
  // Grants
  grants: {
    // Get all grants with optional filters
    getGrants: async (filters?: Record<string, any>) => {
      let query = supabase.from('grants').select('*');
      
      if (filters) {
        // Apply filters
        if (filters.search) {
          query = query.ilike('title', `%${filters.search}%`);
        }
        
        if (filters.category) {
          query = query.eq('category', filters.category);
        }
        
        if (filters.agency_name) {
          query = query.eq('agency_name', filters.agency_name);
        }
        
        if (filters.funding_min) {
          query = query.gte('award_ceiling', filters.funding_min);
        }
        
        if (filters.funding_max) {
          query = query.lte('award_floor', filters.funding_max);
        }
        
        if (filters.close_date_start) {
          query = query.gte('close_date', filters.close_date_start);
        }
        
        if (filters.close_date_end) {
          query = query.lte('close_date', filters.close_date_end);
        }
        
        if (filters.activity_categories) {
          query = query.contains('activity_category', filters.activity_categories);
        }
        
        // Pagination
        if (filters.limit) {
          query = query.limit(filters.limit);
        }
        
        if (filters.page && filters.limit) {
          const offset = (filters.page - 1) * filters.limit;
          query = query.range(offset, offset + filters.limit - 1);
        }
      }
      
      return query;
    },
    
    // Get a specific grant by ID
    getGrantById: async (id: string) => {
      return supabase.from('grants').select('*').eq('id', id).single();
    },
    
    // Get recommended grants for a user
    getRecommendedGrants: async (userId: string) => {
      // This is a placeholder. In a real application, this would involve
      // more complex logic with AI recommendations
      return supabase.from('grants').select('*').limit(10);
    },
  },
  
  // Users
  users: {
    // Get user preferences
    getUserPreferences: async (userId: string) => {
      return supabase.from('user_preferences').select('*').eq('user_id', userId).single();
    },
    
    // Update user preferences
    updateUserPreferences: async (userId: string, preferences: any) => {
      return supabase.from('user_preferences').upsert({
        user_id: userId,
        ...preferences,
        updated_at: new Date().toISOString(),
      });
    },
    
    // Record user interaction with a grant
    recordInteraction: async (userId: string, grantId: string, action: 'saved' | 'applied' | 'ignored') => {
      return supabase.from('user_interactions').insert({
        user_id: userId,
        grant_id: grantId,
        action,
        timestamp: new Date().toISOString(),
      });
    },
    
    // Get user interactions
    getUserInteractions: async (userId: string, action?: 'saved' | 'applied' | 'ignored') => {
      let query = supabase.from('user_interactions').select('*').eq('user_id', userId);
      
      if (action) {
        query = query.eq('action', action);
      }
      
      return await query;
    },
  },
};
