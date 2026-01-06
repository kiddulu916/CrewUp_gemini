'use server';

import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import type { Subscription } from '@/types/subscription';

export type SubscriptionResult = {
  success: boolean;
  error?: string;
  subscription?: Subscription;
  profileSubscriptionStatus?: 'free' | 'pro';
};

/**
 * Get current user's subscription
 */
export async function getMySubscription(): Promise<SubscriptionResult> {
  const supabase = await createClient(await cookies());

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get profile subscription status (source of truth for UI)
  const { data: profile } = await supabase
    .from('users')
    .select('subscription_status')
    .eq('id', user.id)
    .single();

  const profileSubscriptionStatus = (profile?.subscription_status as 'free' | 'pro') || 'free';

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
    const now = new Date();
    const farFuture = new Date('2099-12-31');
    return {
      success: true,
      profileSubscriptionStatus,
      subscription: {
        id: '',
        user_id: user.id,
        stripe_customer_id: '',
        stripe_subscription_id: '',
        stripe_price_id: '',
        status: 'active',
        plan_type: 'monthly',
        current_period_start: now.toISOString(),
        current_period_end: farFuture.toISOString(),
        cancel_at_period_end: false,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      },
    };
  }

  return { success: true, subscription, profileSubscriptionStatus };
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
  const supabase = await createClient(await cookies());

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Validate priceId format
  if (!priceId || !priceId.startsWith('price_')) {
    console.error('Invalid priceId format:', { priceId, userId: user.id });
    return { success: false, error: 'Invalid price ID format' };
  }

  // Validate environment variable
  if (!process.env.NEXT_PUBLIC_APP_URL) {
    console.error('Missing NEXT_PUBLIC_APP_URL environment variable', { userId: user.id, priceId });
    return { success: false, error: 'Application URL not configured' };
  }

  let customerId: string | undefined;

  try {
    // Get or create Stripe customer
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    customerId = subscription?.stripe_customer_id;

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

    // Revalidate subscription page after creating session
    revalidatePath('/dashboard/subscription');

    return { success: true, url: session.url || undefined };
  } catch (error) {
    console.error('Checkout session error:', {
      error,
      userId: user.id,
      priceId,
      customerId,
    });
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
  const supabase = await createClient(await cookies());

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  let customerId: string | undefined;

  try {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (!subscription?.stripe_customer_id) {
      return { success: false, error: 'No subscription found' };
    }

    customerId = subscription.stripe_customer_id;

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscription`,
    });

    // Revalidate subscription page after creating portal session
    revalidatePath('/dashboard/subscription');

    return { success: true, url: session.url };
  } catch (error) {
    console.error('Portal session error:', {
      error,
      userId: user.id,
      customerId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create portal session',
    };
  }
}
