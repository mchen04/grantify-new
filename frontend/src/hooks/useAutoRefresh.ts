import { useEffect, useRef, useState } from 'react';
import { useUserPreferences } from './useUserPreferences';

interface UseAutoRefreshOptions {
  userId?: string;
  onRefresh: () => void | Promise<void>;
  enabled?: boolean;
  interval?: number; // in minutes
}

export const useAutoRefresh = (options: UseAutoRefreshOptions) => {
  const { preferences } = useUserPreferences({ 
    userId: options.userId, 
    enabled: !!options.userId 
  });
  const [isActive, setIsActive] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get auto-refresh settings from preferences or options
  const enabled = options.enabled ?? preferences?.auto_refresh_enabled ?? false;
  const intervalMinutes = options.interval ?? preferences?.auto_refresh_interval ?? 5;

  const startAutoRefresh = () => {
    if (!enabled || intervalRef.current) return;

    const intervalMs = intervalMinutes * 60 * 1000; // Convert minutes to milliseconds
    
    intervalRef.current = setInterval(async () => {
      try {
        await options.onRefresh();
        setLastRefresh(new Date());
      } catch (error) {
        
      }
    }, intervalMs);

    setIsActive(true);
  };

  const stopAutoRefresh = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsActive(false);
  };

  const toggleAutoRefresh = () => {
    if (isActive) {
      stopAutoRefresh();
    } else {
      startAutoRefresh();
    }
  };

  const manualRefresh = async () => {
    try {
      await options.onRefresh();
      setLastRefresh(new Date());
    } catch (error) {
      
    }
  };

  // Start/stop auto-refresh based on enabled state
  useEffect(() => {
    if (enabled && !isActive) {
      startAutoRefresh();
    } else if (!enabled && isActive) {
      stopAutoRefresh();
    }
  }, [enabled, intervalMinutes]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAutoRefresh();
    };
  }, []);

  return {
    isActive,
    enabled,
    intervalMinutes,
    lastRefresh,
    startAutoRefresh,
    stopAutoRefresh,
    toggleAutoRefresh,
    manualRefresh,
  };
};