'use client';

import { useSmartPolling, POLLING_CONFIGS } from '@/lib/hooks/use-smart-polling';
import { getMyNotifications } from '../actions/notification-actions';

/**
 * Hook for fetching notifications with smart polling
 * 
 * * Features:
 * - Adaptive polling (slower for notifications - 30s active, 60s idle)
 * - Exponential backoff on errors
 * - Tab visibility handling (pauses when hidden)
 * - Status indicators for UI
 */
export function useNotifications() {
  const fetchNotifications = async () => {
    const result = await getMyNotifications();
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.notifications || [];
  };

  const result = useSmartPolling(
    ['notifications'],
    fetchNotifications,
    POLLING_CONFIGS.notifications
  );

  return {
    ...result,
    // * Convenience alias for React Query compatibility
    notifications: result.data || [],
    isLoading: result.isLoading,
    isFetching: result.isFetching,
  };
}
