/**
 * API client for communicating with the backend
 */

// Base URL for API requests
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// Cache configuration
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}


class ApiCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private pendingRequests = new Map<string, Promise<unknown>>();
  
  // Default TTL: 5 minutes
  private defaultTTL = 5 * 60 * 1000;
  
  getCacheKey(endpoint: string, options: RequestInit, accessToken?: string | null): string {
    // Use only the first 10 chars of access token to avoid overly long keys in logs
    const tokenPart = accessToken ? accessToken.substring(0, 10) + '...' : 'anonymous';
    // Sort options to ensure consistent cache keys
    const sortedOptions = options ? JSON.stringify(options, Object.keys(options).sort()) : '{}';
    return `${endpoint}-${sortedOptions}-${tokenPart}`;
  }
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    // Check if cache entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }
  
  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    });
  }
  
  clear(): void {
    this.cache.clear();
    this.pendingRequests.clear();
  }
  
  clearPattern(pattern: string): void {
    // Clear cache entries that match the pattern
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => {
      this.cache.delete(key);
      // Cache entry cleared
    });
  }
  
  // Request deduplication
  async dedupe<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    // Check if request is already pending
    const pending = this.pendingRequests.get(key);
    if (pending) {
      // Request deduped
      return pending as T;
    }
    
    // New request started
    // Create new request and store as pending
    const request = requestFn().finally(() => {
      this.pendingRequests.delete(key);
      // Request completed
    });
    
    this.pendingRequests.set(key, request);
    return request;
  }
}

// Create cache instance
const apiCache = new ApiCache();

// Request controller map for cancellation
const requestControllers = new Map<string, AbortController>();

// CSRF token storage with fetch promise for preventing race conditions
let csrfToken: string | null = null;
let csrfTokenExpiry: number = 0;
let csrfTokenFetchPromise: Promise<string | null> | null = null;

// Function to fetch CSRF token
async function fetchCSRFToken(accessToken: string): Promise<string | null> {
  try {
    console.log('[apiClient] Fetching CSRF token...');
    const response = await fetch(`${API_BASE_URL}/api/csrf-token`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      csrfToken = data.csrfToken;
      // Token expires in 1 hour, refresh after 50 minutes
      csrfTokenExpiry = Date.now() + 50 * 60 * 1000;
      
      console.log('[apiClient] CSRF token fetched successfully:', {
        tokenLength: csrfToken?.length,
        tokenPrefix: csrfToken?.substring(0, 10) + '...',
        expiresIn: '50 minutes'
      });
      
      // Check for new token in response header
      const newToken = response.headers.get('X-New-CSRF-Token');
      if (newToken) {
        csrfToken = newToken;
        console.log('[apiClient] New CSRF token from response header');
      }
      
      return csrfToken;
    } else {
      console.error('[apiClient] Failed to fetch CSRF token:', {
        status: response.status,
        statusText: response.statusText
      });
    }
  } catch (error) {
    console.error('[apiClient] Error fetching CSRF token:', error);
  }
  return null;
}

// Function to get valid CSRF token with race condition prevention
async function getCSRFToken(accessToken: string): Promise<string | null> {
  // If token is valid, return it
  if (csrfToken && Date.now() <= csrfTokenExpiry) {
    return csrfToken;
  }
  
  // If a fetch is already in progress, wait for it
  if (csrfTokenFetchPromise) {
    return await csrfTokenFetchPromise;
  }
  
  // Start a new fetch and store the promise
  csrfTokenFetchPromise = fetchCSRFToken(accessToken).finally(() => {
    csrfTokenFetchPromise = null; // Clear the promise when done
  });
  
  return await csrfTokenFetchPromise;
}

// Fetch with retry logic and exponential backoff
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 3
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      
      // Don't retry on client errors (4xx) except 429 (rate limit)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        return response;
      }
      
      // Retry on server errors (5xx) or rate limit
      if (response.status >= 500 || response.status === 429) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      return response;
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on abort - this is intentional
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
      
      // Don't retry on DOMException for AbortError
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(Math.pow(2, i) * 1000, 10000); // Max 10 seconds
      
      if (i < maxRetries - 1) {
        // Retrying request after delay
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Request failed after retries');
}

// Generic fetch function with error handling and caching
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {},
  accessToken?: string | null,
  cacheOptions?: { ttl?: number; forceRefresh?: boolean }
): Promise<ApiResponse<T>> {
  const cacheKey = apiCache.getCacheKey(endpoint, options, accessToken);
  
  // Check cache first (only for GET requests)
  if (options.method === undefined || options.method === 'GET') {
    if (!cacheOptions?.forceRefresh) {
      const cachedData = apiCache.get<ApiResponse<T>>(cacheKey);
      if (cachedData) {
        // Cache hit
        return cachedData;
      } else {
        // Cache miss
      }
    }
  }
  
  // Create abort controller for this request
  const controller = new AbortController();
  const requestKey = `${endpoint}-${Date.now()}`;
  
  // Cancel any existing request to the same endpoint for non-GET requests
  if (options.method && options.method !== 'GET') {
    requestControllers.forEach((ctrl, key) => {
      if (key.startsWith(endpoint)) {
        ctrl.abort();
        requestControllers.delete(key);
      }
    });
  }
  
  requestControllers.set(requestKey, controller);
  
  // Add signal to options
  const fetchOptions = {
    ...options,
    signal: controller.signal
  };
  
  try {
    // Use request deduplication for GET requests
    if (options.method === undefined || options.method === 'GET') {
      return await apiCache.dedupe(cacheKey, async () => {
        const response = await performFetch<T>(endpoint, fetchOptions, accessToken);
        
        // Cache successful responses
        if (response.data && !response.error) {
          apiCache.set(cacheKey, response, cacheOptions?.ttl);
        }
        
        return response;
      });
    }
    
    // For non-GET requests, perform fetch without caching
    return await performFetch<T>(endpoint, fetchOptions, accessToken);
  } finally {
    // Clean up controller
    requestControllers.delete(requestKey);
  }
}

// Actual fetch implementation
async function performFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  accessToken?: string | null
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}/api${endpoint}`;
  
  // Log interactions API calls for debugging
  if (endpoint.includes('/users/interactions')) {
    console.log('[apiClient] Making request to:', url, {
      method: options.method || 'GET',
      hasAccessToken: !!accessToken,
      endpoint
    });
  }
  
  try {
    // Default headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
      
      // Add CSRF token for state-changing requests
      if (options.method && ['POST', 'PUT', 'DELETE'].includes(options.method)) {
        const token = await getCSRFToken(accessToken);
        if (token) {
          headers['X-CSRF-Token'] = token;
          console.log('[apiClient] CSRF token added to request:', {
            endpoint,
            method: options.method,
            tokenLength: token.length,
            tokenPrefix: token.substring(0, 10) + '...'
          });
        } else {
          console.warn('[apiClient] No CSRF token available for state-changing request:', {
            endpoint,
            method: options.method
          });
        }
      }
    }
    
    // Add cache-busting headers to prevent 304 responses for dynamic data
    if (endpoint.includes('/grants') && (options.method === undefined || options.method === 'GET')) {
      headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      headers['Pragma'] = 'no-cache';
    }
    
    const response = await fetchWithRetry(url, {
      ...options,
      headers,
      mode: 'cors',
      credentials: 'omit' // Temporarily disable credentials to test
    }, 3); // 3 retries with exponential backoff
    
    // Check for new CSRF token in response
    const newCSRFToken = response.headers.get('X-New-CSRF-Token');
    if (newCSRFToken) {
      csrfToken = newCSRFToken;
      csrfTokenExpiry = Date.now() + 50 * 60 * 1000;
    }
    
    // Handle 304 Not Modified - browser served from cache
    if (response.status === 304) {
      // For 304 responses, we need to get the data from our cache
      const cacheKey = apiCache.getCacheKey(endpoint, options, accessToken);
      const cachedData = apiCache.get<ApiResponse<T>>(cacheKey);
      if (cachedData) {
        // 304 response, serving from cache
        return cachedData;
      }
      // If no cache data available, this shouldn't happen but handle gracefully
      // 304 response but no cached data found
      return { error: 'Cached data not available' };
    }
    
    // For responses with content, parse JSON
    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      // Failed to parse JSON response
      return { error: 'Invalid response format' };
    }
    
    if (!response.ok) {
      // Log batch errors specifically
      if (endpoint.includes('/grants/batch')) {
        console.error('[apiClient] Batch request failed:', {
          endpoint,
          status: response.status,
          error: data.message || 'Unknown error',
          responseData: data
        });
      }
      return {
        error: data.message || 'An error occurred',
      };
    }
    
    // Log successful interactions responses for debugging
    if (endpoint.includes('/users/interactions') && options.method !== 'POST') {
      console.log('[apiClient] Interactions API response:', {
        endpoint,
        status: response.status,
        dataType: typeof data,
        hasData: !!data,
        dataLength: Array.isArray(data) ? data.length : 
                    (data && typeof data === 'object' && 'interactions' in data) ? 
                    (data as any).interactions?.length : 'N/A'
      });
    }
    
    // Log batch responses for debugging
    if (endpoint.includes('/grants/batch')) {
      console.log('[apiClient] Batch API response:', {
        endpoint,
        status: response.status,
        hasData: !!data,
        hasGrants: !!(data as any)?.grants,
        grantsCount: (data as any)?.grants?.length || 0
      });
    }
    
    return { data: data as T };
  } catch (error) {
    // Check if request was aborted first - this is normal during navigation
    if (error instanceof Error && error.name === 'AbortError') {
      // Request was cancelled - silently return without any logging
      return { data: undefined as any };
    }
    
    // Only log actual errors (not aborts) in development
    if (process.env.NODE_ENV === 'development') {
      
      
    }
    
    // Check if it's a network error
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      return {
        error: 'Network error: Unable to connect to the server. Please check if the backend is running on port 3001.',
      };
    }
    
    return {
      error: error instanceof Error ? error.message : 'Failed to connect to the server',
    };
  }
}

// Grants API
export const grantsApi = {
  // Get all grants with optional filters and sorting
  getGrants: async (filters?: Record<string, unknown>, sortBy?: string, accessToken?: string | null) => {
    const params = new URLSearchParams();
    
    // Add all filters to params
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    
    if (sortBy) {
      params.append('sortBy', sortBy);
    }
    
    // Add timestamp to ensure fresh data when user has interactions
    if (filters?.user_id && filters?.exclude_interaction_types) {
      params.append('_t', Date.now().toString());
    }
    
    const queryParams = params.toString() ? `?${params.toString()}` : '';
    // Final query params prepared
    
    return fetchApi<{ grants: unknown[] }>(`/grants${queryParams}`, {}, accessToken, { ttl: 5 * 60 * 1000 }); // 5 min cache
  },
  
  // Get a specific grant by ID
  getGrantById: async (id: string, accessToken?: string | null) => {
    return fetchApi<{ grant: unknown }>(`/grants/${id}`, {}, accessToken, { ttl: 10 * 60 * 1000 }); // 10 min cache
  },
  
  // Get similar grants
  getSimilarGrants: async (params: Record<string, string>, accessToken?: string | null) => {
    const queryParams = new URLSearchParams(params).toString();
    return fetchApi<{ grants: unknown[] }>(`/grants/similar?${queryParams}`, {}, accessToken, { ttl: 5 * 60 * 1000 }); // 5 min cache
  },
  
  // Search grants using semantic similarity
  searchSemantic: async (query: string, options?: { limit?: number, match_threshold?: number }, accessToken?: string | null) => {
    const params = new URLSearchParams({
      query,
      ...(options?.limit && { limit: options.limit.toString() }),
      ...(options?.match_threshold && { match_threshold: options.match_threshold.toString() })
    });
    return fetchApi<{ grants: unknown[], count: number, method: string }>(`/grants/search-semantic?${params}`, {}, accessToken, { ttl: 3 * 60 * 1000 }); // 3 min cache
  },
  
  // Search grants using pre-computed embedding
  searchByEmbedding: async (embedding: number[], options?: { limit?: number, match_threshold?: number }, accessToken?: string | null) => {
    return fetchApi<{ grants: unknown[], count: number, method: string }>(`/grants/search-by-embedding`, {
      method: 'POST',
      body: JSON.stringify({
        embedding,
        limit: options?.limit || 5,
        match_threshold: options?.match_threshold || 0.6
      })
    }, accessToken, { ttl: 60 * 60 * 1000 }); // 1 hour cache for hardcoded embeddings
  },
  
  // Get recommended grants for a user
  getRecommendedGrants: async (userId: string, options?: { exclude?: string[], limit?: number }, accessToken?: string | null) => {
    let queryParams = `?userId=${userId}`;
    
    if (options?.exclude && options.exclude.length > 0) {
      queryParams += `&exclude=${options.exclude.join(',')}`;
    }
    
    if (options?.limit) {
      queryParams += `&limit=${options.limit}`;
    }
    
    // Getting recommended grants
    
    return fetchApi<any>(`/grants/recommended${queryParams}`, {}, accessToken, { ttl: 10 * 60 * 1000 }); // 10 min cache
  },
  
  // Get multiple grants by IDs (batch fetch)
  getGrantsBatch: async (grantIds: string[], accessToken?: string | null) => {
    // Cache batch requests with a key based on sorted grant IDs for deduplication
    const sortedIds = [...grantIds].sort().join(',');
    const cacheOptions = {
      ttl: 15 * 60 * 1000, // 15 min cache for batch requests
      // Use custom key generator to cache based on grant IDs
      keyGenerator: () => `batch-${sortedIds.substring(0, 100)}` // Limit key length
    };
    return fetchApi<{ grants: unknown[] }>(`/grants/batch`, {
      method: 'POST',
      body: JSON.stringify({ grant_ids: grantIds })
    }, accessToken, cacheOptions);
  },
  
  // Get multiple grants with user interactions (batch fetch)
  getGrantsBatchWithInteractions: async (grantIds: string[], accessToken?: string | null) => {
    return fetchApi<{ results: Record<string, { grant: unknown; interaction?: unknown }> }>(`/grants/batch/interactions`, {
      method: 'POST',
      body: JSON.stringify({ grant_ids: grantIds })
    }, accessToken);
  },
  
  // Get grant metadata for filters
  getGrantMetadata: async (accessToken?: string | null) => {
    return fetchApi<{
      agencies: string[];
      subdivisions: string[];
      grantTypes: string[];
      activityCodes: string[];
      activityCategories: string[];
      announcementTypes: string[];
      applicantTypes: string[];
      dataSources: string[];
      statuses: string[];
    }>(`/grants/metadata`, {}, accessToken, { ttl: 60 * 60 * 1000 }); // 1 hour cache
  },
};

// Users API
export const usersApi = {
  // Get user preferences
  getUserPreferences: async (userId: string, accessToken?: string | null) => {
    // Getting user preferences
    // Ensure userId is passed as a query parameter as per backend expectation
    return fetchApi<any>(`/users/preferences?userId=${userId}`, {}, accessToken, { ttl: 10 * 60 * 1000 }); // 10 min cache
  },

  // Update user preferences
  updateUserPreferences: async (userId: string, preferences: any, accessToken?: string | null) => {
    // Use partial cache invalidation instead of clearing everything
    apiCache.clearPattern('/users/preferences');
    apiCache.clearPattern('/grants/recommended');
    return fetchApi<any>(`/users/preferences`, { // Removed userId from path, will be in body or query
      method: 'PUT', // Changed from POST to PUT
      body: JSON.stringify({ userId, preferences }), // Assuming userId might still be needed in body by backend
    }, accessToken);
  },

  // Delete user preferences
  deleteUserPreferences: async (userId: string, preferenceIds: string[], accessToken?: string | null) => {
    // Clear preferences cache when deleting
    apiCache.clear();
    // Assuming backend expects preferenceIds in the body for deletion
    // And userId might be in query or body depending on backend implementation
    return fetchApi<any>(`/users/preferences`, {
      method: 'DELETE',
      body: JSON.stringify({ userId, preferenceIds }),
    }, accessToken);
  },
  
  // Record user interaction with a grant
  recordInteraction: async (userId: string, grantId: string, action: 'saved' | 'applied' | 'ignored', accessToken?: string | null) => {
    // Clear only relevant caches
    apiCache.clearPattern('/users/interactions');
    apiCache.clearPattern(`/grants/${grantId}`);
    apiCache.clearPattern('/grants/recommended');
    
    return fetchApi<any>('/users/interactions', {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        grant_id: grantId,
        action,
        timestamp: new Date().toISOString(),
      }),
    }, accessToken);
  },

  // Get user interactions
  getUserInteractions: async (
    userId: string,
    action?: 'saved' | 'applied' | 'ignored',
    grantId?: string,
    additionalParams?: Record<string, any>,
    accessToken?: string | null,
    forceRefresh?: boolean
  ) => {
    let queryParams = `?userId=${userId}`;
    
    if (action) {
      queryParams += `&action=${action}`;
    }
    
    if (grantId) {
      queryParams += `&grant_id=${grantId}`;
    }
    
    // Add any additional parameters
    if (additionalParams) {
      Object.entries(additionalParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams += `&${key}=${encodeURIComponent(String(value))}`;
        }
      });
    }
    
    console.log('[apiClient] Getting user interactions:', {
      userId,
      action,
      grantId,
      forceRefresh,
      hasAccessToken: !!accessToken,
      queryParams
    });
    
    return fetchApi<{ message: string; interactions: any[]; grants?: any[] }>(`/users/interactions${queryParams}`, {}, accessToken, { 
      ttl: 5 * 60 * 1000, // 5 min cache - increased for better performance
      forceRefresh: forceRefresh 
    });
  },
  
  // Delete user interaction
  deleteInteraction: async (userId: string, grantId: string, action: 'saved' | 'applied' | 'ignored', accessToken?: string | null) => {
    return fetchApi<any>('/users/interactions/delete', {
      method: 'DELETE',
      body: JSON.stringify({
        user_id: userId,
        grant_id: grantId,
        action: action
      }),
    }, accessToken);
  },
};

// Auth API (to be implemented with Supabase)
export const authApi = {
  // Get current user
  getCurrentUser: async () => {
    // This will be implemented with Supabase Auth
    return null;
  },
};

// CSRF utilities
export const csrfUtils = {
  // Initialize CSRF token on app startup
  initialize: async (accessToken: string) => {
    return await fetchCSRFToken(accessToken);
  },
  // Clear CSRF token on logout
  clear: () => {
    csrfToken = null;
    csrfTokenExpiry = 0;
  },
  // Get current token (for debugging)
  getToken: () => csrfToken
};

// Export cache utilities for manual cache management
export const cacheUtils = {
  clearCache: () => apiCache.clear(),
  clearInteractionsCache: () => apiCache.clearPattern('/users/interactions'),
  clearGrantsCache: () => apiCache.clearPattern('/grants'),
  clearRecommendationsCache: () => apiCache.clearPattern('/grants/recommended'),
  clearPreferencesCache: () => apiCache.clearPattern('/users/preferences'),
  clearSpecificGrant: (grantId: string) => apiCache.clearPattern(`/grants/${grantId}`),
  // Force refresh helper
  forceRefresh: <T>(
    fetchFn: (...args: any[]) => Promise<ApiResponse<T>>,
    ...args: any[]
  ) => {
    const lastArg = args[args.length - 1];
    if (typeof lastArg === 'object' && lastArg !== null) {
      return fetchFn(...args.slice(0, -1), { ...lastArg, forceRefresh: true });
    }
    return fetchFn(...args, { forceRefresh: true });
  }
};

const apiClient = {
  grants: grantsApi,
  users: usersApi,
  auth: authApi,
};

// Utility to cancel all pending requests
export const cancelAllRequests = () => {
  requestControllers.forEach(controller => {
    // Provide a reason when aborting to avoid the error
    controller.abort(new DOMException('Request cancelled due to navigation', 'AbortError'));
  });
  requestControllers.clear();
};

export default apiClient;