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
        stripe_customer_id: '',
        stripe_subscription_id: '',
        stripe_price_id: '',
        status: 'active',
        plan_type: 'monthly',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date().toISOString(),
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

      // Note: We don't upsert here because subscriptions table requires all fields
      // The subscription will be created by the webhook after successful checkout
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
