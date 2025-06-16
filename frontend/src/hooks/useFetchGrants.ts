import { useState, useEffect, useCallback } from 'react';
import { Grant, GrantFilter } from '@/types/grant';
import apiClient from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { useInteractions } from '@/contexts/InteractionContext';

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
      
      // Convert filter to API-compatible format
      const apiFilters: Record<string, any> = {};
      
      // Add user ID and exclude interacted grants flag if user is logged in
      if (user) {
        apiFilters.user_id = user.id;
        
        if (excludeInteractedGrants) {
          apiFilters.exclude_interacted_grants = true;
        }
      }
      
      if (filter) {
        // Basic filters
        apiFilters.search = filter.searchTerm;
        apiFilters.limit = grantsPerPage;
        apiFilters.page = filter.page;
        
        // Data sources filter
        if (filter.data_sources && filter.data_sources.length > 0) {
          apiFilters.data_sources = filter.data_sources.join(',');
        } else if (filter.sources && filter.sources.length > 0) {
          // Legacy support for 'sources' field
          apiFilters.data_sources = filter.sources.join(',');
        }
        
        apiFilters.sort_by = filter.sortBy;
        
        // Deadline filters
        if (filter.onlyNoDeadline) {
          apiFilters.deadline_null = true;
        } else {
          // Handle both positive (future) and negative (overdue) deadline days
          if (filter.deadlineMinDays !== undefined && filter.deadlineMinDays !== 0) {
            const minDate = new Date();
            minDate.setDate(minDate.getDate() + filter.deadlineMinDays);
            apiFilters.deadline_min = minDate.toISOString();
          }
          
          if (filter.deadlineMaxDays !== undefined && filter.deadlineMaxDays < Number.MAX_SAFE_INTEGER) {
            const maxDate = new Date();
            maxDate.setDate(maxDate.getDate() + filter.deadlineMaxDays);
            apiFilters.deadline_max = maxDate.toISOString();
          }
          
          apiFilters.include_no_deadline = filter.includeNoDeadline;
        }
        
        // Funding filters
        if (filter.onlyNoFunding) {
          apiFilters.funding_null = true;
        } else {
          if (filter.fundingMin > 0) {
            apiFilters.funding_min = filter.fundingMin;
          }
          
          if (filter.fundingMax < Number.MAX_SAFE_INTEGER) {
            apiFilters.funding_max = filter.fundingMax;
          }
          
          apiFilters.include_no_funding = filter.includeFundingNull;
        }
        
        // Boolean filters - send when explicitly set to true or false, not when null/undefined
        if (filter.costSharing !== undefined && filter.costSharing !== null) {
          apiFilters.cost_sharing = filter.costSharing;
        }
        
        if (filter.clinicalTrialAllowed !== undefined && filter.clinicalTrialAllowed !== null) {
          apiFilters.clinical_trial_allowed = filter.clinicalTrialAllowed;
        }
        
        // Show overdue grants filter
        if (filter.showOverdue !== undefined) {
          apiFilters.show_overdue = filter.showOverdue;
        }
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