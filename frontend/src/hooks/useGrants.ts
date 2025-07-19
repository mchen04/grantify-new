"use client";

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import supabase from '@/lib/supabaseClient';
import { Grant, GrantFilter } from '@/shared/types/grant';
import { useUserInteractions } from './useInteractions';

/**
 * TanStack Query hooks for grants data
 * 
 * This replaces the complex useFetchGrants hook with industry-standard
 * patterns and integrates seamlessly with the interaction system.
 */

// Query key factory for grants
export const grantKeys = {
  all: ['grants'] as const,
  lists: () => [...grantKeys.all, 'list'] as const,
  list: (filter?: GrantFilter) => [...grantKeys.lists(), filter] as const,
  details: () => [...grantKeys.all, 'detail'] as const,
  detail: (id: string) => [...grantKeys.details(), id] as const,
};

interface GrantsResponse {
  grants: Grant[];
  count: number;
}

/**
 * Hook to fetch grants with filtering and interaction status
 */
export function useGrants(filter?: GrantFilter) {
  const { user } = useAuth();
  const { data: interactions = [] } = useUserInteractions();
  
  return useQuery({
    queryKey: grantKeys.list(filter),
    queryFn: async (): Promise<GrantsResponse> => {
      let query = supabase
        .from('grants')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply filters
      if (filter?.searchTerm) {
        // Search in title and description
        query = query.or(`title.ilike.%${filter.searchTerm}%, description.ilike.%${filter.searchTerm}%`);
      }

      if (filter?.organizations && filter.organizations.length > 0) {
        query = query.in('funding_organization_name', filter.organizations);
      }

      if (filter?.fundingMin) {
        query = query.gte('funding_amount_max', filter.fundingMin);
      }

      if (filter?.fundingMax) {
        query = query.lte('funding_amount_min', filter.fundingMax);
      }

      if (filter?.deadlineMaxDays) {
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(now.getDate() + filter.deadlineMaxDays);
        
        query = query
          .gte('application_deadline', now.toISOString())
          .lte('application_deadline', futureDate.toISOString());
      }

      if (filter?.categories && filter.categories.length > 0) {
        query = query.in('category', filter.categories);
      }

      // Apply pagination
      const page = filter?.page || 1;
      const limit = filter?.limit || 20;
      const offset = (page - 1) * limit;
      
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching grants:', error);
        throw new Error(error.message);
      }

      // Enrich grants with interaction status for authenticated users
      let enrichedGrants = data || [];
      
      if (user?.id && interactions.length > 0) {
        const interactionMap = new Map(
          interactions.map(i => [i.grant_id, i])
        );

        enrichedGrants = enrichedGrants.map(grant => ({
          ...grant,
          interactions: interactionMap.has(grant.id) 
            ? [{
                action: interactionMap.get(grant.id)!.action,
                timestamp: interactionMap.get(grant.id)!.created_at,
              }]
            : null,
        }));

        // Note: Filtering out interacted grants is handled at the component level
        // if needed, not in the query itself
      }

      return {
        grants: enrichedGrants,
        count: count || 0,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    // Refetch when interactions change to update interaction status
    enabled: true,
  });
}

/**
 * Hook to fetch a single grant by ID
 */
export function useGrant(grantId: string) {
  const { user } = useAuth();
  const { data: interactions = [] } = useUserInteractions();

  return useQuery({
    queryKey: grantKeys.detail(grantId),
    queryFn: async (): Promise<Grant | null> => {
      if (!grantId) return null;

      const { data, error } = await supabase
        .from('grants')
        .select('*')
        .eq('id', grantId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Grant not found
          return null;
        }
        console.error('Error fetching grant:', error);
        throw new Error(error.message);
      }

      // Enrich with interaction status
      if (user?.id && interactions.length > 0) {
        const interaction = interactions.find(i => i.grant_id === grantId);
        if (interaction) {
          data.interactions = [{
            action: interaction.action,
            timestamp: interaction.created_at,
          }];
        }
      }

      return data;
    },
    enabled: !!grantId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Hook to get recommended grants based on user preferences
 */
export function useRecommendedGrants() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['grants', 'recommended', user?.id],
    queryFn: async (): Promise<Grant[]> => {
      if (!user?.id) return [];

      // This would ideally call a backend function that uses AI/ML
      // For now, we'll just fetch recent grants
      const { data, error } = await supabase
        .from('grants')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching recommended grants:', error);
        throw new Error(error.message);
      }

      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes for recommendations
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Utility hook to prefetch grants for better UX
 */
export function usePrefetchGrant() {
  const queryClient = useQueryClient();

  return (grantId: string) => {
    queryClient.prefetchQuery({
      queryKey: grantKeys.detail(grantId),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('grants')
          .select('*')
          .eq('id', grantId)
          .single();

        if (error) throw new Error(error.message);
        return data;
      },
      staleTime: 5 * 60 * 1000,
    });
  };
}

/**
 * Hook to get grants statistics
 */
export function useGrantsStats() {
  return useQuery({
    queryKey: ['grants', 'stats'],
    queryFn: async () => {
      const { count: totalGrants, error } = await supabase
        .from('grants')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error('Error fetching grants stats:', error);
        throw new Error(error.message);
      }

      return {
        totalGrants: totalGrants || 0,
      };
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  });
}