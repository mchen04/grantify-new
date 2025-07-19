import { useState, useEffect, useCallback } from 'react';
import supabaseApiClient from '../lib/supabaseApiClient'; // Use Supabase API client
import { useAuth } from '../contexts/AuthContext'; // Import useAuth
import { UserInteraction } from '../types/interaction';
import { useCleanupOnUnmount, useAbortController, useSafeTimeout } from './useCleanupOnUnmount';

interface UseFetchUserInteractionsProps {
  userId: string | undefined;
  enabled?: boolean;
}

interface UseFetchUserInteractionsReturn {
  interactions: UserInteraction[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for fetching user interactions using public user identifier
 */
const useFetchUserInteractions = ({
  userId,
  enabled = true
}: UseFetchUserInteractionsProps): UseFetchUserInteractionsReturn => {
  const [interactions, setInteractions] = useState<UserInteraction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const { session } = useAuth(); // Get session from useAuth
  const accessToken = session?.access_token; // Extract accessToken from session

  // Cleanup management to prevent race conditions after unmount
  const cleanup = useCleanupOnUnmount();
  const abortController = useAbortController();
  const { set: setSafeTimeout } = useSafeTimeout();
  
  // Safe state setters that only execute if component is mounted
  const safeSetInteractions = cleanup.safeSetState(setInteractions);
  const safeSetLoading = cleanup.safeSetState(setLoading);
  const safeSetError = cleanup.safeSetState(setError);
  
  console.log('[useFetchUserInteractions] Hook state:', {
    userId,
    enabled,
    hasAccessToken: !!accessToken,
    loading
  });

  const fetchInteractions = useCallback(async (): Promise<void> => {
    console.log('[useFetchUserInteractions] fetchInteractions called');
    
    if (!userId || !enabled || !cleanup.isMounted()) {
      console.log('[useFetchUserInteractions] No userId, disabled, or unmounted');
      safeSetInteractions([]);
      safeSetLoading(false);
      return;
    }

    if (!accessToken) {
      console.log('[useFetchUserInteractions] No access token');
      safeSetInteractions([]);
      safeSetLoading(false);
      return;
    }

    // Use safe async execution to prevent operations after unmount
    await cleanup.safeAsync(async () => {
      try {
        safeSetLoading(true);
        safeSetError(null); // Clear previous errors
        
        // Use the API client to fetch interactions consistently
        // Force refresh on initial load to ensure we get fresh data
        const isInitialLoad = interactions.length === 0 && !error;
        console.log('[useFetchUserInteractions] About to call API:', {
          userId,
          hasAccessToken: !!accessToken,
          isInitialLoad,
          timestamp: new Date().toISOString()
        });
        
        const response = await supabaseApiClient.users.getUserInteractions(
          userId, 
          undefined, 
          undefined
        );
        
        // Check if component is still mounted before processing response
        if (!cleanup.isMounted()) {
          return;
        }
        
        console.log('[useFetchUserInteractions] API response:', {
          dataType: typeof response.data,
          hasInteractions: !!response.data?.interactions,
          count: response.data?.interactions?.length || 0,
          responseDataKeys: response.data ? Object.keys(response.data) : [],
          sampleInteraction: response.data?.interactions?.[0]
        });
        
        // The data is the interactions array from API response
        const interactionsArray = response.data?.interactions || [];
        console.log('[useFetchUserInteractions] Setting', interactionsArray.length, 'interactions');
        console.log('[useFetchUserInteractions] Sample interactions:', interactionsArray.slice(0, 3));
        safeSetInteractions(interactionsArray); // Set interactions, default to empty array if data is null
      } catch (err: any) {
        // Only set error if component is still mounted and not an abort error
        if (cleanup.isMounted() && err.name !== 'AbortError') {
          safeSetError(err as Error);
          safeSetInteractions([]); // Set to empty on unexpected error
        }
      } finally {
        // Only set loading to false if component is still mounted
        if (cleanup.isMounted()) {
          safeSetLoading(false);
        }
      }
    });
  }, [userId, enabled, accessToken, cleanup, abortController, safeSetLoading, safeSetError, safeSetInteractions]); // Removed interactions.length and error to prevent unnecessary refetches

  useEffect(() => {
    console.log('[useFetchUserInteractions] Effect triggered:', {
      enabled,
      userId,
      hasAccessToken: !!accessToken
    });
    if (enabled) {
      // Add a small delay on initial load to ensure auth is fully ready
      setSafeTimeout(() => {
        console.log('[useFetchUserInteractions] Executing fetch after delay');
        fetchInteractions();
      }, 100);
    }
  }, [fetchInteractions, enabled, setSafeTimeout]); // Rerun effect when dependencies change

  return {
    interactions,
    loading,
    error,
    refetch: fetchInteractions
  };
};

export default useFetchUserInteractions;