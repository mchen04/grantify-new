import { useState, useEffect, useCallback } from 'react';
import { Grant, GrantFilter } from '@/types/grant';
import apiClient from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { useInteractions } from '@/contexts/InteractionContext';
import { mapFiltersToApi } from '@/utils/filterMapping';

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
 * Uses apiClient directly for all API communication
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
  
  // Get the lastInteractionTimestamp from InteractionContext to trigger refetches
  const { lastInteractionTimestamp } = useInteractions();

  const fetchGrants = useCallback(async () => {
    if (!enabled) return;
    
    try {
      setLoading(true);
      setError(null);
      
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
      
      // Make the API call using apiClient
      const response = await apiClient.grants.getGrants(apiFilters, undefined, session?.access_token);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      setGrants((response.data?.grants || []) as Grant[]);
      
      // Calculate total pages with NaN protection
      const count = (response.data as any)?.count;
      const validCount = Number.isFinite(count) && !Number.isNaN(count) && count >= 0 ? count : 0;
      const validGrantsPerPage = Number.isFinite(grantsPerPage) && !Number.isNaN(grantsPerPage) && grantsPerPage > 0 ? grantsPerPage : 10;
      const calculatedTotalPages = validCount > 0 ? Math.ceil(validCount / validGrantsPerPage) : 1;
      const safeTotalPages = Number.isFinite(calculatedTotalPages) && !Number.isNaN(calculatedTotalPages) && calculatedTotalPages > 0 ? calculatedTotalPages : 1;
      
      setTotalPages(safeTotalPages);
    } catch (error: any) {
      
      setError('Failed to load grants. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [filter, grantsPerPage, enabled, user, session?.access_token, excludeInteractedGrants]);

  // Fetch grants when dependencies change
  useEffect(() => {
    fetchGrants();
  }, [fetchGrants]);
  
  // Refetch grants when interactions change and user is logged in
  useEffect(() => {
    if (user && lastInteractionTimestamp) {
      fetchGrants();
    }
  }, [lastInteractionTimestamp, user, fetchGrants]);

  return {
    grants,
    loading,
    error,
    totalPages,
    refetch: fetchGrants
  };
}