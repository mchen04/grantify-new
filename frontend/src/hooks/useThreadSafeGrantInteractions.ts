import { useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import supabaseApiClient from '@/lib/supabaseApiClient';
import { UserInteraction } from '@/types/user';
import { useAuth } from '@/contexts/AuthContext';
import { announce } from '@/components/common/AriaLiveAnnouncer';
import { useThreadSafeState, useStateCoordinator } from './useThreadSafeState';

interface GrantInteractionState {
  loadingOperations: Set<string>;
  recentOperations: Map<string, number>; // grantId -> timestamp
}

interface UseThreadSafeGrantInteractionsProps {
  userId?: string;
  accessToken?: string;
  onError?: (message: string) => void;
}

interface UseThreadSafeGrantInteractionsReturn {
  interactionLoading: boolean;
  pendingOperations: string[];
  handleSaveGrant: (grantId: string, removeFromUI?: boolean) => Promise<void>;
  handleApplyGrant: (grantId: string, removeFromUI?: boolean) => Promise<void>;
  handleIgnoreGrant: (grantId: string, removeFromUI?: boolean) => Promise<void>;
  handleShareGrant: (grantId: string) => Promise<void>;
  handleUndoInteraction: (grantId: string, action: 'saved' | 'applied' | 'ignored') => Promise<void>;
  isCurrentInteraction: (grantId: string, action: 'saved' | 'applied' | 'ignored', interactions: UserInteraction[]) => boolean;
  getLatestInteraction: (interactions: UserInteraction[]) => UserInteraction | null;
  isOperationPending: (grantId: string) => boolean;
  getOperationStats: () => {
    activeOperations: string[];
    queueLength: number;
    recentOperationsCount: number;
  };
}

/**
 * Thread-safe hook for managing grant interactions with race condition prevention
 * Provides coordination, deduplication, and optimistic updates
 */
export function useThreadSafeGrantInteractions({
  userId,
  accessToken,
  onError = () => {}
}: UseThreadSafeGrantInteractionsProps): UseThreadSafeGrantInteractionsReturn {
  
  const { user, session } = useAuth();
  const router = useRouter();
  
  // Use provided userId and accessToken if available, otherwise fall back to auth context
  const effectiveUserId = userId || user?.id;
  const effectiveAccessToken = accessToken || session?.access_token;

  // Thread-safe state for tracking operations
  const {
    state: interactionState,
    setState: setInteractionState,
    updateStateAsync,
    isPending,
    pendingCount
  } = useThreadSafeState<GrantInteractionState>(
    {
      loadingOperations: new Set(),
      recentOperations: new Map()
    },
    {
      enableOptimisticUpdates: true,
      maxRetries: 3,
      retryDelayMs: 1000,
      onError: (error, operationId) => {
        console.error(`[ThreadSafeGrantInteractions] Operation ${operationId} failed:`, error);
        onError(`Operation failed: ${error.message}`);
      }
    }
  );

  // Operation coordination
  const { coordinatedOperation, isOperationActive, getQueueStatus } = useStateCoordinator();

  // Cleanup recent operations periodically
  const cleanupInterval = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    cleanupInterval.current = setInterval(() => {
      const now = Date.now();
      const fiveMinutesAgo = now - 5 * 60 * 1000;
      
      setInteractionState(prev => {
        const cleanedOperations = new Map();
        prev.recentOperations.forEach((timestamp, grantId) => {
          if (timestamp > fiveMinutesAgo) {
            cleanedOperations.set(grantId, timestamp);
          }
        });
        
        return {
          ...prev,
          recentOperations: cleanedOperations
        };
      });
    }, 60000); // Clean up every minute

    return () => {
      if (cleanupInterval.current) {
        clearInterval(cleanupInterval.current);
      }
    };
  }, [setInteractionState]);

  /**
   * Get the latest interaction from a list of interactions
   */
  const getLatestInteraction = useCallback((interactions: UserInteraction[]): UserInteraction | null => {
    if (!interactions || interactions.length === 0) return null;
    
    return [...interactions].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )[0];
  }, []);

  /**
   * Check if the specified action is the current interaction for the grant
   */
  const isCurrentInteraction = useCallback(
    (grantId: string, action: 'saved' | 'applied' | 'ignored', interactions: UserInteraction[]): boolean => {
      if (!interactions || interactions.length === 0) return false;
      
      const latestInteraction = getLatestInteraction(
        interactions.filter(interaction => interaction.grant_id === grantId)
      );
      
      return latestInteraction?.action === action;
    },
    [getLatestInteraction]
  );

  /**
   * Check if an operation is currently pending for a grant
   */
  const isOperationPending = useCallback((grantId: string): boolean => {
    return isOperationActive(`interaction_${grantId}`) || 
           isOperationActive(`undo_${grantId}`) ||
           isOperationActive(`share_${grantId}`);
  }, [isOperationActive]);

  /**
   * Deduplicated interaction handler with rate limiting
   */
  const handleInteraction = useCallback(
    async (
      grantId: string, 
      action: 'saved' | 'applied' | 'ignored', 
      _removeFromUI: boolean = false
    ): Promise<void> => {
      if (!effectiveUserId || !effectiveAccessToken) {
        router.push('/login');
        return;
      }

      const operationId = `interaction_${grantId}_${action}`;
      const now = Date.now();
      
      // Rate limiting: prevent rapid successive operations on same grant
      const lastOperation = interactionState.recentOperations.get(grantId);
      if (lastOperation && (now - lastOperation) < 1000) { // 1 second cooldown
        console.log(`[ThreadSafeGrantInteractions] Rate limiting ${action} for grant ${grantId}`);
        return;
      }

      return coordinatedOperation(
        operationId,
        async () => {
          return updateStateAsync(
            async (currentState) => {
              try {
                // Record the interaction using Supabase
                const { error } = await supabaseApiClient.users.recordInteraction(
                  effectiveUserId,
                  grantId,
                  action
                );

                if (error) throw new Error(error);
                
                // Announce the action for accessibility
                const actionMessages = {
                  saved: 'Grant saved to your collection',
                  applied: 'Grant marked as applied',
                  ignored: 'Grant removed from recommendations'
                };
                announce(actionMessages[action], 'polite');

                // Update state to track recent operation
                const newRecentOperations = new Map(currentState.recentOperations);
                newRecentOperations.set(grantId, now);

                return {
                  newState: {
                    ...currentState,
                    recentOperations: newRecentOperations
                  },
                  result: undefined
                };

              } catch (error: any) {
                console.error(`[ThreadSafeGrantInteractions] ${action} failed for grant ${grantId}:`, error);
                announce(`Failed to ${action.replace('ed', '')} grant`, 'assertive');
                throw error;
              }
            },
            // Optimistic update: mark as loading
            (prev) => ({
              ...prev,
              loadingOperations: new Set(prev.loadingOperations).add(grantId)
            })
          );
        },
        { 
          allowConcurrent: false, // Prevent concurrent operations on same grant
          priority: 'high' 
        }
      ).finally(() => {
        // Remove from loading operations
        setInteractionState(prev => {
          const newLoadingOps = new Set(prev.loadingOperations);
          newLoadingOps.delete(grantId);
          return {
            ...prev,
            loadingOperations: newLoadingOps
          };
        });
      });
    },
    [
      effectiveUserId, 
      effectiveAccessToken, 
      router, 
      coordinatedOperation, 
      updateStateAsync, 
      interactionState.recentOperations,
      setInteractionState
    ]
  );

  /**
   * Undo a specific interaction with coordination
   */
  const handleUndoInteraction = useCallback(
    async (grantId: string, action: 'saved' | 'applied' | 'ignored'): Promise<void> => {
      if (!effectiveUserId || !effectiveAccessToken) {
        router.push('/login');
        return;
      }

      const operationId = `undo_${grantId}_${action}`;

      return coordinatedOperation(
        operationId,
        async () => {
          return updateStateAsync(
            async (currentState) => {
              try {
                // Delete the interaction using Supabase
                const { error } = await supabaseApiClient.users.deleteInteraction(
                  effectiveUserId,
                  grantId,
                  action
                );

                if (error) throw new Error(error);
                
                announce(`${action} status removed from grant`, 'polite');

                // Update recent operations
                const newRecentOperations = new Map(currentState.recentOperations);
                newRecentOperations.set(grantId, Date.now());

                return {
                  newState: {
                    ...currentState,
                    recentOperations: newRecentOperations
                  },
                  result: undefined
                };

              } catch (error: any) {
                console.error(`[ThreadSafeGrantInteractions] Undo ${action} failed for grant ${grantId}:`, error);
                throw error;
              }
            },
            // Optimistic update: mark as loading
            (prev) => ({
              ...prev,
              loadingOperations: new Set(prev.loadingOperations).add(grantId)
            })
          );
        },
        { allowConcurrent: false, priority: 'high' }
      ).finally(() => {
        // Remove from loading operations
        setInteractionState(prev => {
          const newLoadingOps = new Set(prev.loadingOperations);
          newLoadingOps.delete(grantId);
          return {
            ...prev,
            loadingOperations: newLoadingOps
          };
        });
      });
    },
    [effectiveUserId, effectiveAccessToken, router, coordinatedOperation, updateStateAsync, setInteractionState]
  );

  /**
   * Handle saving a grant
   */
  const handleSaveGrant = useCallback(
    async (grantId: string, removeFromUI: boolean = false): Promise<void> => {
      await handleInteraction(grantId, 'saved', removeFromUI);
    },
    [handleInteraction]
  );

  /**
   * Handle applying for a grant
   */
  const handleApplyGrant = useCallback(
    async (grantId: string, removeFromUI: boolean = false): Promise<void> => {
      await handleInteraction(grantId, 'applied', removeFromUI);
    },
    [handleInteraction]
  );

  /**
   * Handle ignoring a grant
   */
  const handleIgnoreGrant = useCallback(
    async (grantId: string, removeFromUI: boolean = false): Promise<void> => {
      await handleInteraction(grantId, 'ignored', removeFromUI);
    },
    [handleInteraction]
  );

  /**
   * Handle sharing a grant with coordination
   */
  const handleShareGrant = useCallback(
    async (grantId: string): Promise<void> => {
      const operationId = `share_${grantId}`;
      
      return coordinatedOperation(
        operationId,
        async () => {
          const shareUrl = `${window.location.origin}/grants/${grantId}`;

          try {
            if (navigator.share) {
              await navigator.share({
                title: 'Check out this grant',
                text: 'I found this interesting grant opportunity',
                url: shareUrl
              });
              announce('Grant shared successfully', 'polite');
            } else {
              await navigator.clipboard.writeText(shareUrl);
              announce('Grant link copied to clipboard', 'polite');
            }
          } catch (error: any) {
            // Don't throw errors if the user canceled the share
            if (error.name !== 'AbortError') {
              try {
                await navigator.clipboard.writeText(shareUrl);
                announce('Grant link copied to clipboard', 'polite');
              } catch (clipboardError) {
                console.error('[ThreadSafeGrantInteractions] Share failed:', clipboardError);
                throw new Error('Failed to share grant');
              }
            }
          }
        },
        { allowConcurrent: true, priority: 'normal' }
      );
    },
    [coordinatedOperation]
  );

  /**
   * Get operation statistics
   */
  const getOperationStats = useCallback(() => {
    const queueStatus = getQueueStatus();
    return {
      ...queueStatus,
      recentOperationsCount: interactionState.recentOperations.size
    };
  }, [getQueueStatus, interactionState.recentOperations.size]);

  return {
    interactionLoading: isPending || interactionState.loadingOperations.size > 0,
    pendingOperations: Array.from(interactionState.loadingOperations),
    handleSaveGrant,
    handleApplyGrant,
    handleIgnoreGrant,
    handleShareGrant,
    handleUndoInteraction,
    isCurrentInteraction,
    getLatestInteraction,
    isOperationPending,
    getOperationStats
  };
}