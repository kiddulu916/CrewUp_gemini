// features/subscriptions/components/feature-gate.tsx
'use client';

import { useIsPro } from '../hooks/use-subscription';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProBadge } from './pro-badge';

interface FeatureGateProps {
  children: React.ReactNode;
  feature: string;
  fallback?: React.ReactNode;
}

export function FeatureGate({ children, feature, fallback }: FeatureGateProps) {
  const isPro = useIsPro();

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
      <Button onClick={() => (window.location.href = '/pricing')}>
        Upgrade to Pro
      </Button>
    </Card>
  );
}
