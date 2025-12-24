# 07 - Payment & Subscription System

## Overview

Stripe powers all payment processing and subscription management. Users can subscribe to CrewUp Pro ($15/month or $150/year) to unlock premium features.

## Stripe Setup

### Products and Prices

Create in Stripe Dashboard:

```
Product: CrewUp Pro

Price 1 (Monthly):
- Amount: $15.00 USD
- Billing: Recurring monthly
- ID: price_monthly_xxxx

Price 2 (Annual):
- Amount: $150.00 USD
- Billing: Recurring yearly
- ID: price_annual_xxxx
```

### Webhook Endpoint

Configure webhook in Stripe Dashboard:
- URL: `https://your-domain.com/api/webhooks/stripe`
- Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`

## Checkout Flow

```
1. User clicks "Upgrade to Pro" → PricingCard component
2. Select plan (monthly or annual)
3. Click "Subscribe" → calls /api/subscriptions/checkout
4. API creates Stripe Checkout Session
5. User redirected to Stripe-hosted checkout page
6. User enters payment details and confirms
7. Stripe processes payment
8. Stripe redirects to success_url (/dashboard?session_id={id})
9. Stripe sends checkout.session.completed webhook
10. Webhook handler creates subscription record in database
11. Updates profile.subscription_status = 'pro'
12. User sees Pro features unlocked
```

## Implementation

### Environment Variables

```env
# .env.local
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_MONTHLY=price_monthly_xxxx
STRIPE_PRICE_ANNUAL=price_annual_xxxx
```

### Checkout API

```typescript
// app/api/subscriptions/checkout/route.ts
import Stripe from 'stripe'
import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

export async function POST(request: Request) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { price_id } = await request.json()

    // Validate price_id
    const validPrices = [
      process.env.STRIPE_PRICE_MONTHLY!,
      process.env.STRIPE_PRICE_ANNUAL!,
    ]
    if (!validPrices.includes(price_id)) {
      return NextResponse.json({ error: 'Invalid price' }, { status: 400 })
    }

    // Get user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, name')
      .eq('id', user.id)
      .single()

    // Check if user already has active subscription
    const { data: existingS ub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (existingSub) {
      return NextResponse.json(
        { error: 'You already have an active subscription' },
        { status: 400 }
      )
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer_email: profile.email,
      client_reference_id: user.id,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: price_id,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/pricing?canceled=true`,
      metadata: {
        user_id: user.id,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
        },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
```

### Webhook Handler

```typescript
// app/api/webhooks/stripe/route.ts
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

// Use service role key for webhook (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        // Retrieve full subscription details
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        )

        const userId = session.metadata?.user_id
        if (!userId) throw new Error('No user_id in session metadata')

        // Create subscription record
        await supabase.from('subscriptions').insert({
          user_id: userId,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: subscription.id,
          stripe_price_id: subscription.items.data[0].price.id,
          status: subscription.status,
          plan_type: subscription.items.data[0].price.recurring?.interval === 'year'
            ? 'annual'
            : 'monthly',
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
        })

        // Update profile to Pro
        await supabase
          .from('profiles')
          .update({ subscription_status: 'pro' })
          .eq('id', userId)

        console.log(`✅ Subscription created for user ${userId}`)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription

        await supabase
          .from('subscriptions')
          .update({
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
          })
          .eq('stripe_subscription_id', subscription.id)

        console.log(`✅ Subscription updated: ${subscription.id}`)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription

        // Get user_id from subscription
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', subscription.id)
          .single()

        if (sub) {
          // Update subscription status
          await supabase
            .from('subscriptions')
            .update({ status: 'canceled' })
            .eq('stripe_subscription_id', subscription.id)

          // Downgrade user to free
          await supabase
            .from('profiles')
            .update({ subscription_status: 'free' })
            .eq('id', sub.user_id)

          console.log(`✅ Subscription canceled for user ${sub.user_id}`)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice

        if (invoice.subscription) {
          await supabase
            .from('subscriptions')
            .update({ status: 'past_due' })
            .eq('stripe_subscription_id', invoice.subscription as string)

          console.log(`⚠️ Payment failed for subscription ${invoice.subscription}`)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

// Disable body parsing - Stripe needs raw body
export const config = {
  api: {
    bodyParser: false,
  },
}
```

### Get Current Subscription

```typescript
// app/api/subscriptions/route.ts
import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return NextResponse.json({ data: subscription })
}
```

### Cancel Subscription

```typescript
// app/api/subscriptions/cancel/route.ts
import Stripe from 'stripe'
import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

export async function POST() {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', user.id)
      .single()

    if (!subscription) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
    }

    // Cancel at period end (user retains access until then)
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: true,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Cancel subscription error:', error)
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    )
  }
}
```

### Customer Portal

```typescript
// app/api/subscriptions/portal/route.ts
import Stripe from 'stripe'
import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

export async function GET() {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    if (!subscription) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
    }

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_URL}/dashboard/subscription`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Portal error:', error)
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    )
  }
}
```

## Client Hooks

### `use-subscription.ts`

```typescript
// features/subscriptions/hooks/use-subscription.ts
import { useQuery } from '@tanstack/react-query'

export function useSubscription() {
  return useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      const res = await fetch('/api/subscriptions')
      if (!res.ok) throw new Error('Failed to fetch subscription')
      const data = await res.json()
      return data.data
    },
  })
}
```

### `use-checkout.ts`

```typescript
// features/subscriptions/hooks/use-checkout.ts
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'

export function useCheckout() {
  const router = useRouter()

  return useMutation({
    mutationFn: async (priceId: string) => {
      const res = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price_id: priceId }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error)
      }

      return res.json()
    },
    onSuccess: (data) => {
      // Redirect to Stripe Checkout
      window.location.href = data.url
    },
  })
}
```

### `use-is-pro.ts`

```typescript
// features/subscriptions/hooks/use-is-pro.ts
import { useAuth } from '@/features/auth/hooks/use-auth'

export function useIsPro() {
  const { data: auth } = useAuth()
  return auth?.profile?.subscription_status === 'pro'
}
```

## Components

### Pricing Card

```typescript
// features/subscriptions/components/pricing-card.tsx
'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useCheckout } from '../hooks/use-checkout'
import { useIsPro } from '../hooks/use-is-pro'

export function PricingCard() {
  const checkout = useCheckout()
  const isPro = useIsPro()

  const plans = [
    {
      name: 'Monthly Pro',
      price: '$15',
      period: 'month',
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY!,
      savings: null,
    },
    {
      name: 'Annual Pro',
      price: '$150',
      period: 'year',
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ANNUAL!,
      savings: 'Save $30',
    },
  ]

  if (isPro) {
    return (
      <Card className="p-6">
        <h3 className="text-xl font-bold text-green-600">You're a Pro member!</h3>
        <Button
          onClick={() => window.location.href = '/api/subscriptions/portal'}
          className="mt-4"
        >
          Manage Subscription
        </Button>
      </Card>
    )
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {plans.map(plan => (
        <Card key={plan.name} className="p-6">
          <h3 className="text-2xl font-bold">{plan.name}</h3>
          <div className="mt-4">
            <span className="text-4xl font-bold">{plan.price}</span>
            <span className="text-gray-600">/{plan.period}</span>
          </div>
          {plan.savings && (
            <p className="text-green-600 font-semibold mt-2">{plan.savings}</p>
          )}
          <Button
            onClick={() => checkout.mutate(plan.priceId)}
            disabled={checkout.isPending}
            className="w-full mt-6"
          >
            {checkout.isPending ? 'Loading...' : 'Subscribe'}
          </Button>
        </Card>
      ))}
    </div>
  )
}
```

### Feature Gate

```typescript
// features/subscriptions/components/feature-gate.tsx
'use client'

import { useIsPro } from '../hooks/use-is-pro'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

interface FeatureGateProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function FeatureGate({ children, fallback }: FeatureGateProps) {
  const isPro = useIsPro()
  const router = useRouter()

  if (!isPro) {
    return fallback || (
      <div className="p-6 text-center border-2 border-dashed rounded-lg">
        <h3 className="font-bold text-lg">Pro Feature</h3>
        <p className="text-gray-600 mt-2">Upgrade to Pro to unlock this feature</p>
        <Button
          onClick={() => router.push('/pricing')}
          className="mt-4"
        >
          Upgrade to Pro
        </Button>
      </div>
    )
  }

  return <>{children}</>
}

// Usage
<FeatureGate>
  <ProximityAlerts />
</FeatureGate>
```

## Testing

### Test Webhook Locally

Use Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
stripe trigger checkout.session.completed
```

### Test Cards

Stripe provides test cards:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0025 0000 3155`

## Security Considerations

1. **Webhook signature verification**: Always verify Stripe signature
2. **Use service role key in webhooks**: Bypass RLS for webhook operations
3. **Validate price IDs**: Only accept known price IDs in checkout
4. **Never expose secret key**: Only use in server-side code
5. **HTTPS required**: Stripe webhooks require HTTPS in production

## Production Checklist

- [ ] Switch to live Stripe keys
- [ ] Update webhook endpoint URL in Stripe Dashboard
- [ ] Test full checkout flow end-to-end
- [ ] Test subscription cancellation
- [ ] Test failed payment scenarios
- [ ] Set up Stripe email receipts
- [ ] Configure billing portal settings
- [ ] Add sales tax collection if required
