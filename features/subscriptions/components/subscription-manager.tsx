// features/subscriptions/components/subscription-manager.tsx
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useSubscription } from '../hooks/use-subscription';
import { useCheckout } from '../hooks/use-checkout';
import { ProBadge } from './pro-badge';

export function SubscriptionManager() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, isLoading, error, refetch } = useSubscription();
  const { openPortal, isLoading: isPortalLoading } = useCheckout();
  const [isPolling, setIsPolling] = useState(false);
  const [pollAttempts, setPollAttempts] = useState(0);

  const subscription = data?.subscription;
  const profileSubscriptionStatus = data?.profileSubscriptionStatus;

  // Handle checkout success - poll for webhook completion
  useEffect(() => {
    const success = searchParams.get('success');
    if (success === 'true' && data) {
      // Check both profile status and subscription table (profile is source of truth)
      const isPro = profileSubscriptionStatus === 'pro' ||
        (subscription?.status === 'active' && subscription?.stripe_subscription_id !== '');

      // If not Pro yet and we haven't exceeded polling attempts, keep polling
      if (!isPro && pollAttempts < 20) {
        setIsPolling(true);
        const timer = setTimeout(() => {
          refetch();
          setPollAttempts(prev => prev + 1);
        }, 1000); // Poll every 1 second

        return () => clearTimeout(timer);
      } else if (isPro) {
        // Success! Stop polling
        setIsPolling(false);
        setPollAttempts(0);
        // Remove success param from URL
        router.replace('/dashboard/subscription');
      } else if (pollAttempts >= 20) {
        // Timeout after 20 seconds
        setIsPolling(false);
      }
    }
  }, [searchParams, data, subscription, profileSubscriptionStatus, pollAttempts, refetch, router]);

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

  // Show polling state after checkout
  if (isPolling) {
    return (
      <Card className="p-6">
        <div className="text-center space-y-4">
          <LoadingSpinner className="mx-auto" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Processing Your Subscription</h2>
            <p className="text-gray-600">
              Please wait while we activate your Pro subscription...
            </p>
            <p className="text-sm text-gray-500 mt-2">
              This usually takes just a few seconds.
            </p>
          </div>
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

  // Determine Pro status - prefer profile subscription status (source of truth)
  const isPro = profileSubscriptionStatus === 'pro' ||
    (subscription?.status === 'active' && subscription?.stripe_subscription_id !== '');

  // Handle polling timeout - show helpful message
  if (searchParams.get('success') === 'true' && !isPro && pollAttempts >= 20) {
    return (
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">Subscription Processing</h2>
        <p className="text-gray-700 mb-4">
          Your payment was successful! Your subscription is still being processed.
        </p>
        <p className="text-gray-600 mb-4">
          This can take up to a few minutes. Please refresh the page in a moment to see your Pro status.
        </p>
        <div className="flex gap-3">
          <Button onClick={() => {
            setPollAttempts(0);
            setIsPolling(false);
            refetch();
          }}>
            Check Again
          </Button>
          <Button variant="outline" onClick={() => router.replace('/dashboard/subscription')}>
            Dismiss
          </Button>
        </div>
      </Card>
    );
  }

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
