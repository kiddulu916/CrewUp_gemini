import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * OAuth callback handler
 *
 * This route handles the callback from OAuth providers (Google)
 * and exchanges the authorization code for a session.
 * Note: This route is not functional in static export builds (mobile).
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient(await cookies());
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Error exchanging code for session:', error);
      return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
    }

    // Check if user needs onboarding
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: userData } = await supabase
        .from('users')
        .select(`
          first_name, 
          last_name, 
          role, 
          location,
          workers(trade)
        `)
        .eq('id', user.id)
        .single();

      const profile = userData as any;
      const worker = profile?.workers?.[0];
      const fullName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim();

      // If profile is incomplete (default values from trigger), redirect to onboarding
      // Check:
      // 1. Name starts with 'User-' (default from trigger)
      // 2. Location is default
      // 3. For workers: no worker record OR trade is default 'General Laborer'
      const hasIncompleteProfile = 
        !fullName || 
        fullName.startsWith('User-') ||
        !profile?.location ||
        profile.location === 'Update your location' ||
        (profile?.role === 'worker' && (!worker || worker.trade === 'General Laborer'));

      if (profile && hasIncompleteProfile) {
        return NextResponse.redirect(`${origin}/onboarding`);
      }
    }

    // Redirect to dashboard
    return NextResponse.redirect(`${origin}/dashboard/feed`);
  }

  // If no code, redirect to login
  return NextResponse.redirect(`${origin}/login`);
}
