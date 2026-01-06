import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { POST } from '@/app/api/webhooks/stripe/route';
import { createClient } from '@supabase/supabase-js';
import { stripe } from '@/lib/stripe/server';
import { NextRequest } from 'next/server';
import { headers } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const testDb = createClient(supabaseUrl, supabaseServiceKey);

// Mock next/headers
vi.mock('next/headers', () => ({
  headers: vi.fn(),
}));

// Mock stripe.subscriptions.retrieve but keep other stripe methods
vi.mock('@/lib/stripe/server', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    stripe: {
      ...actual.stripe,
      subscriptions: {
        retrieve: vi.fn(),
      },
    },
  };
});

describe('Stripe Webhook API', () => {
  let testUserId: string;
  const webhookUrl = 'http://localhost:4242/webhook';
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  beforeEach(async () => {
    // Create test user
    const testEmail = `webhook-${Date.now()}@test.krewup.local`;
    const { data: authData, error: authError } = await testDb.auth.admin.createUser({
      email: testEmail,
      password: 'TestPassword123!',
      email_confirm: true,
    });

    if (authError) throw authError;
    testUserId = authData.user!.id;

    const { error: profileError } = await testDb
      .from('users')
      .upsert({
        id: testUserId,
        email: testEmail,
        name: 'Webhook Test User',
        role: 'worker',
        trade: 'Carpenter',
        subscription_status: 'free',
        location: 'Test Location',
        bio: 'Test Bio',
      });
    
    if (profileError) throw profileError;

    // Ensure price IDs are set for the route to function
    if (!process.env.STRIPE_PRICE_ID_PRO_MONTHLY) {
      process.env.STRIPE_PRICE_ID_PRO_MONTHLY = process.env.STRIPE_TEST_PRICE_ID_PRO_MONTHLY || 'price_1SfcVeBYPrIlPCsicQBxyyfz';
    }
    if (!process.env.STRIPE_PRICE_ID_PRO_ANNUAL) {
      process.env.STRIPE_PRICE_ID_PRO_ANNUAL = process.env.STRIPE_TEST_PRICE_ID_PRO_ANNUALLY || 'price_1SfcXWBYPrIlPCsiE0efTnDc';
    }
  });

  afterEach(async () => {
    // Cleanup
    await testDb.from('stripe_processed_events').delete().like('id', 'evt_test_%');
    await testDb.from('subscriptions').delete().eq('user_id', testUserId);
    await testDb.from('users').delete().eq('id', testUserId);
    await testDb.auth.admin.deleteUser(testUserId);
  });

  async function createSignedRequest(payload: any) {
    const body = JSON.stringify(payload);
    const signature = stripe.webhooks.generateTestHeaderString({
      payload: body,
      secret: webhookSecret,
    });

    const req = new NextRequest(webhookUrl, {
      method: 'POST',
      headers: {
        'stripe-signature': signature,
        'Content-Type': 'application/json',
      },
      body,
    });

    (headers as any).mockResolvedValue(req.headers);

    return req;
  }

  it('should handle checkout.session.completed event', async () => {
    const mockSubscriptionId = `sub_test_${Date.now()}`;
    const priceId = process.env.STRIPE_PRICE_ID_PRO_MONTHLY;

    // Mock stripe.subscriptions.retrieve
    (stripe.subscriptions.retrieve as any).mockResolvedValue({
      id: mockSubscriptionId,
      items: {
        data: [{ price: { id: priceId } }],
      },
      current_period_start: Math.floor(Date.now() / 1000),
      current_period_end: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000),
      cancel_at_period_end: false,
      status: 'active',
    });

    const mockEvent = {
      id: `evt_test_checkout_${Date.now()}`,
      type: 'checkout.session.completed',
      data: {
        object: {
          id: `cs_test_${Date.now()}`,
          customer: `cus_test_${testUserId}`,
          subscription: mockSubscriptionId,
          metadata: {
            user_id: testUserId,
          },
        },
      },
    };

    const request = await createSignedRequest(mockEvent);
    const response = await POST(request);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.received).toBe(true);

    // Verify DB update
    const { data: subscription } = await testDb
      .from('subscriptions')
      .select('*')
      .eq('user_id', testUserId)
      .single();

    expect(subscription).toBeTruthy();
    expect(subscription.stripe_subscription_id).toBe(mockSubscriptionId);
    expect(subscription.plan_type).toBe('monthly');
    expect(subscription.status).toBe('active');

    // Verify profile update
    const { data: profile } = await testDb
      .from('users')
      .select('subscription_status, is_profile_boosted')
      .eq('id', testUserId)
      .single();
    
    expect(profile?.subscription_status).toBe('pro');
    expect(profile?.is_profile_boosted).toBe(true);
  });

  it('should handle customer.subscription.updated event', async () => {
    const mockSubscriptionId = `sub_test_upd_${Date.now()}`;
    const customerId = `cus_test_${testUserId}`;
    const priceId = process.env.STRIPE_PRICE_ID_PRO_ANNUAL;

    // Create existing subscription
    const { error: insertError } = await testDb.from('subscriptions').insert({
      user_id: testUserId,
      stripe_customer_id: customerId,
      stripe_subscription_id: mockSubscriptionId,
      stripe_price_id: process.env.STRIPE_PRICE_ID_PRO_MONTHLY!,
      status: 'active',
      plan_type: 'monthly',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
    if (insertError) throw insertError;

    const mockEvent = {
      id: `evt_test_update_${Date.now()}`,
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: mockSubscriptionId,
          customer: customerId,
          status: 'active',
          items: {
            data: [{ price: { id: priceId } }],
          },
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor((Date.now() + 365 * 24 * 60 * 60 * 1000) / 1000),
          cancel_at_period_end: true,
        },
      },
    };

    const request = await createSignedRequest(mockEvent);
    const response = await POST(request);

    expect(response.status).toBe(200);

    // Verify DB update
    const { data: subscription } = await testDb
      .from('subscriptions')
      .select('*')
      .eq('user_id', testUserId)
      .single();

    expect(subscription.plan_type).toBe('annual');
    expect(subscription.cancel_at_period_end).toBe(true);
  });

  it('should handle customer.subscription.deleted event', async () => {
    const mockSubscriptionId = `sub_test_del_${Date.now()}`;
    const customerId = `cus_test_${testUserId}`;

    // Create subscription to be deleted
    const { error: insertError } = await testDb.from('subscriptions').insert({
      user_id: testUserId,
      stripe_customer_id: customerId,
      stripe_subscription_id: mockSubscriptionId,
      stripe_price_id: process.env.STRIPE_PRICE_ID_PRO_MONTHLY!,
      status: 'active',
      plan_type: 'monthly',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
    if (insertError) throw insertError;

    // Also set profile to pro
    await testDb.from('users').update({ subscription_status: 'pro', is_profile_boosted: true }).eq('id', testUserId);

    const mockEvent = {
      id: `evt_test_delete_${Date.now()}`,
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: mockSubscriptionId,
          customer: customerId,
        },
      },
    };

    const request = await createSignedRequest(mockEvent);
    const response = await POST(request);

    expect(response.status).toBe(200);

    // Verify status updated in DB
    const { data: subscription } = await testDb
      .from('subscriptions')
      .select('*')
      .eq('user_id', testUserId)
      .single();

    expect(subscription.status).toBe('canceled');

    // Verify profile updated
    const { data: profile } = await testDb
      .from('users')
      .select('subscription_status, is_profile_boosted')
      .eq('id', testUserId)
      .single();
    
    expect(profile?.subscription_status).toBe('free');
    expect(profile?.is_profile_boosted).toBe(false);
  });

  it('should reject requests without stripe signature', async () => {
    const mockRequest = new NextRequest(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: 'evt_test', type: 'test.event' }),
    });

    (headers as any).mockResolvedValue(mockRequest.headers);

    const response = await POST(mockRequest);
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe('No signature');
  });

  it('should reject requests with invalid signature', async () => {
    const mockRequest = new NextRequest(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 't=123,v1=invalid',
      },
      body: JSON.stringify({ id: 'evt_test', type: 'test.event' }),
    });

    (headers as any).mockResolvedValue(mockRequest.headers);

    const response = await POST(mockRequest);
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe('Invalid signature');
  });

  it('should handle invoice.payment_failed event', async () => {
    const mockSubscriptionId = `sub_test_fail_${Date.now()}`;
    const customerId = `cus_test_${testUserId}`;

    // Create subscription
    const { error: insertError } = await testDb.from('subscriptions').insert({
      user_id: testUserId,
      stripe_customer_id: customerId,
      stripe_subscription_id: mockSubscriptionId,
      stripe_price_id: process.env.STRIPE_PRICE_ID_PRO_MONTHLY!,
      status: 'active',
      plan_type: 'monthly',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
    if (insertError) throw insertError;

    const mockEvent = {
      id: `evt_test_fail_${Date.now()}`,
      type: 'invoice.payment_failed',
      data: {
        object: {
          customer: customerId,
          subscription: mockSubscriptionId,
        },
      },
    };

    const request = await createSignedRequest(mockEvent);
    const response = await POST(request);

    expect(response.status).toBe(200);

    // Verify status updated to past_due
    const { data: subscription } = await testDb
      .from('subscriptions')
      .select('status')
      .eq('user_id', testUserId)
      .single();

    expect(subscription?.status).toBe('past_due');
  });
});
