import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import supabaseApiClient from '@/lib/supabaseApiClient';
import { UserInteraction } from '@/types/user';
import { useAuth } from '@/contexts/AuthContext';
import { announce } from '@/components/common/AriaLiveAnnouncer';

interface UseGrantInteractionsProps {
  userId?: string;
  accessToken?: string;
  onError?: (message: string) => void;
}

interface UseGrantInteractionsReturn {
  interactionLoading: boolean;
  handleSaveGrant: (grantId: string, removeFromUI?: boolean) => Promise<void>;
  handleApplyGrant: (grantId: string, removeFromUI?: boolean) => Promise<void>;
  handleIgnoreGrant: (grantId: string, removeFromUI?: boolean) => Promise<void>;
  handleShareGrant: (grantId: string) => Promise<void>;
  handleUndoInteraction: (grantId: string, action: 'saved' | 'applied' | 'ignored') => Promise<void>;
  isCurrentInteraction: (grantId: string, action: 'saved' | 'applied' | 'ignored', interactions: UserInteraction[]) => boolean;
  getLatestInteraction: (interactions: UserInteraction[]) => UserInteraction | null;
}

/**
 * Custom hook for managing grant interactions (save, apply, ignore, share)
 */
export function useGrantInteractions({
  userId,
  accessToken,
  onError = () => {}
}: UseGrantInteractionsProps): UseGrantInteractionsReturn {
  const [interactionLoading, setInteractionLoading] = useState(false);
  const { user, session } = useAuth();
  const router = useRouter();
  
  // Use provided userId and accessToken if available, otherwise fall back to auth context
  const effectiveUserId = userId || user?.id;
  const effectiveAccessToken = accessToken || session?.access_token;

  /**
   * Get the latest interaction from a list of interactions
   */
  const getLatestInteraction = useCallback((interactions: UserInteraction[]): UserInteraction | null => {
    if (!interactions || interactions.length === 0) return null;
    
    // Sort by timestamp (descending) and return the first one
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
      
      // Find the latest interaction for this grant
      const latestInteraction = getLatestInteraction(
        interactions.filter(interaction => interaction.grant_id === grantId)
      );
      
      return latestInteraction?.action === action;
    },
    [getLatestInteraction]
  );

  /**
   * Handle grant interaction (save, apply, ignore)
   */
  const handleInteraction = useCallback(
    async (grantId: string, action: 'saved' | 'applied' | 'ignored', _removeFromUI: boolean = false): Promise<void> => {
      
      
      if (!effectiveUserId || !effectiveAccessToken) {
        // Redirect to login page instead of showing error
        router.push('/login');
        return;
      }

      // setInteractionLoading(true); // Removed loading animation

      try {
        // Record the interaction using Supabase
        const { error } = await supabaseApiClient.users.recordInteraction(
          effectiveUserId,
          grantId,
          action
        );

        if (error) throw new Error(error);
        
        // Announce the action for screen readers
        const actionMessages = {
          saved: 'Grant saved to your collection',
          applied: 'Grant marked as applied',
          ignored: 'Grant removed from recommendations'
        };
        announce(actionMessages[action], 'polite');

      } catch (error: any) {
        
        onError(`Failed to ${action.replace('ed', '')} grant: ${error.message || 'Please try again.'}`);
        announce(`Failed to ${action.replace('ed', '')} grant`, 'assertive');
      } finally {
        // setInteractionLoading(false); // Removed loading animation
      }
    },
    [effectiveUserId, effectiveAccessToken, onError]
  );

  /**
   * Undo a specific interaction
   */
  const handleUndoInteraction = useCallback(
    async (grantId: string, action: 'saved' | 'applied' | 'ignored'): Promise<void> => {
      if (!effectiveUserId || !effectiveAccessToken) {
        // Redirect to login page instead of showing error
        router.push('/login');
        return;
      }

      // setInteractionLoading(true); // Removed loading animation

      try {
        // Delete the interaction using Supabase
        const { error } = await supabaseApiClient.users.deleteInteraction(
          effectiveUserId,
          grantId,
          action
        );

        if (error) throw new Error(error);
      } catch (error: any) {
        
        onError(`Failed to undo ${action.replace('ed', '')}: ${error.message || 'Please try again.'}`);
      } finally {
        // setInteractionLoading(false); // Removed loading animation
      }
    },
    [effectiveUserId, effectiveAccessToken, onError]
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
   * Handle sharing a grant
   */
  const handleShareGrant = useCallback(async (grantId: string): Promise<void> => {
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
        // Could add a toast notification here
      }
    } catch (error: any) {
      // Don't log errors if the user canceled the share
      if (error.name !== 'AbortError') {
        // Only copy to clipboard if it's not a cancel action
        try {
          await navigator.clipboard.writeText(shareUrl);
        } catch (clipboardError) {
          
        }
      }
    }
  }, []);

  return {
    interactionLoading,
    handleSaveGrant,
    handleApplyGrant,
    handleIgnoreGrant,
    handleShareGrant,
    handleUndoInteraction,
    isCurrentInteraction,
    getLatestInteraction
  };
}