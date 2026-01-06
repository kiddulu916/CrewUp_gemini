'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, UseQueryOptions, QueryKey } from '@tanstack/react-query';

// * Polling configuration
export type PollingConfig = {
  // Base interval when active (ms)
  activeInterval: number;
  // Interval when idle/inactive (ms)
  idleInterval: number;
  // Time until considered idle (ms)
  idleTimeout: number;
  // Max interval after errors (exponential backoff)
  maxBackoffInterval: number;
  // Whether to pause when tab is hidden
  pauseWhenHidden: boolean;
};

// * Default configs for different use cases
export const POLLING_CONFIGS = {
  // * Messages: Fast when active, slower when idle
  messages: {
    activeInterval: 2000, // 2 seconds when actively chatting
    idleInterval: 10000, // 10 seconds when idle
    idleTimeout: 30000, // 30 seconds to become idle
    maxBackoffInterval: 60000, // 1 minute max on errors
    pauseWhenHidden: true,
  },
  // * Conversations list: Medium speed
  conversations: {
    activeInterval: 5000, // 5 seconds
    idleInterval: 15000, // 15 seconds
    idleTimeout: 60000, // 1 minute to become idle
    maxBackoffInterval: 60000,
    pauseWhenHidden: true,
  },
  // * Notifications: Slower, less critical
  notifications: {
    activeInterval: 30000, // 30 seconds
    idleInterval: 60000, // 1 minute
    idleTimeout: 120000, // 2 minutes to become idle
    maxBackoffInterval: 300000, // 5 minutes max
    pauseWhenHidden: true,
  },
} as const;

export type PollingStatus = {
  isPolling: boolean;
  lastSyncTime: Date | null;
  nextSyncTime: Date | null;
  isIdle: boolean;
  isPaused: boolean;
  errorCount: number;
  currentInterval: number;
};

type SmartPollingResult<TData, TError> = {
  data: TData | undefined;
  error: TError | null;
  isLoading: boolean;
  isFetching: boolean;
  status: PollingStatus;
  // * Manual controls
  markActive: () => void;
  pause: () => void;
  resume: () => void;
  refetchNow: () => Promise<void>;
};

/**
 * Smart polling hook with adaptive intervals
 * 
 * * Features:
 * - Adaptive polling intervals based on activity
 * - Exponential backoff on errors
 * - Tab visibility handling
 * - Status indicators for UI
 * - Manual controls (pause, resume, force refresh)
 * 
 * @example
 * ```tsx
 * const { data, status, markActive } = useSmartPolling(
 *   ['messages', conversationId],
 *   fetchMessages,
 *   POLLING_CONFIGS.messages
 * );
 * 
 * // Mark as active on user interaction
 * <input onFocus={markActive} />
 * 
 * // Show status indicator
 * {status.isFetching && <span>Syncing...</span>}
 * {status.lastSyncTime && <span>Last updated: {formatTime(status.lastSyncTime)}</span>}
 * ```
 */
export function useSmartPolling<TData = unknown, TError = Error>(
  queryKey: QueryKey,
  queryFn: () => Promise<TData>,
  config: PollingConfig,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn' | 'refetchInterval'>
): SmartPollingResult<TData, TError> {
  // * State for adaptive polling
  const [isIdle, setIsIdle] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [nextSyncTime, setNextSyncTime] = useState<Date | null>(null);
  const lastActivityRef = useRef(Date.now());
  const idleTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // * Calculate current interval based on state
  const calculateInterval = useCallback(() => {
    if (isPaused) return false; // Don't poll when paused

    // Exponential backoff on errors
    if (errorCount > 0) {
      const backoffInterval = Math.min(
        config.activeInterval * Math.pow(2, errorCount),
        config.maxBackoffInterval
      );
      return backoffInterval;
    }

    return isIdle ? config.idleInterval : config.activeInterval;
  }, [isPaused, errorCount, isIdle, config]);

  const currentInterval = calculateInterval();

  // * Update next sync time
  useEffect(() => {
    if (currentInterval && typeof currentInterval === 'number') {
      setNextSyncTime(new Date(Date.now() + currentInterval));
    } else {
      setNextSyncTime(null);
    }
  }, [currentInterval, lastSyncTime]);

  // * Mark user as active (resets idle timer)
  const markActive = useCallback(() => {
    lastActivityRef.current = Date.now();
    setIsIdle(false);

    // Reset idle timer
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = setTimeout(() => {
      setIsIdle(true);
    }, config.idleTimeout);
  }, [config.idleTimeout]);

  // * Pause polling
  const pause = useCallback(() => {
    setIsPaused(true);
  }, []);

  // * Resume polling
  const resume = useCallback(() => {
    setIsPaused(false);
    markActive();
  }, [markActive]);

  // * Handle tab visibility
  useEffect(() => {
    if (!config.pauseWhenHidden) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsPaused(true);
      } else {
        setIsPaused(false);
        markActive();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [config.pauseWhenHidden, markActive]);

  // * Initialize idle timer
  useEffect(() => {
    markActive(); // Start tracking activity
    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [markActive]);

  // * React Query with smart interval
  const query = useQuery<TData, TError>({
    queryKey,
    queryFn: async () => {
      try {
        const result = await queryFn();
        setErrorCount(0); // Reset error count on success
        setLastSyncTime(new Date());
        return result;
      } catch (error) {
        setErrorCount((prev) => prev + 1);
        throw error;
      }
    },
    refetchInterval: currentInterval,
    // * Stale-while-revalidate: return cached data immediately, refetch in background
    staleTime: typeof currentInterval === 'number' ? currentInterval / 2 : 0,
    ...options,
  });

  // * Force refetch
  const refetchNow = useCallback(async () => {
    markActive();
    await query.refetch();
  }, [query, markActive]);

  const status: PollingStatus = {
    isPolling: !isPaused && typeof currentInterval === 'number',
    lastSyncTime,
    nextSyncTime,
    isIdle,
    isPaused,
    errorCount,
    currentInterval: typeof currentInterval === 'number' ? currentInterval : 0,
  };

  return {
    data: query.data,
    error: query.error,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    status,
    markActive,
    pause,
    resume,
    refetchNow,
  };
}

/**
 * Hook for displaying polling status in UI
 */
export function usePollingStatusText(status: PollingStatus): string {
  if (status.isPaused) {
    return 'Paused';
  }
  if (status.errorCount > 0) {
    return `Reconnecting... (${status.errorCount} errors)`;
  }
  if (status.isIdle) {
    return 'Idle';
  }
  return 'Live';
}

/**
 * Format last sync time for display
 */
export function formatLastSyncTime(date: Date | null): string {
  if (!date) return 'Never';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 5) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  return date.toLocaleTimeString();
}

