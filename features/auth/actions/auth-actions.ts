'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { rateLimit, RATE_LIMITS } from '@/lib/security/rate-limit';

const SUPPORT_EMAIL = 'support@krewup.net';

export type AuthResult = {
  success: boolean;
  error?: string;
};

/**
 * Sign in with email and password
 * 
 * ! Rate limited: 5 attempts per minute per IP
 */
export async function signIn(email: string, password: string): Promise<AuthResult> {
  // * Rate limiting - prevent brute force attacks
  const rateLimitResult = await rateLimit('auth:signIn', RATE_LIMITS.auth);
  if (rateLimitResult) return rateLimitResult;

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
    const { data: actions } = await serviceSupabase
      .from('user_moderation_actions')
      .select('*')
      .eq('user_id', data.user.id)
      .in('action_type', ['ban', 'suspension', 'warning'])
      .order('created_at', { ascending: false })
      .limit(10);

    if (actions && actions.length > 0) {
      // Check for permanent ban (ban exists means user is banned)
      const latestBan = actions.find((a) => a.action_type === 'ban');

      const isBanned = !!latestBan;

      if (isBanned) {
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
 * 
 * ! Rate limited: 3 signups per minute per IP
 */
export async function signUp(
  email: string,
  password: string,
  name: string
): Promise<AuthResult> {
  // * Rate limiting - prevent mass account creation
  const rateLimitResult = await rateLimit('auth:signUp', RATE_LIMITS.authSignup);
  if (rateLimitResult) return rateLimitResult;

  const supabase = await createClient(await cookies());

  // Check if email already exists in profiles
  // Note: Supabase auth.signUp() may not always prevent duplicates if email confirmation is disabled
  const { data: existingProfile } = await supabase
    .from('users')
    .select('email')
    .eq('email', email.toLowerCase())
    .maybeSingle();

  if (existingProfile) {
    return {
      success: false,
      error: 'An account with this email already exists. Please sign in instead.'
    };
  }
  
  const nameParts = name.trim().split(' ');
  const firstName = nameParts[0] || 'New';
  const lastName = nameParts.slice(1).join(' ') || 'User';

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
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
 * 
 * ! Rate limited: 5 attempts per minute per IP
 */
export async function resetPassword(email: string): Promise<AuthResult> {
  // * Rate limiting - prevent email enumeration and spam
  const rateLimitResult = await rateLimit('auth:resetPassword', RATE_LIMITS.auth);
  if (rateLimitResult) return rateLimitResult;

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
