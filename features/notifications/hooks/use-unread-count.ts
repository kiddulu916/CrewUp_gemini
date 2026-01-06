'use client';

import { useSmartPolling, POLLING_CONFIGS } from '@/lib/hooks/use-smart-polling';
import { getUnreadCount } from '../actions/notification-actions';

/**
 * Hook for fetching unread notification count with smart polling
 * 
 * Uses same config as notifications for consistency
 */
export function useUnreadCount() {
  const fetchUnreadCount = async () => {
    const result = await getUnreadCount();
    return result.count || 0;
  };

  const result = useSmartPolling(
    ['notifications', 'unread-count'],
    fetchUnreadCount,
    POLLING_CONFIGS.notifications
  );

  return {
    ...result,
    // * Convenience alias
    count: result.data || 0,
    isLoading: result.isLoading,
    isFetching: result.isFetching,
  };
}
