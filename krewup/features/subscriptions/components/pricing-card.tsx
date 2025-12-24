// features/subscriptions/components/pricing-card.tsx
'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCheckout } from '../hooks/use-checkout';
import { SUBSCRIPTION_PLANS } from '@/lib/stripe/client';

interface PricingCardProps {
  plan: 'MONTHLY' | 'ANNUAL';
  isCurrentPlan?: boolean;
}

export function PricingCard({ plan, isCurrentPlan = false }: PricingCardProps) {
  const { checkout, isLoading } = useCheckout();
  const planDetails = SUBSCRIPTION_PLANS[plan];

  const handleSubscribe = async () => {
    await checkout(planDetails.priceId);
  };

  const savings = plan === 'ANNUAL' ? ((15 * 12 - 150) / (15 * 12)) * 100 : 0;

  return (
    <Card className="p-6 flex flex-col">
      <div className="mb-4">
        <h3 className="text-2xl font-bold">{planDetails.name}</h3>
        {plan === 'ANNUAL' && (
          <p className="text-sm text-green-600 font-semibold">
            Save {Math.round(savings)}%
          </p>
        )}
      </div>

      <div className="mb-6">
        <span className="text-4xl font-bold">${planDetails.price}</span>
        <span className="text-gray-600">/{planDetails.interval}</span>
      </div>

      <ul className="mb-6 space-y-2 flex-1">
        <li className="flex items-center">
          <span className="mr-2">✓</span>
          <span>Real-time proximity alerts</span>
        </li>
        <li className="flex items-center">
          <span className="mr-2">✓</span>
          <span>Profile boost in searches</span>
        </li>
        <li className="flex items-center">
          <span className="mr-2">✓</span>
          <span>"Who Viewed Me" analytics</span>
        </li>
        <li className="flex items-center">
          <span className="mr-2">✓</span>
          <span>Advanced job matching</span>
        </li>
        <li className="flex items-center">
          <span className="mr-2">✓</span>
          <span>Priority support</span>
        </li>
      </ul>

      <Button
        onClick={handleSubscribe}
        disabled={isLoading || isCurrentPlan}
        className="w-full"
      >
        {isCurrentPlan ? 'Current Plan' : `Subscribe ${plan === 'ANNUAL' ? 'Annually' : 'Monthly'}`}
      </Button>
    </Card>
  );
}
