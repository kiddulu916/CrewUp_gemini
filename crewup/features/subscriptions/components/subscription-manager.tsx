// features/subscriptions/components/subscription-manager.tsx
'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSubscription } from '../hooks/use-subscription';
import { useCheckout } from '../hooks/use-checkout';
import { ProBadge } from './pro-badge';

export function SubscriptionManager() {
  const { data: subscription, isLoading } = useSubscription();
  const { openPortal, isLoading: isPortalLoading } = useCheckout();

  if (isLoading) {
    return <div>Loading subscription...</div>;
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
          Current Plan: <strong>{isPro ? 'CrewUp Pro' : 'Free'}</strong>
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
          <Button onClick={() => (window.location.href = '/pricing')}>
            View Pricing
          </Button>
        </div>
      )}
    </Card>
  );
}
