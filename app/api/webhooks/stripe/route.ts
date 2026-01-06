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

/**
 * Stripe webhook handler
 * Note: This route is not functional in static export builds (mobile).
 */
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

  // Idempotency check: Return 200 if event already processed
  const { data: existingEvent } = await supabaseAdmin
    .from('stripe_processed_events')
    .select('id')
    .eq('id', event.id)
    .maybeSingle();

  if (existingEvent) {
    console.log(`Event ${event.id} already processed, skipping`);
    return NextResponse.json({ received: true });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;

        if (!userId) {
          console.error('No user_id in session metadata');
          return NextResponse.json({ error: 'Missing user_id in session metadata' }, { status: 500 });
        }

        // Get subscription details
        const subscriptionId = session.subscription as string;
        const subscription: Stripe.Subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price.id;

        // Determine plan_type based on price ID
        let planType: 'monthly' | 'annual';
        if (priceId === process.env.STRIPE_PRICE_ID_PRO_MONTHLY) {
          planType = 'monthly';
        } else if (priceId === process.env.STRIPE_PRICE_ID_PRO_ANNUAL) {
          planType = 'annual';
        } else {
          console.error('Unknown price ID:', priceId);
          return NextResponse.json({ error: 'Unknown price ID' }, { status: 500 });
        }

        // Safely convert Unix timestamps (seconds) to ISO strings
        const periodStart = (subscription as any).current_period_start
          ? new Date((subscription as any).current_period_start * 1000).toISOString()
          : new Date().toISOString();
        const periodEnd = (subscription as any).current_period_end
          ? new Date((subscription as any).current_period_end * 1000).toISOString()
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // Default to 30 days

        const { error } = await supabaseAdmin.from('subscriptions').upsert({
          user_id: userId,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: subscriptionId,
          stripe_price_id: priceId,
          status: 'active' as any,
          plan_type: planType,
          current_period_start: periodStart,
          current_period_end: periodEnd,
          cancel_at_period_end: subscription.cancel_at_period_end ?? false,
        });

        if (error) {
          console.error('Database error upserting subscription:', error);
          return NextResponse.json({ error: 'Database operation failed' }, { status: 500 });
        }

        // Track in history
        await supabaseAdmin.from('subscription_history').insert({
          user_id: userId,
          stripe_subscription_id: subscriptionId,
          event_type: 'subscription_created',
          status: 'active',
          plan_type: planType,
          metadata: {
            checkout_session_id: session.id,
          },
        });

        // Update profiles.subscription_status to 'pro' and activate profile boost
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('role, is_lifetime_pro')
          .eq('id', userId)
          .single();

        // Protect lifetime Pro users - they already have Pro access
        if (profile?.is_lifetime_pro) {
          console.log(`User ${userId} has lifetime Pro - skipping subscription_status update`);
        } else {
          // Only set profile boost for workers
          const profileUpdate: any = { subscription_status: 'pro' };
          if (profile?.role === 'worker') {
            profileUpdate.is_profile_boosted = true;
            // Profile boost lasts 7 days and renews monthly
            profileUpdate.boost_expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
          }

          const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update(profileUpdate)
            .eq('id', userId);

          if (profileError) {
            console.error('Database error updating profile subscription status:', profileError);
            // Don't fail the webhook for this, just log the error
          }
        }

        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find user by customer ID
        const { data: existingSubscription, error: fetchError } = await supabaseAdmin
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (fetchError || !existingSubscription) {
          console.error('No subscription found for customer:', customerId, fetchError);
          return NextResponse.json({ error: 'Subscription not found' }, { status: 500 });
        }

        const priceId = subscription.items.data[0]?.price.id;

        // Determine plan_type based on price ID
        let planType: 'monthly' | 'annual';
        if (priceId === process.env.STRIPE_PRICE_ID_PRO_MONTHLY) {
          planType = 'monthly';
        } else if (priceId === process.env.STRIPE_PRICE_ID_PRO_ANNUAL) {
          planType = 'annual';
        } else {
          console.error('Unknown price ID:', priceId);
          return NextResponse.json({ error: 'Unknown price ID' }, { status: 500 });
        }

        // Safely convert Unix timestamps (seconds) to ISO strings
        const periodStart = (subscription as any).current_period_start
          ? new Date((subscription as any).current_period_start * 1000).toISOString()
          : new Date().toISOString();
        const periodEnd = (subscription as any).current_period_end
          ? new Date((subscription as any).current_period_end * 1000).toISOString()
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        const { error: updateError } = await supabaseAdmin
          .from('subscriptions')
          .update({
            stripe_subscription_id: subscription.id,
            stripe_price_id: priceId,
            status: subscription.status as any,
            plan_type: planType,
            current_period_start: periodStart,
            current_period_end: periodEnd,
            cancel_at_period_end: subscription.cancel_at_period_end ?? false,
          })
          .eq('user_id', existingSubscription.user_id);

        if (updateError) {
          console.error('Database error updating subscription:', updateError);
          return NextResponse.json({ error: 'Database operation failed' }, { status: 500 });
        }

        // Track in history
        await supabaseAdmin.from('subscription_history').insert({
          user_id: existingSubscription.user_id,
          stripe_subscription_id: subscription.id,
          event_type: 'subscription_updated',
          status: subscription.status,
          plan_type: planType,
          metadata: {
            cancel_at_period_end: subscription.cancel_at_period_end,
          },
        });

        // Renew profile boost if subscription is active and for workers
        if (subscription.status === 'active') {
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role, is_lifetime_pro')
            .eq('id', existingSubscription.user_id)
            .single();

          // Protect lifetime Pro users - don't modify their status
          if (profile?.is_lifetime_pro) {
            console.log(`User ${existingSubscription.user_id} has lifetime Pro - skipping subscription renewal updates`);
          } else if (profile?.role === 'worker') {
            await supabaseAdmin
              .from('profiles')
              .update({
                is_profile_boosted: true,
                boost_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              })
              .eq('id', existingSubscription.user_id);
          }
        }

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const { data: existingSubscription, error: fetchError } = await supabaseAdmin
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (fetchError || !existingSubscription) {
          console.error('No subscription found for customer:', customerId, fetchError);
          return NextResponse.json({ error: 'Subscription not found' }, { status: 500 });
        }

        const { error: updateError } = await supabaseAdmin
          .from('subscriptions')
          .update({
            status: 'canceled',
            cancel_at_period_end: false,
          })
          .eq('user_id', existingSubscription.user_id);

        if (updateError) {
          console.error('Database error updating subscription:', updateError);
          return NextResponse.json({ error: 'Database operation failed' }, { status: 500 });
        }

        // Track in history
        await supabaseAdmin.from('subscription_history').insert({
          user_id: existingSubscription.user_id,
          stripe_subscription_id: subscription.id,
          event_type: 'subscription_canceled',
          status: 'canceled',
          metadata: {
            deleted_at: new Date().toISOString(),
          },
        });

        // Update profiles.subscription_status back to 'free' and remove profile boost
        // BUT protect lifetime Pro users - they keep Pro access even after canceling
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('is_lifetime_pro')
          .eq('id', existingSubscription.user_id)
          .single();

        if (profile?.is_lifetime_pro) {
          console.log(`User ${existingSubscription.user_id} has lifetime Pro - keeping Pro access despite cancellation`);
        } else {
          const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({
              subscription_status: 'free',
              is_profile_boosted: false,
              boost_expires_at: null,
            })
            .eq('id', existingSubscription.user_id);

          if (profileError) {
            console.error('Database error updating profile subscription status:', profileError);
            // Don't fail the webhook for this, just log the error
          }
        }

        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const { data: existingSubscription, error: fetchError } = await supabaseAdmin
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (fetchError || !existingSubscription) {
          console.error('No subscription found for customer:', customerId, fetchError);
          return NextResponse.json({ error: 'Subscription not found' }, { status: 500 });
        }

        const { error: updateError } = await supabaseAdmin
          .from('subscriptions')
          .update({
            status: 'past_due',
          })
          .eq('user_id', existingSubscription.user_id);

        if (updateError) {
          console.error('Database error updating subscription:', updateError);
          return NextResponse.json({ error: 'Database operation failed' }, { status: 500 });
        }

        // Track in history
        await supabaseAdmin.from('subscription_history').insert({
          user_id: existingSubscription.user_id,
          stripe_subscription_id: (invoice as any).subscription as string,
          event_type: 'payment_failed',
          status: 'past_due',
          metadata: {
            invoice_id: invoice.id,
            amount_due: invoice.amount_due / 100,
          },
        });

        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const subscriptionId = (invoice as any).subscription as string;

        // Skip if not a subscription payment (e.g. one-off invoice)
        if (!subscriptionId) break;

        const { data: existingSubscription } = await supabaseAdmin
          .from('subscriptions')
          .select('user_id, plan_type')
          .eq('stripe_customer_id', customerId)
          .maybeSingle();

        if (existingSubscription) {
          await supabaseAdmin.from('subscription_history').insert({
            user_id: existingSubscription.user_id,
            stripe_subscription_id: subscriptionId,
            event_type: 'payment_succeeded',
            status: 'active',
            plan_type: existingSubscription.plan_type,
            amount: invoice.amount_paid / 100,
            currency: invoice.currency,
            metadata: {
              invoice_id: invoice.id,
              billing_reason: invoice.billing_reason,
            },
          });
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Mark event as processed for idempotency
    await supabaseAdmin
      .from('stripe_processed_events')
      .insert({
        id: event.id,
        type: event.type,
      });

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
