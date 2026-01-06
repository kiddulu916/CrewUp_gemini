'use client';

import { QueryClient, QueryClientProvider, QueryKey, QueryFunction } from '@tanstack/react-query';
import { ReactNode, useState, useCallback, createContext, useContext } from 'react';

// * Query Client instance for prefetching from server components
let browserQueryClient: QueryClient | undefined = undefined;

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // * Data considered fresh for 5 minutes (reduces refetches)
        staleTime: 1000 * 60 * 5,
        // * Cached data stays for 15 minutes (improved cache retention)
        gcTime: 1000 * 60 * 15,
        // * Don't refetch on window focus by default
        refetchOnWindowFocus: false,
        // * Retry failed queries up to 2 times
        retry: 2,
        // * Exponential backoff for retries
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        // * Deduplicate identical queries within 2 seconds
        structuralSharing: true,
      },
      mutations: {
        // * Retry failed mutations once
        retry: 1,
      },
    },
  });
}

export function getQueryClient() {
  if (typeof window === 'undefined') {
    // * Server: always make a new query client
    return makeQueryClient();
  } else {
    // * Browser: reuse existing client or create new one
    if (!browserQueryClient) {
      browserQueryClient = makeQueryClient();
    }
    return browserQueryClient;
  }
}

// * Context for prefetch function
const PrefetchContext = createContext<{
  prefetch: <T>(queryKey: QueryKey, queryFn: QueryFunction<T>) => Promise<void>;
} | null>(null);

/**
 * TanStack Query Provider
 *
 * Wraps the app with QueryClientProvider to enable React Query functionality.
 * This provider manages server state, caching, and data fetching.
 *
 * Configuration:
 * - 5 minute default stale time (data considered fresh for 5 minutes)
 * - 15 minute cache time (unused data stays in cache for 15 minutes)
 * - Refetch on window focus disabled by default (can enable per-query)
 * - Retry failed queries up to 2 times
 * - Structural sharing enabled for query deduplication
 *
 * Usage:
 * Import this provider in app/layout.tsx and wrap children with it.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(getQueryClient);

  // * Prefetch utility for preloading data on hover/focus
  const prefetch = useCallback(
    async <T,>(queryKey: QueryKey, queryFn: QueryFunction<T>) => {
      await queryClient.prefetchQuery({
        queryKey,
        queryFn,
        staleTime: 1000 * 60 * 5, // 5 minutes
      });
    },
    [queryClient]
  );

  return (
    <PrefetchContext.Provider value={{ prefetch }}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </PrefetchContext.Provider>
  );
}

/**
 * Hook to access prefetch function
 * 
 * Usage:
 * const { prefetch } = usePrefetch();
 * 
 * // Prefetch on hover
 * <button onMouseEnter={() => prefetch(['job', jobId], fetchJobFn)}>
 *   View Job
 * </button>
 */
export function usePrefetch() {
  const context = useContext(PrefetchContext);
  if (!context) {
    throw new Error('usePrefetch must be used within QueryProvider');
  }
  return context;
}
