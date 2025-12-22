# Stripe Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement complete Stripe subscription system for CrewUp Pro ($15/month, $150/year) with checkout, webhook handling, and subscription management.

**Architecture:** Server-side Stripe integration using Next.js server actions (not API routes). Stripe handles payment processing and webhooks update Supabase subscription records. Client components use hooks to check subscription status and initiate checkout sessions.

**Tech Stack:** Stripe SDK, Next.js 14 server actions, Supabase (subscription storage), React hooks, shadcn/ui components

**Working Directory:** `/home/kiddulu/Projects/crewUp_gemini/crewup-nextjs`

---

## Prerequisites

Before starting implementation, complete these manual Stripe setup steps:

1. **Create Stripe Account** at https://dashboard.stripe.com
2. **Create Products in Stripe Dashboard**:
   - Product 1: "CrewUp Pro Monthly" - $15.00/month (recurring)
   - Product 2: "CrewUp Pro Annual" - $150.00/year (recurring)
3. **Copy Price IDs** from each product (format: `price_xxxxxxxxxxxxx`)
4. **Get API Keys** from https://dashboard.stripe.com/test/apikeys
   - Publishable key (starts with `pk_test_`)
   - Secret key (starts with `sk_test_`)
5. **Add to .env.local**:
   ```env
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
   STRIPE_SECRET_KEY=sk_test_xxxxx
   STRIPE_PRICE_ID_PRO_MONTHLY=price_xxxxx
   STRIPE_PRICE_ID_PRO_ANNUAL=price_xxxxx
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx  # Will get this later
   ```

---

## Task 1: Stripe Client Setup

**Files:**
- Create: `lib/stripe/client.ts`
- Create: `lib/stripe/server.ts`

**Step 1: Create Stripe server client**

```typescript
// lib/stripe/server.ts
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
});
```

**Step 2: Create Stripe client utilities**

```typescript
// lib/stripe/client.ts
export const STRIPE_PRICE_IDS = {
  MONTHLY: process.env.STRIPE_PRICE_ID_PRO_MONTHLY!,
  ANNUAL: process.env.STRIPE_PRICE_ID_PRO_ANNUAL!,
};

export const SUBSCRIPTION_PLANS = {
  MONTHLY: {
    priceId: STRIPE_PRICE_IDS.MONTHLY,
    price: 15,
    interval: 'month' as const,
    name: 'CrewUp Pro Monthly',
  },
  ANNUAL: {
    priceId: STRIPE_PRICE_IDS.ANNUAL,
    price: 150,
    interval: 'year' as const,
    name: 'CrewUp Pro Annual',
  },
};
```

**Step 3: Verify files compile**

Run: `npm run type-check`
Expected: No TypeScript errors

**Step 4: Commit**

```bash
git add lib/stripe/
git commit -m "feat: add Stripe client configuration"
```

---

## Task 2: Subscription Types

**Files:**
- Create: `types/subscription.ts`

**Step 1: Create subscription type definitions**

```typescript
// types/subscription.ts
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'incomplete' | 'trialing';

export type SubscriptionTier = 'free' | 'pro';

export type BillingInterval = 'month' | 'year';

export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  status: SubscriptionStatus;
  tier: SubscriptionTier;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}
```

**Step 2: Verify types compile**

Run: `npm run type-check`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add types/subscription.ts
git commit -m "feat: add subscription type definitions"
```

---

## Task 3: Subscription Server Actions

**Files:**
- Create: `features/subscriptions/actions/subscription-actions.ts`
- Create: `features/subscriptions/` directory structure

**Step 1: Create feature directory**

```bash
mkdir -p features/subscriptions/actions
mkdir -p features/subscriptions/components
mkdir -p features/subscriptions/hooks
```

**Step 2: Create subscription actions**

```typescript
// features/subscriptions/actions/subscription-actions.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe/server';
import { revalidatePath } from 'next/cache';
import type { Subscription } from '@/types/subscription';

export type SubscriptionResult = {
  success: boolean;
  error?: string;
  subscription?: Subscription;
};

/**
 * Get current user's subscription
 */
export async function getMySubscription(): Promise<SubscriptionResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned (acceptable)
    return { success: false, error: error.message };
  }

  // If no subscription exists, return free tier
  if (!subscription) {
    return {
      success: true,
      subscription: {
        id: '',
        user_id: user.id,
        stripe_customer_id: null,
        stripe_subscription_id: null,
        stripe_price_id: null,
        status: 'active',
        tier: 'free',
        current_period_start: null,
        current_period_end: null,
        cancel_at_period_end: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };
  }

  return { success: true, subscription };
}

export type CheckoutResult = {
  success: boolean;
  error?: string;
  url?: string;
};

/**
 * Create Stripe checkout session
 */
export async function createCheckoutSession(priceId: string): Promise<CheckoutResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    // Get or create Stripe customer
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    let customerId = subscription?.stripe_customer_id;

    if (!customerId) {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;

      // Update subscription record with customer ID
      await supabase
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          stripe_customer_id: customerId,
          tier: 'free',
          status: 'active',
        });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscription?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscription?canceled=true`,
      metadata: {
        user_id: user.id,
      },
    });

    return { success: true, url: session.url || undefined };
  } catch (error) {
    console.error('Checkout session error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create checkout session',
    };
  }
}

/**
 * Create Stripe billing portal session
 */
export async function createPortalSession(): Promise<CheckoutResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (!subscription?.stripe_customer_id) {
      return { success: false, error: 'No subscription found' };
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscription`,
    });

    return { success: true, url: session.url };
  } catch (error) {
    console.error('Portal session error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create portal session',
    };
  }
}
```

**Step 3: Verify compilation**

Run: `npm run type-check`
Expected: No TypeScript errors

**Step 4: Commit**

```bash
git add features/subscriptions/
git commit -m "feat: add subscription server actions"
```

---

## Task 4: Subscription Hooks

**Files:**
- Create: `features/subscriptions/hooks/use-subscription.ts`
- Create: `features/subscriptions/hooks/use-checkout.ts`

**Step 1: Create use-subscription hook**

```typescript
// features/subscriptions/hooks/use-subscription.ts
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
  });
}

export function useIsPro() {
  const { data: subscription } = useSubscription();
  return subscription?.tier === 'pro' && subscription?.status === 'active';
}
```

**Step 2: Create use-checkout hook**

```typescript
// features/subscriptions/hooks/use-checkout.ts
'use client';

import { useState } from 'react';
import { createCheckoutSession, createPortalSession } from '../actions/subscription-actions';

export function useCheckout() {
  const [isLoading, setIsLoading] = useState(false);

  const checkout = async (priceId: string) => {
    setIsLoading(true);
    try {
      const result = await createCheckoutSession(priceId);
      if (!result.success) {
        throw new Error(result.error);
      }
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const openPortal = async () => {
    setIsLoading(true);
    try {
      const result = await createPortalSession();
      if (!result.success) {
        throw new Error(result.error);
      }
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      console.error('Portal error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return { checkout, openPortal, isLoading };
}
```

**Step 3: Verify compilation**

Run: `npm run type-check`
Expected: No TypeScript errors

**Step 4: Commit**

```bash
git add features/subscriptions/hooks/
git commit -m "feat: add subscription hooks"
```

---

## Task 5: Pro Badge Component

**Files:**
- Create: `features/subscriptions/components/pro-badge.tsx`

**Step 1: Create Pro badge component**

```typescript
// features/subscriptions/components/pro-badge.tsx
import { Badge } from '@/components/ui/badge';

interface ProBadgeProps {
  className?: string;
}

export function ProBadge({ className }: ProBadgeProps) {
  return (
    <Badge variant="default" className={className}>
      PRO
    </Badge>
  );
}
```

**Step 2: Verify compilation**

Run: `npm run type-check`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add features/subscriptions/components/pro-badge.tsx
git commit -m "feat: add Pro badge component"
```

---

## Task 6: Pricing Card Component

**Files:**
- Create: `features/subscriptions/components/pricing-card.tsx`

**Step 1: Create pricing card component**

```typescript
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
```

**Step 2: Verify compilation**

Run: `npm run type-check`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add features/subscriptions/components/pricing-card.tsx
git commit -m "feat: add pricing card component"
```

---

## Task 7: Subscription Manager Component

**Files:**
- Create: `features/subscriptions/components/subscription-manager.tsx`

**Step 1: Create subscription manager component**

```typescript
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

  const isPro = subscription?.tier === 'pro' && subscription?.status === 'active';

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
```

**Step 2: Verify compilation**

Run: `npm run type-check`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add features/subscriptions/components/subscription-manager.tsx
git commit -m "feat: add subscription manager component"
```

---

## Task 8: Feature Gate Component

**Files:**
- Create: `features/subscriptions/components/feature-gate.tsx`

**Step 1: Create feature gate component**

```typescript
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
```

**Step 2: Verify compilation**

Run: `npm run type-check`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add features/subscriptions/components/feature-gate.tsx
git commit -m "feat: add feature gate component"
```

---

## Task 9: Pricing Page

**Files:**
- Create: `app/pricing/page.tsx`

**Step 1: Create pricing page**

```typescript
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
```

**Step 2: Verify page renders**

Run: `npm run dev`
Navigate to: http://localhost:3000/pricing
Expected: Pricing page displays with both plan cards

**Step 3: Commit**

```bash
git add app/pricing/
git commit -m "feat: add pricing page"
```

---

## Task 10: Subscription Management Page

**Files:**
- Create: `app/dashboard/subscription/page.tsx`

**Step 1: Create subscription page**

```typescript
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
```

**Step 2: Verify page renders**

Run: `npm run dev`
Navigate to: http://localhost:3000/dashboard/subscription
Expected: Subscription manager displays current subscription status

**Step 3: Commit**

```bash
git add app/dashboard/subscription/
git commit -m "feat: add subscription management page"
```

---

## Task 11: Stripe Webhook Handler

**Files:**
- Create: `app/api/webhooks/stripe/route.ts`

**Step 1: Create webhook route**

```typescript
// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Create Supabase admin client for webhook (server-side, bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;

        if (!userId) {
          console.error('No user_id in session metadata');
          break;
        }

        // Get subscription details
        const subscriptionId = session.subscription as string;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        await supabaseAdmin.from('subscriptions').upsert({
          user_id: userId,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: subscriptionId,
          stripe_price_id: subscription.items.data[0].price.id,
          status: 'active',
          tier: 'pro',
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
        });

        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find user by customer ID
        const { data: existingSubscription } = await supabaseAdmin
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (!existingSubscription) {
          console.error('No subscription found for customer:', customerId);
          break;
        }

        await supabaseAdmin
          .from('subscriptions')
          .update({
            stripe_subscription_id: subscription.id,
            stripe_price_id: subscription.items.data[0].price.id,
            status: subscription.status as any,
            tier: subscription.status === 'active' ? 'pro' : 'free',
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
          })
          .eq('user_id', existingSubscription.user_id);

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const { data: existingSubscription } = await supabaseAdmin
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (!existingSubscription) {
          console.error('No subscription found for customer:', customerId);
          break;
        }

        await supabaseAdmin
          .from('subscriptions')
          .update({
            status: 'canceled',
            tier: 'free',
            cancel_at_period_end: false,
          })
          .eq('user_id', existingSubscription.user_id);

        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const { data: existingSubscription } = await supabaseAdmin
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (!existingSubscription) {
          console.error('No subscription found for customer:', customerId);
          break;
        }

        await supabaseAdmin
          .from('subscriptions')
          .update({
            status: 'past_due',
          })
          .eq('user_id', existingSubscription.user_id);

        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
```

**Step 2: Verify compilation**

Run: `npm run type-check`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add app/api/webhooks/stripe/
git commit -m "feat: add Stripe webhook handler"
```

---

## Task 12: Add Subscription Link to Navigation

**Files:**
- Modify: `app/dashboard/layout.tsx`

**Step 1: Read current layout**

Run: `cat app/dashboard/layout.tsx`
Note: Find the navigation section

**Step 2: Add subscription link**

Add this link to the navigation:

```tsx
<Link
  href="/dashboard/subscription"
  className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
    pathname === '/dashboard/subscription'
      ? 'bg-blue-600 text-white'
      : 'text-gray-600 hover:bg-gray-100'
  }`}
>
  <span>💳</span>
  <span>Subscription</span>
</Link>
```

**Step 3: Verify navigation**

Run: `npm run dev`
Check: Subscription link appears in dashboard navigation

**Step 4: Commit**

```bash
git add app/dashboard/layout.tsx
git commit -m "feat: add subscription link to navigation"
```

---

## Task 13: Test Checkout Flow with Stripe CLI

**Files:**
- None (testing only)

**Step 1: Install Stripe CLI**

Run:
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Linux
wget https://github.com/stripe/stripe-cli/releases/latest/download/stripe_linux_amd64.tar.gz
tar -xvf stripe_linux_amd64.tar.gz
sudo mv stripe /usr/local/bin/
```

**Step 2: Login to Stripe CLI**

Run: `stripe login`
Expected: Browser opens for authentication

**Step 3: Forward webhooks to local**

Run: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
Expected: Shows webhook signing secret (starts with `whsec_`)

**Step 4: Add webhook secret to .env.local**

Add the `whsec_` value to `STRIPE_WEBHOOK_SECRET` in `.env.local`

**Step 5: Test checkout in dev**

1. Run: `npm run dev`
2. Navigate to: http://localhost:3000/pricing
3. Click "Subscribe Monthly"
4. Use test card: `4242 4242 4242 4242`, any future date, any CVC
5. Complete checkout
6. Verify redirect to `/dashboard/subscription?success=true`
7. Check Stripe CLI output for webhook events

**Step 6: Trigger test events**

Run: `stripe trigger checkout.session.completed`
Expected: Webhook fires and updates subscription in database

**Step 7: Verify database**

```bash
# Check subscriptions table in Supabase
# Should see subscription record with status='active', tier='pro'
```

---

## Task 14: Build and Deploy

**Files:**
- None (deployment only)

**Step 1: Build locally**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 2: Add environment variables to Vercel**

In Vercel dashboard, add:
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_PRICE_ID_PRO_MONTHLY`
- `STRIPE_PRICE_ID_PRO_ANNUAL`
- `STRIPE_WEBHOOK_SECRET` (will update after webhook endpoint created)

**Step 3: Deploy to Vercel**

Run: `vercel --prod` or push to main branch
Expected: Deployment succeeds

**Step 4: Configure Stripe webhook in production**

1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. URL: `https://get-crewup.vercel.app/api/webhooks/stripe`
4. Select events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
5. Copy webhook signing secret
6. Update `STRIPE_WEBHOOK_SECRET` in Vercel

**Step 5: Test in production**

1. Navigate to: https://get-crewup.vercel.app/pricing
2. Complete test checkout
3. Verify subscription updates in Supabase production database

**Step 6: Switch to live mode**

When ready for real payments:
1. Get live API keys from Stripe dashboard
2. Create live products and price IDs
3. Update environment variables with live keys
4. Configure live webhook endpoint

---

## Task 15: Update Progress Checklist

**Files:**
- Modify: `development_plan/progress-checklist.md`

**Step 1: Mark Phase 2 tasks complete**

Update these checkboxes:
- [x] Create Stripe account
- [x] Create CrewUp Pro Monthly product ($15/month)
- [x] Create CrewUp Pro Annual product ($150/year)
- [x] Get price IDs for both products
- [x] Configure Stripe webhook endpoint
- [x] Add Stripe environment variables
- [x] Create pricing-card.tsx component
- [x] Create subscription-manager.tsx component
- [x] Create pro-badge.tsx component
- [x] Create feature-gate.tsx component
- [x] Create use-subscription.ts hook
- [x] Create use-checkout.ts hook
- [x] Create POST /api/webhooks/stripe route
- [x] Create pricing page
- [x] Create subscription management page
- [x] Implement webhook handler for checkout.session.completed
- [x] Implement webhook handler for customer.subscription.updated
- [x] Implement webhook handler for customer.subscription.deleted
- [x] Implement webhook handler for invoice.payment_failed
- [x] Test monthly subscription checkout
- [x] Test annual subscription checkout
- [x] Test subscription cancellation
- [x] Test webhook with Stripe CLI locally
- [x] Test full payment flow in production

**Step 2: Commit**

```bash
git add development_plan/progress-checklist.md
git commit -m "docs: mark Phase 2 Stripe tasks complete"
```

---

## Testing Checklist

After implementation, verify:

- [ ] Pricing page loads and displays both plans correctly
- [ ] Monthly checkout redirects to Stripe and completes successfully
- [ ] Annual checkout redirects to Stripe and completes successfully
- [ ] Subscription record created in Supabase with correct data
- [ ] Subscription page shows "Pro" status after checkout
- [ ] "Manage Subscription" button opens Stripe billing portal
- [ ] Subscription cancellation updates status in database
- [ ] Failed payment updates status to 'past_due'
- [ ] Webhooks fire correctly in production
- [ ] Feature gates work (test with a Pro feature)
- [ ] useIsPro hook returns correct status

---

## Common Issues & Solutions

**Issue:** Webhook signature verification fails
**Solution:** Ensure `STRIPE_WEBHOOK_SECRET` matches the signing secret from Stripe dashboard or CLI

**Issue:** "No user_id in session metadata"
**Solution:** Verify `createCheckoutSession` includes `metadata: { user_id: user.id }`

**Issue:** Subscription not updating after checkout
**Solution:** Check webhook endpoint is accessible (not blocked by firewall), check Stripe webhook logs

**Issue:** Build fails with "stripe is not defined"
**Solution:** Ensure `lib/stripe/server.ts` is imported correctly and environment variables are set

---

## Next Steps After Completion

1. Implement Basic Pro Features (Phase 2, Week 2):
   - Profile Boost for workers
   - Certification filtering for employers
   - Profile view tracking ("Who Viewed Me")

2. Test with beta users:
   - Invite 5-10 beta users to test checkout
   - Gather feedback on pricing
   - Monitor conversion rate

3. Monitor metrics:
   - Track subscription signups
   - Monitor churn rate
   - Analyze failed payments

---

**Plan Complete!** Ready for execution with `superpowers:executing-plans` or `superpowers:subagent-driven-development`.
