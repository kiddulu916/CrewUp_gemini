/**
 * Stripe Service - Pure business logic for Stripe webhook processing.
 *
 * This module contains testable pure functions for subscription management
 * and webhook data transformation. No Server Action dependencies.
 */

// ============================================================================
// Types
// ============================================================================

export type PlanType = 'monthly' | 'annual';

export type SubscriptionStatus =
  | 'active'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'past_due'
  | 'trialing'
  | 'unpaid';

export type WebhookEventType =
  | 'checkout.session.completed'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'invoice.payment_failed'
  | 'invoice.payment_succeeded';

export type CheckoutSessionMetadata = {
  user_id?: string;
  [key: string]: string | undefined;
};

export type SubscriptionRecord = {
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  stripe_price_id: string;
  status: SubscriptionStatus;
  plan_type: PlanType;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
};

export type SubscriptionHistoryRecord = {
  user_id: string;
  stripe_subscription_id: string;
  event_type: string;
  status: string;
  plan_type?: PlanType;
  amount?: number;
  currency?: string;
  metadata?: Record<string, unknown>;
};

export type ValidationResult = {
  valid: boolean;
  error?: string;
};

export type PriceIdConfig = {
  monthlyPriceId: string;
  annualPriceId: string;
};

// ============================================================================
// Constants
// ============================================================================

export const SUPPORTED_WEBHOOK_EVENTS: WebhookEventType[] = [
  'checkout.session.completed',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_failed',
  'invoice.payment_succeeded',
];

export const ACTIVE_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  'active',
  'trialing',
];

export const INACTIVE_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  'canceled',
  'incomplete_expired',
  'unpaid',
];

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates checkout session metadata.
 * @param metadata - Session metadata from Stripe
 * @returns ValidationResult
 */
export function validateCheckoutMetadata(
  metadata: CheckoutSessionMetadata | null | undefined
): ValidationResult {
  if (!metadata) {
    return { valid: false, error: 'Missing session metadata' };
  }

  if (!metadata.user_id) {
    return { valid: false, error: 'Missing user_id in session metadata' };
  }

  if (typeof metadata.user_id !== 'string' || metadata.user_id.trim().length === 0) {
    return { valid: false, error: 'Invalid user_id in session metadata' };
  }

  return { valid: true };
}

/**
 * Validates a Stripe price ID against known price IDs.
 * @param priceId - The price ID from Stripe
 * @param config - Price ID configuration
 * @returns ValidationResult with plan type if valid
 */
export function validatePriceId(
  priceId: string | undefined,
  config: PriceIdConfig
): ValidationResult & { planType?: PlanType } {
  if (!priceId) {
    return { valid: false, error: 'Missing price ID' };
  }

  if (priceId === config.monthlyPriceId) {
    return { valid: true, planType: 'monthly' };
  }

  if (priceId === config.annualPriceId) {
    return { valid: true, planType: 'annual' };
  }

  return { valid: false, error: `Unknown price ID: ${priceId}` };
}

/**
 * Validates a Stripe customer ID.
 * @param customerId - The customer ID from Stripe
 * @returns ValidationResult
 */
export function validateCustomerId(customerId: string | null | undefined): ValidationResult {
  if (!customerId) {
    return { valid: false, error: 'Missing customer ID' };
  }

  if (typeof customerId !== 'string') {
    return { valid: false, error: 'Invalid customer ID type' };
  }

  // Stripe customer IDs start with 'cus_'
  if (!customerId.startsWith('cus_')) {
    return { valid: false, error: 'Invalid customer ID format' };
  }

  return { valid: true };
}

/**
 * Validates a Stripe subscription ID.
 * @param subscriptionId - The subscription ID from Stripe
 * @returns ValidationResult
 */
export function validateSubscriptionId(subscriptionId: string | null | undefined): ValidationResult {
  if (!subscriptionId) {
    return { valid: false, error: 'Missing subscription ID' };
  }

  if (typeof subscriptionId !== 'string') {
    return { valid: false, error: 'Invalid subscription ID type' };
  }

  // Stripe subscription IDs start with 'sub_'
  if (!subscriptionId.startsWith('sub_')) {
    return { valid: false, error: 'Invalid subscription ID format' };
  }

  return { valid: true };
}

/**
 * Checks if a webhook event type is supported.
 * @param eventType - The event type from Stripe
 * @returns true if supported
 */
export function isSupportedWebhookEvent(eventType: string): eventType is WebhookEventType {
  return SUPPORTED_WEBHOOK_EVENTS.includes(eventType as WebhookEventType);
}

// ============================================================================
// Plan & Status Functions
// ============================================================================

/**
 * Determines plan type from a Stripe price ID.
 * @param priceId - The price ID from Stripe
 * @param config - Price ID configuration
 * @returns PlanType or null if unknown
 */
export function determinePlanType(
  priceId: string | undefined,
  config: PriceIdConfig
): PlanType | null {
  if (!priceId) return null;

  if (priceId === config.monthlyPriceId) return 'monthly';
  if (priceId === config.annualPriceId) return 'annual';

  return null;
}

/**
 * Maps Stripe subscription status to internal status.
 * @param stripeStatus - Status from Stripe API
 * @returns Mapped subscription status
 */
export function mapSubscriptionStatus(stripeStatus: string): SubscriptionStatus {
  const validStatuses: SubscriptionStatus[] = [
    'active',
    'canceled',
    'incomplete',
    'incomplete_expired',
    'past_due',
    'trialing',
    'unpaid',
  ];

  if (validStatuses.includes(stripeStatus as SubscriptionStatus)) {
    return stripeStatus as SubscriptionStatus;
  }

  // Default to 'incomplete' for unknown statuses
  return 'incomplete';
}

/**
 * Checks if a subscription status indicates an active subscription.
 * @param status - Subscription status
 * @returns true if subscription is considered active
 */
export function isSubscriptionActive(status: SubscriptionStatus): boolean {
  return ACTIVE_SUBSCRIPTION_STATUSES.includes(status);
}

/**
 * Checks if a subscription status indicates the subscription is canceled/inactive.
 * @param status - Subscription status
 * @returns true if subscription is considered inactive
 */
export function isSubscriptionInactive(status: SubscriptionStatus): boolean {
  return INACTIVE_SUBSCRIPTION_STATUSES.includes(status);
}

/**
 * Determines the user-facing subscription tier from status.
 * @param status - Subscription status
 * @returns 'pro' or 'free'
 */
export function getSubscriptionTier(status: SubscriptionStatus): 'pro' | 'free' {
  return isSubscriptionActive(status) ? 'pro' : 'free';
}

// ============================================================================
// Timestamp Functions
// ============================================================================

/**
 * Converts a Unix timestamp (seconds) to ISO string.
 * @param unixTimestamp - Unix timestamp in seconds
 * @returns ISO date string
 */
export function unixToISOString(unixTimestamp: number | undefined | null): string {
  if (!unixTimestamp || typeof unixTimestamp !== 'number') {
    return new Date().toISOString();
  }

  // Stripe timestamps are in seconds, JavaScript uses milliseconds
  return new Date(unixTimestamp * 1000).toISOString();
}

/**
 * Calculates default period end (30 days from now).
 * @returns ISO date string 30 days from now
 */
export function getDefaultPeriodEnd(): string {
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  return new Date(Date.now() + thirtyDaysMs).toISOString();
}

/**
 * Calculates period end based on plan type.
 * @param planType - Monthly or annual
 * @param startDate - Period start date
 * @returns ISO date string for period end
 */
export function calculatePeriodEnd(planType: PlanType, startDate: Date = new Date()): string {
  const endDate = new Date(startDate);

  if (planType === 'monthly') {
    endDate.setMonth(endDate.getMonth() + 1);
  } else {
    endDate.setFullYear(endDate.getFullYear() + 1);
  }

  return endDate.toISOString();
}

// ============================================================================
// Record Building Functions
// ============================================================================

/**
 * Builds a subscription record for database upsert.
 * @param params - Subscription parameters
 * @returns SubscriptionRecord
 */
export function buildSubscriptionRecord(params: {
  userId: string;
  customerId: string;
  subscriptionId: string;
  priceId: string;
  planType: PlanType;
  status: SubscriptionStatus;
  periodStart: number | undefined;
  periodEnd: number | undefined;
  cancelAtPeriodEnd: boolean;
}): SubscriptionRecord {
  return {
    user_id: params.userId,
    stripe_customer_id: params.customerId,
    stripe_subscription_id: params.subscriptionId,
    stripe_price_id: params.priceId,
    status: params.status,
    plan_type: params.planType,
    current_period_start: unixToISOString(params.periodStart),
    current_period_end: params.periodEnd
      ? unixToISOString(params.periodEnd)
      : getDefaultPeriodEnd(),
    cancel_at_period_end: params.cancelAtPeriodEnd,
  };
}

/**
 * Builds a subscription history record.
 * @param params - History record parameters
 * @returns SubscriptionHistoryRecord
 */
export function buildSubscriptionHistoryRecord(params: {
  userId: string;
  subscriptionId: string;
  eventType: string;
  status: string;
  planType?: PlanType;
  amount?: number;
  currency?: string;
  metadata?: Record<string, unknown>;
}): SubscriptionHistoryRecord {
  const record: SubscriptionHistoryRecord = {
    user_id: params.userId,
    stripe_subscription_id: params.subscriptionId,
    event_type: params.eventType,
    status: params.status,
  };

  if (params.planType) record.plan_type = params.planType;
  if (params.amount !== undefined) record.amount = params.amount;
  if (params.currency) record.currency = params.currency;
  if (params.metadata) record.metadata = params.metadata;

  return record;
}

// ============================================================================
// Boost Logic Functions
// ============================================================================

/**
 * Determines if profile boost should be activated for a user.
 * @param role - User's role
 * @param isLifetimePro - Whether user has lifetime Pro
 * @param subscriptionStatus - Current subscription status
 * @returns true if boost should be activated
 */
export function shouldActivateProfileBoost(
  role: string | null | undefined,
  isLifetimePro: boolean | null | undefined,
  subscriptionStatus: SubscriptionStatus
): boolean {
  // Lifetime Pro users already have boost
  if (isLifetimePro) return false;

  // Only workers get profile boost
  if (role !== 'worker') return false;

  // Only activate for active subscriptions
  return isSubscriptionActive(subscriptionStatus);
}

/**
 * Determines if profile boost should be removed for a user.
 * @param role - User's role
 * @param isLifetimePro - Whether user has lifetime Pro
 * @returns true if boost should be removed
 */
export function shouldRemoveProfileBoost(
  role: string | null | undefined,
  isLifetimePro: boolean | null | undefined
): boolean {
  // Lifetime Pro users keep boost
  if (isLifetimePro) return false;

  // Only affects workers (who had boost)
  return role === 'worker';
}

/**
 * Determines if subscription status update should be skipped.
 * @param isLifetimePro - Whether user has lifetime Pro
 * @returns true if update should be skipped
 */
export function shouldSkipSubscriptionUpdate(isLifetimePro: boolean | null | undefined): boolean {
  return !!isLifetimePro;
}

// ============================================================================
// Amount Conversion Functions
// ============================================================================

/**
 * Converts Stripe amount (cents) to dollars.
 * @param amountInCents - Amount in cents from Stripe
 * @returns Amount in dollars
 */
export function centsToDollars(amountInCents: number): number {
  return amountInCents / 100;
}

/**
 * Converts dollars to Stripe amount (cents).
 * @param amountInDollars - Amount in dollars
 * @returns Amount in cents for Stripe
 */
export function dollarsToCents(amountInDollars: number): number {
  return Math.round(amountInDollars * 100);
}

/**
 * Formats an amount for display.
 * @param amountInCents - Amount in cents
 * @param currency - Currency code (default: 'usd')
 * @returns Formatted amount string
 */
export function formatAmount(amountInCents: number, currency: string = 'usd'): string {
  const dollars = centsToDollars(amountInCents);

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(dollars);
}

// ============================================================================
// Webhook Event Helpers
// ============================================================================

/**
 * Extracts user ID from checkout session metadata.
 * @param metadata - Session metadata
 * @returns User ID or null
 */
export function extractUserIdFromMetadata(
  metadata: CheckoutSessionMetadata | null | undefined
): string | null {
  if (!metadata?.user_id) return null;
  return metadata.user_id.trim() || null;
}

/**
 * Extracts price ID from subscription items.
 * @param items - Subscription items array
 * @returns Price ID or null
 */
export function extractPriceIdFromItems(
  items: Array<{ price?: { id?: string } }> | undefined
): string | null {
  if (!items || items.length === 0) return null;
  return items[0]?.price?.id || null;
}

/**
 * Determines the appropriate history event type.
 * @param webhookEventType - Stripe webhook event type
 * @returns Internal event type string
 */
export function mapWebhookToHistoryEventType(webhookEventType: WebhookEventType): string {
  const mapping: Record<WebhookEventType, string> = {
    'checkout.session.completed': 'subscription_created',
    'customer.subscription.updated': 'subscription_updated',
    'customer.subscription.deleted': 'subscription_canceled',
    'invoice.payment_failed': 'payment_failed',
    'invoice.payment_succeeded': 'payment_succeeded',
  };

  return mapping[webhookEventType] || webhookEventType;
}
