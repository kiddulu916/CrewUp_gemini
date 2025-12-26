/**
 * Manual script to activate Pro subscription for testing
 * Run this after completing Stripe test checkout
 *
 * Usage: npx tsx scripts/activate-test-subscription.ts <user_email>
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function activateSubscription(userEmail: string) {
  console.log(`Activating Pro subscription for: ${userEmail}`);

  // Get user by email
  const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();

  if (userError) {
    console.error('Error fetching users:', userError);
    return;
  }

  const user = users.find(u => u.email === userEmail);

  if (!user) {
    console.error(`User not found: ${userEmail}`);
    return;
  }

  console.log(`Found user: ${user.id}`);

  // Create subscription record
  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .upsert({
      user_id: user.id,
      stripe_customer_id: 'test_customer_' + user.id,
      stripe_subscription_id: 'test_sub_' + Date.now(),
      stripe_price_id: process.env.STRIPE_PRICE_ID_PRO_MONTHLY || 'price_test',
      status: 'active',
      plan_type: 'monthly',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      cancel_at_period_end: false,
    })
    .select()
    .single();

  if (subError) {
    console.error('Error creating subscription:', subError);
    return;
  }

  console.log('✅ Subscription created:', subscription);

  // Update profile subscription_status
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .update({
      subscription_status: 'pro',
      is_profile_boosted: true,
      boost_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .eq('id', user.id)
    .select()
    .single();

  if (profileError) {
    console.error('Error updating profile:', profileError);
    return;
  }

  console.log('✅ Profile updated to Pro:', profile);
  console.log('\n🎉 Subscription activated successfully!');
}

const userEmail = process.argv[2];

if (!userEmail) {
  console.error('Usage: npx tsx scripts/activate-test-subscription.ts <user_email>');
  process.exit(1);
}

activateSubscription(userEmail);
