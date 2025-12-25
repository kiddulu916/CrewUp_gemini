// features/subscriptions/components/subscription-manager.tsx
'use client';

import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSubscription } from '../hooks/use-subscription';
import { useCheckout } from '../hooks/use-checkout';
import { ProBadge } from './pro-badge';

export function SubscriptionManager() {
  const router = useRouter();
  const { data: subscription, isLoading, error } = useSubscription();
  const { openPortal, isLoading: isPortalLoading } = useCheckout();

  // Show loading skeleton with proper Card styling
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            <div className="h-6 bg-gray-200 rounded w-16"></div>
          </div>
          <div className="space-y-2">
            <div className="h-6 bg-gray-200 rounded w-2/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div className="h-10 bg-gray-200 rounded w-40"></div>
        </div>
      </Card>
    );
  }

  // Handle error state
  if (error) {
    return (
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">Your Subscription</h2>
        <p className="text-red-600 mb-4">
          Unable to load subscription information. Please try again.
        </p>
        <Button onClick={() => window.location.reload()}>
          Retry
        </Button>
      </Card>
    );
  }

  const isPro = subscription?.status === 'active' && subscription?.stripe_subscription_id !== '';

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Your Subscription</h2>
        {isPro && <ProBadge />}
      </div>

      <div className="mb-6">
        <p className="text-lg mb-2">
          Current Plan: <strong>{isPro ? 'KrewUp Pro' : 'Free'}</strong>
        </p>

        {isPro && subscription?.current_period_end && (
          <p className="text-sm text-gray-600">
            {subscription.cancel_at_period_end
              ? `Cancels on ${new Date(subscription.current_period_end).toLocaleDateString()}`
              : `Renews on ${new Date(subscription.current_period_end).toLocaleDateString()}`}
          </p>
        )}
      </div>

      {isPro ? (
        <Button onClick={openPortal} disabled={isPortalLoading}>
          Manage Subscription
        </Button>
      ) : (
        <div>
          <p className="text-gray-600 mb-4">
            Upgrade to Pro to unlock advanced features like proximity alerts, profile boosts, and analytics.
          </p>
          <Button onClick={() => router.push('/pricing')}>
            View Pricing
          </Button>
        </div>
      )}
    </Card>
  );
}
