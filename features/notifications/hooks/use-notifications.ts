'use client';

import { useQuery } from '@tanstack/react-query';
import { getMyNotifications } from '../actions/notification-actions';

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const result = await getMyNotifications();
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.notifications || [];
    },
    refetchInterval: 30000, // Refetch every 30 seconds for new notifications
  });
}
