import { useState, useEffect, useCallback } from 'react';
import apiClient from '../lib/apiClient'; // Use API client instead of direct Supabase
import { useAuth } from '../contexts/AuthContext'; // Import useAuth
import { UserInteraction } from '../types/interaction';

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
  
  console.log('[useFetchUserInteractions] Hook state:', {
    userId,
    enabled,
    hasAccessToken: !!accessToken,
    loading
  });

  const fetchInteractions = useCallback(async () => {
    console.log('[useFetchUserInteractions] fetchInteractions called');
    
    if (!userId || !enabled) {
      console.log('[useFetchUserInteractions] No userId or disabled');
      setInteractions([]);
      setLoading(false);
      return;
    }

    if (!accessToken) {
      console.log('[useFetchUserInteractions] No access token');
      setInteractions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null); // Clear previous errors
      
      // Use the API client to fetch interactions consistently
      // Force refresh on initial load to ensure we get fresh data
      const isInitialLoad = interactions.length === 0 && !error;
      console.log('[useFetchUserInteractions] About to call API:', {
        userId,
        hasAccessToken: !!accessToken,
        isInitialLoad,
        timestamp: new Date().toISOString()
      });
      
      const response = await apiClient.users.getUserInteractions(userId, undefined, undefined, undefined, accessToken, isInitialLoad);
      
      console.log('[useFetchUserInteractions] API response:', {
        hasError: !!response.error,
        error: response.error,
        dataType: typeof response.data,
        hasInteractions: !!response.data?.interactions,
        count: response.data?.interactions?.length || 0,
        responseDataKeys: response.data ? Object.keys(response.data) : [],
        sampleInteraction: response.data?.interactions?.[0]
      });
      
      if (response.error) {
        console.error('[useFetchUserInteractions] Error:', response.error);
        setError(new Error(response.error));
        setInteractions([]); // Set to empty on error
      } else {
        // The data is the interactions array from API response
        const interactionsArray = response.data?.interactions || [];
        console.log('[useFetchUserInteractions] Setting', interactionsArray.length, 'interactions');
        console.log('[useFetchUserInteractions] Sample interactions:', interactionsArray.slice(0, 3));
        setInteractions(interactionsArray); // Set interactions, default to empty array if data is null
      }
    } catch (err) {
      setError(err as Error);
      setInteractions([]); // Set to empty on unexpected error
    } finally {
      setLoading(false);
    }
  }, [userId, enabled, accessToken]); // Dependencies include userId and accessToken

  useEffect(() => {
    console.log('[useFetchUserInteractions] Effect triggered:', {
      enabled,
      userId,
      hasAccessToken: !!accessToken
    });
    if (enabled) {
      // Add a small delay on initial load to ensure auth is fully ready
      const timer = setTimeout(() => {
        console.log('[useFetchUserInteractions] Executing fetch after delay');
        fetchInteractions();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [fetchInteractions, enabled]); // Rerun effect when dependencies change

  return {
    interactions,
    loading,
    error,
    refetch: fetchInteractions
  };
};

export default useFetchUserInteractions;