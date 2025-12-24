'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

/**
 * TanStack Query Provider
 *
 * Wraps the app with QueryClientProvider to enable React Query functionality.
 * This provider manages server state, caching, and data fetching.
 *
 * Configuration:
 * - 5 minute default stale time (data considered fresh for 5 minutes)
 * - 10 minute cache time (unused data stays in cache for 10 minutes)
 * - Refetch on window focus disabled by default (can enable per-query)
 * - Retry failed queries up to 2 times
 *
 * Usage:
 * Import this provider in app/layout.tsx and wrap children with it.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data considered fresh for 5 minutes
            staleTime: 1000 * 60 * 5,
            // Cached data stays for 10 minutes
            gcTime: 1000 * 60 * 10,
            // Don't refetch on window focus by default (can enable per-query)
            refetchOnWindowFocus: false,
            // Retry failed queries up to 2 times
            retry: 2,
            // Exponential backoff for retries
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
          },
          mutations: {
            // Retry failed mutations once
            retry: 1,
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
