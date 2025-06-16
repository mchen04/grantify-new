"use client";

import React, { useState, useEffect, useCallback, Suspense, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import apiClient, { grantsApi } from '@/lib/apiClient';
import { Grant, GrantFilter, SelectOption } from '@/types/grant';
import { useAuth } from '@/contexts/AuthContext';
import { useGrantInteractions } from '@/hooks/useGrantInteractions';
import { InteractionStatus } from '@/types/interaction';
import { debounce } from '@/utils/debounce';
import { cancelAllRequests } from '@/lib/apiClient';
import {
  MAX_FUNDING,
  MIN_DEADLINE_DAYS,
  MAX_DEADLINE_DAYS,
  SEARCH_GRANTS_PER_PAGE
} from '@/utils/constants';
import { DEFAULT_FILTER_STATE, validateFilterState } from '@/utils/filterPresets';
import { isAuthReady } from '@/utils/authHelpers';

// Components
import SearchBar from '@/components/features/search/SearchBar';
import GoogleAdSense from '@/components/ui/GoogleAdSense';
import { ADSENSE_CONFIG } from '@/lib/config';

import SearchFilters from '@/components/features/search/SearchFilters';
import SearchContainer from '@/components/features/search/SearchContainer';

// Dynamically import ApplyConfirmationPopup component
const DynamicApplyConfirmationPopup = dynamic(
  () => import('@/components/features/grants/ApplyConfirmationPopup'),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg p-6 animate-pulse">Loading...</div>
      </div>
    )
  }
);

// Constants
const SORT_OPTIONS: SelectOption[] = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'recent', label: 'Recently Added' },
  { value: 'deadline', label: 'Deadline (Soonest)' },
  { value: 'deadline_latest', label: 'Deadline (Latest)' },
  { value: 'amount', label: 'Funding Amount (Highest)' },
  { value: 'amount_asc', label: 'Funding Amount (Lowest)' },
  { value: 'title_asc', label: 'Title (A-Z)' },
  { value: 'title_desc', label: 'Title (Z-A)' }
];

const DEFAULT_FILTER: GrantFilter = {
  ...DEFAULT_FILTER_STATE,
  searchTerm: '',
  page: 1
} as GrantFilter;

function SearchContent() {
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const urlQuery = mounted ? (searchParams.get('q') || '') : '';
  
  // Core state
  const [grants, setGrants] = useState<Grant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filter, setFilter] = useState<GrantFilter>(() => ({
    ...DEFAULT_FILTER,
    searchTerm: ''
  }));
  const [submittedSearchTerm, setSubmittedSearchTerm] = useState<string>(''); // Track the actually submitted search term
  
  // Track interacted grant IDs locally for instant updates
  const [localInteractedIds, setLocalInteractedIds] = useState<Set<string>>(new Set());
  
  // UI state
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [showApplyConfirmation, setShowApplyConfirmation] = useState(false);
  const [pendingGrantId, setPendingGrantId] = useState<string | null>(null);
  const [pendingGrantTitle, setPendingGrantTitle] = useState<string>('');
  
  // Available filter options
  const [availableOptions, setAvailableOptions] = useState({
    dataSources: ['NIH'] as string[],
    agencies: [] as string[],
    grantTypes: [] as string[],
    activityCategories: [] as string[],
    applicantTypes: [] as string[]
  });

  // Context hooks
  const { user, session, isLoading: authLoading } = useAuth();
  
  // Grant interactions hook
  const { 
    handleSaveGrant: saveGrant,
    handleIgnoreGrant: ignoreGrant,
    handleApplyGrant: applyGrant,
    interactionLoading 
  } = useGrantInteractions({
    userId: user?.id,
    onError: setError
  });
  
  // Refs
  const searchResultsRef = React.useRef<{
    fadeAndRemoveCard: (grantId: string) => Promise<void>;
  } | null>(null);
  const isApplyingRef = React.useRef(false);
  const hasLoadedInitialRef = React.useRef(false);

  // Track if we've done the initial fetch
  const [initialFetchDone, setInitialFetchDone] = useState(false);

  // Filter update function
  const updateFilter = useCallback((key: keyof GrantFilter, value: any) => {
    setFilter(prev => ({ ...prev, [key]: value }));
  }, []);

  // Filter option handlers
  const handleFundingOptionChange = useCallback((option: 'include' | 'only', checked: boolean) => {
    const updates: Partial<GrantFilter> = {};
    
    if (option === 'only') {
      updates.onlyNoFunding = checked;
      if (checked) {
        // When showing ONLY no funding, must include null and reset ranges
        updates.includeFundingNull = true;
        updates.fundingMin = 0;
        updates.fundingMax = MAX_FUNDING;
      }
    } else {
      updates.includeFundingNull = checked;
      if (!checked && filter.onlyNoFunding) {
        // Can't exclude null if showing only null
        updates.onlyNoFunding = false;
      }
    }
    
    setFilter(prev => ({ ...prev, ...validateFilterState(updates) }));
  }, [filter.onlyNoFunding]);

  const handleDeadlineOptionChange = useCallback((option: 'include' | 'only', checked: boolean) => {
    const updates: Partial<GrantFilter> = {};
    
    if (option === 'only') {
      updates.onlyNoDeadline = checked;
      if (checked) {
        // When showing ONLY no deadline, must include null and reset ranges
        updates.includeNoDeadline = true;
        updates.deadlineMinDays = MIN_DEADLINE_DAYS;
        updates.deadlineMaxDays = MAX_DEADLINE_DAYS;
        updates.showOverdue = false; // Overdue doesn't apply to no deadline
      }
    } else {
      updates.includeNoDeadline = checked;
      if (!checked && filter.onlyNoDeadline) {
        // Can't exclude null if showing only null
        updates.onlyNoDeadline = false;
      }
    }
    
    setFilter(prev => ({ ...prev, ...validateFilterState(updates) }));
  }, [filter.onlyNoDeadline]);

  // Build API filters from state
  const buildApiFilters = useCallback(() => {
    const apiFilters: Record<string, any> = {
      limit: SEARCH_GRANTS_PER_PAGE,
      page: filter.page,
      sort_by: filter.sortBy
    };
    
    // Only include search parameter if it's not empty
    if (submittedSearchTerm && submittedSearchTerm.trim()) {
      apiFilters.search = submittedSearchTerm;
    }
    
    // Always include user_id if available to filter out interacted grants
    if (user) {
      apiFilters.user_id = user.id;
      // For search page, exclude all interaction types (saved, applied, ignored)
      // This ensures interacted grants disappear from search results
      apiFilters.exclude_interaction_types = 'saved,applied,ignored';
    }
    
    // Deadline filters
    if (filter.onlyNoDeadline) {
      apiFilters.deadline_null = true;
    } else {
      // Calculate deadline dates based on days from today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Set deadline_min based on deadlineMinDays
      // Always set deadline_min if deadlineMinDays is defined, to handle both positive and negative days
      if (filter.deadlineMinDays !== undefined) {
        const minDate = new Date();
        minDate.setDate(minDate.getDate() + filter.deadlineMinDays);
        apiFilters.deadline_min = minDate.toISOString();
      }
      
      if (filter.deadlineMaxDays < MAX_DEADLINE_DAYS) {
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
      // Always send funding range to ensure proper filtering
      apiFilters.funding_min = filter.fundingMin || 0;
      apiFilters.funding_max = filter.fundingMax || MAX_FUNDING;
      apiFilters.include_no_funding = filter.includeFundingNull;
    }
    
    
    // Total funding filters
    if (filter.totalFundingMin) {
      apiFilters.total_funding_min = filter.totalFundingMin;
    }
    if (filter.totalFundingMax) {
      apiFilters.total_funding_max = filter.totalFundingMax;
    }
    
    // Expected award count
    if (filter.expectedAwardCountMin) {
      apiFilters.expected_award_count_min = filter.expectedAwardCountMin;
    }
    if (filter.expectedAwardCountMax) {
      apiFilters.expected_award_count_max = filter.expectedAwardCountMax;
    }
    
    // Date filters
    if (filter.postDateFrom) {
      apiFilters.post_date_from = filter.postDateFrom;
    }
    if (filter.postDateTo) {
      apiFilters.post_date_to = filter.postDateTo;
    }
    if (filter.loiDueDateFrom) {
      apiFilters.loi_due_date_from = filter.loiDueDateFrom;
    }
    if (filter.loiDueDateTo) {
      apiFilters.loi_due_date_to = filter.loiDueDateTo;
    }
    if (filter.earliestStartDateFrom) {
      apiFilters.earliest_start_date_from = filter.earliestStartDateFrom;
    }
    if (filter.earliestStartDateTo) {
      apiFilters.earliest_start_date_to = filter.earliestStartDateTo;
    }
    
    // Project period
    if (filter.projectPeriodMinYears) {
      apiFilters.project_period_min_years = filter.projectPeriodMinYears;
    }
    if (filter.projectPeriodMaxYears) {
      apiFilters.project_period_max_years = filter.projectPeriodMaxYears;
    }
    
    // Agency filters
    if (filter.agencies && filter.agencies.length > 0) {
      apiFilters.agencies = filter.agencies.join(',');
    }
    if (filter.agency_subdivisions && filter.agency_subdivisions.length > 0) {
      apiFilters.agency_subdivisions = filter.agency_subdivisions.join(',');
    }
    if (filter.agency_codes && filter.agency_codes.length > 0) {
      apiFilters.agency_codes = filter.agency_codes.join(',');
    }
    
    // Grant type filters
    if (filter.grant_types && filter.grant_types.length > 0) {
      apiFilters.grant_types = filter.grant_types.join(',');
    }
    if (filter.activity_codes && filter.activity_codes.length > 0) {
      apiFilters.activity_codes = filter.activity_codes.join(',');
    }
    if (filter.activity_categories && filter.activity_categories.length > 0) {
      apiFilters.activity_categories = filter.activity_categories.join(',');
    }
    if (filter.announcement_types && filter.announcement_types.length > 0) {
      apiFilters.announcement_types = filter.announcement_types.join(',');
    }
    
    // Eligibility filters
    if (filter.eligible_applicant_types && filter.eligible_applicant_types.length > 0) {
      apiFilters.eligible_applicant_types = filter.eligible_applicant_types.join(',');
    }
    if (filter.eligibility_pi) {
      apiFilters.eligibility_pi = filter.eligibility_pi;
    }
    
    // Content filters
    if (filter.keywords && filter.keywords.length > 0) {
      apiFilters.keywords = filter.keywords.join(',');
    }
    if (filter.categories && filter.categories.length > 0) {
      apiFilters.categories = filter.categories.join(',');
    }
    
    // Other filters
    if (filter.costSharing !== null && filter.costSharing !== undefined) {
      apiFilters.cost_sharing = filter.costSharing;
    }
    if (filter.clinicalTrialAllowed !== null && filter.clinicalTrialAllowed !== undefined) {
      apiFilters.clinical_trial_allowed = filter.clinicalTrialAllowed;
    }
    if (filter.data_sources && filter.data_sources.length > 0) {
      apiFilters.data_sources = filter.data_sources.join(',');
    }
    if (filter.status) {
      apiFilters.status = filter.status;
    }
    if (filter.statuses && filter.statuses.length > 0) {
      apiFilters.statuses = filter.statuses.join(',');
    }
    
    // Show overdue grants filter
    if (filter.showOverdue !== undefined) {
      apiFilters.show_overdue = filter.showOverdue;
    }
    
    
    return apiFilters;
  }, [filter, user, submittedSearchTerm]);

  // Create a stable fetch function that doesn't depend on filter state
  const fetchGrantsCore = useCallback(async (apiFilters: any, sortBy: string, isInitialLoad = false, appendMode = false) => {
    try {
      // Only show loading state on initial load
      if (isInitialLoad) {
        setLoading(true);
      }
      setError(null);
      
      const response = await apiClient.grants.getGrants(apiFilters, sortBy, session?.access_token);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      // If no data and no error, it was likely cancelled - don't process
      if (!response.data && !response.error) {
        return;
      }
      
      if (!response.data) {
        throw new Error('No data returned from API');
      }
      
      const newGrants = response.data.grants || [];
      
      if (appendMode) {
        // In append mode, add new grants to existing ones
        setGrants((prevGrants: Grant[]) => {
          // Get current grant IDs to avoid duplicates
          const currentIds = new Set(prevGrants.map(g => g.id));
          // Filter out any duplicates from new grants
          const uniqueNewGrants = (newGrants as Grant[]).filter(g => !currentIds.has(g.id));
          // Append only unique new grants
          return [...prevGrants, ...uniqueNewGrants].slice(0, SEARCH_GRANTS_PER_PAGE);
        });
      } else {
        // Normal mode - replace all grants
        setGrants(newGrants as Grant[]);
      }
      
      // Safely extract totalCount with proper validation
      const responseData = response.data as any;
      const rawCount = responseData?.totalCount;
      const count = (typeof rawCount === 'number' && Number.isFinite(rawCount) && rawCount >= 0) ? Math.floor(rawCount) : 0;
      
      setTotalCount(count);
      // Calculate totalPages with validation
      const perPage = SEARCH_GRANTS_PER_PAGE || 6;
      const calculatedPages = count > 0 ? Math.ceil(count / perPage) : 1;
      setTotalPages(calculatedPages);
    } catch (error: any) {
      setError(`Failed to load grants: ${error.message || 'Please try again later.'}`);
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  }, [session?.access_token]);

  // Ref to track if we're currently fetching
  const fetchingRef = useRef(false);
  const [isSearching, setIsSearching] = useState(false);

  // Fetch function - accepts optional parameter to control loading spinner
  const fetchGrants = useCallback((showLoadingSpinner = true) => {
    
    // Don't fetch if we're in the middle of applying or interacting with grants
    if (isApplyingRef.current) {
      return;
    }

    if (!fetchingRef.current) {
      fetchingRef.current = true;
      // Only show searching animation if explicitly requested AND not interacting with grants
      if (showLoadingSpinner && !isApplyingRef.current) {
        setIsSearching(true);
      }
      const apiFilters = buildApiFilters();
      // Check if this is the initial load
      const isInitial = !hasLoadedInitialRef.current;
      if (isInitial) {
        hasLoadedInitialRef.current = true;
      }
      fetchGrantsCore(apiFilters, filter.sortBy, isInitial, false).finally(() => {
        fetchingRef.current = false;
        // Only clear searching state if we're not in the middle of interactions
        if (!isApplyingRef.current) {
          setIsSearching(false);
        }
      });
    } else {
    }
  }, [buildApiFilters, filter.sortBy, fetchGrantsCore]);

  // Special function to fetch grants after interaction to fill the gap
  const fetchGrantsAfterInteraction = useCallback(() => {
    if (!fetchingRef.current) {
      fetchingRef.current = true;
      const apiFilters = buildApiFilters();
      // Fetch a full page of grants but we'll handle the replacement differently
      fetchGrantsCore(apiFilters, filter.sortBy, false, false).finally(() => {
        fetchingRef.current = false;
      });
    }
  }, [buildApiFilters, filter.sortBy, fetchGrantsCore]);

  // Handle visibility change to show apply confirmation when user returns
  useEffect(() => {
    const handleVisibilityChange = () => {
      // When user returns to the tab and we have a pending apply
      if (!document.hidden && pendingGrantId && !showApplyConfirmation) {
        // Small delay to ensure browser is fully focused
        setTimeout(() => {
          setShowApplyConfirmation(true);
        }, 100);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also handle focus event as a backup
    const handleFocus = () => {
      if (pendingGrantId && !showApplyConfirmation) {
        setTimeout(() => {
          setShowApplyConfirmation(true);
        }, 100);
      }
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [pendingGrantId, showApplyConfirmation]);
  
  // Fetch available filter options
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const response = await grantsApi.getGrantMetadata();
        
        if (response.data) {
          setAvailableOptions({
            dataSources: response.data.dataSources || ['NIH'],
            agencies: response.data.agencies || [],
            grantTypes: response.data.grantTypes || [],
            activityCategories: response.data.activityCategories || [],
            applicantTypes: response.data.applicantTypes || []
          });
        } else {
          // Fallback to default values if metadata endpoint fails
          // Failed to fetch metadata, using fallback values
          setAvailableOptions({
            dataSources: ['NIH'],
            agencies: [],
            grantTypes: [],
            activityCategories: [],
            applicantTypes: []
          });
        }
      } catch (error) {
        // Error fetching filter options
        // Fallback to default values if there's an error
        setAvailableOptions({
          dataSources: ['NIH'],
          agencies: [],
          grantTypes: [],
          activityCategories: [],
          applicantTypes: []
        });
      }
    };
    
    fetchFilterOptions();
  }, []);


  const goToPage = useCallback((newPage: number) => {
    // Validate newPage is a valid number
    const validNewPage = Number.isFinite(newPage) ? newPage : 1;
    const validTotalPages = Number.isFinite(totalPages) && totalPages > 0 ? totalPages : 1;
    
    if (validNewPage >= 1 && validNewPage <= validTotalPages) {
      updateFilter('page', validNewPage);
    }
  }, [updateFilter, totalPages]);

  const resetFilters = useCallback(() => {
    setFilter({ ...DEFAULT_FILTER });
    setSubmittedSearchTerm(''); // Also reset the submitted search term
  }, []);

  // Grant interaction handlers
  const handleSaveInteraction = useCallback(async (grantId: string, status: InteractionStatus | null): Promise<void> => {
    if (!user) {
      setError('You must be logged in to perform this action.');
      return;
    }
    
    if (status === null) return;
    
    try {
      // Set flag to prevent search animation during interaction
      isApplyingRef.current = true;
      
      // Make the API call to save the grant first
      await saveGrant(grantId, false);
      
      // Only remove from UI and fetch more if successful
      setLocalInteractedIds(prev => new Set([...prev, grantId]));
      setGrants(prev => prev.filter(g => g.id !== grantId));
      setTotalCount(prev => Math.max(0, prev - 1));
      
      // Fetch more grants to fill the gap
      fetchGrantsAfterInteraction();
    } catch (error: any) {
      // Don't modify UI on error
      setError(`Failed to save grant: ${error.message || 'Please try again.'}`);
    } finally {
      // Clear the flag
      setTimeout(() => {
        isApplyingRef.current = false;
      }, 1000); // Small delay to ensure fetch completes
    }
  }, [user, saveGrant, fetchGrantsAfterInteraction]);
  
  const handleIgnoreInteraction = useCallback(async (grantId: string, status: InteractionStatus | null): Promise<void> => {
    if (!user) {
      setError('You must be logged in to perform this action.');
      return;
    }
    
    if (status === null) return;
    
    try {
      // Set flag to prevent search animation during interaction
      isApplyingRef.current = true;
      
      // Make the API call to ignore the grant first
      await ignoreGrant(grantId, false);
      
      // Only remove from UI and fetch more if successful
      setLocalInteractedIds(prev => new Set([...prev, grantId]));
      setGrants(prev => prev.filter(g => g.id !== grantId));
      setTotalCount(prev => Math.max(0, prev - 1));
      
      // Fetch more grants to fill the gap
      fetchGrantsAfterInteraction();
    } catch (error: any) {
      // Don't modify UI on error
      setError(`Failed to ignore grant: ${error.message || 'Please try again.'}`);
    } finally {
      // Clear the flag
      setTimeout(() => {
        isApplyingRef.current = false;
      }, 1000); // Small delay to ensure fetch completes
    }
  }, [user, ignoreGrant, fetchGrantsAfterInteraction]);

  const handleApplyClick = useCallback(async (grantId: string, status?: InteractionStatus | 'pending' | null): Promise<void> => {
    // Handle unapply
    if (status === null) {
      return;
    }
    
    // If status is 'pending', store the grant info but don't show dialog yet
    if (status === 'pending') {
      const grant = grants.find(g => g.id === grantId);
      if (!grant) return;
      
      // Set flag to prevent fetching during apply flow
      isApplyingRef.current = true;
      setPendingGrantId(grantId);
      setPendingGrantTitle(grant.title);
      // Don't show dialog immediately - wait for user to return
      return;
    }
  }, [grants]);
  
  const handleApplyConfirmation = useCallback(async (didApply: boolean) => {
    setShowApplyConfirmation(false);
    
    if (didApply && pendingGrantId) {
      try {
        // Make the API call to apply for the grant first
        await applyGrant(pendingGrantId, false);
        
        // Only remove from UI and fetch more if successful
        setLocalInteractedIds(prev => new Set([...prev, pendingGrantId]));
        setGrants(prev => prev.filter(g => g.id !== pendingGrantId));
        setTotalCount(prev => Math.max(0, prev - 1));
        
        // Fetch more grants to fill the gap
        fetchGrantsAfterInteraction();
      } catch (error: any) {
        // Don't modify UI on error
        setError(`Failed to apply for grant: ${error.message || 'Please try again.'}`);
      }
    }
    
    setPendingGrantId(null);
    setPendingGrantTitle('');
    
    // Clear the flag to allow fetching again
    isApplyingRef.current = false;
  }, [pendingGrantId, applyGrant, fetchGrantsAfterInteraction]);

  const handleConfirmApply = useCallback(async () => {
    if (pendingGrantId) {
      try {
        // Make the API call to apply for the grant first
        await applyGrant(pendingGrantId, false);
        
        // Only remove from UI and fetch more if successful
        setLocalInteractedIds(prev => new Set([...prev, pendingGrantId]));
        setGrants(prev => prev.filter(g => g.id !== pendingGrantId));
        setTotalCount(prev => Math.max(0, prev - 1));
        
        // Fetch more grants to fill the gap
        fetchGrantsAfterInteraction();
      } catch (error: any) {
        // Don't modify UI on error
        setError(`Failed to apply for grant: ${error.message || 'Please try again.'}`);
      }
    }
    
    setShowApplyConfirmation(false);
    setPendingGrantId(null);
    setPendingGrantTitle('');
    isApplyingRef.current = false;
  }, [pendingGrantId, applyGrant, fetchGrantsAfterInteraction]);

  const handleCancelApply = useCallback(() => {
    setShowApplyConfirmation(false);
    setPendingGrantId(null);
    setPendingGrantTitle('');
    isApplyingRef.current = false;
  }, []);

  const handleShare = useCallback(async (grantId: string): Promise<void> => {
    const shareUrl = `${window.location.origin}/grants/${grantId}`;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Check out this grant',
          text: 'I found this interesting grant opportunity',
          url: shareUrl
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(shareUrl);
        } catch (clipboardError) {
        }
      }
    }
  }, []);

  // Handle client-side mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle URL query parameter changes
  useEffect(() => {
    if (mounted && urlQuery && urlQuery !== submittedSearchTerm) {
      setFilter(prev => ({ ...prev, searchTerm: urlQuery, page: 1 }));
      setSubmittedSearchTerm(urlQuery);
    }
  }, [mounted, urlQuery, submittedSearchTerm]);

  // Effects
  useEffect(() => {
    // Only fetch grants after auth state is determined AND session is available
    if (isAuthReady(authLoading, user, session) && !initialFetchDone) {
      fetchGrants();
      setInitialFetchDone(true);
    }
  }, [fetchGrants, authLoading, initialFetchDone, user, session]);
  
  // Create a debounced fetch function for filter changes
  const debouncedFetchGrants = useMemo(
    () => debounce(() => {
      if (initialFetchDone) {
        // Cancel any pending requests before starting new ones
        cancelAllRequests();
        // Don't show loading spinner for filter changes
        fetchGrants(false);
      }
    }, 1000), // 1 second debounce delay
    [initialFetchDone, fetchGrants]
  );

  // Navigation handlers
  const handleSearch = useCallback((e: React.FormEvent | null, searchValue?: string) => {
    try {
      e?.preventDefault?.();
      const valueToSearch = searchValue ?? filter.searchTerm;
    
    // Only set searching state if not interacting with grants
    if (!isApplyingRef.current) {
      setIsSearching(true);
    }
    
    // Update search term while preserving all other filter settings
    setFilter(prev => ({
      ...prev, // Keep all existing filter settings
      searchTerm: valueToSearch,
      page: 1 // Reset to first page for new search
    }));
    setSubmittedSearchTerm(valueToSearch);
    
      // Cancel any pending debounced calls and trigger immediate search
      debouncedFetchGrants.cancel();
      fetchGrants(true); // Force show loading spinner
    } catch (error) {
      if (error instanceof Event) {
      } else {
      }
      if (!isApplyingRef.current) {
        setIsSearching(false);
      }
    }
  }, [filter, debouncedFetchGrants, fetchGrants]);

  // Fetch grants when filter changes (after initial load)
  useEffect(() => {
    if (initialFetchDone) {
      // Use debounced fetch for filter changes
      debouncedFetchGrants();
    }
    
    return () => {
      // Cancel debounced call on cleanup
      debouncedFetchGrants.cancel();
    };
  }, [filter.page, filter.sortBy, filter.fundingMin, filter.fundingMax, 
      filter.deadlineMinDays, filter.deadlineMaxDays, filter.includeNoDeadline, 
      filter.onlyNoDeadline, filter.includeFundingNull, filter.onlyNoFunding, 
      filter.showOverdue, submittedSearchTerm, initialFetchDone, debouncedFetchGrants]);
  

  // Cleanup effect for component unmount
  useEffect(() => {
    return () => {
      // Cancel all pending API requests when component unmounts
      // The API client will handle aborted requests gracefully
      cancelAllRequests();
    };
  }, []);

  useEffect(() => {
    const handleToggleFilters = () => setFilterPanelOpen(prev => !prev);
    const handleResetFilters = () => resetFilters();
    
    window.addEventListener('toggleFilters', handleToggleFilters);
    window.addEventListener('resetFilters', handleResetFilters);
    
    return () => {
      window.removeEventListener('toggleFilters', handleToggleFilters);
      window.removeEventListener('resetFilters', handleResetFilters);
    };
  }, [resetFilters]);

  return (
    <Layout>
      <div className="flex">
        {/* Left ad sidebar - increased width for 160px ads */}
        <div className="hidden lg:block w-48 flex-shrink-0 -ml-4">
          <div className="sticky top-8 space-y-8">
            <div className="ad-container">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2 text-center">Sponsored</p>
              <GoogleAdSense
                publisherId={ADSENSE_CONFIG.PUBLISHER_ID}
                adSlot="1234567890"
                adFormat="vertical"
                responsive={false}
                style={{ width: '160px', height: '600px', margin: '0 auto' }}
                className="bg-gray-50 rounded block"
                testMode={ADSENSE_CONFIG.TEST_MODE}
              />
            </div>
            <div className="ad-container">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2 text-center">Sponsored</p>
              <GoogleAdSense
                publisherId={ADSENSE_CONFIG.PUBLISHER_ID}
                adSlot="1234567891"
                adFormat="vertical"
                responsive={false}
                style={{ width: '160px', height: '600px', margin: '0 auto' }}
                className="bg-gray-50 rounded block"
                testMode={ADSENSE_CONFIG.TEST_MODE}
              />
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0 px-4">
          {/* Search and Filter Section */}
          <div className="bg-white rounded-lg shadow-md mb-8">
            <div>
              <SearchBar
                searchTerm={filter.searchTerm}
                setSearchTerm={(value) => updateFilter('searchTerm', value)}
                onSubmit={handleSearch}
                isSearching={isSearching}
              />
              
              
              {/* Advanced Filters Toggle */}
              <div className="border-t">
                <button
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                  onClick={() => setFilterPanelOpen(!filterPanelOpen)}
                >
                  <h2 className="text-lg font-medium text-gray-900">Advanced Filters</h2>
                  <span className={`transition duration-300 ${filterPanelOpen ? 'rotate-180' : ''}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </span>
                </button>
                
                {filterPanelOpen && (
                  <div className="border-t p-6">
                    <SearchFilters
                      filters={filter}
                      agencies={[]}
                      categories={[]}
                      onFiltersChange={(changes) => {
                        setFilter(prev => ({ ...prev, ...changes, page: 1 }));
                        // Cancel any pending debounced calls and trigger immediate search
                        debouncedFetchGrants.cancel();
                        // Only show searching animation if not interacting with grants
                        if (!isApplyingRef.current) {
                          setIsSearching(true);
                        }
                        fetchGrants(true);
                      }}
                      onClearFilters={() => {
                        resetFilters();
                        // Only show searching animation if not interacting with grants
                        if (!isApplyingRef.current) {
                          setIsSearching(true);
                        }
                        fetchGrants(true);
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Search Status Indicator */}
          {isSearching && !loading && (
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-blue-700 font-medium">Searching for grants...</span>
              </div>
            </div>
          )}
          
          {/* Search Results */}
          <SearchContainer
            grants={grants}
            loading={loading}
            error={error}
            totalPages={totalPages || 1}
            currentPage={filter.page || 1}
            totalCount={totalCount || 0}
            query={filter.searchTerm}
            onPageChange={goToPage}
            onGrantSave={handleSaveInteraction}
            onGrantApply={handleApplyClick}
            onGrantIgnore={handleIgnoreInteraction}
            onGrantShare={handleShare}
            showApplyConfirmation={showApplyConfirmation}
            pendingApplyGrant={pendingGrantId ? grants.find(g => g.id === pendingGrantId) || null : null}
            onConfirmApply={handleConfirmApply}
            onCancelApply={handleCancelApply}
          />
        </div>
        
        {/* Right ad sidebar - increased width for 160px ads */}
        <div className="hidden lg:block w-48 flex-shrink-0 -mr-4">
          <div className="sticky top-8 space-y-8">
            <div className="ad-container">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2 text-center">Sponsored</p>
              <GoogleAdSense
                publisherId={ADSENSE_CONFIG.PUBLISHER_ID}
                adSlot="0987654321"
                adFormat="vertical"
                responsive={false}
                style={{ width: '160px', height: '600px', margin: '0 auto' }}
                className="bg-gray-50 rounded block"
                testMode={ADSENSE_CONFIG.TEST_MODE}
              />
            </div>
            <div className="ad-container">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2 text-center">Sponsored</p>
              <GoogleAdSense
                publisherId={ADSENSE_CONFIG.PUBLISHER_ID}
                adSlot="0987654322"
                adFormat="vertical"
                responsive={false}
                style={{ width: '160px', height: '600px', margin: '0 auto' }}
                className="bg-gray-50 rounded block"
                testMode={ADSENSE_CONFIG.TEST_MODE}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Apply Confirmation Popup - Dynamically loaded */}
      {showApplyConfirmation && (
        <Suspense fallback={
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg p-6 animate-pulse">Loading...</div>
          </div>
        }>
          <DynamicApplyConfirmationPopup
            isOpen={showApplyConfirmation}
            grantTitle={pendingGrantTitle}
            onConfirm={() => handleApplyConfirmation(true)}
            onCancel={() => handleApplyConfirmation(false)}
          />
        </Suspense>
      )}
    </Layout>
  );
}

export default function Search() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchContent />
    </Suspense>
  );
}
