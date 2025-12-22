'use client';

import { useQuery } from '@tanstack/react-query';
import { getMySubscription } from '../actions/subscription-actions';

export function useSubscription() {
  return useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      const result = await getMySubscription();
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.subscription;
    },
    refetchOnWindowFocus: true,  // Refetch after Stripe redirects
    staleTime: 1000 * 60 * 10,   // 10 minutes
  });
}

export function useIsPro() {
  const { data: subscription } = useSubscription();
  return subscription?.status === 'active' && subscription?.stripe_subscription_id !== '';
}
