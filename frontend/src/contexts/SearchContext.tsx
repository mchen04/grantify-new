import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode, useEffect } from 'react';
import { Grant, GrantFilter, SelectOption } from '@/types/grant';
import { useFetchGrants } from '@/hooks/useFetchGrants';
import { useGrantInteractions } from '@/hooks/useGrantInteractions';
import { useAuth } from '@/contexts/AuthContext';
import {
  MAX_FUNDING,
  MIN_DEADLINE_DAYS,
  MAX_DEADLINE_DAYS,
  SEARCH_GRANTS_PER_PAGE
} from '@/utils/constants';

// Define the shape of our context
interface SearchContextType {
  // State
  grants: Grant[];
  loading: boolean;
  error: string | null;
  totalPages: number;
  filter: GrantFilter;
  showApplyConfirmation: boolean;
  pendingGrantId: string | null;
  pendingGrantTitle: string;
  interactionLoading: boolean;
  filterPanelOpen: boolean;
  
  // Actions
  setFilterPanelOpen: (open: boolean) => void;
  updateFilter: (key: keyof GrantFilter, value: any) => void;
  handleSearch: (e: React.FormEvent) => void;
  goToPage: (newPage: number) => void;
  resetFilters: () => void;
  handleFundingOptionChange: (option: 'include' | 'only', checked: boolean) => void;
  handleDeadlineOptionChange: (option: 'include' | 'only', checked: boolean) => void;
  handleSaveGrant: (grantId: string) => Promise<void>;
  handleApplyGrant: (grantId: string) => Promise<void>;
  handleIgnoreGrant: (grantId: string) => Promise<void>;
  handleShareGrant: (grantId: string) => Promise<void>;
  handleApplyClick: (grantId: string) => Promise<void>;
  handleApplyConfirmation: (didApply: boolean) => Promise<void>;
  refetchGrants: () => Promise<void>;
  
  // Constants
  sortOptions: SelectOption[];
  sourceOptions: SelectOption[];
}

// Create the context with a default value
const SearchContext = createContext<SearchContextType | undefined>(undefined);

// Provider component
export function SearchProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  
  // Search filter state
  const [filter, setFilter] = useState<GrantFilter>({
    searchTerm: '',
    sources: ['NIH'], // Default to NIH as the primary data source
    fundingMin: 0,
    fundingMax: MAX_FUNDING,
    includeFundingNull: false,
    onlyNoFunding: false,
    deadlineMinDays: MIN_DEADLINE_DAYS,
    deadlineMaxDays: MAX_DEADLINE_DAYS,
    includeNoDeadline: false,
    onlyNoDeadline: false,
    costSharingRequired: undefined,
    sortBy: 'relevance',
    page: 1
  });
  
  // Apply confirmation state
  const [showApplyConfirmation, setShowApplyConfirmation] = useState(false);
  const [pendingGrantId, setPendingGrantId] = useState<string | null>(null);
  const [pendingGrantTitle, setPendingGrantTitle] = useState<string>('');
  
  // UI state
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  
  // Check if we're on the search page - if so, disable SearchProvider's API calls
  const isSearchPage = typeof window !== 'undefined' && window.location.pathname === '/search';
  
  // Fetch grants based on filter - disabled on search page
  const {
    grants,
    loading,
    error,
    totalPages,
    refetch: refetchGrants
  } = useFetchGrants({
    filter,
    grantsPerPage: SEARCH_GRANTS_PER_PAGE,
    enabled: !isSearchPage // Disable on search page
  });
  
  // Grant interactions
  const {
    interactionLoading,
    handleSaveGrant,
    handleApplyGrant,
    handleIgnoreGrant,
    handleShareGrant
  } = useGrantInteractions({
    userId: user?.id,
    onError: () => {}
  });
  
  // Options for dropdowns
  const sourceOptions: SelectOption[] = useMemo(() => [
    { value: 'NIH', label: 'NIH' }
    // More sources can be added here in the future
  ], []);

  
  const sortOptions: SelectOption[] = useMemo(() => [
    { value: 'relevance', label: 'Relevance' },
    { value: 'recent', label: 'Recently Added' },
    { value: 'deadline', label: 'Deadline (Soonest)' },
    { value: 'deadline_latest', label: 'Deadline (Latest)' },
    { value: 'amount', label: 'Funding Amount (Highest)' },
    { value: 'amount_asc', label: 'Funding Amount (Lowest)' },
    { value: 'title_asc', label: 'Title (A-Z)' },
    { value: 'title_desc', label: 'Title (Z-A)' },
    { value: 'available', label: 'Available Grants' },
    { value: 'popular', label: 'Popular Grants' }
  ], []);
  
  // Memoize the filter update function
  const updateFilter = useCallback((key: keyof GrantFilter, value: any) => {
    setFilter(prev => ({ ...prev, [key]: value }));
  }, []);
  
  // Handle funding option changes
  const handleFundingOptionChange = useCallback((option: 'include' | 'only', checked: boolean) => {
    if (option === 'only') {
      updateFilter('onlyNoFunding', checked);
      if (checked) {
        updateFilter('includeFundingNull', true);
        updateFilter('fundingMin', 0);
        updateFilter('fundingMax', MAX_FUNDING);
      }
    } else {
      updateFilter('includeFundingNull', checked);
      if (checked && filter.onlyNoFunding) {
        updateFilter('onlyNoFunding', false);
      }
    }
  }, [updateFilter, filter.onlyNoFunding]);
  
  // Handle deadline option changes
  const handleDeadlineOptionChange = useCallback((option: 'include' | 'only', checked: boolean) => {
    if (option === 'only') {
      updateFilter('onlyNoDeadline', checked);
      if (checked) {
        updateFilter('includeNoDeadline', true);
        updateFilter('deadlineMinDays', MIN_DEADLINE_DAYS);
        updateFilter('deadlineMaxDays', MAX_DEADLINE_DAYS);
      }
    } else {
      updateFilter('includeNoDeadline', checked);
      if (checked && filter.onlyNoDeadline) {
        updateFilter('onlyNoDeadline', false);
      }
    }
  }, [updateFilter, filter.onlyNoDeadline]);
  
  // Memoize the search handler to avoid recreating on every render
  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    updateFilter('page', 1);
  }, [updateFilter]);
  
  // Memoize the pagination handler
  const goToPage = useCallback((newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      updateFilter('page', newPage);
    }
  }, [updateFilter, totalPages]);
  
  // Memoize the filter reset function
  const resetFilters = useCallback(() => {
    setFilter({
      searchTerm: '',
      sources: ['NIH'], // Keep the default source
      fundingMin: 0,
      fundingMax: MAX_FUNDING,
      includeFundingNull: true,
      onlyNoFunding: false,
      deadlineMinDays: MIN_DEADLINE_DAYS,
      deadlineMaxDays: MAX_DEADLINE_DAYS,
      includeNoDeadline: true,
      onlyNoDeadline: false,
      costSharingRequired: undefined,
      sortBy: 'relevance',
      page: 1
    });
  }, []);
  
  // Function to handle apply button click and show confirmation popup
  const handleApplyClick = useCallback((grantId: string): Promise<void> => {
    return new Promise<void>(resolve => {
      // Find the grant in the list
      const grant = grants.find(g => g.id === grantId);
      
      if (!grant) {
        resolve();
        return;
      }
      
      // Set the pending grant ID and title
      setPendingGrantId(grantId);
      setPendingGrantTitle(grant.title);
      
      // Show the confirmation popup
      setShowApplyConfirmation(true);
      resolve();
    });
  }, [grants]);
  
  // Function to handle confirmation response
  const handleApplyConfirmation = useCallback(async (didApply: boolean) => {
    // Hide the confirmation popup
    setShowApplyConfirmation(false);
    
    // If the user clicked "Yes" and we have a pending grant ID
    if (didApply && pendingGrantId) {
      // Update the database and local state
      await handleApplyGrant(pendingGrantId, true); // true = remove from UI
    }
    
    // Reset the pending grant ID and title
    setPendingGrantId(null);
    setPendingGrantTitle('');
  }, [pendingGrantId, handleApplyGrant]);
  
  
  // Keyboard shortcut event listeners
  // Stabilize event handlers to prevent frequent re-registration
  const handleToggleFilters = useCallback(() => {
    setFilterPanelOpen(prev => !prev);
  }, []);
  
  const handleResetFilters = useCallback(() => {
    resetFilters();
  }, [resetFilters]);

  useEffect(() => {
    window.addEventListener('toggleFilters', handleToggleFilters);
    window.addEventListener('resetFilters', handleResetFilters);
    
    return () => {
      window.removeEventListener('toggleFilters', handleToggleFilters);
      window.removeEventListener('resetFilters', handleResetFilters);
    };
  }, [handleToggleFilters, handleResetFilters]);
  
  // Combine all values and functions into the context value
  const contextValue = useMemo(() => ({
    grants: isSearchPage ? [] : grants, // Return empty array on search page
    loading: isSearchPage ? false : loading, // Not loading on search page
    error: isSearchPage ? null : error, // No error on search page
    totalPages: isSearchPage ? 1 : totalPages, // Default total pages on search page
    filter,
    showApplyConfirmation,
    pendingGrantId,
    pendingGrantTitle,
    interactionLoading,
    filterPanelOpen,
    setFilterPanelOpen,
    updateFilter,
    handleSearch,
    goToPage,
    resetFilters,
    handleFundingOptionChange,
    handleDeadlineOptionChange,
    handleSaveGrant,
    handleApplyGrant,
    handleIgnoreGrant,
    handleShareGrant,
    handleApplyClick,
    handleApplyConfirmation,
    refetchGrants: isSearchPage ? async () => {} : refetchGrants, // No-op on search page
    sortOptions,
    sourceOptions
  }), [
    grants,
    loading,
    error,
    totalPages,
    filter,
    showApplyConfirmation,
    pendingGrantId,
    pendingGrantTitle,
    interactionLoading,
    filterPanelOpen,
    setFilterPanelOpen,
    updateFilter,
    handleSearch,
    goToPage,
    resetFilters,
    handleFundingOptionChange,
    handleDeadlineOptionChange,
    handleSaveGrant,
    handleApplyGrant,
    handleIgnoreGrant,
    handleShareGrant,
    handleApplyClick,
    handleApplyConfirmation,
    refetchGrants,
    sortOptions,
    sourceOptions
  ]);
  
  return (
    <SearchContext.Provider value={contextValue}>
      {children}
    </SearchContext.Provider>
  );
}

// Custom hook to use the search context
export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}