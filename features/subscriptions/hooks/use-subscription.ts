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
      return {
        subscription: result.subscription,
        profileSubscriptionStatus: result.profileSubscriptionStatus,
      };
    },
    refetchOnWindowFocus: true,  // Refetch after Stripe redirects
    staleTime: 1000 * 60 * 10,   // 10 minutes
  });
}

export function useIsPro() {
  const { data } = useSubscription();
  // Prefer profile subscription status (source of truth for UI)
  // Fall back to checking subscriptions table
  if (data?.profileSubscriptionStatus === 'pro') {
    return true;
  }
  return data?.subscription?.status === 'active' && data?.subscription?.stripe_subscription_id !== '';
}
