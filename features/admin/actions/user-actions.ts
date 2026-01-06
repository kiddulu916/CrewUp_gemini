'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

/**
 * Suspend a user temporarily
 */
export async function suspendUser(
  userId: string,
  reason: string,
  durationDays: number
) {
  const supabase = await createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Verify admin status
  const { data: profile } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return { success: false, error: 'Not authorized' };
  }

  if (!reason || reason.trim().length === 0) {
    return { success: false, error: 'Suspension reason is required' };
  }

  if (durationDays <= 0) {
    return { success: false, error: 'Duration must be greater than 0' };
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + durationDays);

  // Create moderation action record
  const { error: moderationError } = await supabase
    .from('user_moderation_actions')
    .insert({
      user_id: userId,
      action_type: 'suspension',
      reason,
      duration_days: durationDays,
      expires_at: expiresAt.toISOString(),
      actioned_by: user.id,
    });

  if (moderationError) {
    console.error('Error creating moderation action:', moderationError);
    return { success: false, error: 'Failed to suspend user' };
  }

  // Log activity
  const { error: logError } = await supabase.from('admin_activity_log').insert({
    admin_id: user.id,
    action: 'suspended_user',
    target_type: 'user',
    target_id: userId,
    details: {
      reason,
      duration_days: durationDays,
      expires_at: expiresAt.toISOString(),
    },
  });

  if (logError) {
    console.error('Error logging activity:', logError);
  }

  revalidatePath('/admin/users');
  return { success: true };
}

/**
 * Ban a user permanently
 */
export async function banUser(userId: string, reason: string) {
  const supabase = await createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Verify admin status
  const { data: profile } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return { success: false, error: 'Not authorized' };
  }

  if (!reason || reason.trim().length === 0) {
    return { success: false, error: 'Ban reason is required' };
  }

  // Create permanent ban record
  const { error: moderationError } = await supabase
    .from('user_moderation_actions')
    .insert({
      user_id: userId,
      action_type: 'ban',
      reason,
      duration_days: null, // NULL = permanent ban
      expires_at: null,
      actioned_by: user.id,
    });

  if (moderationError) {
    console.error('Error creating moderation action:', moderationError);
    return { success: false, error: 'Failed to ban user' };
  }

  // Log activity
  const { error: logError } = await supabase.from('admin_activity_log').insert({
    admin_id: user.id,
    action: 'banned_user',
    target_type: 'user',
    target_id: userId,
    details: { reason },
  });

  if (logError) {
    console.error('Error logging activity:', logError);
  }

  revalidatePath('/admin/users');
  return { success: true };
}

/**
 * Unban a user
 */
export async function unbanUser(userId: string) {
  const supabase = await createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Verify admin status
  const { data: profile } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return { success: false, error: 'Not authorized' };
  }

  // Create unban record
  const { error: moderationError } = await supabase
    .from('user_moderation_actions')
    .insert({
      user_id: userId,
      action_type: 'unbanned',
      reason: 'User unbanned by admin',
      duration_days: null,
      expires_at: null,
      actioned_by: user.id,
    });

  if (moderationError) {
    console.error('Error creating moderation action:', moderationError);
    return { success: false, error: 'Failed to unban user' };
  }

  // Log activity
  const { error: logError } = await supabase.from('admin_activity_log').insert({
    admin_id: user.id,
    action: 'unbanned_user',
    target_type: 'user',
    target_id: userId,
  });

  if (logError) {
    console.error('Error logging activity:', logError);
  }

  revalidatePath('/admin/users');
  return { success: true };
}

/**
 * Grant Pro subscription to a user manually
 */
export async function grantProSubscription(userId: string, reason: string) {
  const supabase = await createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Verify admin status
  const { data: profile } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return { success: false, error: 'Not authorized' };
  }

  // Update user's subscription status
  const { error: updateError } = await supabase
    .from('users')
    .update({
      subscription_status: 'pro',
    })
    .eq('user_id', userId);

  if (updateError) {
    console.error('Error updating subscription status:', updateError);
    return { success: false, error: 'Failed to grant Pro subscription' };
  }

  // Create a manual subscription record
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

  const { error: subscriptionError } = await supabase
    .from('subscriptions')
    .insert({
      user_id: userId,
      status: 'active',
      plan: 'pro_annual_manual',
      current_period_start: new Date().toISOString(),
      current_period_end: oneYearFromNow.toISOString(),
    });

  if (subscriptionError) {
    console.error('Error creating subscription record:', subscriptionError);
    // Don't fail the whole operation, just log it
  }

  // Log activity
  const { error: logError } = await supabase.from('admin_activity_log').insert({
    admin_id: user.id,
    action: 'granted_pro',
    target_type: 'user',
    target_id: userId,
    details: { reason },
  });

  if (logError) {
    console.error('Error logging activity:', logError);
  }

  revalidatePath('/admin/users');
  return { success: true };
}

/**
 * Revoke Pro subscription from a user
 */
export async function revokeProSubscription(userId: string, reason: string) {
  const supabase = await createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Verify admin status
  const { data: profile } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return { success: false, error: 'Not authorized' };
  }

  // Update user's subscription status
  const { error: updateError } = await supabase
    .from('users')
    .update({
      subscription_status: 'free',
    })
    .eq('user_id', userId);

  if (updateError) {
    console.error('Error updating subscription status:', updateError);
    return { success: false, error: 'Failed to revoke Pro subscription' };
  }

  // Cancel any active subscriptions
  const { error: subscriptionError } = await supabase
    .from('subscriptions')
    .update({ status: 'canceled' })
    .eq('user_id', userId)
    .eq('status', 'active');

  if (subscriptionError) {
    console.error('Error canceling subscriptions:', subscriptionError);
  }

  // Log activity
  const { error: logError } = await supabase.from('admin_activity_log').insert({
    admin_id: user.id,
    action: 'revoked_pro',
    target_type: 'user',
    target_id: userId,
    details: { reason },
  });

  if (logError) {
    console.error('Error logging activity:', logError);
  }

  revalidatePath('/admin/users');
  return { success: true };
}

/**
 * Get user's moderation history
 */
export async function getUserModerationHistory(userId: string) {
  const supabase = await createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated', data: null };
  }

  // Verify admin status
  const { data: profile } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return { success: false, error: 'Not authorized', data: null };
  }

  const { data, error } = await supabase
    .from('user_moderation_actions')
    .select(
      `
      *,
      actioned_by_profile:users!actioned_by(name)
    `
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching moderation history:', error);
    return { success: false, error: 'Failed to fetch moderation history', data: null };
  }

  return { success: true, data };
}

/**
 * Check if user is currently suspended or banned
 */
export async function getUserModerationStatus(userId: string) {
  const supabase = await createClient(await cookies());

  // Get the most recent ban or active suspension
  const { data: actions } = await supabase
    .from('user_moderation_actions')
    .select('*')
    .eq('user_id', userId)
    .in('action_type', ['ban', 'suspension'])
    .order('created_at', { ascending: false })
    .limit(10);

  if (!actions || actions.length === 0) {
    return { isBanned: false, isSuspended: false };
  }

  // Check for permanent ban (most recent ban without an unban after it)
  const latestBan = actions.find((a) => a.action_type === 'ban');
  const latestUnban = actions.find((a) => a.action_type === 'unbanned');

  const isBanned =
    latestBan &&
    (!latestUnban || new Date(latestBan.created_at) > new Date(latestUnban.created_at));

  // Check for active suspension (not expired)
  const activeSuspension = actions.find(
    (a) =>
      a.action_type === 'suspension' &&
      a.expires_at &&
      new Date(a.expires_at) > new Date()
  );

  return {
    isBanned: !!isBanned,
    isSuspended: !!activeSuspension,
    suspensionExpiresAt: activeSuspension?.expires_at,
  };
}
