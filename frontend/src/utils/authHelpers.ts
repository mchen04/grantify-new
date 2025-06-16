import { User, Session } from '@supabase/supabase-js';

/**
 * Helper functions to determine authentication and session readiness
 */

/**
 * Checks if authentication is ready for data fetching
 * Returns true when:
 * - Auth loading is complete AND
 * - If user exists, session with access token is available
 * - If no user, we can proceed with anonymous requests
 */
export function isAuthReady(
  authLoading: boolean,
  user: User | null,
  session: Session | null
): boolean {
  // Still loading auth state
  if (authLoading) {
    return false;
  }

  // No user = ready for anonymous requests
  if (!user) {
    return true;
  }

  // User exists = need valid session with access token
  return !!(session?.access_token);
}

/**
 * Checks if user interactions can be safely fetched
 */
export function canFetchUserData(
  user: User | null,
  session: Session | null
): boolean {
  return !!(user && session?.access_token);
}

/**
 * Gets a safe loading state message based on current auth state
 */
export function getLoadingStateMessage(
  authLoading: boolean,
  user: User | null,
  session: Session | null
): string {
  if (authLoading) {
    return 'Checking authentication...';
  }

  if (user && !session?.access_token) {
    return 'Initializing session...';
  }

  return 'Loading...';
}