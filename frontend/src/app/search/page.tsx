"use client";

import React, { useState, useEffect, useCallback, Suspense, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import supabaseApiClient from '@/lib/supabaseApiClient';
import { Grant, GrantFilter, SelectOption } from '@/shared/types/grant';
import { useAuth } from '@/contexts/AuthContext';
import { InteractionStatus } from '@/types/interaction';
import { useGrants } from '@/hooks/useGrants';
import { 
  useInteractionStatus, 
  useSaveGrantMutation, 
  useApplyGrantMutation, 
  useIgnoreGrantMutation,
  useDeleteInteractionMutation 
} from '@/hooks/useInteractions';
import { debounce } from '@/utils/debounce';
import {
  MAX_FUNDING,
  MIN_DEADLINE_DAYS,
  MAX_DEADLINE_DAYS,
  SEARCH_GRANTS_PER_PAGE
} from '@/utils/constants';
import { DEFAULT_FILTER_STATE, validateFilterState } from '@/utils/filterPresets';
import { isAuthReady } from '@/utils/authHelpers';
import { mapFiltersToApi } from '@/utils/filterMapping';

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
  const [hiddenGrantIds, setHiddenGrantIds] = useState<Set<string>>(new Set());
  
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
  
  // TanStack Query hooks for interactions
  const { saveGrant } = useSaveGrantMutation();
  const { applyGrant } = useApplyGrantMutation();
  const { ignoreGrant } = useIgnoreGrantMutation();
  const deleteInteraction = useDeleteInteractionMutation();
  
  // Refs
  const searchResultsRef = React.useRef<{
    fadeAndRemoveCard: (grantId: string) => Promise<void>;
  } | null>(null);
  const isApplyingRef = React.useRef(false);
  const hasLoadedInitialRef = React.useRef(false);
  
  // Request tracking to prevent race conditions
  const currentRequestIdRef = React.useRef<string | null>(null);
  const requestCounterRef = React.useRef(0);

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

  // Stable refs for buildApiFilters to prevent recreation
  const filterRef = useRef(filter);
  const userRef = useRef(user);
  const submittedSearchTermRef = useRef(submittedSearchTerm);
  const sessionRef = useRef(session);
  const authLoadingRef = useRef(authLoading);
  
  // Update refs when values change
  filterRef.current = filter;
  userRef.current = user;
  submittedSearchTermRef.current = submittedSearchTerm;
  sessionRef.current = session;
  authLoadingRef.current = authLoading;

  // Build API filters from state - now stable
  const buildApiFilters = useCallback(() => {
    // Create a filter object with the submitted search term
    const filterWithSearch = {
      ...filterRef.current,
      searchTerm: submittedSearchTermRef.current
    };
    
    // Use the mapping utility to convert filters
    const apiFilters = mapFiltersToApi(filterWithSearch);
    
    // Override with page size for search
    apiFilters.limit = SEARCH_GRANTS_PER_PAGE;
    
    // Always include user_id if available for personalization
    if (userRef.current) {
      apiFilters.user_id = userRef.current.id;
      // Exclude grants the user has already interacted with from search results
      apiFilters.exclude_interaction_types = ['saved', 'applied', 'ignored'];
      console.log('[Search] Building API filters with user:', {
        userId: userRef.current.id,
        excludeInteractionTypes: apiFilters.exclude_interaction_types,
        allFilters: apiFilters
      });
    }
    
    console.log('[Search] buildApiFilters completed:', {
      hasUser: !!userRef.current,
      hasExcludeParam: !!apiFilters.exclude_interaction_types,
      filterCount: Object.keys(apiFilters).length,
      hasStatus: !!apiFilters.status,
      status: apiFilters.status,
      filterStatuses: filterRef.current.statuses,
      rawFilter: filterRef.current,
      mappedFilters: apiFilters
    });
    
    return apiFilters;
  }, []); // No dependencies - uses refs for stability

  // Create a stable fetch function that doesn't depend on filter state
  const fetchGrantsCore = useCallback(async (apiFilters: any, sortBy: string, isInitialLoad = false, appendMode = false) => {
    // Generate unique request ID for this call
    const requestId = `req_${++requestCounterRef.current}_${Date.now()}`;
    currentRequestIdRef.current = requestId;
    
    console.log('[Search] fetchGrantsCore called:', {
      requestId,
      apiFilters,
      isInitialLoad,
      appendMode,
      hasSession: !!session?.access_token
    });
    
    try {
      // Only show loading state on initial load
      if (isInitialLoad) {
        setLoading(true);
      }
      setError(null);
      
      const response = await supabaseApiClient.grants.getGrants(apiFilters, sessionRef.current?.access_token);
      
      // Check if this response is from the current request
      if (currentRequestIdRef.current !== requestId) {
        console.log('[Search] Ignoring stale response:', {
          responseRequestId: requestId,
          currentRequestId: currentRequestIdRef.current
        });
        return; // Ignore stale responses
      }
      
      console.log('[Search] API response:', {
        requestId,
        hasData: !!response.data,
        hasError: !!response.error,
        grantCount: response.data?.grants?.length || 0,
        totalCount: response.data?.totalCount
      });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      // If no data and no error, it was likely cancelled - don't process
      if (!response.data && !response.error) {
        console.log('[Search] Request was cancelled:', requestId);
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
      
      // Clear local tracking after successful fetch
      // The backend has now excluded these grants, so we don't need to track them locally
      setLocalInteractedIds(new Set());
      setHiddenGrantIds(new Set());
    } catch (error: any) {
      // Only set error if this is still the current request
      if (currentRequestIdRef.current === requestId) {
        // Check if it was an abort error (cancellation)
        if (error.name === 'AbortError' || (error instanceof DOMException && error.name === 'AbortError')) {
          console.log('[Search] Request was aborted:', requestId);
          return; // Don't set error for intentional cancellations
        }
        setError(`Failed to load grants: ${error.message || 'Please try again later.'}`);
      } else {
        console.log('[Search] Ignoring error from stale request:', requestId);
      }
    } finally {
      // Only clear loading if this is still the current request
      if (isInitialLoad && currentRequestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, []); // No dependencies - uses refs for session access

  // Ref to track if we're currently fetching
  const fetchingRef = useRef(false);
  const [isSearching, setIsSearching] = useState(false);

  // Fetch function - stable with no dependencies
  const fetchGrants = useCallback((showLoadingSpinner = true) => {
    console.log('[Search] fetchGrants called, user state:', {
      user: userRef.current,
      userId: userRef.current?.id,
      authLoading,
      session: !!sessionRef.current
    });
    
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
      console.log('[Search] API filters built:', apiFilters);
      // Check if this is the initial load
      const isInitial = !hasLoadedInitialRef.current;
      if (isInitial) {
        hasLoadedInitialRef.current = true;
      }
      fetchGrantsCore(apiFilters, filterRef.current.sortBy, isInitial, false).finally(() => {
        fetchingRef.current = false;
        // Only clear searching state if we're not in the middle of interactions
        if (!isApplyingRef.current) {
          setIsSearching(false);
        }
      });
    } else {
    }
  }, []); // No dependencies - uses refs for all values

  // Special function to fetch grants after interaction to fill the gap
  const fetchGrantsAfterInteraction = useCallback(() => {
    if (!fetchingRef.current) {
      fetchingRef.current = true;
      const apiFilters = buildApiFilters();
      // Fetch a full page of grants but we'll handle the replacement differently
      fetchGrantsCore(apiFilters, filterRef.current.sortBy, false, false).finally(() => {
        fetchingRef.current = false;
      });
    }
  }, []); // No dependencies - uses refs for all values

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
        const response = await supabaseApiClient.grants.getGrantMetadata();
        
        if (response.data) {
          setAvailableOptions({
            dataSources: response.data.dataSources || ['NIH'],
            agencies: response.data.organizations || [],
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
    console.log('[Search] Save interaction called:', { 
      grantId, 
      status, 
      statusType: typeof status,
      hasUser: !!user,
      userId: user?.id 
    });
    
    if (!user) {
      setError('You must be logged in to perform this action.');
      return;
    }
    
    try {
      // Set flag to prevent search animation during interaction
      isApplyingRef.current = true;
      
      // Immediately hide the grant for instant UI update
      setHiddenGrantIds(prev => new Set([...prev, grantId]));
      
      // Use TanStack Query to update the interaction
      console.log('[Search] Calling saveGrant with:', { grantId, status });
      
      if (status === null) {
        // Remove existing save interaction
        await deleteInteraction.mutateAsync({ grantId, action: 'saved' });
      } else {
        // Add save interaction
        saveGrant(grantId);
      }
      
      console.log('[Search] updateUserInteraction completed successfully');
      
      // Don't refresh immediately - the grant is already hidden locally
      // Schedule a background refresh after a short delay to sync with backend
      setTimeout(() => {
        if (!isApplyingRef.current) {
          fetchGrants(false);
        }
      }, 500);
    } catch (error: any) {
      console.error('[Search] Error in handleSaveInteraction:', error);
      setError(`Failed to save grant: ${error.message || 'Please try again.'}`);
      // Remove from hidden grants on error
      setHiddenGrantIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(grantId);
        return newSet;
      });
    } finally {
      // Clear the flag immediately
      isApplyingRef.current = false;
    }
  }, [user, saveGrant, deleteInteraction, fetchGrants]);
  
  const handleIgnoreInteraction = useCallback(async (grantId: string, status: InteractionStatus | null): Promise<void> => {
    console.log('[Search] Ignore interaction called:', { 
      grantId, 
      status, 
      statusType: typeof status,
      hasUser: !!user,
      userId: user?.id 
    });
    
    if (!user) {
      setError('You must be logged in to perform this action.');
      return;
    }
    
    try {
      // Set flag to prevent search animation during interaction
      isApplyingRef.current = true;
      
      // Immediately hide the grant for instant UI update
      setHiddenGrantIds(prev => new Set([...prev, grantId]));
      
      // Use TanStack Query to update the interaction
      console.log('[Search] Calling ignoreGrant with:', { grantId, status });
      
      if (status === null) {
        // Remove existing ignore interaction
        await deleteInteraction.mutateAsync({ grantId, action: 'ignored' });
      } else {
        // Add ignore interaction
        ignoreGrant(grantId);
      }
      
      console.log('[Search] updateUserInteraction completed successfully');
      
      // Don't refresh immediately - the grant is already hidden locally
      // Schedule a background refresh after a short delay to sync with backend
      setTimeout(() => {
        if (!isApplyingRef.current) {
          fetchGrants(false);
        }
      }, 500);
    } catch (error: any) {
      console.error('[Search] Error in handleIgnoreInteraction:', error);
      setError(`Failed to ignore grant: ${error.message || 'Please try again.'}`);
      // Remove from hidden grants on error
      setHiddenGrantIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(grantId);
        return newSet;
      });
    } finally {
      // Clear the flag immediately
      isApplyingRef.current = false;
    }
  }, [user, ignoreGrant, deleteInteraction, fetchGrants]);

  const handleApplyClick = useCallback(async (grantId: string, status?: InteractionStatus | 'pending' | null): Promise<void> => {
    console.log('[Search] Apply clicked for grant:', grantId, 'status:', status);
    
    // Handle unapply
    if (status === null) {
      // User is un-applying - remove the applied interaction
      if (!user) {
        setError('You must be logged in to perform this action.');
        return;
      }
      
      try {
        isApplyingRef.current = true;
        // Use TanStack Query to apply grant
        applyGrant(grantId);
        setLocalInteractedIds(prev => new Set([...prev, grantId]));
        fetchGrants(false);
      } catch (error: any) {
        setError(`Failed to update application: ${error.message || 'Please try again.'}`);
      } finally {
        setTimeout(() => {
          isApplyingRef.current = false;
        }, 1000);
      }
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
  }, [grants, user, applyGrant, fetchGrants]);
  
  const handleApplyConfirmation = useCallback(async (didApply: boolean) => {
    console.log('[Search] Apply confirmation:', didApply, 'for grant:', pendingGrantId);
    setShowApplyConfirmation(false);
    
    if (didApply && pendingGrantId) {
      try {
        // Use TanStack Query to apply grant
        applyGrant(pendingGrantId);
        
        // Track locally interacted grants
        setLocalInteractedIds(prev => new Set([...prev, pendingGrantId]));
        
        // Refresh search results to exclude the newly interacted grant
        fetchGrants(false);
      } catch (error: any) {
        setError(`Failed to apply for grant: ${error.message || 'Please try again.'}`);
      }
    }
    
    setPendingGrantId(null);
    setPendingGrantTitle('');
    
    // Clear the flag to allow fetching again
    isApplyingRef.current = false;
  }, [pendingGrantId, applyGrant, fetchGrants]);

  const handleConfirmApply = useCallback(async () => {
    if (pendingGrantId) {
      try {
        // Use TanStack Query to apply grant
        applyGrant(pendingGrantId);
        
        // Track locally interacted grants
        setLocalInteractedIds(prev => new Set([...prev, pendingGrantId]));
        
        // Refresh search results to exclude the newly interacted grant
        fetchGrants(false);
      } catch (error: any) {
        setError(`Failed to apply for grant: ${error.message || 'Please try again.'}`);
      }
    }
    
    setShowApplyConfirmation(false);
    setPendingGrantId(null);
    setPendingGrantTitle('');
    isApplyingRef.current = false;
  }, [pendingGrantId, applyGrant, fetchGrants]);

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

  // Effects - stable auth effect
  useEffect(() => {
    console.log('[Search] Auth effect running:', {
      authLoading,
      user: !!userRef.current,
      session: !!sessionRef.current,
      isAuthReady: isAuthReady(authLoading, userRef.current, sessionRef.current),
      initialFetchDone
    });
    
    // Only fetch grants after auth state is determined AND session is available
    if (isAuthReady(authLoading, userRef.current, sessionRef.current) && !initialFetchDone) {
      console.log('[Search] Auth ready, fetching grants...');
      // Use buildApiFilters directly to avoid fetchGrants dependency loop
      const apiFilters = buildApiFilters();
      fetchGrantsCore(apiFilters, filterRef.current.sortBy, true, false);
      setInitialFetchDone(true);
    }
  }, [authLoading, initialFetchDone]); // Only auth state dependencies
  
  // Fallback: If auth takes too long, fetch grants anyway
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!initialFetchDone && authLoading) {
        console.log('[Search] Auth timeout - fetching grants anyway');
        // Use direct approach to avoid fetchGrants dependency
        const apiFilters = buildApiFilters();
        fetchGrantsCore(apiFilters, filterRef.current.sortBy, true, false);
        setInitialFetchDone(true);
      }
    }, 3000); // 3 second timeout
    
    return () => clearTimeout(timer);
  }, [initialFetchDone, authLoading]); // Only state dependencies
  
  // Create refs to store latest values for debounced function
  const buildApiFiltersRef = useRef(buildApiFilters);
  const fetchGrantsCoreRef = useRef(fetchGrantsCore);
  
  // Update refs when values change
  buildApiFiltersRef.current = buildApiFilters;
  fetchGrantsCoreRef.current = fetchGrantsCore;

  // Create a debounced fetch function for filter changes
  const debouncedFetchGrants = useMemo(
    () => debounce(() => {
      if (initialFetchDone && !fetchingRef.current) {
        fetchingRef.current = true;
        // Direct Supabase calls don't need manual cancellation
        // Use refs to get latest values without stale closure
        const apiFilters = buildApiFiltersRef.current();
        fetchGrantsCoreRef.current(apiFilters, filterRef.current.sortBy, false, false).finally(() => {
          fetchingRef.current = false;
        });
      }
    }, 1000), // 1 second debounce delay
    [initialFetchDone] // Stable dependencies to prevent recreation
  );

  // Navigation handlers
  const handleSearch = useCallback((e: React.FormEvent | null, searchValue?: string) => {
    try {
      e?.preventDefault?.();
      const valueToSearch = searchValue ?? filterRef.current.searchTerm;
    
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
  }, [debouncedFetchGrants, fetchGrants]); // Removed filter dependency

  // Fetch grants when page, sort, or search term changes (after initial load)
  // Other filter changes now require explicit Apply button click
  useEffect(() => {
    if (initialFetchDone) {
      // Use debounced fetch for page/search/sort changes only
      debouncedFetchGrants();
    }
    
    return () => {
      // Cancel debounced call on cleanup
      debouncedFetchGrants.cancel();
    };
  }, [filter.page, filter.sortBy, submittedSearchTerm, initialFetchDone, debouncedFetchGrants]);
  

  // Cleanup effect for component unmount
  useEffect(() => {
    return () => {
      // Direct Supabase calls don't need manual cleanup
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
                        // Don't trigger immediate search - let user click Apply button for better control
                      }}
                      onApplyFilters={() => {
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
          
          {/* Search Status Indicator - Removed to avoid duplicate loading states */}
          
          {/* Search Results */}
          <SearchContainer
            grants={grants.filter(grant => {
              // Immediately filter out hidden grants
              if (hiddenGrantIds.has(grant.id)) {
                return false;
              }
              return true;
            })}
            loading={loading || isSearching}
            error={error}
            totalPages={totalPages || 1}
            currentPage={filter.page || 1}
            totalCount={Math.max(0, (totalCount || 0) - hiddenGrantIds.size)}
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
