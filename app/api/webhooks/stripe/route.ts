import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import * as Sentry from '@sentry/nextjs';

// Create Supabase admin client for webhook (server-side, bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// * Webhook processing timeout (30 seconds)
const WEBHOOK_TIMEOUT_MS = 30000;

/**
 * Log webhook event for auditing
 */
async function logWebhookEvent(
  eventId: string,
  eventType: string,
  status: 'received' | 'processed' | 'failed' | 'timeout',
  metadata?: Record<string, unknown>
) {
  try {
    await supabaseAdmin.from('webhook_logs').insert({
      event_id: eventId,
      event_type: eventType,
      status,
      metadata,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    // ! Don't fail webhook if logging fails, just log to console
    console.error('Failed to log webhook event:', err);
  }
}

/**
 * Stripe webhook handler
 * 
 * * Security features:
 * - Signature verification (Stripe signature)
 * - Idempotency check (prevents duplicate processing)
 * - Timeout handling (30 second limit)
 * - Audit logging (logs all webhook events)
 * - Error reporting to Sentry
 * 
 * Note: This route is not functional in static export builds (mobile).
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let eventId = 'unknown';
  let eventType = 'unknown';

  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  // ! Security: Reject requests without signature
  if (!signature) {
    Sentry.captureMessage('Stripe webhook received without signature', {
      level: 'warning',
      extra: { ip: headersList.get('x-forwarded-for') },
    });
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    eventId = event.id;
    eventType = event.type;
  } catch (err) {
    // ! Security: Log signature verification failures (potential attack)
    Sentry.captureException(err, {
      tags: { webhook: 'stripe', error_type: 'signature_verification' },
      extra: { 
        ip: headersList.get('x-forwarded-for'),
        userAgent: headersList.get('user-agent'),
      },
    });
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // * Log webhook received
  await logWebhookEvent(eventId, eventType, 'received');

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
          .from('users')
          .select('role, is_lifetime_pro')
          .eq('id', userId)
          .single();

        // Protect lifetime Pro users - they already have Pro access
        if (profile?.is_lifetime_pro) {
          console.log(`User ${userId} has lifetime Pro - skipping subscription_status update`);
        } else {
          // Update subscription status on users table
          const { error: profileError } = await supabaseAdmin
            .from('users')
            .update({ subscription_status: 'pro' })
            .eq('id', userId);

          if (profileError) {
            console.error('Database error updating profile subscription status:', profileError);
            // Don't fail the webhook for this, just log the error
          }

          // Set profile boost on workers table (only for workers)
          // * Profile boost is continuous for the entire Pro subscription duration
          if (profile?.role === 'worker') {
            const { error: workerError } = await supabaseAdmin
              .from('workers')
              .update({
                is_profile_boosted: true,
                boost_expires_at: null, // * No expiration - boost lasts entire subscription
              })
              .eq('user_id', userId);

            if (workerError) {
              console.error('Database error updating worker boost:', workerError);
            }
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

        // Ensure profile boost is active if subscription is active (for workers)
        // * Profile boost is continuous - no expiration while subscription active
        if (subscription.status === 'active') {
          const { data: profile } = await supabaseAdmin
            .from('users')
            .select('role, is_lifetime_pro')
            .eq('id', existingSubscription.user_id)
            .single();

          // Protect lifetime Pro users - don't modify their status
          if (profile?.is_lifetime_pro) {
            console.log(`User ${existingSubscription.user_id} has lifetime Pro - skipping subscription renewal updates`);
          } else if (profile?.role === 'worker') {
            // Update workers table - ensure boost is active (continuous while subscribed)
            await supabaseAdmin
              .from('workers')
              .update({
                is_profile_boosted: true,
                boost_expires_at: null, // * No expiration - boost lasts entire subscription
              })
              .eq('user_id', existingSubscription.user_id);
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
          .from('users')
          .select('is_lifetime_pro')
          .eq('id', existingSubscription.user_id)
          .single();

        if (profile?.is_lifetime_pro) {
          console.log(`User ${existingSubscription.user_id} has lifetime Pro - keeping Pro access despite cancellation`);
        } else {
          // Update subscription status on users table
          const { error: profileError } = await supabaseAdmin
            .from('users')
            .update({ subscription_status: 'free' })
            .eq('id', existingSubscription.user_id);

          if (profileError) {
            console.error('Database error updating profile subscription status:', profileError);
            // Don't fail the webhook for this, just log the error
          }

          // Remove profile boost on workers table
          const { error: workerError } = await supabaseAdmin
            .from('workers')
            .update({
              is_profile_boosted: false,
              boost_expires_at: null,
            })
            .eq('user_id', existingSubscription.user_id);

          if (workerError) {
            console.error('Database error removing worker boost:', workerError);
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

    // * Check for timeout
    const processingTime = Date.now() - startTime;
    if (processingTime > WEBHOOK_TIMEOUT_MS) {
      Sentry.captureMessage('Stripe webhook processing exceeded timeout', {
        level: 'warning',
        tags: { webhook: 'stripe', event_type: eventType },
        extra: { eventId, processingTimeMs: processingTime },
      });
      await logWebhookEvent(eventId, eventType, 'timeout', { processingTimeMs: processingTime });
    } else {
      await logWebhookEvent(eventId, eventType, 'processed', { processingTimeMs: processingTime });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    // ! Log error to Sentry with full context
    Sentry.captureException(err, {
      tags: { webhook: 'stripe', event_type: eventType },
      extra: { 
        eventId,
        processingTimeMs: Date.now() - startTime,
      },
    });
    console.error('Webhook handler error:', err);
    
    // * Log failed webhook
    await logWebhookEvent(eventId, eventType, 'failed', { error: String(err) });
    
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
