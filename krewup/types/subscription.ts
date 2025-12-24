// types/subscription.ts

/**
 * All possible Stripe subscription statuses
 * @see https://docs.stripe.com/api/subscriptions/object
 */
export type SubscriptionStatus =
  | 'active'              // Subscription is in good standing
  | 'canceled'            // Subscription has been canceled
  | 'incomplete'          // Initial payment attempt failed
  | 'incomplete_expired'  // First invoice not paid within 23 hours (terminal)
  | 'past_due'            // Most recent invoice failed
  | 'trialing'            // Currently in trial period
  | 'unpaid'              // Invoices open but not attempting payment
  | 'paused';             // Trial ended without payment method

export type SubscriptionTier = 'free' | 'pro';

/**
 * Database uses 'monthly' and 'annual' to match Stripe convention
 */
export type BillingInterval = 'monthly' | 'annual';

/**
 * Subscription interface matching database schema
 * Note: Database uses 'plan_type' instead of 'tier' for the billing interval
 */
export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  stripe_price_id: string;
  status: SubscriptionStatus;
  plan_type: BillingInterval;  // Database field name
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}
