// app/api/cron/reset-expired-boosts/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create Supabase admin client for cron job (server-side, bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Cron job to sync profile boosts with subscription status
 *
 * * Profile boost is continuous for the entire Pro subscription duration
 * * This cron job ensures boosts are removed when subscriptions become inactive
 *
 * Runs daily to:
 * 1. Remove boosts from workers whose subscription is no longer active
 * 2. Ensure boosted workers have active Pro subscriptions
 *
 * Protected by Vercel Cron Secret
 * Note: This route is not functional in static export builds (mobile).
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error('Unauthorized cron job access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // * Find workers who have boost but no longer have active Pro subscription
    // This catches edge cases where subscription cancellation webhook might have failed
    const { data: boostedWorkers, error: fetchError } = await supabaseAdmin
      .from('workers')
      .select(`
        user_id,
        is_profile_boosted,
        users!user_id(
          first_name,
          last_name,
          subscription_status,
          is_lifetime_pro
        )
      `)
      .eq('is_profile_boosted', true);

    if (fetchError) {
      console.error('Error fetching boosted workers:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch boosted workers' },
        { status: 500 }
      );
    }

    if (!boostedWorkers || boostedWorkers.length === 0) {
      console.log('No boosted workers found');
      return NextResponse.json({
        success: true,
        message: 'No boosted workers to check',
        count: 0,
      });
    }

    // * Identify workers who should lose their boost
    // (boosted but subscription_status !== 'pro' AND not lifetime_pro)
    const workersToReset = boostedWorkers.filter((w: any) => {
      const user = Array.isArray(w.users) ? w.users[0] : w.users;
      if (!user) return true; // No user data - remove boost
      if (user.is_lifetime_pro) return false; // Lifetime Pro keeps boost
      return user.subscription_status !== 'pro'; // Remove if not Pro
    });

    if (workersToReset.length === 0) {
      console.log('All boosted workers have active Pro subscriptions');
      return NextResponse.json({
        success: true,
        message: 'All boosts are valid',
        count: 0,
        checked: boostedWorkers.length,
      });
    }

    // * Remove boosts from workers without active Pro subscription
    const userIdsToReset = workersToReset.map((w: any) => w.user_id);
    
    const { error: updateError } = await supabaseAdmin
      .from('workers')
      .update({
        is_profile_boosted: false,
        boost_expires_at: null,
      })
      .in('user_id', userIdsToReset);

    if (updateError) {
      console.error('Error resetting boosts:', updateError);
      return NextResponse.json(
        { error: 'Failed to reset boosts' },
        { status: 500 }
      );
    }

    console.log(`Successfully reset ${workersToReset.length} invalid boosts`);
    return NextResponse.json({
      success: true,
      message: `Reset ${workersToReset.length} boosts (workers without active Pro)`,
      count: workersToReset.length,
      checked: boostedWorkers.length,
      workers: workersToReset.map((w: any) => {
        const user = Array.isArray(w.users) ? w.users[0] : w.users;
        return { 
          id: w.user_id, 
          name: user ? `${user.first_name} ${user.last_name}`.trim() : 'Unknown',
          subscription_status: user?.subscription_status || 'unknown',
        };
      }),
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
