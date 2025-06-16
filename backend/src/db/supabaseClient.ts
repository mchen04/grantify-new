import { createClient, SupabaseClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase credentials. Please check your .env file.');
}

// Create public client for general operations (respects RLS)
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false,
    detectSessionInUrl: false
  }
});

// Create service role client ONLY for admin operations
// WARNING: This bypasses RLS - use only when absolutely necessary
let serviceRoleClient: SupabaseClient | null = null;

export const getServiceRoleClient = () => {
  if (!supabaseServiceKey) {
    throw new Error('Service role key not available');
  }
  
  if (!serviceRoleClient) {
    serviceRoleClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    });
  }
  
  return serviceRoleClient;
};

// Create authenticated client for user-specific operations
export const createAuthenticatedClient = (userToken: string) => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${userToken}`
      }
    }
  });
};

// Default export is the public client
export default supabaseClient;