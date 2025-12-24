// app/dashboard/subscription/page.tsx
import { SubscriptionManager } from '@/features/subscriptions/components/subscription-manager';

export default function SubscriptionPage() {
  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Subscription</h1>
      <SubscriptionManager />
    </div>
  );
}
