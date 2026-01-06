// app/api/cron/reset-expired-boosts/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create Supabase admin client for cron job (server-side, bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Cron job to reset expired profile boosts
 * Runs daily to check for boosts that have expired
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

    const now = new Date().toISOString();

    // Find all profiles with expired boosts
    const { data: expiredBoosts, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('id, name, boost_expires_at')
      .eq('is_profile_boosted', true)
      .lt('boost_expires_at', now);

    if (fetchError) {
      console.error('Error fetching expired boosts:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch expired boosts' },
        { status: 500 }
      );
    }

    if (!expiredBoosts || expiredBoosts.length === 0) {
      console.log('No expired boosts found');
      return NextResponse.json({
        success: true,
        message: 'No expired boosts to reset',
        count: 0,
      });
    }

    // Reset expired boosts
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        is_profile_boosted: false,
        boost_expires_at: null,
      })
      .eq('is_profile_boosted', true)
      .lt('boost_expires_at', now);

    if (updateError) {
      console.error('Error resetting expired boosts:', updateError);
      return NextResponse.json(
        { error: 'Failed to reset expired boosts' },
        { status: 500 }
      );
    }

    console.log(`Successfully reset ${expiredBoosts.length} expired boosts`);
    return NextResponse.json({
      success: true,
      message: `Reset ${expiredBoosts.length} expired boosts`,
      count: expiredBoosts.length,
      profiles: expiredBoosts.map((p) => ({ id: p.id, name: p.name })),
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
