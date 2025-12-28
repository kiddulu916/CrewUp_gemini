'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

const SUPPORT_EMAIL = 'support@krewup.net';

export type AuthResult = {
  success: boolean;
  error?: string;
};

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string): Promise<AuthResult> {
  const supabase = await createClient(await cookies());

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // Check moderation status using service role (bypasses RLS)
  if (data.user) {
    const serviceSupabase = await createServiceClient(await cookies());
    const { data: actions, error: moderationError } = await serviceSupabase
      .from('user_moderation_actions')
      .select('*')
      .eq('user_id', data.user.id)
      .in('action_type', ['ban', 'suspension', 'unbanned'])
      .order('created_at', { ascending: false })
      .limit(10);

    if (moderationError) {
      console.error('[signIn] Error checking moderation status:', moderationError);
    }

    console.log('[signIn] Moderation check for user:', data.user.id);
    console.log('[signIn] Found actions:', actions?.length || 0);
    if (actions && actions.length > 0) {
      console.log('[signIn] Actions:', JSON.stringify(actions, null, 2));
    } else {
      // Debug: Check what user_ids exist in the table
      const { data: allActions, error: allError } = await serviceSupabase
        .from('user_moderation_actions')
        .select('user_id, action_type, created_at')
        .limit(5);
      console.log('[signIn] Sample of all actions in table:', JSON.stringify(allActions, null, 2));
      console.log('[signIn] Error querying all actions:', allError);

      // Try to query the specific record we know exists
      const { data: specificAction, error: specificError } = await serviceSupabase
        .from('user_moderation_actions')
        .select('*')
        .eq('id', '374de1dd-5443-46e4-936b-75d6c055409f')
        .single();
      console.log('[signIn] Query for specific known record (374de1dd...):', specificAction);
      console.log('[signIn] Error:', specificError);

      // Also check the profiles table to see what ID is stored there
      const { data: profile } = await serviceSupabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .single();
      console.log('[signIn] Profile exists with this auth user ID?', profile ? 'YES' : 'NO');
    }

    if (actions && actions.length > 0) {
      // Check for permanent ban
      const latestBan = actions.find((a) => a.action_type === 'ban');
      const latestUnban = actions.find((a) => a.action_type === 'unbanned');

      const isBanned =
        latestBan &&
        (!latestUnban || new Date(latestBan.created_at) > new Date(latestUnban.created_at));

      if (isBanned) {
        // Log out the user immediately
        await supabase.auth.signOut();
        return {
          success: false,
          error: `Your account has been permanently banned.\n\nReason: ${latestBan.reason}\n\nIf you believe this is a mistake, please contact ${SUPPORT_EMAIL} to appeal.`,
        };
      }

      // Check for active suspension
      const activeSuspension = actions.find(
        (a) =>
          a.action_type === 'suspension' &&
          a.expires_at &&
          new Date(a.expires_at) > new Date()
      );

      if (activeSuspension) {
        const expiresDate = new Date(activeSuspension.expires_at).toLocaleString();
        // Log out the user immediately
        await supabase.auth.signOut();
        return {
          success: false,
          error: `Your account has been temporarily suspended until ${expiresDate}.\n\nReason: ${activeSuspension.reason}\n\nIf you believe this is a mistake, please contact ${SUPPORT_EMAIL} to appeal.`,
        };
      }
    }
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard/feed');
}

/**
 * Sign up with email and password
 */
export async function signUp(
  email: string,
  password: string,
  name: string
): Promise<AuthResult> {
  const supabase = await createClient(await cookies());

  // Check if email already exists in profiles
  // Note: Supabase auth.signUp() may not always prevent duplicates if email confirmation is disabled
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('email')
    .eq('email', email.toLowerCase())
    .maybeSingle();

  if (existingProfile) {
    return {
      success: false,
      error: 'An account with this email already exists. Please sign in instead.'
    };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
    },
  });

  if (error) {
    console.error('[signUp] Supabase error:', error);
    console.error('[signUp] Error details:', JSON.stringify(error, null, 2));
    return { success: false, error: error.message };
  }

  // If email confirmation is disabled, user is immediately logged in
  // Redirect to onboarding in this case
  if (data.user && data.session) {
    revalidatePath('/', 'layout');
    redirect('/onboarding');
  }

  return { success: true };
}

/**
 * Sign in with Google OAuth
 */
export async function signInWithGoogle(): Promise<AuthResult> {
  const supabase = await createClient(await cookies());

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  if (data.url) {
    redirect(data.url);
  }

  return { success: true };
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<AuthResult> {
  const supabase = await createClient(await cookies());

  const { error } = await supabase.auth.signOut();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/', 'layout');
  redirect('/login');
}

/**
 * Request password reset
 */
export async function resetPassword(email: string): Promise<AuthResult> {
  const supabase = await createClient(await cookies());

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Update password
 */
export async function updatePassword(newPassword: string): Promise<AuthResult> {
  const supabase = await createClient(await cookies());

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
