'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

/**
 * Activate profile boost for the current user (Pro feature)
 * Boost lasts for 7 days
 */
export async function activateProfileBoost() {
  try {
    const supabase = await createClient(await cookies());

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Check if user is Pro
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('subscription_status, is_profile_boosted, boost_expires_at')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return { success: false, error: 'Failed to fetch profile' };
    }

    if (profile.subscription_status !== 'pro') {
      return { success: false, error: 'Profile boost is a Pro feature. Upgrade to Pro to activate.' };
    }

    // Check if already boosted
    if (profile.is_profile_boosted && profile.boost_expires_at) {
      const expiresAt = new Date(profile.boost_expires_at);
      if (expiresAt > new Date()) {
        return {
          success: false,
          error: 'Your profile is already boosted. Wait for it to expire before activating again.',
        };
      }
    }

    // Activate boost for 7 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { error: updateError } = await supabase
      .from('users')
      .update({
        is_profile_boosted: true,
        boost_expires_at: expiresAt.toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error activating boost:', updateError);
      return { success: false, error: 'Failed to activate profile boost' };
    }

    revalidatePath('/dashboard/profile');
    revalidatePath('/dashboard/settings');
    return { success: true, expiresAt: expiresAt.toISOString() };
  } catch (error: any) {
    console.error('Error in activateProfileBoost:', error);
    return { success: false, error: error.message || 'Failed to activate profile boost' };
  }
}

/**
 * Deactivate profile boost for the current user
 */
export async function deactivateProfileBoost() {
  try {
    const supabase = await createClient(await cookies());

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({
        is_profile_boosted: false,
        boost_expires_at: null,
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error deactivating boost:', updateError);
      return { success: false, error: 'Failed to deactivate profile boost' };
    }

    revalidatePath('/dashboard/profile');
    revalidatePath('/dashboard/settings');
    return { success: true };
  } catch (error: any) {
    console.error('Error in deactivateProfileBoost:', error);
    return { success: false, error: error.message || 'Failed to deactivate profile boost' };
  }
}

/**
 * Get current boost status for the user
 */
export async function getBoostStatus() {
  try {
    const supabase = await createClient(await cookies());

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data: profile, error } = await supabase
      .from('users')
      .select('subscription_status, is_profile_boosted, boost_expires_at')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching boost status:', error);
      return { success: false, error: 'Failed to fetch boost status' };
    }

    const isPro = profile.subscription_status === 'pro';
    const isActive = profile.is_profile_boosted && profile.boost_expires_at
      ? new Date(profile.boost_expires_at) > new Date()
      : false;

    return {
      success: true,
      isPro,
      isActive,
      expiresAt: profile.boost_expires_at,
    };
  } catch (error: any) {
    console.error('Error in getBoostStatus:', error);
    return { success: false, error: error.message || 'Failed to fetch boost status' };
  }
}
