import supabase from './supabaseClient';

// Base URL for edge functions
const FUNCTIONS_URL = process.env.NEXT_PUBLIC_SUPABASE_URL + '/functions/v1';

// Helper function to call edge functions
async function callEdgeFunction(functionName: string, params?: any) {
  const { data: { session } } = await supabase.auth.getSession();
  
  const url = new URL(`${FUNCTIONS_URL}/${functionName}`);
  
  // Add query parameters if provided
  if (params && typeof params === 'object') {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add authorization header if user is logged in
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  } else {
    // Use anon key for public endpoints
    headers['Authorization'] = `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`;
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Edge function call failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Specific edge function calls
export const edgeFunctions = {
  // Get application stats
  getStats: () => callEdgeFunction('stats'),
  
  // Health check
  getHealth: () => callEdgeFunction('health'),
  
  // Diagnose grants (for debugging)
  diagnoseGrants: (searchTerm?: string) => 
    callEdgeFunction('diagnose-grants', searchTerm ? { search: searchTerm } : undefined),
  
  // Sync grants manually (requires auth)
  syncGrants: async (params: { data_source_id?: string; sync_type?: 'full' | 'incremental'; force?: boolean } = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('Authentication required for sync operations');
    }

    const response = await fetch(`${FUNCTIONS_URL}/sync-grants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
};

export default edgeFunctions;