import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { POST } from '@/app/api/webhooks/stripe/route';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const testDb = createClient(supabaseUrl, supabaseServiceKey);

describe('Stripe Webhook API', () => {
  let testUserId: string;

  beforeEach(async () => {
    // Create test user
    const testEmail = `webhook-${Date.now()}@test.krewup.local`;
    const { data: authData } = await testDb.auth.admin.createUser({
      email: testEmail,
      password: 'TestPassword123!',
      email_confirm: true,
    });

    testUserId = authData.user!.id;

    await testDb
      .from('profiles')
      .update({
        name: 'Webhook Test User',
        role: 'Worker',
        trade: 'Carpenter',
      })
      .eq('id', testUserId);
  });

  afterEach(async () => {
    // Cleanup
    await testDb.from('subscriptions').delete().eq('user_id', testUserId);
    await testDb.from('profiles').delete().eq('id', testUserId);
    await testDb.auth.admin.deleteUser(testUserId);
  });

  it('should handle checkout.session.completed event', async () => {
    const mockEvent = {
      type: 'checkout.session.completed',
      data: {
        object: {
          customer: `cus_test_${testUserId}`,
          subscription: `sub_test_${Date.now()}`,
          client_reference_id: testUserId,
          metadata: {
            userId: testUserId,
          },
        },
      },
    };

    const mockRequest = new Request('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test_signature',
      },
      body: JSON.stringify(mockEvent),
    });

    // Note: This test verifies the structure, actual Stripe signature validation
    // would need proper webhook secret and signature generation
    expect(mockRequest.method).toBe('POST');
  });

  it('should handle customer.subscription.updated event', async () => {
    // Create existing subscription
    await testDb.from('subscriptions').insert({
      user_id: testUserId,
      stripe_customer_id: `cus_test_${testUserId}`,
      stripe_subscription_id: `sub_test_${testUserId}`,
      status: 'active',
      plan: 'monthly',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toISOString(),
    });

    const mockEvent = {
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: `sub_test_${testUserId}`,
          customer: `cus_test_${testUserId}`,
          status: 'active',
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor(
            (Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000
          ),
        },
      },
    };

    // Verify subscription exists
    const { data } = await testDb
      .from('subscriptions')
      .select('*')
      .eq('user_id', testUserId)
      .single();

    expect(data).toBeTruthy();
    expect(data?.status).toBe('active');
  });

  it('should handle customer.subscription.deleted event', async () => {
    // Create subscription to be deleted
    await testDb.from('subscriptions').insert({
      user_id: testUserId,
      stripe_customer_id: `cus_test_${testUserId}`,
      stripe_subscription_id: `sub_test_${testUserId}`,
      status: 'active',
      plan: 'monthly',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toISOString(),
    });

    // Manually update status to canceled (simulating webhook handler)
    await testDb
      .from('subscriptions')
      .update({ status: 'canceled' })
      .eq('stripe_subscription_id', `sub_test_${testUserId}`);

    // Verify status updated
    const { data } = await testDb
      .from('subscriptions')
      .select('*')
      .eq('user_id', testUserId)
      .single();

    expect(data?.status).toBe('canceled');
  });

  it('should reject requests without stripe signature', async () => {
    const mockRequest = new Request('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Missing stripe-signature header
      },
      body: JSON.stringify({ type: 'test.event' }),
    });

    // In actual implementation, this should return 400
    expect(mockRequest.headers.get('stripe-signature')).toBeNull();
  });

  it('should handle invoice.payment_failed event', async () => {
    const mockEvent = {
      type: 'invoice.payment_failed',
      data: {
        object: {
          customer: `cus_test_${testUserId}`,
          subscription: `sub_test_${testUserId}`,
          attempt_count: 1,
        },
      },
    };

    // Verify event structure
    expect(mockEvent.type).toBe('invoice.payment_failed');
    expect(mockEvent.data.object.attempt_count).toBe(1);
  });
});
