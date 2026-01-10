import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  validateCheckoutMetadata,
  validatePriceId,
  validateCustomerId,
  validateSubscriptionId,
  isSupportedWebhookEvent,
  determinePlanType,
  mapSubscriptionStatus,
  isSubscriptionActive,
  isSubscriptionInactive,
  getSubscriptionTier,
  unixToISOString,
  getDefaultPeriodEnd,
  calculatePeriodEnd,
  buildSubscriptionRecord,
  buildSubscriptionHistoryRecord,
  shouldActivateProfileBoost,
  shouldRemoveProfileBoost,
  shouldSkipSubscriptionUpdate,
  centsToDollars,
  dollarsToCents,
  formatAmount,
  extractUserIdFromMetadata,
  extractPriceIdFromItems,
  mapWebhookToHistoryEventType,
  SUPPORTED_WEBHOOK_EVENTS,
  ACTIVE_SUBSCRIPTION_STATUSES,
  INACTIVE_SUBSCRIPTION_STATUSES,
  type PlanType,
  type SubscriptionStatus,
  type WebhookEventType,
  type CheckoutSessionMetadata,
  type PriceIdConfig,
} from './stripe-service';

// ============================================================================
// Test Fixtures
// ============================================================================

const TEST_PRICE_CONFIG: PriceIdConfig = {
  monthlyPriceId: 'price_monthly_123',
  annualPriceId: 'price_annual_456',
};

function createValidMetadata(overrides?: Partial<CheckoutSessionMetadata>): CheckoutSessionMetadata {
  return {
    user_id: 'user-123',
    ...overrides,
  };
}

// ============================================================================
// validateCheckoutMetadata Tests
// ============================================================================

describe('validateCheckoutMetadata', () => {
  it('should return valid for valid metadata with user_id', () => {
    const result = validateCheckoutMetadata({ user_id: 'user-123' });
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should reject null metadata', () => {
    const result = validateCheckoutMetadata(null);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Missing session metadata');
  });

  it('should reject undefined metadata', () => {
    const result = validateCheckoutMetadata(undefined);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Missing session metadata');
  });

  it('should reject metadata without user_id', () => {
    const result = validateCheckoutMetadata({});
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Missing user_id');
  });

  it('should reject metadata with empty user_id', () => {
    const result = validateCheckoutMetadata({ user_id: '' });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('user_id');
  });

  it('should reject metadata with whitespace-only user_id', () => {
    const result = validateCheckoutMetadata({ user_id: '   ' });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid user_id');
  });

  it('should accept metadata with additional properties', () => {
    const result = validateCheckoutMetadata({
      user_id: 'user-123',
      plan: 'pro',
      source: 'checkout',
    });
    expect(result.valid).toBe(true);
  });
});

// ============================================================================
// validatePriceId Tests
// ============================================================================

describe('validatePriceId', () => {
  it('should return valid with planType for monthly price', () => {
    const result = validatePriceId('price_monthly_123', TEST_PRICE_CONFIG);
    expect(result.valid).toBe(true);
    expect(result.planType).toBe('monthly');
  });

  it('should return valid with planType for annual price', () => {
    const result = validatePriceId('price_annual_456', TEST_PRICE_CONFIG);
    expect(result.valid).toBe(true);
    expect(result.planType).toBe('annual');
  });

  it('should reject undefined price ID', () => {
    const result = validatePriceId(undefined, TEST_PRICE_CONFIG);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Missing price ID');
  });

  it('should reject unknown price ID', () => {
    const result = validatePriceId('price_unknown', TEST_PRICE_CONFIG);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Unknown price ID');
    expect(result.error).toContain('price_unknown');
  });
});

// ============================================================================
// validateCustomerId Tests
// ============================================================================

describe('validateCustomerId', () => {
  it('should return valid for valid customer ID', () => {
    const result = validateCustomerId('cus_abc123');
    expect(result.valid).toBe(true);
  });

  it('should reject null customer ID', () => {
    const result = validateCustomerId(null);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Missing customer ID');
  });

  it('should reject undefined customer ID', () => {
    const result = validateCustomerId(undefined);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Missing customer ID');
  });

  it('should reject customer ID without cus_ prefix', () => {
    const result = validateCustomerId('abc123');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid customer ID format');
  });

  it('should reject non-string customer ID', () => {
    const result = validateCustomerId(12345 as unknown as string);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid customer ID type');
  });
});

// ============================================================================
// validateSubscriptionId Tests
// ============================================================================

describe('validateSubscriptionId', () => {
  it('should return valid for valid subscription ID', () => {
    const result = validateSubscriptionId('sub_abc123');
    expect(result.valid).toBe(true);
  });

  it('should reject null subscription ID', () => {
    const result = validateSubscriptionId(null);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Missing subscription ID');
  });

  it('should reject undefined subscription ID', () => {
    const result = validateSubscriptionId(undefined);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Missing subscription ID');
  });

  it('should reject subscription ID without sub_ prefix', () => {
    const result = validateSubscriptionId('abc123');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid subscription ID format');
  });

  it('should reject non-string subscription ID', () => {
    const result = validateSubscriptionId(12345 as unknown as string);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid subscription ID type');
  });
});

// ============================================================================
// isSupportedWebhookEvent Tests
// ============================================================================

describe('isSupportedWebhookEvent', () => {
  it('should return true for checkout.session.completed', () => {
    expect(isSupportedWebhookEvent('checkout.session.completed')).toBe(true);
  });

  it('should return true for customer.subscription.updated', () => {
    expect(isSupportedWebhookEvent('customer.subscription.updated')).toBe(true);
  });

  it('should return true for customer.subscription.deleted', () => {
    expect(isSupportedWebhookEvent('customer.subscription.deleted')).toBe(true);
  });

  it('should return true for invoice.payment_failed', () => {
    expect(isSupportedWebhookEvent('invoice.payment_failed')).toBe(true);
  });

  it('should return true for invoice.payment_succeeded', () => {
    expect(isSupportedWebhookEvent('invoice.payment_succeeded')).toBe(true);
  });

  it('should return false for unsupported events', () => {
    expect(isSupportedWebhookEvent('customer.created')).toBe(false);
    expect(isSupportedWebhookEvent('charge.succeeded')).toBe(false);
    expect(isSupportedWebhookEvent('')).toBe(false);
  });

  it('should have all supported events in SUPPORTED_WEBHOOK_EVENTS', () => {
    expect(SUPPORTED_WEBHOOK_EVENTS).toContain('checkout.session.completed');
    expect(SUPPORTED_WEBHOOK_EVENTS).toContain('customer.subscription.updated');
    expect(SUPPORTED_WEBHOOK_EVENTS).toContain('customer.subscription.deleted');
    expect(SUPPORTED_WEBHOOK_EVENTS).toContain('invoice.payment_failed');
    expect(SUPPORTED_WEBHOOK_EVENTS).toContain('invoice.payment_succeeded');
    expect(SUPPORTED_WEBHOOK_EVENTS).toHaveLength(5);
  });
});

// ============================================================================
// determinePlanType Tests
// ============================================================================

describe('determinePlanType', () => {
  it('should return monthly for monthly price ID', () => {
    expect(determinePlanType('price_monthly_123', TEST_PRICE_CONFIG)).toBe('monthly');
  });

  it('should return annual for annual price ID', () => {
    expect(determinePlanType('price_annual_456', TEST_PRICE_CONFIG)).toBe('annual');
  });

  it('should return null for undefined price ID', () => {
    expect(determinePlanType(undefined, TEST_PRICE_CONFIG)).toBeNull();
  });

  it('should return null for unknown price ID', () => {
    expect(determinePlanType('price_unknown', TEST_PRICE_CONFIG)).toBeNull();
  });
});

// ============================================================================
// mapSubscriptionStatus Tests
// ============================================================================

describe('mapSubscriptionStatus', () => {
  it('should map valid statuses correctly', () => {
    expect(mapSubscriptionStatus('active')).toBe('active');
    expect(mapSubscriptionStatus('canceled')).toBe('canceled');
    expect(mapSubscriptionStatus('incomplete')).toBe('incomplete');
    expect(mapSubscriptionStatus('incomplete_expired')).toBe('incomplete_expired');
    expect(mapSubscriptionStatus('past_due')).toBe('past_due');
    expect(mapSubscriptionStatus('trialing')).toBe('trialing');
    expect(mapSubscriptionStatus('unpaid')).toBe('unpaid');
  });

  it('should default to incomplete for unknown statuses', () => {
    expect(mapSubscriptionStatus('unknown')).toBe('incomplete');
    expect(mapSubscriptionStatus('')).toBe('incomplete');
    expect(mapSubscriptionStatus('pending')).toBe('incomplete');
  });
});

// ============================================================================
// isSubscriptionActive Tests
// ============================================================================

describe('isSubscriptionActive', () => {
  it('should return true for active status', () => {
    expect(isSubscriptionActive('active')).toBe(true);
  });

  it('should return true for trialing status', () => {
    expect(isSubscriptionActive('trialing')).toBe(true);
  });

  it('should return false for inactive statuses', () => {
    expect(isSubscriptionActive('canceled')).toBe(false);
    expect(isSubscriptionActive('incomplete')).toBe(false);
    expect(isSubscriptionActive('incomplete_expired')).toBe(false);
    expect(isSubscriptionActive('past_due')).toBe(false);
    expect(isSubscriptionActive('unpaid')).toBe(false);
  });

  it('should have correct ACTIVE_SUBSCRIPTION_STATUSES', () => {
    expect(ACTIVE_SUBSCRIPTION_STATUSES).toContain('active');
    expect(ACTIVE_SUBSCRIPTION_STATUSES).toContain('trialing');
    expect(ACTIVE_SUBSCRIPTION_STATUSES).toHaveLength(2);
  });
});

// ============================================================================
// isSubscriptionInactive Tests
// ============================================================================

describe('isSubscriptionInactive', () => {
  it('should return true for canceled status', () => {
    expect(isSubscriptionInactive('canceled')).toBe(true);
  });

  it('should return true for incomplete_expired status', () => {
    expect(isSubscriptionInactive('incomplete_expired')).toBe(true);
  });

  it('should return true for unpaid status', () => {
    expect(isSubscriptionInactive('unpaid')).toBe(true);
  });

  it('should return false for active statuses', () => {
    expect(isSubscriptionInactive('active')).toBe(false);
    expect(isSubscriptionInactive('trialing')).toBe(false);
  });

  it('should return false for intermediate statuses', () => {
    expect(isSubscriptionInactive('incomplete')).toBe(false);
    expect(isSubscriptionInactive('past_due')).toBe(false);
  });

  it('should have correct INACTIVE_SUBSCRIPTION_STATUSES', () => {
    expect(INACTIVE_SUBSCRIPTION_STATUSES).toContain('canceled');
    expect(INACTIVE_SUBSCRIPTION_STATUSES).toContain('incomplete_expired');
    expect(INACTIVE_SUBSCRIPTION_STATUSES).toContain('unpaid');
    expect(INACTIVE_SUBSCRIPTION_STATUSES).toHaveLength(3);
  });
});

// ============================================================================
// getSubscriptionTier Tests
// ============================================================================

describe('getSubscriptionTier', () => {
  it('should return pro for active subscriptions', () => {
    expect(getSubscriptionTier('active')).toBe('pro');
    expect(getSubscriptionTier('trialing')).toBe('pro');
  });

  it('should return free for inactive subscriptions', () => {
    expect(getSubscriptionTier('canceled')).toBe('free');
    expect(getSubscriptionTier('incomplete')).toBe('free');
    expect(getSubscriptionTier('incomplete_expired')).toBe('free');
    expect(getSubscriptionTier('past_due')).toBe('free');
    expect(getSubscriptionTier('unpaid')).toBe('free');
  });
});

// ============================================================================
// unixToISOString Tests
// ============================================================================

describe('unixToISOString', () => {
  it('should convert Unix timestamp to ISO string', () => {
    const timestamp = 1704067200; // 2024-01-01 00:00:00 UTC
    const result = unixToISOString(timestamp);
    expect(result).toBe('2024-01-01T00:00:00.000Z');
  });

  it('should handle another timestamp correctly', () => {
    const timestamp = 1735689600; // 2025-01-01 00:00:00 UTC
    const result = unixToISOString(timestamp);
    expect(result).toBe('2025-01-01T00:00:00.000Z');
  });

  it('should return current date for undefined', () => {
    const before = Date.now();
    const result = unixToISOString(undefined);
    const after = Date.now();
    const resultTime = new Date(result).getTime();
    expect(resultTime).toBeGreaterThanOrEqual(before);
    expect(resultTime).toBeLessThanOrEqual(after);
  });

  it('should return current date for null', () => {
    const before = Date.now();
    const result = unixToISOString(null);
    const after = Date.now();
    const resultTime = new Date(result).getTime();
    expect(resultTime).toBeGreaterThanOrEqual(before);
    expect(resultTime).toBeLessThanOrEqual(after);
  });

  it('should return current date for non-number', () => {
    const before = Date.now();
    const result = unixToISOString('invalid' as unknown as number);
    const after = Date.now();
    const resultTime = new Date(result).getTime();
    expect(resultTime).toBeGreaterThanOrEqual(before);
    expect(resultTime).toBeLessThanOrEqual(after);
  });
});

// ============================================================================
// getDefaultPeriodEnd Tests
// ============================================================================

describe('getDefaultPeriodEnd', () => {
  it('should return a date 30 days from now', () => {
    const now = Date.now();
    const result = getDefaultPeriodEnd();
    const resultTime = new Date(result).getTime();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    // Allow 1 second tolerance
    expect(resultTime).toBeGreaterThanOrEqual(now + thirtyDaysMs - 1000);
    expect(resultTime).toBeLessThanOrEqual(now + thirtyDaysMs + 1000);
  });

  it('should return valid ISO string', () => {
    const result = getDefaultPeriodEnd();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});

// ============================================================================
// calculatePeriodEnd Tests
// ============================================================================

describe('calculatePeriodEnd', () => {
  it('should add 1 month for monthly plan', () => {
    const startDate = new Date('2024-01-15T00:00:00Z');
    const result = calculatePeriodEnd('monthly', startDate);
    expect(result).toBe('2024-02-15T00:00:00.000Z');
  });

  it('should add 1 year for annual plan', () => {
    const startDate = new Date('2024-01-15T00:00:00Z');
    const result = calculatePeriodEnd('annual', startDate);
    expect(result).toBe('2025-01-15T00:00:00.000Z');
  });

  it('should handle month overflow correctly', () => {
    const startDate = new Date('2024-01-31T00:00:00Z');
    const result = calculatePeriodEnd('monthly', startDate);
    // January 31 + 1 month = March 2 (or March 3 in leap year) due to overflow
    const resultDate = new Date(result);
    expect(resultDate.getMonth()).toBe(2); // March is month index 2
  });

  it('should use current date when no start date provided', () => {
    const before = Date.now();
    const result = calculatePeriodEnd('monthly');
    const resultDate = new Date(result);
    const after = Date.now();

    // Result should be approximately 1 month from now
    const oneMonthFromNow = new Date(before);
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

    expect(resultDate.getTime()).toBeGreaterThanOrEqual(oneMonthFromNow.getTime() - 1000);
  });
});

// ============================================================================
// buildSubscriptionRecord Tests
// ============================================================================

describe('buildSubscriptionRecord', () => {
  it('should build a complete subscription record', () => {
    const record = buildSubscriptionRecord({
      userId: 'user-123',
      customerId: 'cus_abc',
      subscriptionId: 'sub_xyz',
      priceId: 'price_monthly',
      planType: 'monthly',
      status: 'active',
      periodStart: 1704067200, // 2024-01-01
      periodEnd: 1706745600, // 2024-02-01
      cancelAtPeriodEnd: false,
    });

    expect(record.user_id).toBe('user-123');
    expect(record.stripe_customer_id).toBe('cus_abc');
    expect(record.stripe_subscription_id).toBe('sub_xyz');
    expect(record.stripe_price_id).toBe('price_monthly');
    expect(record.plan_type).toBe('monthly');
    expect(record.status).toBe('active');
    expect(record.current_period_start).toBe('2024-01-01T00:00:00.000Z');
    expect(record.current_period_end).toBe('2024-02-01T00:00:00.000Z');
    expect(record.cancel_at_period_end).toBe(false);
  });

  it('should use default period end when periodEnd is undefined', () => {
    const now = Date.now();
    const record = buildSubscriptionRecord({
      userId: 'user-123',
      customerId: 'cus_abc',
      subscriptionId: 'sub_xyz',
      priceId: 'price_monthly',
      planType: 'monthly',
      status: 'active',
      periodStart: 1704067200,
      periodEnd: undefined,
      cancelAtPeriodEnd: false,
    });

    const periodEndTime = new Date(record.current_period_end).getTime();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    expect(periodEndTime).toBeGreaterThanOrEqual(now + thirtyDaysMs - 1000);
  });

  it('should handle cancelAtPeriodEnd true', () => {
    const record = buildSubscriptionRecord({
      userId: 'user-123',
      customerId: 'cus_abc',
      subscriptionId: 'sub_xyz',
      priceId: 'price_annual',
      planType: 'annual',
      status: 'active',
      periodStart: 1704067200,
      periodEnd: 1735689600,
      cancelAtPeriodEnd: true,
    });

    expect(record.cancel_at_period_end).toBe(true);
    expect(record.plan_type).toBe('annual');
  });
});

// ============================================================================
// buildSubscriptionHistoryRecord Tests
// ============================================================================

describe('buildSubscriptionHistoryRecord', () => {
  it('should build minimal history record', () => {
    const record = buildSubscriptionHistoryRecord({
      userId: 'user-123',
      subscriptionId: 'sub_xyz',
      eventType: 'subscription_created',
      status: 'active',
    });

    expect(record.user_id).toBe('user-123');
    expect(record.stripe_subscription_id).toBe('sub_xyz');
    expect(record.event_type).toBe('subscription_created');
    expect(record.status).toBe('active');
    expect(record.plan_type).toBeUndefined();
    expect(record.amount).toBeUndefined();
    expect(record.currency).toBeUndefined();
    expect(record.metadata).toBeUndefined();
  });

  it('should build complete history record with all optional fields', () => {
    const record = buildSubscriptionHistoryRecord({
      userId: 'user-123',
      subscriptionId: 'sub_xyz',
      eventType: 'payment_succeeded',
      status: 'active',
      planType: 'monthly',
      amount: 999,
      currency: 'usd',
      metadata: { invoice_id: 'inv_123' },
    });

    expect(record.plan_type).toBe('monthly');
    expect(record.amount).toBe(999);
    expect(record.currency).toBe('usd');
    expect(record.metadata).toEqual({ invoice_id: 'inv_123' });
  });

  it('should not include undefined optional fields', () => {
    const record = buildSubscriptionHistoryRecord({
      userId: 'user-123',
      subscriptionId: 'sub_xyz',
      eventType: 'subscription_updated',
      status: 'canceled',
      planType: undefined,
      amount: undefined,
    });

    expect('plan_type' in record).toBe(false);
    expect('amount' in record).toBe(false);
  });
});

// ============================================================================
// shouldActivateProfileBoost Tests
// ============================================================================

describe('shouldActivateProfileBoost', () => {
  it('should return true for worker with active subscription', () => {
    expect(shouldActivateProfileBoost('worker', false, 'active')).toBe(true);
  });

  it('should return true for worker with trialing subscription', () => {
    expect(shouldActivateProfileBoost('worker', false, 'trialing')).toBe(true);
  });

  it('should return false for lifetime Pro users', () => {
    expect(shouldActivateProfileBoost('worker', true, 'active')).toBe(false);
  });

  it('should return false for non-workers', () => {
    expect(shouldActivateProfileBoost('employer', false, 'active')).toBe(false);
    expect(shouldActivateProfileBoost('admin', false, 'active')).toBe(false);
  });

  it('should return false for inactive subscriptions', () => {
    expect(shouldActivateProfileBoost('worker', false, 'canceled')).toBe(false);
    expect(shouldActivateProfileBoost('worker', false, 'unpaid')).toBe(false);
    expect(shouldActivateProfileBoost('worker', false, 'past_due')).toBe(false);
  });

  it('should handle null/undefined role', () => {
    expect(shouldActivateProfileBoost(null, false, 'active')).toBe(false);
    expect(shouldActivateProfileBoost(undefined, false, 'active')).toBe(false);
  });

  it('should handle null isLifetimePro', () => {
    expect(shouldActivateProfileBoost('worker', null, 'active')).toBe(true);
  });
});

// ============================================================================
// shouldRemoveProfileBoost Tests
// ============================================================================

describe('shouldRemoveProfileBoost', () => {
  it('should return true for workers without lifetime Pro', () => {
    expect(shouldRemoveProfileBoost('worker', false)).toBe(true);
  });

  it('should return false for lifetime Pro users', () => {
    expect(shouldRemoveProfileBoost('worker', true)).toBe(false);
  });

  it('should return false for non-workers', () => {
    expect(shouldRemoveProfileBoost('employer', false)).toBe(false);
    expect(shouldRemoveProfileBoost('admin', false)).toBe(false);
  });

  it('should handle null/undefined role', () => {
    expect(shouldRemoveProfileBoost(null, false)).toBe(false);
    expect(shouldRemoveProfileBoost(undefined, false)).toBe(false);
  });

  it('should handle null isLifetimePro', () => {
    expect(shouldRemoveProfileBoost('worker', null)).toBe(true);
  });
});

// ============================================================================
// shouldSkipSubscriptionUpdate Tests
// ============================================================================

describe('shouldSkipSubscriptionUpdate', () => {
  it('should return true for lifetime Pro users', () => {
    expect(shouldSkipSubscriptionUpdate(true)).toBe(true);
  });

  it('should return false for non-lifetime Pro users', () => {
    expect(shouldSkipSubscriptionUpdate(false)).toBe(false);
  });

  it('should return false for null/undefined', () => {
    expect(shouldSkipSubscriptionUpdate(null)).toBe(false);
    expect(shouldSkipSubscriptionUpdate(undefined)).toBe(false);
  });
});

// ============================================================================
// centsToDollars Tests
// ============================================================================

describe('centsToDollars', () => {
  it('should convert cents to dollars correctly', () => {
    expect(centsToDollars(100)).toBe(1);
    expect(centsToDollars(999)).toBe(9.99);
    expect(centsToDollars(1999)).toBe(19.99);
    expect(centsToDollars(0)).toBe(0);
  });

  it('should handle fractional cents', () => {
    expect(centsToDollars(150)).toBe(1.5);
    expect(centsToDollars(1)).toBe(0.01);
  });
});

// ============================================================================
// dollarsToCents Tests
// ============================================================================

describe('dollarsToCents', () => {
  it('should convert dollars to cents correctly', () => {
    expect(dollarsToCents(1)).toBe(100);
    expect(dollarsToCents(9.99)).toBe(999);
    expect(dollarsToCents(19.99)).toBe(1999);
    expect(dollarsToCents(0)).toBe(0);
  });

  it('should round to nearest cent', () => {
    expect(dollarsToCents(1.555)).toBe(156);
    expect(dollarsToCents(1.554)).toBe(155);
  });

  it('should handle floating point precision', () => {
    expect(dollarsToCents(0.1 + 0.2)).toBe(30);
  });
});

// ============================================================================
// formatAmount Tests
// ============================================================================

describe('formatAmount', () => {
  it('should format USD amounts correctly', () => {
    expect(formatAmount(999)).toBe('$9.99');
    expect(formatAmount(1999)).toBe('$19.99');
    expect(formatAmount(10000)).toBe('$100.00');
  });

  it('should format zero correctly', () => {
    expect(formatAmount(0)).toBe('$0.00');
  });

  it('should handle different currencies', () => {
    const eurResult = formatAmount(999, 'eur');
    expect(eurResult).toContain('9.99');
    // EUR format may vary by locale but should contain the amount
  });

  it('should uppercase currency code', () => {
    // This test verifies the function doesn't error with lowercase
    expect(() => formatAmount(999, 'gbp')).not.toThrow();
  });
});

// ============================================================================
// extractUserIdFromMetadata Tests
// ============================================================================

describe('extractUserIdFromMetadata', () => {
  it('should extract user_id from valid metadata', () => {
    expect(extractUserIdFromMetadata({ user_id: 'user-123' })).toBe('user-123');
  });

  it('should trim whitespace from user_id', () => {
    expect(extractUserIdFromMetadata({ user_id: '  user-123  ' })).toBe('user-123');
  });

  it('should return null for null metadata', () => {
    expect(extractUserIdFromMetadata(null)).toBeNull();
  });

  it('should return null for undefined metadata', () => {
    expect(extractUserIdFromMetadata(undefined)).toBeNull();
  });

  it('should return null for missing user_id', () => {
    expect(extractUserIdFromMetadata({})).toBeNull();
  });

  it('should return null for empty user_id', () => {
    expect(extractUserIdFromMetadata({ user_id: '' })).toBeNull();
  });

  it('should return null for whitespace-only user_id', () => {
    expect(extractUserIdFromMetadata({ user_id: '   ' })).toBeNull();
  });
});

// ============================================================================
// extractPriceIdFromItems Tests
// ============================================================================

describe('extractPriceIdFromItems', () => {
  it('should extract price ID from items array', () => {
    const items = [{ price: { id: 'price_123' } }];
    expect(extractPriceIdFromItems(items)).toBe('price_123');
  });

  it('should return first item price ID when multiple items', () => {
    const items = [
      { price: { id: 'price_first' } },
      { price: { id: 'price_second' } },
    ];
    expect(extractPriceIdFromItems(items)).toBe('price_first');
  });

  it('should return null for undefined items', () => {
    expect(extractPriceIdFromItems(undefined)).toBeNull();
  });

  it('should return null for empty array', () => {
    expect(extractPriceIdFromItems([])).toBeNull();
  });

  it('should return null when price is missing', () => {
    const items = [{}];
    expect(extractPriceIdFromItems(items)).toBeNull();
  });

  it('should return null when price.id is missing', () => {
    const items = [{ price: {} }];
    expect(extractPriceIdFromItems(items)).toBeNull();
  });
});

// ============================================================================
// mapWebhookToHistoryEventType Tests
// ============================================================================

describe('mapWebhookToHistoryEventType', () => {
  it('should map checkout.session.completed to subscription_created', () => {
    expect(mapWebhookToHistoryEventType('checkout.session.completed')).toBe('subscription_created');
  });

  it('should map customer.subscription.updated to subscription_updated', () => {
    expect(mapWebhookToHistoryEventType('customer.subscription.updated')).toBe('subscription_updated');
  });

  it('should map customer.subscription.deleted to subscription_canceled', () => {
    expect(mapWebhookToHistoryEventType('customer.subscription.deleted')).toBe('subscription_canceled');
  });

  it('should map invoice.payment_failed to payment_failed', () => {
    expect(mapWebhookToHistoryEventType('invoice.payment_failed')).toBe('payment_failed');
  });

  it('should map invoice.payment_succeeded to payment_succeeded', () => {
    expect(mapWebhookToHistoryEventType('invoice.payment_succeeded')).toBe('payment_succeeded');
  });
});
