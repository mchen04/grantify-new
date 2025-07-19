import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useThreadSafeState, useStateCoordinator } from './useThreadSafeState';

interface UrlStateConfig {
  debounceMs?: number;
  enableHistory?: boolean;
  syncOnMount?: boolean;
  ignoreKeys?: string[];
  transformKeys?: Record<string, (value: any) => string>;
  parseKeys?: Record<string, (value: string) => any>;
  validateState?: (state: any) => boolean;
  onStateChange?: (newState: any, source: 'url' | 'state') => void;
  onError?: (error: Error, operation: string) => void;
}

interface UrlStateOperation {
  type: 'update_url' | 'update_state' | 'sync';
  data: any;
  timestamp: number;
  source: 'url' | 'state' | 'navigation';
}

/**
 * Thread-safe hook for synchronizing component state with URL parameters
 * Prevents race conditions between URL updates and state changes
 */
export function useThreadSafeUrlState<T extends Record<string, any>>(
  initialState: T,
  config: UrlStateConfig = {}
): {
  state: T;
  updateState: (updates: Partial<T>, updateUrl?: boolean) => Promise<void>;
  updateUrl: (params: Record<string, string | null>, replace?: boolean) => Promise<void>;
  syncFromUrl: () => Promise<void>;
  syncToUrl: (replace?: boolean) => Promise<void>;
  isOperationPending: (type?: string) => boolean;
  getOperationHistory: () => UrlStateOperation[];
  resetState: () => void;
} {
  const {
    debounceMs = 300,
    enableHistory = true,
    syncOnMount = true,
    ignoreKeys = [],
    transformKeys = {},
    parseKeys = {},
    validateState = () => true,
    onStateChange,
    onError
  } = config;

  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Thread-safe state management
  const {
    state,
    setState,
    updateStateAsync,
    isPending,
    getSnapshot
  } = useThreadSafeState<T>(initialState, {
    debounceMs: debounceMs,
    enableOptimisticUpdates: true,
    maxRetries: 3,
    onError: (error, operationId) => {
      console.error(`[ThreadSafeUrlState] Operation ${operationId} failed:`, error);
      onError?.(error, operationId);
    }
  });

  // Operation coordination
  const { coordinatedOperation, isOperationActive, getQueueStatus } = useStateCoordinator();

  // Operation history tracking
  const operationHistory = useRef<UrlStateOperation[]>([]);
  const lastSyncTimestamp = useRef<number>(0);
  const isNavigating = useRef<boolean>(false);

  // Debounce timer for URL updates
  const urlUpdateTimer = useRef<NodeJS.Timeout | null>(null);

  /**
   * Add operation to history
   */
  const addToHistory = useCallback((operation: UrlStateOperation) => {
    operationHistory.current.push(operation);
    if (operationHistory.current.length > 50) {
      operationHistory.current.shift();
    }
  }, []);

  /**
   * Transform state value to URL parameter
   */
  const transformValueForUrl = useCallback((key: string, value: any): string | null => {
    if (value === null || value === undefined) {
      return null;
    }

    if (transformKeys[key]) {
      return transformKeys[key](value);
    }

    // Default transformations
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }

    if (typeof value === 'number') {
      return value.toString();
    }

    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(',') : null;
    }

    return String(value);
  }, [transformKeys]);

  /**
   * Parse URL parameter to state value
   */
  const parseValueFromUrl = useCallback((key: string, value: string): any => {
    if (parseKeys[key]) {
      return parseKeys[key](value);
    }

    // Default parsing
    if (value === 'true') return true;
    if (value === 'false') return false;
    
    // Try to parse as number
    if (!isNaN(Number(value)) && value !== '') {
      return Number(value);
    }

    // Try to parse as array
    if (value.includes(',')) {
      return value.split(',').map(v => v.trim()).filter(v => v !== '');
    }

    return value;
  }, [parseKeys]);

  /**
   * Create URL search params from state
   */
  const createUrlParams = useCallback((stateData: T): URLSearchParams => {
    const params = new URLSearchParams();
    
    Object.entries(stateData).forEach(([key, value]) => {
      if (ignoreKeys.includes(key)) {
        return;
      }

      const transformedValue = transformValueForUrl(key, value);
      if (transformedValue !== null && transformedValue !== '') {
        params.set(key, transformedValue);
      }
    });

    return params;
  }, [ignoreKeys, transformValueForUrl]);

  /**
   * Parse state from URL search params
   */
  const parseStateFromUrl = useCallback((urlParams: URLSearchParams): Partial<T> => {
    const parsedState: Partial<T> = {};

    urlParams.forEach((value, key) => {
      if (ignoreKeys.includes(key)) {
        return;
      }

      try {
        parsedState[key as keyof T] = parseValueFromUrl(key, value);
      } catch (error) {
        console.warn(`[ThreadSafeUrlState] Failed to parse URL param ${key}:`, error);
      }
    });

    return parsedState;
  }, [ignoreKeys, parseValueFromUrl]);

  /**
   * Update component state with thread safety
   */
  const updateState = useCallback(
    async (updates: Partial<T>, updateUrl = true): Promise<void> => {
      const operationId = `update_state_${Date.now()}`;

      return coordinatedOperation(
        operationId,
        async () => {
          return updateStateAsync(
            async (currentState) => {
              const newState = { ...currentState, ...updates };

              // Validate state if validator provided
              if (!validateState(newState)) {
                throw new Error('State validation failed');
              }

              // Record operation
              addToHistory({
                type: 'update_state',
                data: updates,
                timestamp: Date.now(),
                source: 'state'
              });

              // Notify of state change
              onStateChange?.(newState, 'state');

              // Schedule URL update if requested
              if (updateUrl) {
                // Debounce URL updates to prevent excessive history entries
                if (urlUpdateTimer.current) {
                  clearTimeout(urlUpdateTimer.current);
                }

                urlUpdateTimer.current = setTimeout(() => {
                  syncToUrl(!enableHistory).catch(error => {
                    console.error('[ThreadSafeUrlState] Failed to sync to URL:', error);
                  });
                }, debounceMs);
              }

              return {
                newState,
                result: undefined
              };
            },
            // Optimistic update
            (prev) => ({ ...prev, ...updates })
          );
        },
        { allowConcurrent: false, priority: 'high' }
      );
    },
    [
      coordinatedOperation,
      updateStateAsync,
      validateState,
      addToHistory,
      onStateChange,
      debounceMs,
      enableHistory
    ]
  );

  /**
   * Update URL with thread safety
   */
  const updateUrl = useCallback(
    async (params: Record<string, string | null>, replace = false): Promise<void> => {
      const operationId = `update_url_${Date.now()}`;

      return coordinatedOperation(
        operationId,
        async () => {
          const currentParams = new URLSearchParams(searchParams);

          // Update parameters
          Object.entries(params).forEach(([key, value]) => {
            if (value === null) {
              currentParams.delete(key);
            } else {
              currentParams.set(key, value);
            }
          });

          const newUrl = `${pathname}?${currentParams.toString()}`;

          // Record operation
          addToHistory({
            type: 'update_url',
            data: params,
            timestamp: Date.now(),
            source: 'url'
          });

          // Use router to update URL
          isNavigating.current = true;
          try {
            if (replace) {
              router.replace(newUrl);
            } else {
              router.push(newUrl);
            }
          } finally {
            // Reset navigation flag after a delay
            setTimeout(() => {
              isNavigating.current = false;
            }, 100);
          }
        },
        { allowConcurrent: false, priority: 'normal' }
      );
    },
    [coordinatedOperation, searchParams, pathname, router, addToHistory]
  );

  /**
   * Sync state from URL parameters
   */
  const syncFromUrl = useCallback(async (): Promise<void> => {
    const operationId = `sync_from_url_${Date.now()}`;

    return coordinatedOperation(
      operationId,
      async () => {
        const urlParams = new URLSearchParams(searchParams);
        const parsedState = parseStateFromUrl(urlParams);

        if (Object.keys(parsedState).length === 0) {
          return; // No URL params to sync
        }

        return updateStateAsync(
          async (currentState) => {
            const newState = { ...currentState, ...parsedState };

            // Validate merged state
            if (!validateState(newState)) {
              console.warn('[ThreadSafeUrlState] URL state validation failed, keeping current state');
              return { newState: currentState, result: undefined };
            }

            // Record operation
            addToHistory({
              type: 'sync',
              data: parsedState,
              timestamp: Date.now(),
              source: 'url'
            });

            // Notify of state change
            onStateChange?.(newState, 'url');

            lastSyncTimestamp.current = Date.now();

            return {
              newState,
              result: undefined
            };
          },
          // No optimistic update for URL sync
          undefined
        );
      },
      { allowConcurrent: false, priority: 'high' }
    );
  }, [
    coordinatedOperation,
    searchParams,
    parseStateFromUrl,
    updateStateAsync,
    validateState,
    addToHistory,
    onStateChange
  ]);

  /**
   * Sync state to URL parameters
   */
  const syncToUrl = useCallback(
    async (replace = true): Promise<void> => {
      const operationId = `sync_to_url_${Date.now()}`;

      return coordinatedOperation(
        operationId,
        async () => {
          const currentState = getSnapshot();
          const urlParams = createUrlParams(currentState);
          const newUrl = `${pathname}?${urlParams.toString()}`;

          // Record operation
          addToHistory({
            type: 'sync',
            data: currentState,
            timestamp: Date.now(),
            source: 'state'
          });

          // Update URL
          isNavigating.current = true;
          try {
            if (replace) {
              router.replace(newUrl);
            } else {
              router.push(newUrl);
            }
          } finally {
            setTimeout(() => {
              isNavigating.current = false;
            }, 100);
          }

          lastSyncTimestamp.current = Date.now();
        },
        { allowConcurrent: false, priority: 'normal' }
      );
    },
    [coordinatedOperation, getSnapshot, createUrlParams, pathname, router, addToHistory]
  );

  /**
   * Reset state to initial values
   */
  const resetState = useCallback(() => {
    setState(initialState);
    
    // Clear URL parameters
    if (enableHistory) {
      router.replace(pathname);
    }

    addToHistory({
      type: 'update_state',
      data: initialState,
      timestamp: Date.now(),
      source: 'state'
    });
  }, [setState, initialState, enableHistory, router, pathname, addToHistory]);

  /**
   * Check if specific operation type is pending
   */
  const isOperationPending = useCallback(
    (type?: string): boolean => {
      if (!type) {
        return isPending || isOperationActive('sync_from_url') || isOperationActive('sync_to_url');
      }

      return isOperationActive(type);
    },
    [isPending, isOperationActive]
  );

  /**
   * Get operation history
   */
  const getOperationHistory = useCallback((): UrlStateOperation[] => {
    return [...operationHistory.current].reverse(); // Most recent first
  }, []);

  // Sync from URL on mount if enabled
  useEffect(() => {
    if (syncOnMount && searchParams.size > 0) {
      syncFromUrl().catch(error => {
        console.error('[ThreadSafeUrlState] Failed to sync from URL on mount:', error);
      });
    }
  }, [syncOnMount, syncFromUrl]); // Only run on mount

  // Listen for URL changes (browser navigation)
  useEffect(() => {
    // Only sync if not currently navigating (to avoid infinite loops)
    if (!isNavigating.current && searchParams.size > 0) {
      const currentTime = Date.now();
      
      // Debounce URL change handling
      if (currentTime - lastSyncTimestamp.current > 500) {
        syncFromUrl().catch(error => {
          console.error('[ThreadSafeUrlState] Failed to sync from URL change:', error);
        });
      }
    }
  }, [searchParams, syncFromUrl]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (urlUpdateTimer.current) {
        clearTimeout(urlUpdateTimer.current);
      }
    };
  }, []);

  return {
    state,
    updateState,
    updateUrl,
    syncFromUrl,
    syncToUrl,
    isOperationPending,
    getOperationHistory,
    resetState
  };
}