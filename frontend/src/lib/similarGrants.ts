import apiClient from './apiClient';

/**
 * Fetch similar grants based on embeddings similarity
 * @param grantId - The ID of the current grant
 * @param categories - The categories of the current grant (kept for fallback compatibility)
 * @param limit - The maximum number of similar grants to return
 * @param matchThreshold - Similarity threshold for matching (0.0 to 1.0, default 0.7)
 * @returns Promise<Array> - Array of similar grants
 */
export async function fetchSimilarGrants(
  grantId: string,
  categories: string[] | null,
  limit: number = 3,
  matchThreshold: number = 0.7
) {
  try {
    // Build query parameters for embeddings-based similarity
    const queryParams: Record<string, any> = {
      exclude_id: grantId,
      limit: limit,
      match_threshold: matchThreshold
    };
    
    // Fetch similar grants using embeddings-based endpoint
    const { data, error } = await apiClient.grants.getSimilarGrants(queryParams);
    
    if (error) {
      // Silently return empty array on error
      return [];
    }
    
    return data?.grants || [];
  } catch (error) {
    // Silently return empty array on error
    return [];
  }
}

/**
 * Format a grant for display in the similar grants section
 * @param grant - The grant to format
 * @returns Object - Formatted grant data
 */
export function formatSimilarGrant(grant: any) {
  // Format the deadline
  let deadline = 'No deadline specified';
  if (grant.close_date) {
    deadline = new Date(grant.close_date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    
    // Add days remaining if there's a deadline
    const daysRemaining = Math.ceil(
      (new Date(grant.close_date).getTime() - new Date().getTime()) / 
      (1000 * 60 * 60 * 24)
    );
    
    if (daysRemaining > 0) {
      deadline += ` (${daysRemaining} days left)`;
    }
  } else {
    deadline = 'Open-ended opportunity';
  }
  
  return {
    id: grant.id,
    title: grant.title,
    agency: grant.data_source || grant.agency_name,
    deadline,
  };
}