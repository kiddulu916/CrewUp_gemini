// features/subscriptions/components/feature-gate.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useSubscription } from '../hooks/use-subscription';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProBadge } from './pro-badge';

interface FeatureGateProps {
  children: React.ReactNode;
  feature: string;
  fallback?: React.ReactNode;
}

export function FeatureGate({ children, feature, fallback }: FeatureGateProps) {
  const router = useRouter();
  const { data: subscription, isLoading, error } = useSubscription();

  // Show loading skeleton while checking subscription status
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </Card>
    );
  }

  // Handle error state
  if (error) {
    return (
      <Card className="p-6 text-center">
        <p className="text-red-600 mb-4">
          Unable to verify subscription status. Please try again.
        </p>
        <Button onClick={() => window.location.reload()}>
          Retry
        </Button>
      </Card>
    );
  }

  const isPro = subscription?.status === 'active' && subscription?.stripe_subscription_id !== '';

  if (isPro) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <Card className="p-6 text-center">
      <div className="flex justify-center mb-4">
        <ProBadge />
      </div>
      <h3 className="text-xl font-bold mb-2">Pro Feature</h3>
      <p className="text-gray-600 mb-4">
        Upgrade to CrewUp Pro to access {feature}.
      </p>
      <Button onClick={() => router.push('/pricing')}>
        Upgrade to Pro
      </Button>
    </Card>
  );
}
