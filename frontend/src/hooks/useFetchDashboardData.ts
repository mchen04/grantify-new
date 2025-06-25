import { useState, useEffect, useCallback, useRef } from 'react';
import { debounce } from '../utils/debounce';
import { useMemo } from 'react';
import apiClient from '@/lib/apiClient';
import { Grant, ScoredGrant } from '@/types/grant';
import { UserPreferences } from '@/types/user';
import { useAuth } from '@/contexts/AuthContext';
import { useInteractions } from '@/contexts/InteractionContext';
import { InteractionStatus } from '@/types/interaction';
import supabase from '@/lib/supabaseClient';

interface UseFetchDashboardDataProps {
  targetRecommendedCount?: number;
  enabled?: boolean;
  userId?: string; // Add userId parameter
}

interface UseFetchDashboardDataReturn {
  recommendedGrants: ScoredGrant[];
  savedGrants: Grant[];
  appliedGrants: Grant[];
  ignoredGrants: Grant[];
  userPreferences: UserPreferences | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  fetchReplacementRecommendations: () => Promise<void>;
}

/**
 * Custom hook for fetching all dashboard data including recommended, saved, applied, and ignored grants
 */
export function useFetchDashboardData({
  targetRecommendedCount = 10,
  enabled = true,
  userId
}: UseFetchDashboardDataProps): UseFetchDashboardDataReturn {
  const { user } = useAuth();
  const currentUserId = userId || user?.id;
  const {
    interactionsMap,
    isLoading: interactionsLoading,
    lastInteractionTimestamp
  } = useInteractions();
  
  const [recommendedGrants, setRecommendedGrants] = useState<ScoredGrant[]>([]);
  const [savedGrants, setSavedGrants] = useState<Grant[]>([]);
  const [appliedGrants, setAppliedGrants] = useState<Grant[]>([]);
  const [ignoredGrants, setIgnoredGrants] = useState<Grant[]>([]);
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFetchingReplacements, setIsFetchingReplacements] = useState(false);
  const [grantDetailsMap, setGrantDetailsMap] = useState<Record<string, Grant>>({});
  const grantDetailsMapRef = useRef<Record<string, Grant>>({});
  const fetchingGrantsRef = useRef<Set<string>>(new Set());
  
  // Add ref to prevent concurrent fetchGrantDetails calls
  const activeFetchPromiseRef = useRef<Promise<Record<string, Grant>> | null>(null);

  // Keep the ref in sync with the state
  useEffect(() => {
    grantDetailsMapRef.current = grantDetailsMap;
  }, [grantDetailsMap]);

  // Function to fetch grant details for a list of grant IDs
  const fetchGrantDetails = useCallback(async (grantIds: string[]): Promise<Record<string, Grant>> => {
    if (!currentUserId || grantIds.length === 0) {
      console.log('[fetchGrantDetails] No grant IDs to fetch or no user');
      return grantDetailsMapRef.current;
    }
    
    // If there's already an active fetch in progress, wait for it to complete
    if (activeFetchPromiseRef.current) {
      console.log('[fetchGrantDetails] Waiting for existing fetch to complete...');
      try {
        const result = await activeFetchPromiseRef.current;
        // Check if the current request is satisfied by the previous fetch
        const missingIds = grantIds.filter(id => !result[id]);
        if (missingIds.length === 0) {
          console.log('[fetchGrantDetails] All requested grants found in previous fetch result');
          return result;
        }
        console.log('[fetchGrantDetails] Previous fetch completed, but still missing', missingIds.length, 'grants');
      } catch (e) {
        // Previous fetch failed, continue with new fetch
        console.log('[fetchGrantDetails] Previous fetch failed, continuing with new fetch');
      }
    }
    
    console.log('[fetchGrantDetails] Fetching details for', grantIds.length, 'grants');
    
    // Create and store the promise for this fetch operation with proper synchronization
    const fetchPromise = (async () => {
      try {
      // Get session for API calls
      const { data, error: sessionError } = await supabase.auth.getSession();
      const session = data?.session;
      
      if (sessionError || !session) {
        // Error fetching session for grant details
        return {};
      }
      
      const accessToken = session.access_token;
      
      // Use the ref to access the current grantDetailsMap
      const currentGrantDetailsMap = grantDetailsMapRef.current;

      // Filter out grant IDs we already have details for and ensure uniqueness
      const uniqueGrantIds = [...new Set(grantIds)];
      const missingGrantIds = uniqueGrantIds.filter(id => 
        !currentGrantDetailsMap[id] && !fetchingGrantsRef.current.has(id)
      );
      
      console.log('[fetchGrantDetails] Missing grant IDs:', missingGrantIds.length, 'of', uniqueGrantIds.length, {
        totalRequested: grantIds.length,
        uniqueRequested: uniqueGrantIds.length,
        cachedCount: Object.keys(currentGrantDetailsMap).length,
        currentlyFetching: fetchingGrantsRef.current.size,
        missingCount: missingGrantIds.length,
        firstMissingIds: missingGrantIds.slice(0, 5),
        uniqueMissingCount: new Set(missingGrantIds).size,
        duplicatesRemoved: grantIds.length - uniqueGrantIds.length
      });
      
      if (missingGrantIds.length === 0) {
        console.log('[fetchGrantDetails] All grants already cached or being fetched');
        return currentGrantDetailsMap; // We already have all the grant details
      }
      
      // Mark these grants as being fetched
      missingGrantIds.forEach(id => fetchingGrantsRef.current.add(id));
      
      try {
        // Fetch details for grants we don't have yet using the batch endpoint
        // Split into chunks of 20 to be safe (backend might have stricter limits)
        const BATCH_SIZE = 20; // Reduced batch size to avoid potential issues
        const chunks: string[][] = [];
      
      // Create chunks ensuring we don't miss any IDs
      for (let i = 0; i < missingGrantIds.length; i += BATCH_SIZE) {
        const chunk = missingGrantIds.slice(i, Math.min(i + BATCH_SIZE, missingGrantIds.length));
        chunks.push(chunk);
        console.log(`[fetchGrantDetails] Created chunk ${chunks.length - 1} with ${chunk.length} IDs`);
      }
      
      
      // Fetch all chunks in parallel (but limit concurrent requests)
      console.log('[fetchGrantDetails] Creating', chunks.length, 'batch requests');
      const MAX_CONCURRENT = 3; // Process batches in parallel for better performance
      const allGrants: Grant[] = [];
      
      // Process all chunks sequentially in groups to avoid overwhelming the server
      for (let i = 0; i < chunks.length; i += MAX_CONCURRENT) {
        console.log(`[fetchGrantDetails] Processing batch group ${Math.floor(i / MAX_CONCURRENT) + 1} of ${Math.ceil(chunks.length / MAX_CONCURRENT)}`);
        
        // Get the current batch of chunks
        const endIndex = Math.min(i + MAX_CONCURRENT, chunks.length);
        const currentBatchIndices: number[] = [];
        for (let j = i; j < endIndex; j++) {
          currentBatchIndices.push(j);
        }
        
        console.log(`[fetchGrantDetails] Processing chunks ${i} to ${endIndex - 1}`);
        
        // Create promises for this batch
        const batchPromises = currentBatchIndices.map(chunkIndex => {
          const chunk = chunks[chunkIndex];
          console.log(`[fetchGrantDetails] Batch ${chunkIndex}: preparing to fetch ${chunk.length} grants`, {
            firstId: chunk[0],
            lastId: chunk[chunk.length - 1],
            sampleIds: chunk.slice(0, 3)
          });
          
          // Create a completely new array to avoid any reference issues
          const grantIdsCopy = JSON.parse(JSON.stringify(chunk));
          
          return apiClient.grants.getGrantsBatch(grantIdsCopy, accessToken);
        });
      
        const batchResults = await Promise.all(batchPromises);
        
        // Add a small delay between batch groups to avoid overwhelming the server
        if (i + MAX_CONCURRENT < chunks.length) {
          await new Promise(resolve => setTimeout(resolve, 50)); // 50ms delay (reduced for better performance)
        }
        
        // Log raw results for debugging
        console.log('[fetchGrantDetails] Batch results:', batchResults.map((r, idx) => ({
          batchIndex: i + idx,
          hasData: !!r.data,
          hasError: !!r.error,
          error: r.error,
          dataKeys: r.data && typeof r.data === 'object' ? Object.keys(r.data) : [],
          dataPreview: r.data ? JSON.stringify(r.data).substring(0, 200) : null,
          fullResponse: r
        })));
        
        // Process results from this batch
        batchResults.forEach(({ data, error }, resultIndex) => {
          const actualChunkIndex = currentBatchIndices[resultIndex];
          if (error) {
            console.error(`[fetchGrantDetails] Batch ${actualChunkIndex} error:`, error);
            // Retry failed chunks individually
            const failedChunk = chunks[actualChunkIndex];
            console.log(`[fetchGrantDetails] Will retry ${failedChunk.length} grants from failed batch ${actualChunkIndex}`);
          } else if (data) {
            // Check different possible response structures
            let grants: Grant[] = [];
            
            // The API response is wrapped in { data: { grants: [...] } } structure
            // First check if we have the grants array
            if (data && typeof data === 'object' && 'grants' in data && Array.isArray((data as any).grants)) {
              // Response with grants property (expected structure)
              grants = (data as any).grants as Grant[];
              console.log(`[fetchGrantDetails] Batch ${actualChunkIndex} has grants property with ${grants.length} items`);
            } else if (Array.isArray(data)) {
              // Direct array response (shouldn't happen with current API)
              grants = data as Grant[];
              console.log(`[fetchGrantDetails] Batch ${actualChunkIndex} is direct array with ${grants.length} items`);
            } else {
              console.warn(`[fetchGrantDetails] Batch ${actualChunkIndex} has unexpected structure:`, {
                dataType: typeof data,
                hasGrants: data && typeof data === 'object' ? 'grants' in data : false,
                keys: data && typeof data === 'object' ? Object.keys(data) : [],
                sample: JSON.stringify(data).substring(0, 200)
              });
            }
            
            if (grants.length > 0) {
              console.log(`[fetchGrantDetails] Batch ${actualChunkIndex} returned ${grants.length} grants`, {
                grantIds: grants.map(g => g.id).slice(0, 5),
                expectedChunkSize: chunks[actualChunkIndex]?.length || 0
              });
              allGrants.push(...grants);
            } else {
              console.warn(`[fetchGrantDetails] Batch ${actualChunkIndex} returned empty grants array`, {
                hasData: !!data,
                dataKeys: data ? Object.keys(data) : [],
                dataType: typeof data,
                isArray: Array.isArray(data),
                sample: JSON.stringify(data).substring(0, 200),
                expectedIds: chunks[actualChunkIndex]?.slice(0, 3) || []
              });
            }
          } else {
            console.warn(`[fetchGrantDetails] Batch ${actualChunkIndex} returned null/undefined data`);
          }
        });
        
        // Log progress after each batch group
        console.log(`[fetchGrantDetails] After batch group: collected ${allGrants.length} grants so far`);
      }
      
      console.log('[fetchGrantDetails] Total grants fetched:', allGrants.length, {
        fetchedIds: allGrants.map(g => g.id).slice(0, 10),
        uniqueFetchedCount: new Set(allGrants.map(g => g.id)).size
      });
      
      // Create a new map with the fetched grants
      const newGrantsMap = { ...currentGrantDetailsMap };
      let addedCount = 0;
      
      (allGrants || []).forEach((grant) => {
        const typedGrant = grant as Grant;
        if (!typedGrant.id) {
          console.error('[fetchGrantDetails] Grant missing ID:', typedGrant);
        } else if (!newGrantsMap[typedGrant.id]) {
          newGrantsMap[typedGrant.id] = typedGrant;
          addedCount++;
        }
      });
      
      console.log('[fetchGrantDetails] Grant map updated:', {
        previousSize: Object.keys(currentGrantDetailsMap).length,
        newSize: Object.keys(newGrantsMap).length,
        addedCount,
        totalRequested: missingGrantIds.length
      });
      
      
      // Update both the ref and the state
      grantDetailsMapRef.current = newGrantsMap;
      setGrantDetailsMap(newGrantsMap);
      
      // Clear the fetching flag for these IDs
      missingGrantIds.forEach(id => fetchingGrantsRef.current.delete(id));
      
      return newGrantsMap;
      } catch (error) {
        console.error('[fetchGrantDetails] Error:', error);
        // Clear the fetching flag even on error
        missingGrantIds.forEach(id => fetchingGrantsRef.current.delete(id));
        throw error; // Re-throw to be caught by outer try-catch
      }
      } catch (error) {
        console.error('[fetchGrantDetails] Early error:', error);
        return grantDetailsMapRef.current;
      } finally {
        // Clear the active fetch promise when done
        activeFetchPromiseRef.current = null;
      }
    })();
    
    // Store the promise reference atomically before starting the async work
    activeFetchPromiseRef.current = fetchPromise;
    
    // Return the promise
    return fetchPromise;
  }, [currentUserId]); // Removed grantDetailsMap from dependencies

  // Function to update grant lists based on interactions
  const updateGrantLists = useCallback(async () => {
    if (!currentUserId || !enabled) return;
    
    console.log('[updateGrantLists] Called with interactions:', Object.keys(interactionsMap).length);
    
    // Extract grant IDs for each interaction type
    const savedGrantIds: string[] = [];
    const appliedGrantIds: string[] = [];
    const ignoredGrantIds: string[] = [];
    
    // Filter grants by interaction type
    const allInteractedIds: string[] = [];
    Object.entries(interactionsMap).forEach(([grantId, status]) => {
      allInteractedIds.push(grantId);
      if (status === 'saved') savedGrantIds.push(grantId);
      else if (status === 'applied') appliedGrantIds.push(grantId);
      else if (status === 'ignored') ignoredGrantIds.push(grantId);
    });
    
    
    // Identify which interacted grant IDs are missing from the cache
    const cachedGrantIds = Object.keys(grantDetailsMapRef.current);
    const missingGrantIds = allInteractedIds.filter(id => !cachedGrantIds.includes(id));


    // Fetch details only for missing grants
    let currentGrantsMap = grantDetailsMapRef.current;
    if (missingGrantIds.length > 0) {
      console.log('[updateGrantLists] Calling fetchGrantDetails with', missingGrantIds.length, 'missing IDs');
      // Create a copy to ensure the array isn't modified
      const missingIdsCopy = [...missingGrantIds];
      // fetchGrantDetails returns the updated map directly
      currentGrantsMap = await fetchGrantDetails(missingIdsCopy);
    }

    // Remove date filtering - show all grants including expired ones
    // This allows users to manage all their grants regardless of status
    
    // Update saved grants
    const newSavedGrants = savedGrantIds
      .map(id => {
        const grant = currentGrantsMap[id];
        if (!grant) {
          console.warn('[updateGrantLists] Missing grant details for saved grant:', id);
        }
        return grant;
      })
      .filter(grant => grant) as Grant[]; // Only filter out null/undefined grants
    console.log('[updateGrantLists] Setting saved grants:', newSavedGrants.length, 'of', savedGrantIds.length);
    setSavedGrants(newSavedGrants);
    
    // Update applied grants (keep all regardless of expiry)
    const newAppliedGrants = appliedGrantIds
      .map(id => {
        const grant = currentGrantsMap[id];
        if (!grant) {
          console.warn('[updateGrantLists] Missing grant details for applied grant:', id);
        }
        return grant;
      })
      .filter(grant => grant) as Grant[];
    console.log('[updateGrantLists] Setting applied grants:', newAppliedGrants.length, 'of', appliedGrantIds.length);
    setAppliedGrants(newAppliedGrants);
    
    // Update ignored grants (show all including expired)
    const newIgnoredGrants = ignoredGrantIds
      .map(id => {
        const grant = currentGrantsMap[id];
        if (!grant) {
          console.warn('[updateGrantLists] Missing grant details for ignored grant:', id);
        }
        return grant;
      })
      .filter(grant => grant) as Grant[]; // Only filter out null/undefined grants
    console.log('[updateGrantLists] Setting ignored grants:', newIgnoredGrants.length, 'of', ignoredGrantIds.length);
    setIgnoredGrants(newIgnoredGrants);
    
  }, [currentUserId, enabled, interactionsMap, fetchGrantDetails]); // fetchGrantDetails is a stable ref now

  // Function to fetch recommended grants
  const fetchRecommendedGrants = useCallback(async () => {
    if (!currentUserId || !enabled) return;
    
    // fetchRecommendedGrants called
    
    try {
      // Get session for API calls
      const { data, error: sessionError } = await supabase.auth.getSession();
      const session = data?.session;
      
      if (sessionError || !session) {
        // Error fetching session for recommended grants
        return;
      }
      
      const accessToken = session.access_token;
      
      // Get all interacted grant IDs to exclude from recommendations
      const interactedGrantIds = Object.keys(interactionsMap);
      // Excluding interacted grants from recommendations
      
      // Fetch user preferences for scoring
      const { data: preferences, error: preferencesError } = await apiClient.users.getUserPreferences(
        currentUserId,
        accessToken
      );
      
      if (preferencesError) {
        // Error fetching user preferences
        // Use default preferences
        setUserPreferences({
          user_id: currentUserId,
          activity_categories: [] as string[],
          funding_min: 0,
          funding_max: 1000000,
          agencies: [] as string[],
          deadline_range: '0',
        });
      } else {
        setUserPreferences(preferences || null);
      }
      
      // Fetch recommended grants based on user preferences
      const { data: recommendedData, error: recommendedError } = await apiClient.grants.getRecommendedGrants(
        currentUserId,
        {
          exclude: interactedGrantIds,
          limit: targetRecommendedCount
        },
        accessToken
      );
      
      if (recommendedError) {
        // Error fetching recommended grants
        return;
      }
      
      // Calculate match scores for recommended grants
      const initialRecommended = recommendedData?.grants || [];
      const scoredRecommendations = initialRecommended.map((grant: Grant) => {
        return {
          ...grant,
          // Use the weighted recommendation score from backend instead of frontend calculation
          matchScore: (grant as any).recommendationScore || (grant as any).match_score || undefined
        } as unknown as ScoredGrant;
      });
      
      // Set recommended grants with scores
      setRecommendedGrants(scoredRecommendations || []);
      
    } catch (error: any) {
      // Error fetching recommended grants
    }
  }, [currentUserId, enabled, interactionsMap, targetRecommendedCount]);

  // Main function to fetch all dashboard data
  const fetchDashboardData = useCallback(async (isInitialLoad = false) => {
    if (!currentUserId || !enabled) return;
    
    console.log('[fetchDashboardData] Called, isInitialLoad:', isInitialLoad, 'interactions:', Object.keys(interactionsMap).length);

    try {
      // Only show loading on initial load
      if (isInitialLoad) {
        setLoading(true);
      }
      setError(null);

      // First update grant lists based on interactions
      console.log('[fetchDashboardData] Updating grant lists...');
      await updateGrantLists();
      
      // Always fetch recommendations regardless of interactions
      // The backend will handle empty exclude list appropriately
      console.log('[fetchDashboardData] Fetching recommendations...');
      await fetchRecommendedGrants();

    } catch (error: any) {
      if (error && Object.keys(error).length > 0 && error.code !== 'PGRST116' && error.message !== 'No grants found') {
        // Error fetching initial data
        setError('Failed to load your grants. Please try again later.');
      } else {
        // No grants found or expected empty result
        setError(null);
      }
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  }, [currentUserId, enabled, updateGrantLists, fetchRecommendedGrants, interactionsMap]);

  // Fetch replacement recommended grants when needed
  const fetchReplacementRecommendations = useCallback(async () => {
    if (!currentUserId || isFetchingReplacements) return;

    const currentRecommendedCount = recommendedGrants.length;
    const neededCount = targetRecommendedCount - currentRecommendedCount;

    if (neededCount <= 0) {
      return; // Already have enough or too many
    }

    setIsFetchingReplacements(true);

    try {
      // **Fetch the latest session and token before making API calls**
      const { data, error: sessionError } = await supabase.auth.getSession();
      const session = data?.session;

      if (sessionError || !session) {
        // Error fetching latest session for replacement
        // Don't set a global error, just log and stop this fetch
        setIsFetchingReplacements(false);
        return;
      }

      const accessToken = session.access_token;

      // Get IDs of ALL grants currently displayed in any list
      const allCurrentGrantIds = [
        ...recommendedGrants.map((g: ScoredGrant) => g.id),
        ...savedGrants.map((g: Grant) => g.id),
        ...appliedGrants.map((g: Grant) => g.id),
        ...ignoredGrants.map((g: Grant) => g.id)
      ];

      // Fetch more recommended grants with preferences
      const { data: newGrantsData, error: newGrantsError } = await apiClient.grants.getRecommendedGrants(
        currentUserId,
        {
          exclude: allCurrentGrantIds,
          limit: neededCount
        },
        accessToken // Use accessToken
      );

      if (newGrantsError) {
        // Error fetching replacement grants
      }

      const newGrants = newGrantsData?.grants || [];

      if (newGrants.length > 0 && userPreferences) {
        // Add match scores to new grants
        const scoredNewGrants = newGrants.map((grant: Grant) => {
          return {
            ...grant,
            // Use the weighted recommendation score from backend instead of frontend calculation
            matchScore: (grant as any).recommendationScore || (grant as any).match_score || undefined
          } as unknown as ScoredGrant;
        });
        setRecommendedGrants(prev => [...prev, ...scoredNewGrants]);
      }
    } catch (e) {
      // Exception fetching replacement grants
    } finally {
      setIsFetchingReplacements(false);
    }
  }, [
    currentUserId, // Keep currentUserId in dependency array
    isFetchingReplacements,
    recommendedGrants,
    savedGrants,
    appliedGrants,
    ignoredGrants,
    targetRecommendedCount,
    userPreferences
  ]);

  // Add a ref to track if initial load has been done
  const hasLoadedInitialRef = useRef(false);
  const hasInteractionsLoadedOnceRef = useRef(false);
  const lastInteractionMapSizeRef = useRef(0);

  // Track when interactions have been loaded at least once
  useEffect(() => {
    const currentMapSize = Object.keys(interactionsMap).length;
    console.log('[useFetchDashboardData] Tracking interactions:', {
      interactionsLoading,
      currentMapSize,
      hasInteractionsLoadedOnce: hasInteractionsLoadedOnceRef.current,
      userId: currentUserId
    });
    
    // Consider interactions loaded once loading is false, regardless of map size
    // This ensures dashboard loads even for users with no interactions
    if (!interactionsLoading) {
      console.log('[useFetchDashboardData] Interactions loaded, setting hasInteractionsLoadedOnceRef to true');
      hasInteractionsLoadedOnceRef.current = true;
      lastInteractionMapSizeRef.current = currentMapSize;
    }
  }, [interactionsLoading, lastInteractionTimestamp, interactionsMap, currentUserId]);

  // Fetch dashboard data when user is available - simplified like search page
  useEffect(() => {
    const tryLoadDashboard = async () => {
      if (!currentUserId || hasLoadedInitialRef.current) return;
      
      console.log('[useFetchDashboardData] Starting dashboard initialization');
      
      // Check localStorage for recent preferences update
      const prefsUpdate = localStorage.getItem('preferencesUpdated');
      if (prefsUpdate) {
        try {
          const updateData = JSON.parse(prefsUpdate);
          const timeSinceUpdate = Date.now() - updateData.timestamp;
          
          // If preferences were updated in the last 30 seconds and for this user
          if (timeSinceUpdate < 30000 && updateData.userId === currentUserId) {
            // Recent preferences update detected from localStorage
            localStorage.removeItem('preferencesUpdated'); // Clear the flag
            
            // Clear cache before fetching
            const { cacheUtils } = await import('@/lib/apiClient');
            cacheUtils.clearCache();
          }
        } catch (e) {
          // Error parsing preferences update flag
        }
      }
      
      hasLoadedInitialRef.current = true;
      
      // Don't clear grant details cache - preserve it for faster loads
      // The cache will be invalidated when interactions change
      
      console.log('[useFetchDashboardData] Calling fetchDashboardData(true)');
      await fetchDashboardData(true);
    };
    
    console.log('[useFetchDashboardData] Dashboard load check:', {
      currentUserId,
      hasLoadedInitial: hasLoadedInitialRef.current,
      interactionsMapSize: Object.keys(interactionsMap).length
    });
    
    // Load dashboard immediately when user is available - don't wait for interactions
    // This matches the search page approach
    if (currentUserId && !hasLoadedInitialRef.current) {
      console.log('[useFetchDashboardData] User available, starting dashboard load immediately');
      tryLoadDashboard().catch(error => {
        console.error('[useFetchDashboardData] Error in initial dashboard fetch:', error);
        // Reset on error to allow retry
        hasLoadedInitialRef.current = false;
      });
    }
    
    // Cleanup function - DON'T reset initialization state
    // This preserves data when navigating away and back
    return () => {
      // Keep the initialization state to prevent reloads on navigation
    };
  }, [currentUserId, fetchDashboardData]); // Simplified dependencies - removed interactionsLoading
  
  // Create a stable debounced function outside the effect
  const debouncedFetchRecommendations = useMemo(
    () => debounce(() => {
      if (currentUserId && !interactionsLoading) {
        // Fetching recommendations after interaction change
        fetchRecommendedGrants();
      }
    }, 1000), // Increased debounce delay to 1000ms to prevent rapid refetches
    [currentUserId, interactionsLoading, fetchRecommendedGrants]
  );

  // React to interaction changes with optimistic updates
  useEffect(() => {
    if (currentUserId && !interactionsLoading && hasLoadedInitialRef.current) {
      // Interactions changed - update grant lists immediately
      // This provides instant feedback without loading states
      updateGrantLists();
      
      // Only fetch new recommendations if needed (e.g., when recommended list gets too small)
      const recommendedCount = recommendedGrants.filter(g => !interactionsMap[g.id]).length;
      if (recommendedCount < targetRecommendedCount * 0.7) {
        // Only fetch when we're below 70% of target
        debouncedFetchRecommendations();
      }
    }
    
    // Cleanup debounced function on unmount
    return () => {
      debouncedFetchRecommendations.cancel();
    };
  }, [currentUserId, interactionsLoading, lastInteractionTimestamp, updateGrantLists, debouncedFetchRecommendations, interactionsMap, recommendedGrants.length, targetRecommendedCount]);
 
  // Create a refetch function that doesn't show loading state
  const refetch = useCallback(async () => {
    // Only clear caches if explicitly needed (e.g., manual refresh)
    // Don't clear on navigation to preserve state
    await fetchDashboardData(false); // Pass false to not show loading
  }, [fetchDashboardData]);

  // Consolidated dashboard refresh handler with debouncing
  const debouncedDashboardRefresh = useMemo(
    () => debounce(async () => {
      if (!currentUserId || !enabled) return;
      
      // Only refresh if preferences actually changed
      // Don't clear recommendations to avoid flicker
      await fetchDashboardData(false); // false = don't show loading spinner
    }, 500), // 500ms debounce to prevent multiple rapid refreshes
    [currentUserId, enabled, fetchDashboardData]
  );

  // Listen for dashboard refresh requests (triggered by global preferences updates)
  useEffect(() => {
    const handleDashboardRefresh = async (event: any) => {
      try {
        // Dashboard refresh request received
        
        if (!currentUserId || !enabled) {
          // Skipping refresh - user not authenticated or hook disabled
          return;
        }
        
        // Check if this refresh is for the current user
        if (event.detail.userId && event.detail.userId !== currentUserId) {
          // Skipping refresh - different user
          return;
        }
        
        // Use debounced refresh to prevent multiple rapid calls
        debouncedDashboardRefresh();
      } catch (error) {
        if (error instanceof Event) {
          
        } else {
          
        }
      }
    };

    const handleDirectPreferencesUpdate = async (event: any) => {
      try {
        // Direct preferences update detected (fallback)
        
        if (!currentUserId || !enabled) {
          return;
        }
        
        // Use debounced refresh to prevent multiple rapid calls
        debouncedDashboardRefresh();
      } catch (error) {
        if (error instanceof Event) {
          
        } else {
          
        }
      }
    };

    // Setting up dashboard refresh listeners
    window.addEventListener('dashboardRefreshRequested', handleDashboardRefresh);
    window.addEventListener('preferencesUpdated', handleDirectPreferencesUpdate);
    
    return () => {
      // Cleaning up dashboard refresh listeners
      window.removeEventListener('dashboardRefreshRequested', handleDashboardRefresh);
      window.removeEventListener('preferencesUpdated', handleDirectPreferencesUpdate);
      debouncedDashboardRefresh.cancel();
    };
  }, [currentUserId, enabled, debouncedDashboardRefresh]);

  return {
    recommendedGrants,
    savedGrants,
    appliedGrants,
    ignoredGrants,
    userPreferences,
    loading,
    error,
    refetch,
    fetchReplacementRecommendations
  };
}