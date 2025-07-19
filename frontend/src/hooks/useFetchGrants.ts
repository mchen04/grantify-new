import { useState, useEffect, useCallback, useMemo } from 'react';
import { Grant, GrantFilter } from '@/shared/types/grant';
import supabaseApiClient from '@/lib/supabaseApiClient';
import { useAuth } from '@/contexts/AuthContext';
// Removed InteractionContext - now using TanStack Query for interactions
import { mapFiltersToApi } from '@/utils/filterMapping';
import { debounce } from '@/utils/debounce';
import { useCleanupOnUnmount, useAbortController } from './useCleanupOnUnmount';

interface UseFetchGrantsProps {
  filter?: GrantFilter;
  grantsPerPage?: number;
  enabled?: boolean;
  excludeInteractedGrants?: boolean;
}

interface UseFetchGrantsReturn {
  grants: Grant[];
  loading: boolean;
  error: string | null;
  totalPages: number;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for fetching grants with filtering, sorting, and pagination
 * Uses Supabase API client for all API communication
 */
export function useFetchGrants({
  filter,
  grantsPerPage = 10,
  enabled = true,
  excludeInteractedGrants = false
}: UseFetchGrantsProps): UseFetchGrantsReturn {
  const [grants, setGrants] = useState<Grant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  
  // Get the user and session from AuthContext
  const { user, session } = useAuth();
  
  // Note: No longer using InteractionContext - TanStack Query handles interactions

  // Cleanup management to prevent race conditions after unmount
  const cleanup = useCleanupOnUnmount();
  const abortController = useAbortController();
  
  // Safe state setters that only execute if component is mounted
  const safeSetGrants = cleanup.safeSetState(setGrants);
  const safeSetLoading = cleanup.safeSetState(setLoading);
  const safeSetError = cleanup.safeSetState(setError);
  const safeSetTotalPages = cleanup.safeSetState(setTotalPages);

  const fetchGrants = useCallback(async (): Promise<void> => {
    if (!enabled || !cleanup.isMounted()) return;
    
    // Use safe async execution to prevent operations after unmount
    await cleanup.safeAsync(async () => {
      try {
        safeSetLoading(true);
        safeSetError(null);
        
        // Convert filter to API-compatible format using the mapping utility
        let apiFilters: Record<string, unknown> = {};
        
        if (filter) {
          // Use the mapping utility to convert filters
          apiFilters = mapFiltersToApi(filter);
          
          // Override limit with grantsPerPage
          apiFilters.limit = grantsPerPage;
        }
        
        // Add user ID if user is logged in
        if (user) {
          apiFilters.user_id = user.id;
          // Note: excludeInteractedGrants parameter is now ignored - users should see all grants
          // This allows users to interact with grants they've previously interacted with
        }
        
        // Make the API call
        const response = await supabaseApiClient.grants.getGrants(
          apiFilters, 
          session?.access_token
        );
        
        // Check if component is still mounted before processing response
        if (!cleanup.isMounted()) {
          return;
        }
        
        if (response.error) {
          throw new Error(response.error);
        }
        
        safeSetGrants((response.data?.grants || []) as Grant[]);
        
        // Calculate total pages with NaN protection
        const count = (response.data as any)?.count;
        const validCount = Number.isFinite(count) && !Number.isNaN(count) && count >= 0 ? count : 0;
        const validGrantsPerPage = Number.isFinite(grantsPerPage) && !Number.isNaN(grantsPerPage) && grantsPerPage > 0 ? grantsPerPage : 10;
        const calculatedTotalPages = validCount > 0 ? Math.ceil(validCount / validGrantsPerPage) : 1;
        const safeTotalPages = Number.isFinite(calculatedTotalPages) && !Number.isNaN(calculatedTotalPages) && calculatedTotalPages > 0 ? calculatedTotalPages : 1;
        
        safeSetTotalPages(safeTotalPages);
      } catch (error: any) {
        // Only set error if component is still mounted and not an abort error
        if (cleanup.isMounted() && error.name !== 'AbortError') {
          safeSetError('Failed to load grants. Please try again later.');
        }
      } finally {
        // Only set loading to false if component is still mounted
        if (cleanup.isMounted()) {
          safeSetLoading(false);
        }
      }
    });
  }, [filter, grantsPerPage, enabled, user, session?.access_token, excludeInteractedGrants, cleanup, abortController, safeSetLoading, safeSetError, safeSetGrants, safeSetTotalPages]);

  // Fetch grants when dependencies change
  useEffect(() => {
    fetchGrants();
  }, [fetchGrants]);
  
  // Create a debounced version of fetchGrants to prevent race conditions
  const debouncedFetchGrants = useMemo(
    () => debounce(() => {
      if (cleanup.isMounted()) {
        fetchGrants();
      }
    }, 200), // 200ms delay to ensure backend operations complete
    [fetchGrants, cleanup]
  );

  // Note: No longer needed - TanStack Query handles interaction-based refetching automatically

  // Cleanup debounced function on unmount
  useEffect(() => {
    return () => {
      debouncedFetchGrants.cancel();
    };
  }, [debouncedFetchGrants]);

  return {
    grants,
    loading,
    error,
    totalPages,
    refetch: fetchGrants
  };
}