// app/pricing/page.tsx
import { PricingCard } from '@/features/subscriptions/components/pricing-card';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-xl text-gray-600">
            Unlock advanced features with CrewUp Pro
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <PricingCard plan="MONTHLY" />
          <PricingCard plan="ANNUAL" />
        </div>

        <div className="mt-12 text-center text-gray-600">
          <p>All plans include unlimited job posting and messaging.</p>
          <p>Cancel anytime. No questions asked.</p>
        </div>
      </div>
    </div>
  );
}
