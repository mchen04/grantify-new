import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

// Create client with standard configuration for direct database access
// Using anon key with RLS (Row Level Security) for secure direct access
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export default supabase;

// Auth helpers (these are fine to use in frontend)
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