"use client";

import React, { useEffect, useState, useRef, useCallback, useMemo, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { isAuthReady, getLoadingStateMessage } from '@/utils/authHelpers';
import { useInteractions } from '@/contexts/InteractionContext';
import { DASHBOARD_GRANTS_PER_PAGE } from '@/utils/constants';

// Import GrantCardRef type separately
import type { GrantCardRef } from '@/components/features/grants/GrantCard';

// Dynamic imports for performance optimization
const GrantCard = dynamic(
  () => import('@/components/features/grants/GrantCard'),
  { 
    ssr: false,
    loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-lg mb-4" />
  }
);

const Pagination = dynamic(
  () => import('@/components/features/dashboard/Pagination'),
  { 
    ssr: false,
    loading: () => <div className="animate-pulse bg-gray-200 h-12 rounded-lg" />
  }
);

const CollapsibleFilterPanel = dynamic(
  () => import('@/components/features/dashboard/CollapsibleFilterPanel'),
  { 
    ssr: false,
    loading: () => <div className="animate-pulse bg-gray-200 h-32 rounded-lg" />
  }
);
import { SelectOption } from '@/types/grant';
import GoogleAdSense from '@/components/ui/GoogleAdSense';
import { ADSENSE_CONFIG } from '@/lib/config';
import { preferenceCookieManager, COOKIE_NAMES } from '@/utils/cookieManager';

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

import { useFetchDashboardData } from '@/hooks/useFetchDashboardData';
import { useGrantInteractions } from '@/hooks/useGrantInteractions';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { Grant, ScoredGrant } from '@/types/grant';

const TARGET_RECOMMENDED_COUNT = 10; // Target number of recommended grants

function DashboardContent() {
  const { user, session, isLoading } = useAuth();
  const { updateUserInteraction, interactionsMap, isLoading: interactionsLoading, refetchInteractions } = useInteractions();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Remove unused dashboard context
  const selectedGrantIndex = -1;
  
  // Track grants being removed to prevent flicker
  const [removingGrantIds, setRemovingGrantIds] = useState<Set<string>>(new Set());
  const lastInteractionMapRef = useRef<Record<string, string>>({});
  
  const [activeTab, setActiveTab] = useState(() => {
    // Initialize activeTab from URL query parameter if available
    const tabParam = searchParams.get('tab');
    return tabParam && ['recommended', 'saved', 'applied', 'ignored'].includes(tabParam)
      ? tabParam
      : 'recommended';
  });
  
  const [error, setError] = useState<string | null>(null);
  
  // Remove the force refresh on mount - the InteractionContext handles this
  // This prevents unnecessary reloads when navigating back to dashboard
  
  // Use the custom hooks for data fetching and interactions
  const {
    recommendedGrants,
    savedGrants,
    appliedGrants,
    ignoredGrants,
    loading,
    error: dashboardError,
    refetch
  } = useFetchDashboardData({
    userId: user?.id,
    targetRecommendedCount: TARGET_RECOMMENDED_COUNT,
    enabled: !!user
  });

  // Auto-refresh functionality
  const {
    isActive: autoRefreshActive,
    enabled: autoRefreshEnabled,
    intervalMinutes,
    lastRefresh,
    toggleAutoRefresh,
    manualRefresh
  } = useAutoRefresh({
    userId: user?.id,
    onRefresh: async () => {
      if (user && !loading && !interactionsLoading) {
        // Manual refresh requested by user
        try {
          // Clear caches for manual refresh to get fresh data
          const { cacheUtils } = await import('@/lib/apiClient');
          cacheUtils.clearInteractionsCache();
          cacheUtils.clearRecommendationsCache();
          
          // Then refetch
          await refetch();
        } catch (error) {
          console.error('[Dashboard] Manual refresh error:', error);
        }
      }
    }
  });
  
  // Set error from dashboard hook
  useEffect(() => {
    if (dashboardError) {
      setError(dashboardError);
    }
  }, [dashboardError]);

  // Track if we're currently refreshing to prevent concurrent refreshes
  const isRefreshingRef = useRef(false);
  
  // Remove the debounced refresh function - no longer needed

  // Remove auto-refresh on focus/visibility change
  // This prevents annoying reloads when users switch tabs or come back from applying
  // The data will still be fresh due to our caching strategy
  
  // Track interaction changes to detect when grants should be hidden
  useEffect(() => {
    console.log('[Dashboard] Interaction map updated:', {
      mapSize: Object.keys(interactionsMap).length,
      sample: Object.entries(interactionsMap).slice(0, 5).map(([id, action]) => ({ id, action }))
    });
    
    // Compare current interactions with last known state
    const newRemovingIds = new Set<string>();
    const lastInteractionMap = lastInteractionMapRef.current;
    
    // Check all grants from both old and new interaction maps
    const allGrantIds = new Set([
      ...Object.keys(lastInteractionMap),
      ...Object.keys(interactionsMap)
    ]);
    
    allGrantIds.forEach(grantId => {
      const lastInteraction = lastInteractionMap[grantId];
      const currentInteraction = interactionsMap[grantId];
      
      // Add to removing list if:
      // 1. Grant had an interaction but now doesn't (being removed)
      // 2. Grant's interaction type changed (moving between tabs)
      if ((lastInteraction && !currentInteraction) ||
          (lastInteraction && currentInteraction && lastInteraction !== currentInteraction)) {
        newRemovingIds.add(grantId);
      }
    });
    
    // Update tracking ref
    lastInteractionMapRef.current = {...interactionsMap};
    
    if (newRemovingIds.size > 0) {
      // Only add grants that aren't already being removed
      setRemovingGrantIds(prev => {
        const updated = new Set(prev);
        newRemovingIds.forEach(id => {
          if (!updated.has(id)) {
            updated.add(id);
            
            // Set individual timeout for each grant
            setTimeout(() => {
              setRemovingGrantIds(current => {
                const newSet = new Set(current);
                newSet.delete(id);
                return newSet;
              });
            }, 800); // Increased delay for smoother transitions
          }
        });
        return updated;
      });
    }
  }, [interactionsMap]);
  
  // Calculate interaction counts with flicker prevention
  const [interactionCounts, setInteractionCounts] = useState({ saved: 0, applied: 0, ignored: 0 });
  const countUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentCountsRef = useRef({ saved: 0, applied: 0, ignored: 0 });
  
  useEffect(() => {
    // Clear any pending timeout
    if (countUpdateTimeoutRef.current) {
      clearTimeout(countUpdateTimeoutRef.current);
    }
    
    // Calculate new counts
    const newCounts = { saved: 0, applied: 0, ignored: 0 };
    Object.entries(interactionsMap).forEach(([, action]) => {
      if (action === 'saved') newCounts.saved++;
      else if (action === 'applied') newCounts.applied++;
      else if (action === 'ignored') newCounts.ignored++;
    });
    
    // For decreases, update immediately. For increases, debounce.
    const currentCounts = currentCountsRef.current;
    const isDecrease = newCounts.saved < currentCounts.saved || 
                      newCounts.applied < currentCounts.applied || 
                      newCounts.ignored < currentCounts.ignored;
    
    if (isDecrease) {
      // Update immediately when count decreases
      setInteractionCounts(newCounts);
      currentCountsRef.current = newCounts;
    } else if (newCounts.saved !== currentCounts.saved || 
               newCounts.applied !== currentCounts.applied || 
               newCounts.ignored !== currentCounts.ignored) {
      // Debounce increases to prevent flicker
      countUpdateTimeoutRef.current = setTimeout(() => {
        setInteractionCounts(newCounts);
        currentCountsRef.current = newCounts;
      }, 150);
    }
    
    return () => {
      if (countUpdateTimeoutRef.current) {
        clearTimeout(countUpdateTimeoutRef.current);
      }
    };
  }, [interactionsMap]);
  
  const {
    handleShareGrant
  } = useGrantInteractions({
    userId: user?.id,
    accessToken: session?.access_token,
    onError: (message) => setError(message)
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showApplyConfirmation, setShowApplyConfirmation] = useState(false);
  const [pendingGrantId, setPendingGrantId] = useState<string | null>(null);
  const [pendingGrantTitle, setPendingGrantTitle] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>(() => {
    // Load saved sort preference if available
    if (typeof window !== 'undefined' && preferenceCookieManager.isAllowed()) {
      const saved = preferenceCookieManager.getPreference(COOKIE_NAMES.DASHBOARD_LAYOUT);
      if (saved && typeof saved === 'object' && 'sortBy' in saved) {
        return (saved as any).sortBy as string;
      }
    }
    return 'deadline'; // Default
  });
  const [filterOnlyNoDeadline, setFilterOnlyNoDeadline] = useState(false);
  const [filterOnlyNoFunding, setFilterOnlyNoFunding] = useState(false);

  // Pagination state for each tab
  const [currentPage, setCurrentPage] = useState({
    recommended: 1,
    saved: 1,
    applied: 1,
    ignored: 1
  });

  // Number of grants to display per page
  const GRANTS_PER_PAGE = DASHBOARD_GRANTS_PER_PAGE;

  // Sort options for the dashboard
  const sortOptions: SelectOption[] = [
    { value: 'deadline', label: 'Deadline (Soonest)' },
    { value: 'deadline_latest', label: 'Deadline (Latest)' },
    { value: 'amount', label: 'Funding Amount (Highest)' },
    { value: 'amount_asc', label: 'Funding Amount (Lowest)' },
    { value: 'title_asc', label: 'Title (A-Z)' },
    { value: 'title_desc', label: 'Title (Z-A)' }
  ];

  // Filter and sort grants based on search term, filter options, and sort option
  const filterAndSortGrants = useCallback((grants: Grant[]) => {
    // Apply filters in sequence
    let filteredGrants = grants;

    // Apply no deadline filter if enabled
    if (filterOnlyNoDeadline) {
      filteredGrants = filteredGrants.filter(grant =>
        grant.close_date === null ||
        (typeof grant.close_date === 'string' &&
          (grant.close_date.toLowerCase().includes('open') ||
           grant.close_date.toLowerCase().includes('continuous') ||
           grant.close_date.toLowerCase().includes('ongoing')))
      );
    } else {
      // When the filter is off, exclude grants with open-ended deadlines
      filteredGrants = filteredGrants.filter(grant =>
        !(typeof grant.close_date === 'string' &&
          (grant.close_date.toLowerCase().includes('open') ||
           grant.close_date.toLowerCase().includes('continuous') ||
           grant.close_date.toLowerCase().includes('ongoing')))
      );
    }

    // Apply no funding filter if enabled
    if (filterOnlyNoFunding) {
      filteredGrants = filteredGrants.filter(grant => grant.award_ceiling === null);
    }

    // Apply search term filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filteredGrants = filteredGrants.filter(grant =>
        grant.title.toLowerCase().includes(term) ||
        grant.description_short.toLowerCase().includes(term) ||
        (grant.data_source || grant.agency_name).toLowerCase().includes(term)
      );
    }

    // Finally sort based on sortBy option
    return [...filteredGrants].sort((a, b) => {
      switch (sortBy) {
        case 'deadline':
          // Sort by deadline (soonest first)
          if (!a.close_date) return 1;
          if (!b.close_date) return -1;
          return new Date(a.close_date).getTime() - new Date(b.close_date).getTime();

        case 'deadline_latest':
          // Sort by deadline (latest first)
          if (!a.close_date) return 1;
          if (!b.close_date) return -1;
          return new Date(b.close_date).getTime() - new Date(a.close_date).getTime();

        case 'amount':
          // Sort by funding amount (highest first)
          if (a.award_ceiling === null) return 1;
          if (b.award_ceiling === null) return -1;
          return b.award_ceiling - a.award_ceiling;

        case 'amount_asc':
          // Sort by funding amount (lowest first)
          if (a.award_ceiling === null) return 1;
          if (b.award_ceiling === null) return -1;
          return a.award_ceiling - b.award_ceiling;

        case 'title_asc':
          // Sort by title (A-Z)
          return a.title.localeCompare(b.title);

        case 'title_desc':
          // Sort by title (Z-A)
          return b.title.localeCompare(a.title);

        default:
          return 0;
      }
    });
  }, [sortBy, filterOnlyNoDeadline, filterOnlyNoFunding, searchTerm]);

  // Memoize filtered and sorted grants to prevent unnecessary recalculations
  const filteredAndSortedGrants = useMemo(() => {
    // Filter out grants that are being removed to prevent flicker
    const filterRemovingGrants = (grants: Grant[]) => {
      return grants.filter(grant => !removingGrantIds.has(grant.id));
    };
    
    return {
      recommended: filterAndSortGrants(filterRemovingGrants(recommendedGrants)) as ScoredGrant[],
      saved: filterAndSortGrants(filterRemovingGrants(savedGrants)),
      applied: filterAndSortGrants(filterRemovingGrants(appliedGrants)),
      ignored: filterAndSortGrants(filterRemovingGrants(ignoredGrants))
    };
  }, [filterAndSortGrants, recommendedGrants, savedGrants, appliedGrants, ignoredGrants, removingGrantIds]);

  // Handle page change
  const handlePageChange = (tabName: string, newPage: number) => {
    setCurrentPage(prev => ({
      ...prev,
      [tabName]: newPage
    }));
  };

  // Get paginated grants for the current tab
  const getPaginatedGrants = useCallback((grants: Grant[], tabName: string) => {
    const filtered = filteredAndSortedGrants[tabName as keyof typeof filteredAndSortedGrants];
    const startIndex = (currentPage[tabName as keyof typeof currentPage] - 1) * GRANTS_PER_PAGE;
    const endIndex = startIndex + GRANTS_PER_PAGE;
    return filtered.slice(startIndex, endIndex);
  }, [filteredAndSortedGrants, currentPage, GRANTS_PER_PAGE]);

  // Get total number of pages for a tab
  const getTotalPages = useCallback((grants: Grant[], tabName: string) => {
    const filtered = filteredAndSortedGrants[tabName as keyof typeof filteredAndSortedGrants];
    return Math.ceil(filtered.length / GRANTS_PER_PAGE);
  }, [filteredAndSortedGrants, GRANTS_PER_PAGE]);

  // Memoize displayed grants to prevent unnecessary recalculations
  const displayedGrants = useMemo(() => ({
    recommended: getPaginatedGrants(recommendedGrants, 'recommended') as ScoredGrant[],
    saved: getPaginatedGrants(savedGrants, 'saved'),
    applied: getPaginatedGrants(appliedGrants, 'applied'),
    ignored: getPaginatedGrants(ignoredGrants, 'ignored')
  }), [getPaginatedGrants, recommendedGrants, savedGrants, appliedGrants, ignoredGrants]);

  // Calculate adaptive ad count based on content (conservative for 600px tall ads)
  const getAdaptiveAdCount = useCallback(() => {
    const currentGrants = filteredAndSortedGrants[activeTab as keyof typeof filteredAndSortedGrants];
    const grantCount = currentGrants.length;
    
    // No ads if less than 5 grants
    if (grantCount < 5) return 0;
    
    // Much more conservative scaling for 600px tall ads
    // Each ad takes significant vertical space, so scale carefully
    if (grantCount >= 20) return 2; // Only 2 ads for very high content
    if (grantCount >= 8) return 1;  // 1 ad for moderate content
    if (grantCount >= 5) return 1;  // 1 ad for minimum content threshold
    
    return 0; // No ads for less than 5 grants
  }, [activeTab, filteredAndSortedGrants]);

  // Memoize total pages calculation to prevent unnecessary recalculations
  const totalPages = useMemo(() => ({
    recommended: getTotalPages(recommendedGrants, 'recommended'),
    saved: getTotalPages(savedGrants, 'saved'),
    applied: getTotalPages(appliedGrants, 'applied'),
    ignored: getTotalPages(ignoredGrants, 'ignored')
  }), [getTotalPages, recommendedGrants, savedGrants, appliedGrants, ignoredGrants]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);
  
  // Update URL when active tab changes
  useEffect(() => {
    // Only update URL if user is authenticated to avoid unnecessary navigation
    if (user) {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', activeTab);
      window.history.replaceState({}, '', url.toString());
    }
  }, [activeTab, user]);


  // Use the share function from the hook

  // Reference to the card component's fadeAndRemoveCard function
  const cardRef = useRef<GrantCardRef | null>(null);

  // Function to handle apply button click and show confirmation popup
  const handleApplyClick = useCallback((grantId: string): Promise<void> => {
    return new Promise<void>(resolve => {
      // Find the grant in any of the lists
      const grant = recommendedGrants.find(g => g.id === grantId) ||
                   savedGrants.find(g => g.id === grantId) ||
                   appliedGrants.find(g => g.id === grantId) ||
                   ignoredGrants.find(g => g.id === grantId);

      if (!grant) {
        resolve();
        return;
      }

      // First open the grant link in a new tab
      window.open(`https://www.grants.gov/view-grant.html?oppId=${grantId}`, '_blank');

      // Set the pending grant ID and title
      setPendingGrantId(grantId);
      setPendingGrantTitle(grant.title);

      // Show the confirmation popup
      setShowApplyConfirmation(true);
      resolve();
    });
  }, [recommendedGrants, savedGrants, appliedGrants, ignoredGrants]);

  // Function to handle confirmation response
  const handleApplyConfirmation = async (didApply: boolean) => {
    // Hide the confirmation popup
    setShowApplyConfirmation(false);

    // If the user clicked "Yes" and we have a pending grant ID
    if (didApply && pendingGrantId) {
      // Immediately add to removingGrantIds to prevent flicker
      setRemovingGrantIds(prev => new Set([...prev, pendingGrantId]));
      
      // Fade out the card if we have a reference to it
      if (cardRef.current) {
        try {
          await cardRef.current.fadeAndRemoveCard();
        } catch {
          // Error handling for fadeAndRemoveCard
        }
      }

      // Update the database and local state
      await handleGrantInteraction(pendingGrantId, 'applied');
    }
    // If the user clicked "No", we don't need to do anything - the card stays in place

    // Reset the pending grant ID and title
    setPendingGrantId(null);
    setPendingGrantTitle('');
  };


  // Use the InteractionContext to handle grant interactions
  const handleGrantInteraction = async (grantId: string, action: 'saved' | 'applied' | 'ignored') => {
    try {
      // Find the grant in any of the lists to get its data
      const grant = recommendedGrants.find(g => g.id === grantId) ||
          savedGrants.find(g => g.id === grantId) ||
          appliedGrants.find(g => g.id === grantId) ||
          ignoredGrants.find(g => g.id === grantId);
      
      if (!grant) {
        return; // Grant not found locally
      }

      // Check if this is a toggle (removing an interaction)
      const currentInteraction = interactionsMap[grantId];
      const isRemoving = currentInteraction === action;
      
      // Immediately add to removingGrantIds to prevent flicker
      if (isRemoving || (currentInteraction && currentInteraction !== action)) {
        setRemovingGrantIds(prev => new Set([...prev, grantId]));
      }

      // Use the InteractionContext to update the interaction
      // This will handle toggling (if the same action is clicked twice)
      await updateUserInteraction(grantId, action);
      
      // No need to manually refresh as the InteractionContext will trigger updates
    } catch (error: any) {
      setError(`Failed to ${action.replace('ed', '')} grant: ${error.message || 'Please try again.'}`);
      // Remove from removingGrantIds if there was an error
      setRemovingGrantIds(prev => {
        const updated = new Set(prev);
        updated.delete(grantId);
        return updated;
      });
    }
  };


  // Show loading state while checking authentication or loading data
  // Match the search page's simpler approach - don't wait for interactions
  if (!isAuthReady(isLoading, user, session) || loading) {
    const loadingMessage = getLoadingStateMessage(isLoading, user, session) || 'Loading dashboard...';
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">{loadingMessage}</p>
          </div>
        </div>
      </Layout>
    );
  }

  // If not authenticated, don't render anything (will redirect)
  if (!user) {
    return null;
  }

  return (
    <Layout fullWidth>
      <div className="container mx-auto px-4 pt-4">
      <div className="flex flex-col md:flex-row">
        {/* Sidebar - Increased width for 300px ads */}
        <div className="md:w-80 md:pr-8 mb-6 md:mb-0">
          <h1 className="text-2xl font-bold mb-2">Your Dashboard</h1>
          <div className="mb-6">
            <p className="text-lg text-gray-900">
              Welcome back{user.email ? `, ${user.email.split('@')[0]}` : ''}!
            </p>
            <p className="text-sm text-gray-600">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            
            {/* Auto-refresh status indicator */}
            {autoRefreshEnabled && (
              <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${autoRefreshActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                    <span className="text-sm font-medium text-green-800">
                      Auto-refresh {autoRefreshActive ? 'active' : 'paused'}
                    </span>
                  </div>
                  <button
                    onClick={toggleAutoRefresh}
                    className="text-xs text-green-700 hover:text-green-900 underline"
                  >
                    {autoRefreshActive ? 'Pause' : 'Resume'}
                  </button>
                </div>
                <div className="mt-1 text-xs text-green-600">
                  Every {intervalMinutes} minute{intervalMinutes !== 1 ? 's' : ''}
                  {lastRefresh && (
                    <span className="ml-2">
                      • Last refresh: {lastRefresh.toLocaleTimeString()}
                    </span>
                  )}
                </div>
                <button
                  onClick={manualRefresh}
                  className="mt-2 text-xs bg-green-200 hover:bg-green-300 text-green-800 px-2 py-1 rounded transition-colors"
                >
                  Refresh now
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
            <div className="space-y-1 p-2">
              <button
                onClick={() => setActiveTab('recommended')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'recommended'
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {/* Display target count or actual count? Using actual for now */}
                <span>Recommended ({recommendedGrants.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('saved')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'saved'
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span>Saved ({interactionCounts.saved})</span>
              </button>

              <button
                onClick={() => setActiveTab('applied')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'applied'
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span>Applied ({interactionCounts.applied})</span>
              </button>

              <button
                onClick={() => setActiveTab('ignored')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'ignored'
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span>Ignored ({interactionCounts.ignored})</span>
              </button>
            </div>
          </div>
          
          {/* Adaptive Advertisements - High Performance 300x600 */}
          {(() => {
            const adCount = getAdaptiveAdCount();
            const adSlots = ['2468013579', '2468013580', '2468013581', '2468013582'];
            
            if (adCount === 0) return null;
            
            return (
              <div className="space-y-8">
                {Array.from({ length: adCount }, (_, index) => (
                  <div key={adSlots[index]} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <GoogleAdSense
                      publisherId={ADSENSE_CONFIG.PUBLISHER_ID}
                      adSlot={adSlots[index]}
                      adFormat="rectangle"
                      responsive={false}
                      style={{ width: '300px', height: '600px', margin: '0 auto' }}
                      className="block"
                      testMode={ADSENSE_CONFIG.TEST_MODE}
                    />
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

        {/* Main content area */}
        <div className="flex-1">
          {/* Consolidated Filter Panel */}
          <CollapsibleFilterPanel
            sortBy={sortBy}
            setSortBy={setSortBy}
            sortOptions={sortOptions}
            filterOnlyNoDeadline={filterOnlyNoDeadline}
            setFilterOnlyNoDeadline={setFilterOnlyNoDeadline}
            filterOnlyNoFunding={filterOnlyNoFunding}
            setFilterOnlyNoFunding={setFilterOnlyNoFunding}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
          />

          {/* Tab Content */}
          {activeTab === 'recommended' && (
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h2 className="text-xl font-bold mb-4">Recommended Grants</h2>
              {filteredAndSortedGrants.recommended.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 auto-rows-fr">
                    {displayedGrants.recommended.map((grant, index) => {
                      // Cast the grant to ScoredGrant to fix TypeScript error
                      const scoredGrant = grant as ScoredGrant;
                      const isSelected = index === selectedGrantIndex && activeTab === 'recommended';
                      return (
                        <div
                          key={scoredGrant.id}
                          className={`transition-all duration-200 ${
                            isSelected ? 'ring-2 ring-primary-500 ring-offset-2 rounded-lg' : ''
                          }`}
                        >
                          <GrantCard
                            ref={scoredGrant.id === pendingGrantId ? cardRef : undefined}
                            id={scoredGrant.id}
                          title={scoredGrant.title}
                          agency={scoredGrant.data_source || scoredGrant.agency_name}
                          closeDate={scoredGrant.close_date}
                          fundingAmount={scoredGrant.award_ceiling}
                          description={scoredGrant.description_short}
                          categories={scoredGrant.activity_category || []}
                          sourceUrl={scoredGrant.source_url}
                          opportunityId={scoredGrant.opportunity_id}
                          onSave={() => handleGrantInteraction(scoredGrant.id, 'saved')}
                          onApply={() => handleApplyClick(scoredGrant.id)} // Shows confirmation first
                          onIgnore={() => handleGrantInteraction(scoredGrant.id, 'ignored')}
                          onShare={() => handleShareGrant(scoredGrant.id)}
                          enableFadeAnimation={true}
                          linkParams={`?from=dashboard&tab=recommended`}
                          />
                        </div>
                      );
                    }
                    )}
                  </div>

                  {/* Pagination */}
                  <div className="mt-6">
                    <Pagination
                      currentPage={currentPage.recommended}
                      totalPages={totalPages.recommended}
                      onPageChange={(page) => handlePageChange('recommended', page)}
                    />
                  </div>
                </>
              ) : searchTerm ? (
                <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No matching grants</h3>
                  <p className="text-gray-600 mb-4">Try adjusting your search terms or filters</p>
                  <button
                    onClick={() => setSearchTerm('')}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Clear Search
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                  <svg className="w-16 h-16 text-primary-200 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No recommended grants yet</h3>
                  <p className="text-gray-600 mb-4">Check back later for personalized recommendations</p>
                  <Link
                    href="/search"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Browse Grants
                  </Link>
                </div>
              )}
            </div>
          )}

          {activeTab === 'saved' && (
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h2 className="text-xl font-bold mb-4">Saved Grants</h2>
              {filteredAndSortedGrants.saved.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 auto-rows-fr">
                    {displayedGrants.saved.map((grant) => (
                      <GrantCard
                        ref={grant.id === pendingGrantId ? cardRef : undefined}
                        key={grant.id}
                        id={grant.id}
                        title={grant.title}
                        agency={grant.data_source || grant.agency_name}
                        closeDate={grant.close_date}
                        fundingAmount={grant.award_ceiling}
                        description={grant.description_short}
                        categories={grant.activity_category || []}
                        sourceUrl={grant.source_url}
                        opportunityId={grant.opportunity_id}
                        onSave={() => handleGrantInteraction(grant.id, 'saved')} // Allows unsaving
                        onApply={() => handleApplyClick(grant.id)}
                        onIgnore={() => handleGrantInteraction(grant.id, 'ignored')}
                        onShare={() => handleShareGrant(grant.id)}
                        linkParams={`?from=dashboard&tab=saved`}
                        enableFadeAnimation={true}
                      />
                    ))}
                  </div>

                  {/* Pagination */}
                  <div className="mt-6">
                    <Pagination
                      currentPage={currentPage.saved}
                      totalPages={totalPages.saved}
                      onPageChange={(page) => handlePageChange('saved', page)}
                    />
                  </div>
                </>
              ) : searchTerm ? (
                <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No matching saved grants</h3>
                  <p className="text-gray-600 mb-4">Try adjusting your search terms or filters</p>
                  <button
                    onClick={() => setSearchTerm('')}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Clear Search
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                  <svg className="w-16 h-16 text-primary-200 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No saved grants yet</h3>
                  <p className="text-gray-600 mb-4">Grants you save will appear here</p>
                  <Link
                    href="/search"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Browse Grants
                  </Link>
                </div>
              )}
            </div>
          )}

          {activeTab === 'applied' && (
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h2 className="text-xl font-bold mb-4">Applied Grants</h2>
              {filteredAndSortedGrants.applied.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 auto-rows-fr">
                    {displayedGrants.applied.map((grant) => (
                      <GrantCard
                        key={grant.id}
                        id={grant.id}
                        title={grant.title}
                        agency={grant.data_source || grant.agency_name}
                        closeDate={grant.close_date}
                        fundingAmount={grant.award_ceiling}
                        description={grant.description_short}
                        categories={grant.activity_category || []}
                        sourceUrl={grant.source_url}
                        opportunityId={grant.opportunity_id}
                        onApply={() => handleGrantInteraction(grant.id, 'applied')} // Allows un-applying
                        onIgnore={() => handleGrantInteraction(grant.id, 'ignored')} // Allows ignoring
                        onSave={() => handleGrantInteraction(grant.id, 'saved')} // Allows saving
                        onShare={() => handleShareGrant(grant.id)}
                        linkParams={`?from=dashboard&tab=applied`}
                        enableFadeAnimation={true}
                      />
                    ))}
                  </div>

                  {/* Pagination */}
                  <div className="mt-6">
                    <Pagination
                      currentPage={currentPage.applied}
                      totalPages={totalPages.applied}
                      onPageChange={(page) => handlePageChange('applied', page)}
                    />
                  </div>
                </>
              ) : searchTerm ? (
                <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No matching applied grants</h3>
                  <p className="text-gray-600 mb-4">Try adjusting your search terms or filters</p>
                  <button
                    onClick={() => setSearchTerm('')}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Clear Search
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                  <svg className="w-16 h-16 text-primary-200 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No applied grants yet</h3>
                  <p className="text-gray-600 mb-4">Grants you've applied for will appear here</p>
                  <Link
                    href="/search"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Browse Grants
                  </Link>
                </div>
              )}
            </div>
          )}

          {activeTab === 'ignored' && (
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h2 className="text-xl font-bold mb-4">Ignored Grants</h2>
              {filteredAndSortedGrants.ignored.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 auto-rows-fr">
                    {displayedGrants.ignored.map((grant) => (
                      <GrantCard
                        ref={grant.id === pendingGrantId ? cardRef : undefined}
                        key={grant.id}
                        id={grant.id}
                        title={grant.title}
                        agency={grant.data_source || grant.agency_name}
                        closeDate={grant.close_date}
                        fundingAmount={grant.award_ceiling}
                        description={grant.description_short}
                        categories={grant.activity_category || []}
                        sourceUrl={grant.source_url}
                        opportunityId={grant.opportunity_id}
                        onSave={() => handleGrantInteraction(grant.id, 'saved')}
                        onApply={() => handleApplyClick(grant.id)}
                        onIgnore={() => handleGrantInteraction(grant.id, 'ignored')} // Allows un-ignoring
                        onShare={() => handleShareGrant(grant.id)}
                        linkParams={`?from=dashboard&tab=ignored`}
                        enableFadeAnimation={true}
                      />
                    ))}
                  </div>

                  {/* Pagination */}
                  <div className="mt-6">
                    <Pagination
                      currentPage={currentPage.ignored}
                      totalPages={totalPages.ignored}
                      onPageChange={(page) => handlePageChange('ignored', page)}
                    />
                  </div>
                </>
              ) : searchTerm ? (
                <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No matching ignored grants</h3>
                  <p className="text-gray-600 mb-4">Try adjusting your search terms or filters</p>
                  <button
                    onClick={() => setSearchTerm('')}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Clear Search
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                  <svg className="w-16 h-16 text-primary-200 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No ignored grants yet</h3>
                  <p className="text-gray-600 mb-4">Grants you choose to ignore will appear here</p>
                  <Link
                    href="/search"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Browse Grants
                  </Link>
                </div>
              )}
            </div>
          )}
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
    </div>
  </Layout>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
