import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import apiClient from '../lib/apiClient';
import { InteractionStatus, UserInteractionsResponse } from '../types/interaction';
import useFetchUserInteractions from '../hooks/useFetchUserInteractions';
import supabase from '../lib/supabaseClient';

// Define the shape of the context state
interface InteractionContextType {
  interactionsMap: Record<string, InteractionStatus>; // Map grantId to action (e.g., 'saved', 'applied', 'ignored')
  isLoading: boolean; // Track loading state for interactions
  fetchUserInteractions: () => Promise<void>;
  updateUserInteraction: (grantId: string, newAction: InteractionStatus | null) => Promise<void>;
  getInteractionStatus: (grantId: string) => InteractionStatus | undefined;
  lastInteractionTimestamp: number; // To trigger reactions in other components
  refetchInteractions: () => Promise<void>; // Expose refetch function
}

// Create the context
const InteractionContext = createContext<InteractionContextType | undefined>(undefined);

// Create the provider component
export const InteractionProvider = ({ children }: { children: ReactNode }) => {
  const { user, session, isLoading: isAuthLoading } = useAuth(); // Get user, session, and loading state from AuthContext
  const userId = user?.id;
  const accessToken = session?.access_token;
  
  const [interactionsMap, setInteractionsMap] = useState<Record<string, InteractionStatus>>({});
  const [lastInteractionTimestamp, setLastInteractionTimestamp] = useState<number>(Date.now());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasInitialLoadCompleted, setHasInitialLoadCompleted] = useState<boolean>(false);
  const [pendingUpdates, setPendingUpdates] = useState<Set<string>>(new Set()); // Track pending updates
  
  // Debug log auth state
  console.log('[InteractionContext] Auth state:', {
    isAuthLoading,
    userId,
    hasAccessToken: !!accessToken,
    hasSession: !!session,
    willEnableFetch: !isAuthLoading && !!userId && !!accessToken && !!session
  });
  
  // Use the updated hook with explicit userId parameter
  // Only enable fetching when auth is loaded and we have both userId and a valid session
  const {
    interactions: fetchedInteractions,
    loading: hookLoading,
    refetch: refetchInteractions
  } = useFetchUserInteractions({
    userId,
    enabled: !isAuthLoading && !!userId && !!accessToken && !!session
  });

  // Update the interactions map when fetchedInteractions changes
  useEffect(() => {
    console.log('[InteractionContext] Update effect:', {
      fetchedCount: fetchedInteractions.length,
      hookLoading,
      hasInitialLoadCompleted,
      userId,
      hasUserId: !!userId,
      hasAccessToken: !!accessToken,
      fetchedInteractionsSample: fetchedInteractions.slice(0, 3).map(i => ({
        grant_id: i.grant_id,
        action: i.action
      }))
    });
    
    // Update the map if we have data or if loading is complete
    if (!hookLoading && userId) {
      setHasInitialLoadCompleted(true);
      
      // Always update the map based on fetched interactions
      const map: Record<string, InteractionStatus> = {};
      const breakdown = { saved: 0, applied: 0, ignored: 0 };
      
      fetchedInteractions.forEach(interaction => {
        if (interaction.grant_id && interaction.action) {
          map[interaction.grant_id] = interaction.action;
          if (interaction.action in breakdown) {
            breakdown[interaction.action as keyof typeof breakdown]++;
          }
        } else {
          console.warn('[InteractionContext] Invalid interaction:', interaction);
        }
      });
      
      console.log('[InteractionContext] Setting map with:', {
        total: Object.keys(map).length,
        breakdown,
        userId,
        mapKeys: Object.keys(map).slice(0, 5) // Show first 5 grant IDs
      });
      
      setInteractionsMap(map);
      setLastInteractionTimestamp(Date.now());
    }
  }, [fetchedInteractions, hookLoading, userId, accessToken]);

  // Function to fetch user interactions - delegate to refetchInteractions from hook
  const fetchUserInteractions = async (): Promise<void> => {
    // fetchUserInteractions called
    await refetchInteractions();
  };

  // Function to update user interaction with race condition prevention
  const updateUserInteraction = async (grantId: string, newAction: InteractionStatus | null) => {
    console.log('[InteractionContext] updateUserInteraction called:', {
      grantId,
      newAction,
      userId,
      hasAccessToken: !!accessToken,
      accessTokenLength: accessToken?.length
    });
    
    if (!userId || !accessToken) {
      console.error('[InteractionContext] Cannot update interaction: No authenticated user', {
        userId,
        hasAccessToken: !!accessToken
      });
      
      // Show user-friendly error message
      const message = 'Please sign in to save, ignore, or apply for grants';
      
      // Create and show toast notification
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-slide-up';
      toast.style.animation = 'slide-up 0.3s ease-out';
      toast.textContent = message;
      document.body.appendChild(toast);
      
      // Remove toast after 3 seconds
      setTimeout(() => {
        toast.style.animation = 'slide-down 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
      }, 3000);
      
      // Trigger auth refresh if we have a user but no access token
      if (userId && !accessToken) {
        console.log('[InteractionContext] User exists but no access token, attempting session refresh...');
        try {
          const { data, error } = await supabase.auth.refreshSession();
          if (error) {
            console.error('[InteractionContext] Session refresh failed:', error);
          }
        } catch (err) {
          console.error('[InteractionContext] Session refresh error:', err);
        }
      }
      return;
    }
    
    // Prevent concurrent updates to the same grant
    if (pendingUpdates.has(grantId)) {
      console.log('[InteractionContext] Update already pending for grant:', grantId);
      return;
    }
    
    // Mark this grant as having a pending update
    setPendingUpdates(prev => new Set(prev).add(grantId));
    
    // Capture the current action BEFORE the optimistic update
    const previousAction = interactionsMap[grantId] as InteractionStatus | undefined;
    
    console.log('[InteractionContext] Starting interaction update:', {
      grantId,
      previousAction,
      newAction,
      willDelete: newAction === null || (previousAction === newAction)
    });
    
    // Use functional update to ensure we have the latest state
    setInteractionsMap(prevMap => {
      const currentAction = prevMap[grantId] as InteractionStatus;
      const optimisticMap = { ...prevMap };

      if (newAction === null || (currentAction === newAction)) {
        // Optimistically remove interaction if null or toggling the same action
        delete optimisticMap[grantId];
      } else {
        // Optimistically add/update interaction
        optimisticMap[grantId] = newAction;
      }
      
      return optimisticMap;
    });
    
    setLastInteractionTimestamp(Date.now()); // Update timestamp to trigger reactions

    try {
      // Clear the interactions cache after updating to ensure fresh data on next fetch
      const { cacheUtils } = await import('@/lib/apiClient');
      cacheUtils.clearInteractionsCache();
      
      if (newAction === null || (previousAction === newAction)) {
        // Call delete endpoint to remove the interaction
        await apiClient.users.deleteInteraction(
          userId,
          grantId,
          previousAction || newAction!, // Use previousAction if available, otherwise newAction (for toggle case)
          accessToken
        );
      } else {
        // Call create/update endpoint
        await apiClient.users.recordInteraction(
          userId,
          grantId,
          newAction,
          accessToken
        );
      }
      // If backend update is successful, state is already updated optimistically
    } catch (error) {
      console.error('[InteractionContext] Error updating interaction:', error);
      // Revert optimistic update if backend call fails using functional update
      setInteractionsMap(prevMap => {
        const revertedMap = { ...prevMap };
        if (previousAction) {
          revertedMap[grantId] = previousAction; // Restore previous action
        } else {
          delete revertedMap[grantId]; // Remove if it didn't exist before
        }
        return revertedMap;
      });
      setLastInteractionTimestamp(Date.now()); // Update timestamp again to trigger reactions
      // TODO: Show user notification about the error
      throw error; // Re-throw to allow caller to handle
    } finally {
      // Remove from pending updates
      setPendingUpdates(prev => {
        const newSet = new Set(prev);
        newSet.delete(grantId);
        return newSet;
      });
    }
  };

  // Helper function to get interaction status
  const getInteractionStatus = (grantId: string): InteractionStatus | undefined => {
    return interactionsMap[grantId];
  };

  // Clear interactions when user logs out
  useEffect(() => {
    if (!userId || !accessToken) {
      // User not authenticated, clearing interactions
      setInteractionsMap({});
    }
    // Don't call fetchUserInteractions here - useFetchUserInteractions already does this
  }, [userId, accessToken]); // Dependencies include userId and accessToken

  // Debug log the provided state
  useEffect(() => {
    console.log('[InteractionContext] Context state:', {
      mapSize: Object.keys(interactionsMap).length,
      isLoading: isAuthLoading || hookLoading || isLoading,
      isAuthLoading,
      hookLoading,
      timestamp: lastInteractionTimestamp,
      userId
    });
  }, [interactionsMap, isAuthLoading, hookLoading, isLoading, lastInteractionTimestamp, userId]);
  
  return (
    <InteractionContext.Provider value={{
      interactionsMap,
      isLoading: isAuthLoading || hookLoading || isLoading,
      fetchUserInteractions,
      updateUserInteraction,
      getInteractionStatus,
      lastInteractionTimestamp,
      refetchInteractions: refetchInteractions
    }}>
      {children}
    </InteractionContext.Provider>
  );
};

// Custom hook to use the InteractionContext
export const useInteractions = () => {
  const context = useContext(InteractionContext);
  if (context === undefined) {
    throw new Error('useInteractions must be used within an InteractionProvider');
  }
  return context;
};