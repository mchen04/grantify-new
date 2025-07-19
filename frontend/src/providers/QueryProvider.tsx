"use client";

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

/**
 * TanStack Query provider with optimized configuration for Supabase
 * 
 * This provider replaces the complex custom state management with
 * industry-standard patterns for server state management.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  // Create QueryClient instance with optimized defaults
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Cache data for 5 minutes by default
            staleTime: 5 * 60 * 1000,
            // Keep data in cache for 10 minutes
            gcTime: 10 * 60 * 1000,
            // Retry failed requests 3 times with exponential backoff
            retry: (failureCount, error: any) => {
              // Don't retry on 4xx errors (client errors)
              if (error?.status >= 400 && error?.status < 500) {
                return false;
              }
              return failureCount < 3;
            },
            // Refetch on window focus for fresh data
            refetchOnWindowFocus: true,
            // Refetch on network reconnection
            refetchOnReconnect: true,
            // Use stale data while revalidating
            refetchOnMount: 'always',
          },
          mutations: {
            // Retry mutations once on failure
            retry: 1,
            // Timeout after 30 seconds
            networkMode: 'online',
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Show DevTools in development */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools 
          initialIsOpen={false}
          position="bottom"
          buttonPosition="bottom-right"
        />
      )}
    </QueryClientProvider>
  );
}