import React, { useRef, useEffect, useCallback } from 'react';

interface CleanupFunction {
  (): void;
}

interface AsyncOperationController {
  cancel(): void;
  isCancelled(): boolean;
}

interface TimerController {
  clear(): void;
  isActive(): boolean;
}

interface CleanupRegistry {
  // Async operation cleanup
  addAsyncOperation: (controller: AsyncOperationController) => void;
  removeAsyncOperation: (controller: AsyncOperationController) => void;
  cancelAllAsyncOperations: () => void;
  
  // Timer cleanup
  addTimer: (timer: NodeJS.Timeout, type?: string) => TimerController;
  clearTimer: (timer: NodeJS.Timeout) => void;
  clearAllTimers: () => void;
  
  // Generic cleanup functions
  addCleanup: (cleanup: CleanupFunction, id?: string) => void;
  removeCleanup: (id: string) => void;
  runAllCleanup: () => void;
  
  // Component lifecycle state
  isMounted: () => boolean;
  isUnmounting: () => boolean;
  
  // Safe async execution
  safeAsync: <T>(operation: () => Promise<T>) => Promise<T | null>;
  safeSetState: <T>(setter: (value: T) => void) => (value: T) => void;
}

/**
 * Comprehensive cleanup hook that prevents race conditions from async operations
 * continuing after component unmount
 */
export function useCleanupOnUnmount(): CleanupRegistry {
  const mountedRef = useRef(true);
  const unmountingRef = useRef(false);
  const asyncOperations = useRef<Set<AsyncOperationController>>(new Set());
  const timers = useRef<Map<NodeJS.Timeout, string>>(new Map());
  const cleanupFunctions = useRef<Map<string, CleanupFunction>>(new Map());
  const cleanupCounter = useRef(0);

  /**
   * Add async operation for cleanup tracking
   */
  const addAsyncOperation = useCallback((controller: AsyncOperationController) => {
    if (unmountingRef.current) {
      // Component is unmounting, immediately cancel
      controller.cancel();
      return;
    }
    
    asyncOperations.current.add(controller);
  }, []);

  /**
   * Remove async operation from tracking
   */
  const removeAsyncOperation = useCallback((controller: AsyncOperationController) => {
    asyncOperations.current.delete(controller);
  }, []);

  /**
   * Cancel all tracked async operations
   */
  const cancelAllAsyncOperations = useCallback(() => {
    asyncOperations.current.forEach(controller => {
      try {
        controller.cancel();
      } catch (error) {
        console.warn('[useCleanupOnUnmount] Error cancelling async operation:', error);
      }
    });
    asyncOperations.current.clear();
  }, []);

  /**
   * Add timer for cleanup tracking
   */
  const addTimer = useCallback((timer: NodeJS.Timeout, type = 'generic'): TimerController => {
    if (unmountingRef.current) {
      // Component is unmounting, immediately clear
      clearTimeout(timer);
      return {
        clear: () => {},
        isActive: () => false
      };
    }

    timers.current.set(timer, type);

    return {
      clear: () => {
        clearTimeout(timer);
        timers.current.delete(timer);
      },
      isActive: () => timers.current.has(timer)
    };
  }, []);

  /**
   * Clear specific timer
   */
  const clearTimer = useCallback((timer: NodeJS.Timeout) => {
    clearTimeout(timer);
    timers.current.delete(timer);
  }, []);

  /**
   * Clear all tracked timers
   */
  const clearAllTimers = useCallback(() => {
    timers.current.forEach((type, timer) => {
      try {
        clearTimeout(timer);
      } catch (error) {
        console.warn('[useCleanupOnUnmount] Error clearing timer:', error);
      }
    });
    timers.current.clear();
  }, []);

  /**
   * Add generic cleanup function
   */
  const addCleanup = useCallback((cleanup: CleanupFunction, id?: string) => {
    const cleanupId = id || `cleanup_${++cleanupCounter.current}`;
    cleanupFunctions.current.set(cleanupId, cleanup);
  }, []);

  /**
   * Remove specific cleanup function
   */
  const removeCleanup = useCallback((id: string) => {
    cleanupFunctions.current.delete(id);
  }, []);

  /**
   * Run all cleanup functions
   */
  const runAllCleanup = useCallback(() => {
    cleanupFunctions.current.forEach((cleanup, id) => {
      try {
        cleanup();
      } catch (error) {
        console.warn(`[useCleanupOnUnmount] Error running cleanup ${id}:`, error);
      }
    });
    cleanupFunctions.current.clear();
  }, []);

  /**
   * Check if component is still mounted
   */
  const isMounted = useCallback(() => {
    return mountedRef.current && !unmountingRef.current;
  }, []);

  /**
   * Check if component is unmounting
   */
  const isUnmounting = useCallback(() => {
    return unmountingRef.current;
  }, []);

  /**
   * Execute async operation safely with automatic cancellation on unmount
   */
  const safeAsync = useCallback(async <T>(operation: () => Promise<T>): Promise<T | null> => {
    if (!isMounted()) {
      return null;
    }

    let cancelled = false;
    const controller: AsyncOperationController = {
      cancel: () => { cancelled = true; },
      isCancelled: () => cancelled
    };

    addAsyncOperation(controller);

    try {
      const result = await operation();
      
      // Check if operation was cancelled or component unmounted
      if (cancelled || !isMounted()) {
        return null;
      }

      return result;
    } catch (error) {
      // Only throw if not cancelled and component is still mounted
      if (!cancelled && isMounted()) {
        throw error;
      }
      return null;
    } finally {
      removeAsyncOperation(controller);
    }
  }, [isMounted, addAsyncOperation, removeAsyncOperation]);

  /**
   * Create safe state setter that only executes if component is mounted
   */
  const safeSetState = useCallback(<T>(setter: (value: T) => void) => {
    return (value: T) => {
      if (isMounted()) {
        setter(value);
      }
    };
  }, [isMounted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unmountingRef.current = true;
      mountedRef.current = false;

      // Cancel all async operations
      cancelAllAsyncOperations();
      
      // Clear all timers
      clearAllTimers();
      
      // Run all cleanup functions
      runAllCleanup();
    };
  }, [cancelAllAsyncOperations, clearAllTimers, runAllCleanup]);

  return {
    addAsyncOperation,
    removeAsyncOperation,
    cancelAllAsyncOperations,
    addTimer,
    clearTimer,
    clearAllTimers,
    addCleanup,
    removeCleanup,
    runAllCleanup,
    isMounted,
    isUnmounting,
    safeAsync,
    safeSetState
  };
}

/**
 * Higher-order component wrapper that provides automatic cleanup
 * Note: Use the individual hooks directly instead of this HOC for better type safety
 */
export function withCleanupOnUnmount<P extends Record<string, any>>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  return function CleanupWrapper(props: P) {
    // Just provide the hooks, components should use them directly
    useCleanupOnUnmount();
    return React.createElement(Component, props);
  };
}

/**
 * Create an AbortController that's automatically cleaned up on unmount
 */
export function useAbortController(): AbortController | null {
  const cleanup = useCleanupOnUnmount();
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!controllerRef.current) {
      controllerRef.current = new AbortController();
      
      // Add to cleanup registry
      cleanup.addAsyncOperation({
        cancel: () => {
          if (controllerRef.current && !controllerRef.current.signal.aborted) {
            controllerRef.current.abort();
          }
        },
        isCancelled: () => controllerRef.current?.signal.aborted ?? true
      });
    }

    return () => {
      if (controllerRef.current && !controllerRef.current.signal.aborted) {
        controllerRef.current.abort();
      }
    };
  }, [cleanup]);

  return controllerRef.current;
}

/**
 * Safe interval that's automatically cleaned up on unmount
 */
export function useSafeInterval(
  callback: () => void,
  delay: number | null,
  immediate = false
): { start: () => void; stop: () => void; isActive: () => boolean } {
  const cleanup = useCleanupOnUnmount();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);

  // Update callback ref
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const start = useCallback(() => {
    if (intervalRef.current || delay === null || !cleanup.isMounted()) {
      return;
    }

    if (immediate) {
      callbackRef.current();
    }

    intervalRef.current = setInterval(() => {
      if (cleanup.isMounted()) {
        callbackRef.current();
      }
    }, delay);

    // Add to cleanup registry
    cleanup.addTimer(intervalRef.current, 'interval');
  }, [delay, immediate, cleanup]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      cleanup.clearTimer(intervalRef.current);
      intervalRef.current = null;
    }
  }, [cleanup]);

  const isActive = useCallback(() => {
    return intervalRef.current !== null;
  }, []);

  // Auto-start if delay is provided
  useEffect(() => {
    if (delay !== null) {
      start();
    }
    return stop;
  }, [delay, start, stop]);

  return { start, stop, isActive };
}

/**
 * Safe timeout that's automatically cleaned up on unmount
 */
export function useSafeTimeout(): {
  set: (callback: () => void, delay: number) => () => void;
  clear: (timer: NodeJS.Timeout) => void;
  clearAll: () => void;
} {
  const cleanup = useCleanupOnUnmount();

  const set = useCallback((callback: () => void, delay: number): (() => void) => {
    if (!cleanup.isMounted()) {
      return () => {};
    }

    const timer = setTimeout(() => {
      if (cleanup.isMounted()) {
        callback();
      }
    }, delay);

    const controller = cleanup.addTimer(timer, 'timeout');
    
    return () => controller.clear();
  }, [cleanup]);

  const clear = useCallback((timer: NodeJS.Timeout) => {
    cleanup.clearTimer(timer);
  }, [cleanup]);

  const clearAll = useCallback(() => {
    cleanup.clearAllTimers();
  }, [cleanup]);

  return { set, clear, clearAll };
}