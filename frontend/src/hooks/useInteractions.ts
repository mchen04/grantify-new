"use client";

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import supabase from '@/lib/supabaseClient';
import { InteractionStatus } from '@/types/interaction';

export interface UserInteraction {
  id: string;
  user_id: string;
  grant_id: string;
  action: InteractionStatus;
  notes?: string;
  created_at: string;
}

/**
 * TanStack Query hooks for user interactions with grants
 * 
 * This replaces the complex InteractionContext with industry-standard
 * optimistic updates and cache management patterns.
 */

// Query key factory for consistent cache management
export const interactionKeys = {
  all: ['interactions'] as const,
  lists: () => [...interactionKeys.all, 'list'] as const,
  list: (userId: string) => [...interactionKeys.lists(), userId] as const,
  details: () => [...interactionKeys.all, 'detail'] as const,
  detail: (id: string) => [...interactionKeys.details(), id] as const,
};

/**
 * Hook to fetch user interactions
 */
export function useUserInteractions() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: interactionKeys.list(user?.id || ''),
    queryFn: async (): Promise<UserInteraction[]> => {
      if (!user?.id) {
        return [];
      }

      const { data, error } = await supabase
        .from('user_interactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user interactions:', error);
        throw new Error(error.message);
      }

      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get interaction status for a specific grant
 */
export function useInteractionStatus(grantId: string): InteractionStatus | undefined {
  const { data: interactions } = useUserInteractions();
  
  if (!interactions || !grantId) {
    return undefined;
  }

  const interaction = interactions.find(i => i.grant_id === grantId);
  return interaction?.action;
}

/**
 * Hook to create/update user interactions with optimistic updates
 */
export function useInteractionMutation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      grantId, 
      action, 
      notes 
    }: { 
      grantId: string; 
      action: InteractionStatus; 
      notes?: string; 
    }): Promise<UserInteraction> => {
      if (!user?.id) {
        throw new Error('User must be authenticated');
      }

      // First, check if interaction already exists
      const { data: existingData } = await supabase
        .from('user_interactions')
        .select('id')
        .eq('user_id', user.id)
        .eq('grant_id', grantId)
        .single();

      let data, error;

      if (existingData) {
        // Update existing interaction
        const result = await supabase
          .from('user_interactions')
          .update({
            action: action,
            notes: notes,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)
          .eq('grant_id', grantId)
          .select()
          .single();
        data = result.data;
        error = result.error;
      } else {
        // Insert new interaction
        const result = await supabase
          .from('user_interactions')
          .insert({
            user_id: user.id,
            grant_id: grantId,
            action: action,
            notes: notes,
          })
          .select()
          .single();
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('Error recording interaction:', error);
        throw new Error(error.message);
      }

      return data;
    },
    onMutate: async ({ grantId, action, notes }) => {
      if (!user?.id) return;

      // Cancel outgoing refetches to prevent race conditions
      await queryClient.cancelQueries({ 
        queryKey: interactionKeys.list(user.id) 
      });

      // Snapshot previous value for rollback
      const previousInteractions = queryClient.getQueryData<UserInteraction[]>(
        interactionKeys.list(user.id)
      );

      // Optimistically update the cache
      queryClient.setQueryData<UserInteraction[]>(
        interactionKeys.list(user.id),
        (old = []) => {
          // Remove existing interaction for this grant (if any)
          const filtered = old.filter(i => i.grant_id !== grantId);
          
          // Add new interaction
          const newInteraction: UserInteraction = {
            id: `temp-${Date.now()}`, // Temporary ID
            user_id: user.id,
            grant_id: grantId,
            action: action,
            notes: notes,
            created_at: new Date().toISOString(),
          };

          return [newInteraction, ...filtered];
        }
      );

      // Return context for rollback
      return { previousInteractions };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousInteractions && user?.id) {
        queryClient.setQueryData(
          interactionKeys.list(user.id),
          context.previousInteractions
        );
      }
      
      console.error('Failed to record interaction:', err);
    },
    onSuccess: (data) => {
      if (!user?.id) return;

      // Update the cache with the real data from server
      queryClient.setQueryData<UserInteraction[]>(
        interactionKeys.list(user.id),
        (old = []) => {
          // Remove temporary entry and add real one
          const filtered = old.filter(i => i.grant_id !== data.grant_id);
          return [data, ...filtered];
        }
      );

      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: ['grants'], // This will refresh grants to reflect interaction status
      });
    },
    onSettled: () => {
      // Ensure data is consistent
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: interactionKeys.list(user.id),
        });
      }
    },
  });
}

/**
 * Hook to delete user interactions with optimistic updates
 */
export function useDeleteInteractionMutation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      grantId, 
      action 
    }: { 
      grantId: string; 
      action: InteractionStatus; 
    }): Promise<void> => {
      if (!user?.id) {
        throw new Error('User must be authenticated');
      }

      const { error } = await supabase
        .from('user_interactions')
        .delete()
        .eq('user_id', user.id)
        .eq('grant_id', grantId)
        .eq('action', action);

      if (error) {
        console.error('Error deleting interaction:', error);
        throw new Error(error.message);
      }
    },
    onMutate: async ({ grantId }) => {
      if (!user?.id) return;

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: interactionKeys.list(user.id) 
      });

      // Snapshot previous value
      const previousInteractions = queryClient.getQueryData<UserInteraction[]>(
        interactionKeys.list(user.id)
      );

      // Optimistically remove the interaction
      queryClient.setQueryData<UserInteraction[]>(
        interactionKeys.list(user.id),
        (old = []) => old.filter(i => i.grant_id !== grantId)
      );

      return { previousInteractions };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousInteractions && user?.id) {
        queryClient.setQueryData(
          interactionKeys.list(user.id),
          context.previousInteractions
        );
      }
      
      console.error('Failed to delete interaction:', err);
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: ['grants'],
      });
    },
    onSettled: () => {
      // Ensure consistency
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: interactionKeys.list(user.id),
        });
      }
    },
  });
}

/**
 * Convenience hooks for specific actions
 */
export function useSaveGrantMutation() {
  const mutation = useInteractionMutation();
  
  return {
    ...mutation,
    saveGrant: (grantId: string, notes?: string) => 
      mutation.mutate({ grantId, action: 'saved', notes }),
  };
}

export function useApplyGrantMutation() {
  const mutation = useInteractionMutation();
  
  return {
    ...mutation,
    applyGrant: (grantId: string, notes?: string) => 
      mutation.mutate({ grantId, action: 'applied', notes }),
  };
}

export function useIgnoreGrantMutation() {
  const mutation = useInteractionMutation();
  
  return {
    ...mutation,
    ignoreGrant: (grantId: string, notes?: string) => 
      mutation.mutate({ grantId, action: 'ignored', notes }),
  };
}