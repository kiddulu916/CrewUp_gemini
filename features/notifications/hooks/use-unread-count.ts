'use client';

import { useQuery } from '@tanstack/react-query';
import { getUnreadCount } from '../actions/notification-actions';

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const result = await getUnreadCount();
      return result.count || 0;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}
