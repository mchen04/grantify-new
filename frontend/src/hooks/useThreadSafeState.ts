import { useState, useCallback, useRef, useEffect } from 'react';

interface PendingOperation<T> {
  id: string;
  timestamp: number;
  operation: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
}

interface ThreadSafeStateConfig {
  debounceMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  enableOptimisticUpdates?: boolean;
  onError?: (error: Error, operation: string) => void;
}

/**
 * Thread-safe state hook that prevents race conditions in React components
 * Provides atomic operations, optimistic updates, and operation coordination
 */
export function useThreadSafeState<T>(
  initialValue: T,
  config: ThreadSafeStateConfig = {}
): {
  state: T;
  setState: (newState: T | ((prev: T) => T)) => void;
  updateStateAsync: <R>(
    operation: (currentState: T) => Promise<{ newState: T; result: R }>,
    optimisticState?: T | ((prev: T) => T)
  ) => Promise<R>;
  isPending: boolean;
  pendingCount: number;
  resetState: () => void;
  getSnapshot: () => T;
} {
  const {
    debounceMs = 0,
    maxRetries = 3,
    retryDelayMs = 1000,
    enableOptimisticUpdates = true,
    onError
  } = config;

  // Main state
  const [state, setStateInternal] = useState<T>(initialValue);
  
  // Operation tracking
  const [isPending, setIsPending] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  
  // Operation queue and coordination
  const pendingOperations = useRef<Map<string, PendingOperation<any>>>(new Map());
  const operationCounter = useRef(0);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const isUnmounted = useRef(false);
  
  // Snapshot for rollback scenarios
  const stateSnapshot = useRef<T>(initialValue);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isUnmounted.current = true;
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      // Cancel all pending operations
      pendingOperations.current.forEach(op => {
        op.reject(new Error('Component unmounted'));
      });
      pendingOperations.current.clear();
    };
  }, []);

  // Update snapshot when state changes
  useEffect(() => {
    stateSnapshot.current = state;
  }, [state]);

  /**
   * Thread-safe setState with optional debouncing
   */
  const setState = useCallback((newState: T | ((prev: T) => T)) => {
    if (isUnmounted.current) return;

    if (debounceMs > 0) {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      
      debounceTimer.current = setTimeout(() => {
        if (!isUnmounted.current) {
          setStateInternal(newState);
        }
      }, debounceMs);
    } else {
      setStateInternal(newState);
    }
  }, [debounceMs]);

  /**
   * Execute an async operation with atomic state updates
   */
  const updateStateAsync = useCallback(
    async <R>(
      operation: (currentState: T) => Promise<{ newState: T; result: R }>,
      optimisticState?: T | ((prev: T) => T)
    ): Promise<R> => {
      if (isUnmounted.current) {
        throw new Error('Cannot execute operation on unmounted component');
      }

      const operationId = `op_${++operationCounter.current}_${Date.now()}`;
      const originalState = stateSnapshot.current;

      // Apply optimistic update if provided
      if (enableOptimisticUpdates && optimisticState !== undefined) {
        setState(optimisticState);
      }

      return new Promise<R>((resolve, reject) => {
        const pendingOp: PendingOperation<R> = {
          id: operationId,
          timestamp: Date.now(),
          operation: async () => {
            let retryCount = 0;
            
            while (retryCount <= maxRetries) {
              try {
                // Get current state at operation time
                const currentState = stateSnapshot.current;
                const result = await operation(currentState);
                
                // Atomically update state with result
                if (!isUnmounted.current) {
                  setState(result.newState);
                }
                
                return result.result;
              } catch (error) {
                retryCount++;
                
                if (retryCount > maxRetries) {
                  // Rollback optimistic update on final failure
                  if (enableOptimisticUpdates && optimisticState !== undefined && !isUnmounted.current) {
                    setState(originalState);
                  }
                  throw error;
                }
                
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, retryDelayMs * retryCount));
              }
            }
            
            throw new Error('Max retries exceeded');
          },
          resolve,
          reject
        };

        pendingOperations.current.set(operationId, pendingOp);
        setPendingCount(prev => prev + 1);
        setIsPending(true);

        // Execute the operation
        pendingOp.operation()
          .then(result => {
            if (!isUnmounted.current) {
              pendingOp.resolve(result);
            }
          })
          .catch(error => {
            if (onError) {
              onError(error, operationId);
            }
            if (!isUnmounted.current) {
              pendingOp.reject(error);
            }
          })
          .finally(() => {
            pendingOperations.current.delete(operationId);
            setPendingCount(prev => {
              const newCount = prev - 1;
              if (newCount === 0) {
                setIsPending(false);
              }
              return newCount;
            });
          });
      });
    },
    [setState, maxRetries, retryDelayMs, enableOptimisticUpdates, onError]
  );

  /**
   * Reset state to initial value
   */
  const resetState = useCallback(() => {
    if (isUnmounted.current) return;
    
    setState(initialValue);
    stateSnapshot.current = initialValue;
  }, [initialValue, setState]);

  /**
   * Get current state snapshot
   */
  const getSnapshot = useCallback(() => {
    return stateSnapshot.current;
  }, []);

  return {
    state,
    setState,
    updateStateAsync,
    isPending,
    pendingCount,
    resetState,
    getSnapshot
  };
}

/**
 * Hook for coordinating multiple thread-safe state operations
 */
export function useStateCoordinator() {
  const activeOperations = useRef<Set<string>>(new Set());
  const operationQueue = useRef<Array<() => Promise<void>>>([]);
  const isProcessing = useRef(false);

  /**
   * Execute operation with coordination to prevent conflicts
   */
  const coordinatedOperation = useCallback(
    async <T>(
      operationId: string,
      operation: () => Promise<T>,
      options: {
        allowConcurrent?: boolean;
        priority?: 'high' | 'normal' | 'low';
      } = {}
    ): Promise<T> => {
      const { allowConcurrent = false, priority = 'normal' } = options;

      // Check if operation is already running
      if (!allowConcurrent && activeOperations.current.has(operationId)) {
        throw new Error(`Operation ${operationId} is already in progress`);
      }

      return new Promise<T>((resolve, reject) => {
        const wrappedOperation = async () => {
          activeOperations.current.add(operationId);
          
          try {
            const result = await operation();
            resolve(result);
          } catch (error) {
            reject(error);
          } finally {
            activeOperations.current.delete(operationId);
          }
        };

        // Add to queue based on priority
        if (priority === 'high') {
          operationQueue.current.unshift(wrappedOperation);
        } else {
          operationQueue.current.push(wrappedOperation);
        }

        // Process queue if not already processing
        if (!isProcessing.current) {
          processQueue();
        }
      });
    },
    []
  );

  /**
   * Process the operation queue
   */
  const processQueue = useCallback(async () => {
    if (isProcessing.current || operationQueue.current.length === 0) {
      return;
    }

    isProcessing.current = true;

    while (operationQueue.current.length > 0) {
      const operation = operationQueue.current.shift();
      if (operation) {
        try {
          await operation();
        } catch (error) {
          // Individual operation errors are handled by the wrappedOperation
          console.error('Operation queue error:', error);
        }
      }
    }

    isProcessing.current = false;
  }, []);

  /**
   * Check if an operation is currently active
   */
  const isOperationActive = useCallback((operationId: string): boolean => {
    return activeOperations.current.has(operationId);
  }, []);

  /**
   * Get queue status
   */
  const getQueueStatus = useCallback(() => {
    return {
      activeOperations: Array.from(activeOperations.current),
      queueLength: operationQueue.current.length,
      isProcessing: isProcessing.current
    };
  }, []);

  return {
    coordinatedOperation,
    isOperationActive,
    getQueueStatus
  };
}