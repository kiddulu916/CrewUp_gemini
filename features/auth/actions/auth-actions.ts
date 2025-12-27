'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

export type AuthResult = {
  success: boolean;
  error?: string;
};

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string): Promise<AuthResult> {
  const supabase = await createClient(await cookies());

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { success: false, error: error.message };
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
