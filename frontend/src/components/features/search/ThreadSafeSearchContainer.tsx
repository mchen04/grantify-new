"use client";

import React, { useCallback, useRef, useEffect, useState, useMemo } from 'react';
import { Grant, GrantFilter } from '@/shared/types/grant';
import { InteractionStatus } from '@/types/interaction';
import { useAuth } from '@/contexts/AuthContext';
import { useThreadSafeSearchState } from '@/hooks/useThreadSafeSearchState';
import { useThreadSafeGrantInteractions } from '@/hooks/useThreadSafeGrantInteractions';
import { DEFAULT_FILTER_STATE } from '@/utils/filterPresets';
import { SEARCH_GRANTS_PER_PAGE } from '@/shared/constants/app';
import { mapFiltersToApi } from '@/utils/filterMapping';
import supabaseApiClient from '@/lib/supabaseApiClient';
import { useCleanupOnUnmount, useSafeTimeout } from '@/hooks/useCleanupOnUnmount';

// Import existing components
import SearchBar from './SearchBar';
import SearchFilters from './SearchFilters';
import SearchResults from './SearchResults';

interface ThreadSafeSearchContainerProps {
  initialQuery?: string;
  initialFilters?: Partial<GrantFilter>;
  className?: string;
  showFilters?: boolean;
  onGrantSelect?: (grant: Grant) => void;
  onError?: (error: string) => void;
}

interface SearchState {
  grants: Grant[];
  totalCount: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  lastSearchTimestamp: number;
}

/**
 * Thread-safe search container that prevents race conditions between
 * search operations, filter updates, URL changes, and user interactions
 */
export default function ThreadSafeSearchContainer({
  initialQuery = '',
  initialFilters = {},
  className = '',
  showFilters = true,
  onGrantSelect,
  onError
}: ThreadSafeSearchContainerProps) {
  const { user, session, isLoading: authLoading } = useAuth();

  // Cleanup management for preventing race conditions after unmount
  const cleanup = useCleanupOnUnmount();
  const { set: setSafeTimeout } = useSafeTimeout();

  // Initialize search state with thread safety
  const initialSearchFilters: GrantFilter = useMemo(() => ({
    ...DEFAULT_FILTER_STATE,
    searchTerm: initialQuery,
    ...initialFilters,
    page: 1,
    // Ensure required properties have default values
    includeFundingNull: initialFilters?.includeFundingNull ?? true,
    onlyNoFunding: initialFilters?.onlyNoFunding ?? false,
    includeNoDeadline: initialFilters?.includeNoDeadline ?? true,
    onlyNoDeadline: initialFilters?.onlyNoDeadline ?? false,
    sortBy: initialFilters?.sortBy ?? 'relevance',
  }), [initialQuery, initialFilters]);

  // Request tracking to prevent race conditions
  const currentRequestId = useRef<string | null>(null);
  const requestCounter = useRef(0);

  // Search results state
  const [searchState, setSearchState] = useState<SearchState>({
    grants: [],
    totalCount: 0,
    totalPages: 1,
    loading: false,
    error: null,
    lastSearchTimestamp: 0
  });

  // Hidden grants for optimistic UI updates
  const [hiddenGrantIds, setHiddenGrantIds] = useState<Set<string>>(new Set());

  // Execute search with race condition protection
  const executeSearch = useCallback(async (filters: GrantFilter): Promise<void> => {
    const requestId = `search_${++requestCounter.current}_${Date.now()}`;
    currentRequestId.current = requestId;

    console.log('[ThreadSafeSearchContainer] Starting search:', {
      requestId,
      filters: { ...filters, searchTerm: filters.searchTerm?.substring(0, 50) },
      userId: user?.id
    });

    try {
      // Set loading state
      setSearchState(prev => ({
        ...prev,
        loading: true,
        error: null
      }));

      // Map filters to API format
      const apiFilters = mapFiltersToApi(filters);
      apiFilters.limit = SEARCH_GRANTS_PER_PAGE;
      apiFilters.sortBy = filters.sortBy;

      // Add user context for personalization
      if (user) {
        apiFilters.user_id = user.id;
        apiFilters.exclude_interaction_types = ['saved', 'applied', 'ignored'];
      }

      console.log('[ThreadSafeSearchContainer] API request:', {
        requestId,
        apiFilters,
        hasSession: !!session?.access_token
      });

      // Execute API call using Supabase
      const response = await supabaseApiClient.grants.getGrants(apiFilters);

      // Check if this response is still current
      if (currentRequestId.current !== requestId) {
        console.log('[ThreadSafeSearchContainer] Ignoring stale response:', {
          responseRequestId: requestId,
          currentRequestId: currentRequestId.current
        });
        return;
      }

      console.log('[ThreadSafeSearchContainer] API response:', {
        requestId,
        hasData: !!response.data,
        hasError: !!response.error,
        grantCount: response.data?.grants?.length || 0,
        totalCount: response.data?.totalCount
      });

      if (response.error) {
        throw new Error(response.error);
      }

      if (!response.data) {
        throw new Error('No data returned from API');
      }

      const newGrants = response.data.grants || [];
      const totalCount = Math.max(0, response.data.totalCount || 0);
      const totalPages = Math.max(1, Math.ceil(totalCount / SEARCH_GRANTS_PER_PAGE));

      // Update search state atomically
      setSearchState({
        grants: newGrants as Grant[],
        totalCount,
        totalPages,
        loading: false,
        error: null,
        lastSearchTimestamp: Date.now()
      });

      // Clear hidden grants since we have fresh results
      setHiddenGrantIds(new Set());

      console.log('[ThreadSafeSearchContainer] Search completed successfully:', {
        requestId,
        grantCount: newGrants.length,
        totalCount,
        totalPages
      });

    } catch (error: any) {
      // Only handle error if this is still the current request
      if (currentRequestId.current === requestId) {
        const errorMessage = error.name === 'AbortError' 
          ? 'Search was cancelled'
          : `Search failed: ${error.message || 'Please try again later.'}`;

        if (error.name !== 'AbortError') {
          setSearchState(prev => ({
            ...prev,
            loading: false,
            error: errorMessage
          }));

          onError?.(errorMessage);
          console.error('[ThreadSafeSearchContainer] Search error:', error);
        }
      }
    }
  }, [user, session, onError]);

  // Thread-safe search state management
  const {
    filters,
    updateFilters,
    performSearch,
    resetFilters,
    isSearching: isSearchOperationPending,
    isFilteringPending,
    getSearchHistory
  } = useThreadSafeSearchState(initialSearchFilters, {
    onSearch: executeSearch,
    onFilterChange: (newFilters) => {
      console.log('[ThreadSafeSearchContainer] Filters changed:', newFilters);
    },
    debounceMs: 500,
    enableUrlSync: true,
    autoSearch: true
  });

  // Thread-safe grant interactions
  const {
    handleSaveGrant,
    handleApplyGrant,
    handleIgnoreGrant,
    handleShareGrant,
    isOperationPending: isInteractionPending,
    pendingOperations
  } = useThreadSafeGrantInteractions({
    onError: (message) => {
      setSearchState(prev => ({ ...prev, error: message }));
      onError?.(message);
    }
  });

  // Combined loading state
  const isLoading = searchState.loading || isSearchOperationPending || authLoading;

  // Filter visible grants
  const visibleGrants = useMemo(() => {
    return searchState.grants.filter(grant => !hiddenGrantIds.has(grant.id));
  }, [searchState.grants, hiddenGrantIds]);

  // Grant interaction handlers with optimistic updates
  const handleGrantSave = useCallback(async (grantId: string): Promise<void> => {
    if (!user) {
      onError?.('Please sign in to save grants');
      return;
    }

    try {
      // Optimistically hide the grant
      setHiddenGrantIds(prev => new Set(prev).add(grantId));

      // Execute interaction
      await handleSaveGrant(grantId);

      console.log('[ThreadSafeSearchContainer] Grant saved successfully:', grantId);

      // Refresh search results after delay to get new grants
      setSafeTimeout(() => {
        if (!isInteractionPending(grantId)) {
          performSearch().catch(console.error);
        }
      }, 1000);

    } catch (error: any) {
      // Revert optimistic update on error
      setHiddenGrantIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(grantId);
        return newSet;
      });

      const errorMessage = `Failed to save grant: ${error.message || 'Please try again.'}`;
      onError?.(errorMessage);
    }
  }, [user, handleSaveGrant, onError, isInteractionPending, performSearch]);

  const handleGrantApply = useCallback(async (grantId: string): Promise<void> => {
    if (!user) {
      onError?.('Please sign in to apply for grants');
      return;
    }

    try {
      // Optimistically hide the grant
      setHiddenGrantIds(prev => new Set(prev).add(grantId));

      // Execute interaction
      await handleApplyGrant(grantId);

      console.log('[ThreadSafeSearchContainer] Grant application recorded:', grantId);

      // Refresh search results after delay
      setSafeTimeout(() => {
        if (!isInteractionPending(grantId)) {
          performSearch().catch(console.error);
        }
      }, 1000);

    } catch (error: any) {
      // Revert optimistic update on error
      setHiddenGrantIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(grantId);
        return newSet;
      });

      const errorMessage = `Failed to record application: ${error.message || 'Please try again.'}`;
      onError?.(errorMessage);
    }
  }, [user, handleApplyGrant, onError, isInteractionPending, performSearch]);

  const handleGrantIgnore = useCallback(async (grantId: string): Promise<void> => {
    if (!user) {
      onError?.('Please sign in to ignore grants');
      return;
    }

    try {
      // Optimistically hide the grant
      setHiddenGrantIds(prev => new Set(prev).add(grantId));

      // Execute interaction
      await handleIgnoreGrant(grantId);

      console.log('[ThreadSafeSearchContainer] Grant ignored successfully:', grantId);

      // Refresh search results after delay
      setSafeTimeout(() => {
        if (!isInteractionPending(grantId)) {
          performSearch().catch(console.error);
        }
      }, 1000);

    } catch (error: any) {
      // Revert optimistic update on error
      setHiddenGrantIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(grantId);
        return newSet;
      });

      const errorMessage = `Failed to ignore grant: ${error.message || 'Please try again.'}`;
      onError?.(errorMessage);
    }
  }, [user, handleIgnoreGrant, onError, isInteractionPending, performSearch]);

  const handleGrantShare = useCallback(async (grantId: string): Promise<void> => {
    try {
      await handleShareGrant(grantId);
      console.log('[ThreadSafeSearchContainer] Grant shared successfully:', grantId);
    } catch (error: any) {
      const errorMessage = `Failed to share grant: ${error.message || 'Please try again.'}`;
      onError?.(errorMessage);
    }
  }, [handleShareGrant, onError]);

  // Search handlers
  const handleSearchSubmit = useCallback((e?: React.FormEvent, searchValue?: string) => {
    e?.preventDefault();
    
    const searchTerm = searchValue ?? filters.searchTerm;
    
    updateFilters({ 
      searchTerm, 
      page: 1 
    }, true).catch(error => {
      console.error('[ThreadSafeSearchContainer] Search submit failed:', error);
      onError?.(`Search failed: ${error.message}`);
    });
  }, [filters.searchTerm, updateFilters, onError]);

  const handleFiltersChange = useCallback((changes: Partial<GrantFilter>) => {
    updateFilters({
      ...changes,
      page: 1 // Reset to first page when filters change
    }).catch(error => {
      console.error('[ThreadSafeSearchContainer] Filter update failed:', error);
      onError?.(`Filter update failed: ${error.message}`);
    });
  }, [updateFilters, onError]);

  const handleApplyFilters = useCallback(() => {
    performSearch().catch(error => {
      console.error('[ThreadSafeSearchContainer] Apply filters failed:', error);
      onError?.(`Search failed: ${error.message}`);
    });
  }, [performSearch, onError]);

  const handleClearFilters = useCallback(() => {
    resetFilters(true).catch(error => {
      console.error('[ThreadSafeSearchContainer] Clear filters failed:', error);
      onError?.(`Clear filters failed: ${error.message}`);
    });
  }, [resetFilters, onError]);

  const handlePageChange = useCallback((newPage: number) => {
    if (newPage >= 1 && newPage <= searchState.totalPages) {
      updateFilters({ page: newPage }, true).catch(error => {
        console.error('[ThreadSafeSearchContainer] Page change failed:', error);
        onError?.(`Page change failed: ${error.message}`);
      });
    }
  }, [updateFilters, searchState.totalPages, onError]);

  // Cleanup on unmount
  useCleanupOnUnmount();

  return (
    <div className={`thread-safe-search-container ${className}`}>
      {/* Search Bar */}
      <div className="search-bar-section">
        <SearchBar
          searchTerm={filters.searchTerm}
          setSearchTerm={(value) => updateFilters({ searchTerm: value })}
          onSubmit={handleSearchSubmit}
          isSearching={isLoading}
        />
      </div>

      {/* Filters Section */}
      {showFilters && (
        <div className="filters-section">
          <SearchFilters
            filters={filters}
            agencies={[]}
            categories={[]}
            onFiltersChange={handleFiltersChange}
            onApplyFilters={handleApplyFilters}
            onClearFilters={handleClearFilters}
          />
        </div>
      )}

      {/* Search Results */}
      <div className="results-section">
        <SearchResults
          grants={visibleGrants}
          loading={isLoading}
          error={searchState.error}
          page={filters.page}
          totalPages={searchState.totalPages}
          totalCount={Math.max(0, searchState.totalCount - hiddenGrantIds.size)}
          grantsPerPage={6}
          goToPage={handlePageChange}
          onSave={handleGrantSave}
          onApply={handleGrantApply}
          onIgnore={handleGrantIgnore}
          onShare={handleGrantShare}
        />
      </div>

      {/* Debug Information (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="debug-info mt-4 p-2 bg-gray-100 rounded text-xs">
          <details>
            <summary>Search Debug Info</summary>
            <div className="mt-2 space-y-1">
              <div>Loading: {isLoading.toString()}</div>
              <div>Filtering Pending: {isFilteringPending.toString()}</div>
              <div>Hidden Grants: {hiddenGrantIds.size}</div>
              <div>Pending Operations: {pendingOperations.length}</div>
              <div>Search History: {getSearchHistory().length} entries</div>
              <div>Current Request: {currentRequestId.current}</div>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}