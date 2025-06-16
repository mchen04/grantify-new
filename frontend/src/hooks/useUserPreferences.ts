import { useState, useEffect, useCallback } from 'react';
import { usersApi } from '@/lib/apiClient';
import { UserPreferences } from '@/types/user';
import { DEFAULT_USER_PREFERENCES } from '@/lib/config';
import { useAuth } from '@/contexts/AuthContext';

interface UseUserPreferencesProps {
  userId: string | undefined;
  enabled?: boolean;
}

interface UseUserPreferencesReturn {
  preferences: UserPreferences | null;
  loading: boolean;
  error: string | null;
  fetchPreferences: () => Promise<void>;
  updatePreferences: (newPreferences: Partial<UserPreferences>) => Promise<void>;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for fetching and managing user preferences using API client
 */
export function useUserPreferences({
  userId,
  enabled = true
}: UseUserPreferencesProps): UseUserPreferencesReturn {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { session } = useAuth();
  const accessToken = session?.access_token;

  const fetchPreferences = useCallback(async () => {
    if (!userId || !enabled) {
      setPreferences(null);
      setLoading(false);
      return;
    }
    if (!accessToken) {
      setError("Access token not available. Please log in.");
      setPreferences(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await usersApi.getUserPreferences(userId, accessToken);

      if (response.error) {
        
        setError(`Failed to load preferences: ${response.error}.`);
        setPreferences(null);
      } else if (response.data) {
        setPreferences(response.data);
      } else {
        // No preferences found, set defaults
        setPreferences({
          user_id: userId,
          funding_min: DEFAULT_USER_PREFERENCES.funding_min,
          funding_max: DEFAULT_USER_PREFERENCES.funding_max,
          deadline_range: DEFAULT_USER_PREFERENCES.deadline_range,
          agencies: DEFAULT_USER_PREFERENCES.agencies,
          project_description_query: null
        });
      }
    } catch (err: any) {
      
      setError('An unexpected error occurred while fetching preferences.');
      setPreferences(null);
    } finally {
      setLoading(false);
    }
  }, [userId, enabled, accessToken]);

  const updatePreferences = useCallback(async (newPreferences: Partial<UserPreferences>) => {
    if (!userId || !accessToken) {
      setError('You must be logged in to update preferences.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Merge with existing preferences
      const updatedPreferences = {
        ...preferences,
        ...newPreferences,
        user_id: userId
      };
      
      const response = await usersApi.updateUserPreferences(userId, updatedPreferences, accessToken);

      if (response.error) {
        throw new Error(response.error);
      }
      await fetchPreferences(); // Refetch to get the updated preferences
    } catch (err: any) {
      
      setError(`Failed to update preferences: ${err.message}. Please try again.`);
    } finally {
      setLoading(false);
    }
  }, [userId, accessToken, preferences, fetchPreferences]);

  useEffect(() => {
    if (enabled) {
      fetchPreferences();
    }
  }, [fetchPreferences, enabled]);

  return {
    preferences,
    loading,
    error,
    fetchPreferences,
    updatePreferences,
    refetch: fetchPreferences
  };
}