/**
 * Singleton manager to prevent duplicate initialization calls
 * Especially important in React StrictMode which double-invokes effects
 */
class InitializationManager {
  private initPromises: Map<string, Promise<any>> = new Map();
  private completedInits: Set<string> = new Set();

  /**
   * Ensures an initialization function runs only once
   * Returns the result of the first call for subsequent attempts
   */
  async runOnce<T>(key: string, initFn: () => Promise<T>): Promise<T> {
    // If already completed, return immediately
    if (this.completedInits.has(key)) {
      // Skipping duplicate init
      return Promise.resolve({} as T);
    }

    // If already in progress, return the existing promise
    const existingPromise = this.initPromises.get(key);
    if (existingPromise) {
      // Returning existing promise
      return existingPromise;
    }

    // Start new initialization
    // Starting initialization
    const promise = initFn()
      .then(result => {
        this.completedInits.add(key);
        this.initPromises.delete(key);
        return result;
      })
      .catch(error => {
        // On error, remove from promises to allow retry
        this.initPromises.delete(key);
        throw error;
      });

    this.initPromises.set(key, promise);
    return promise;
  }

  /**
   * Reset a specific initialization (useful for logout/cleanup)
   */
  reset(key: string) {
    this.completedInits.delete(key);
    this.initPromises.delete(key);
  }

  /**
   * Reset all initializations
   */
  resetAll() {
    this.completedInits.clear();
    this.initPromises.clear();
  }
}

// Export singleton instance
export const initManager = new InitializationManager();