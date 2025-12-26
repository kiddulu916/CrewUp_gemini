// Test script to manually update subscription status
// Run with: npx tsx scripts/test-subscription-update.ts <user_id>

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSubscriptionUpdate(userId: string) {
  console.log('Testing subscription update for user:', userId);

  // 1. Check current profile status
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, name, email, subscription_status, role')
    .eq('id', userId)
    .single();

  if (profileError) {
    console.error('Error fetching profile:', profileError);
    return;
  }

  console.log('Current profile:', {
    name: profile.name,
    email: profile.email,
    subscription_status: profile.subscription_status,
    role: profile.role,
  });

  // 2. Check current subscription
  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (subError && subError.code !== 'PGRST116') {
    console.error('Error fetching subscription:', subError);
  } else if (!subscription) {
    console.log('No subscription found in subscriptions table');
  } else {
    console.log('Current subscription:', {
      status: subscription.status,
      stripe_subscription_id: subscription.stripe_subscription_id,
      plan_type: subscription.plan_type,
    });
  }

  // 3. Attempt to update profile.subscription_status
  console.log('\nAttempting to update profile.subscription_status to "pro"...');
  const { data: updated, error: updateError } = await supabase
    .from('profiles')
    .update({ subscription_status: 'pro' })
    .eq('id', userId)
    .select()
    .single();

  if (updateError) {
    console.error('ERROR updating profile:', updateError);
  } else {
    console.log('✓ Successfully updated profile.subscription_status to "pro"');
    console.log('Updated profile:', updated);
  }
}

const userId = process.argv[2];
if (!userId) {
  console.error('Usage: npx tsx scripts/test-subscription-update.ts <user_id>');
  process.exit(1);
}

testSubscriptionUpdate(userId).then(() => {
  console.log('\nTest complete');
  process.exit(0);
}).catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});
