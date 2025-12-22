import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * OAuth callback handler
 *
 * This route handles the callback from OAuth providers (Google)
 * and exchanges the authorization code for a session.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();
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
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, role, trade, location')
        .eq('id', user.id)
        .single();

      // If profile is incomplete (default values from trigger), redirect to onboarding
      if (
        profile &&
        (profile.name.startsWith('User-') ||
          profile.location === 'Update your location' ||
          profile.trade === 'General Laborer')
      ) {
        return NextResponse.redirect(`${origin}/onboarding`);
      }
    }

    // Redirect to dashboard
    return NextResponse.redirect(`${origin}/dashboard/feed`);
  }

  // If no code, redirect to login
  return NextResponse.redirect(`${origin}/login`);
}
