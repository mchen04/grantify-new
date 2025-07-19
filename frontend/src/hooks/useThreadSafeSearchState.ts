import { useCallback, useRef, useEffect } from 'react';
import { useThreadSafeUrlState } from './useThreadSafeUrlState';
import { useStateCoordinator } from './useThreadSafeState';
import { GrantFilter } from '@/shared/types/grant';
import { DEFAULT_FILTER_STATE, validateFilterState } from '@/utils/filterPresets';

interface SearchStateConfig {
  onSearch?: (filters: GrantFilter) => Promise<void>;
  onFilterChange?: (filters: GrantFilter) => void;
  debounceMs?: number;
  enableUrlSync?: boolean;
  autoSearch?: boolean;
}

interface SearchOperation {
  type: 'search' | 'filter_change' | 'reset';
  filters: GrantFilter;
  timestamp: number;
  triggeredBy: 'user' | 'url' | 'system';
}

/**
 * Thread-safe search state management with URL synchronization
 * Prevents race conditions between search operations, filter updates, and URL changes
 */
export function useThreadSafeSearchState(
  initialFilters: GrantFilter,
  config: SearchStateConfig = {}
): {
  filters: GrantFilter;
  updateFilters: (updates: Partial<GrantFilter>, triggerSearch?: boolean) => Promise<void>;
  performSearch: (filters?: GrantFilter, source?: 'user' | 'url' | 'system') => Promise<void>;
  resetFilters: (triggerSearch?: boolean) => Promise<void>;
  isSearching: boolean;
  isFilteringPending: boolean;
  getSearchHistory: () => SearchOperation[];
  getCurrentOperation: () => SearchOperation | null;
} {
  const {
    onSearch,
    onFilterChange,
    debounceMs = 500,
    enableUrlSync = true,
    autoSearch = true
  } = config;

  // URL-synchronized state
  const {
    state: filters,
    updateState: updateUrlState,
    isOperationPending: isUrlOperationPending
  } = useThreadSafeUrlState<GrantFilter>(
    initialFilters,
    {
      debounceMs,
      enableHistory: true,
      syncOnMount: true,
      ignoreKeys: ['page'], // Handle page separately to avoid unnecessary URL updates
      transformKeys: {
        // Custom transformations for complex filter types
        statuses: (value: string[]) => value.length > 0 ? value.join(',') : '',
        dataSources: (value: string[]) => value.length > 0 ? value.join(',') : '',
        agencies: (value: string[]) => value.length > 0 ? value.join(',') : '',
        grantTypes: (value: string[]) => value.length > 0 ? value.join(',') : '',
        activityCategories: (value: string[]) => value.length > 0 ? value.join(',') : '',
        applicantTypes: (value: string[]) => value.length > 0 ? value.join(',') : '',
        countries: (value: string[]) => value.length > 0 ? value.join(',') : '',
        states: (value: string[]) => value.length > 0 ? value.join(',') : ''
      },
      parseKeys: {
        // Custom parsing for complex filter types
        page: (value: string) => Math.max(1, parseInt(value) || 1),
        fundingMin: (value: string) => Math.max(0, parseInt(value) || 0),
        fundingMax: (value: string) => parseInt(value) || 1000000,
        deadlineMinDays: (value: string) => Math.max(0, parseInt(value) || 0),
        deadlineMaxDays: (value: string) => parseInt(value) || 365,
        includeFundingNull: (value: string) => value === 'true',
        onlyNoFunding: (value: string) => value === 'true',
        includeNoDeadline: (value: string) => value === 'true',
        onlyNoDeadline: (value: string) => value === 'true',
        showOverdue: (value: string) => value === 'true',
        statuses: (value: string) => value.split(',').filter(v => v.trim() !== ''),
        dataSources: (value: string) => value.split(',').filter(v => v.trim() !== ''),
        agencies: (value: string) => value.split(',').filter(v => v.trim() !== ''),
        grantTypes: (value: string) => value.split(',').filter(v => v.trim() !== ''),
        activityCategories: (value: string) => value.split(',').filter(v => v.trim() !== ''),
        applicantTypes: (value: string) => value.split(',').filter(v => v.trim() !== ''),
        countries: (value: string) => value.split(',').filter(v => v.trim() !== ''),
        states: (value: string) => value.split(',').filter(v => v.trim() !== '')
      },
      validateState: (state: GrantFilter) => {
        try {
          const validated = validateFilterState(state);
          return !!validated;
        } catch {
          return false;
        }
      },
      onStateChange: (newFilters, source) => {
        // Notify of filter changes
        onFilterChange?.(newFilters);
        
        // Auto-search on state changes from URL
        if (autoSearch && source === 'url') {
          // Debounce auto-search to prevent excessive API calls
          searchDebounceTimer.current && clearTimeout(searchDebounceTimer.current);
          searchDebounceTimer.current = setTimeout(() => {
            performSearch(newFilters, 'url').catch(console.error);
          }, debounceMs);
        }
      }
    }
  );

  // Operation coordination
  const { coordinatedOperation, isOperationActive } = useStateCoordinator();

  // Search operation tracking
  const searchHistory = useRef<SearchOperation[]>([]);
  const currentOperation = useRef<SearchOperation | null>(null);
  const searchDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  /**
   * Add search operation to history
   */
  const addToSearchHistory = useCallback((operation: SearchOperation) => {
    searchHistory.current.push(operation);
    if (searchHistory.current.length > 20) {
      searchHistory.current.shift();
    }
    currentOperation.current = operation;
  }, []);

  /**
   * Update filters with validation and optional search trigger
   */
  const updateFilters = useCallback(
    async (updates: Partial<GrantFilter>, triggerSearch = false): Promise<void> => {
      const operationId = `update_filters_${Date.now()}`;

      return coordinatedOperation(
        operationId,
        async () => {
          // Validate updates
          const currentFilters = filters;
          const candidateFilters = { ...currentFilters, ...updates };
          const validatedUpdates = validateFilterState(candidateFilters);

          if (!validatedUpdates) {
            throw new Error('Filter validation failed');
          }

          // Apply validated updates
          await updateUrlState(validatedUpdates, enableUrlSync);

          // Record operation
          addToSearchHistory({
            type: 'filter_change',
            filters: { ...currentFilters, ...validatedUpdates },
            timestamp: Date.now(),
            triggeredBy: 'user'
          });

          // Trigger search if requested
          if (triggerSearch && autoSearch) {
            await performSearch({ ...currentFilters, ...validatedUpdates }, 'user');
          }
        },
        { allowConcurrent: false, priority: 'high' }
      );
    },
    [filters, coordinatedOperation, updateUrlState, enableUrlSync, addToSearchHistory, autoSearch]
  );

  /**
   * Perform search operation with coordination
   */
  const performSearch = useCallback(
    async (searchFilters?: GrantFilter, source: 'user' | 'url' | 'system' = 'user'): Promise<void> => {
      const operationId = `search_${Date.now()}`;
      const filtersToUse = searchFilters || filters;

      return coordinatedOperation(
        operationId,
        async () => {
          // Validate filters before search
          const partialValidatedFilters = validateFilterState(filtersToUse);
          if (!partialValidatedFilters) {
            throw new Error('Cannot search with invalid filters');
          }
          
          // Ensure required properties are present for GrantFilter type
          const validatedFilters: GrantFilter = {
            searchTerm: '',
            includeFundingNull: true,
            onlyNoFunding: false,
            includeNoDeadline: true,
            onlyNoDeadline: false,
            sortBy: 'relevance',
            page: 1,
            ...partialValidatedFilters,
          };

          // Record search operation
          addToSearchHistory({
            type: 'search',
            filters: validatedFilters,
            timestamp: Date.now(),
            triggeredBy: source
          });

          // Execute search if handler provided
          if (onSearch) {
            await onSearch(validatedFilters);
          }
        },
        { allowConcurrent: false, priority: 'high' }
      );
    },
    [filters, coordinatedOperation, addToSearchHistory, onSearch]
  );

  /**
   * Reset filters to default state
   */
  const resetFilters = useCallback(
    async (triggerSearch = true): Promise<void> => {
      const operationId = `reset_filters_${Date.now()}`;

      return coordinatedOperation(
        operationId,
        async () => {
          const defaultFilters = { ...DEFAULT_FILTER_STATE } as GrantFilter;

          // Update state
          await updateUrlState(defaultFilters, enableUrlSync);

          // Record operation
          addToSearchHistory({
            type: 'reset',
            filters: defaultFilters,
            timestamp: Date.now(),
            triggeredBy: 'user'
          });

          // Trigger search if requested
          if (triggerSearch && autoSearch) {
            await performSearch(defaultFilters, 'user');
          }
        },
        { allowConcurrent: false, priority: 'high' }
      );
    },
    [coordinatedOperation, updateUrlState, enableUrlSync, addToSearchHistory, autoSearch]
  );

  /**
   * Check if search operation is active
   */
  const isSearching = isOperationActive('search');

  /**
   * Check if filter update is pending
   */
  const isFilteringPending = isOperationActive('update_filters') || isUrlOperationPending();

  /**
   * Get search operation history
   */
  const getSearchHistory = useCallback((): SearchOperation[] => {
    return [...searchHistory.current].reverse(); // Most recent first
  }, []);

  /**
   * Get current operation
   */
  const getCurrentOperation = useCallback((): SearchOperation | null => {
    return currentOperation.current;
  }, []);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceTimer.current) {
        clearTimeout(searchDebounceTimer.current);
      }
    };
  }, []);

  // Clear current operation when no operations are pending
  useEffect(() => {
    if (!isSearching && !isFilteringPending) {
      currentOperation.current = null;
    }
  }, [isSearching, isFilteringPending]);

  return {
    filters,
    updateFilters,
    performSearch,
    resetFilters,
    isSearching,
    isFilteringPending,
    getSearchHistory,
    getCurrentOperation
  };
}