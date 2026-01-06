'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import {
  success,
  error,
  requireAuth,
  requireAdmin,
  getUserFriendlyError,
  validateInput,
  type ActionResponse,
} from '@/lib/utils/action-response';
import { suspendUserSchema, banUserSchema } from '@/lib/validation/schemas';

/**
 * Suspend a user temporarily
 * 
 * @param userId - The ID of the user to suspend
 * @param reason - The reason for suspension (displayed to user)
 * @param durationDays - Number of days to suspend the user
 * @returns ActionResponse indicating success or failure
 */
export async function suspendUser(
  userId: string,
  reason: string,
  durationDays: number
): Promise<ActionResponse> {
  try {
    // * Input validation with Zod
    const validation = validateInput(suspendUserSchema, { userId, reason, durationDays });
    if (!validation.success) return validation.error;
    const validatedInput = validation.data;

    const supabase = await createClient(await cookies());

    // * Authentication check
    const authResult = await requireAuth(supabase);
    if (!authResult.success) return authResult;
    const adminUser = authResult.data!;

    // * Authorization check
    const adminResult = await requireAdmin(supabase, adminUser.id);
    if (!adminResult.success) return adminResult;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + validatedInput.durationDays);

    // * Create moderation action record
    const { error: moderationError } = await supabase
      .from('user_moderation_actions')
      .insert({
        user_id: validatedInput.userId,
        action_type: 'suspension',
        reason: validatedInput.reason,
        duration_days: validatedInput.durationDays,
        expires_at: expiresAt.toISOString(),
        actioned_by: adminUser.id,
      });

    if (moderationError) {
      return error(getUserFriendlyError(moderationError, 'Failed to suspend user'));
    }

    // * Log activity (non-blocking)
    const { error: logError } = await supabase.from('admin_activity_log').insert({
      admin_id: adminUser.id,
      action: 'suspended_user',
      target_type: 'user',
      target_id: validatedInput.userId,
      details: {
        reason: validatedInput.reason,
        duration_days: validatedInput.durationDays,
        expires_at: expiresAt.toISOString(),
      },
    });

    if (logError) {
      console.error('Error logging activity:', logError);
      // ! Don't fail the action if logging fails
    }

    revalidatePath('/admin/users');
    return success();
  } catch (err) {
    return error(getUserFriendlyError(err, 'Failed to suspend user'));
  }
}

/**
 * Ban a user permanently
 * 
 * @param userId - The ID of the user to ban
 * @param reason - The reason for the ban (displayed to user)
 * @returns ActionResponse indicating success or failure
 */
export async function banUser(userId: string, reason: string): Promise<ActionResponse> {
  try {
    // * Input validation with Zod
    const validation = validateInput(banUserSchema, { userId, reason });
    if (!validation.success) return validation.error;
    const validatedInput = validation.data;

    const supabase = await createClient(await cookies());

    // * Authentication check
    const authResult = await requireAuth(supabase);
    if (!authResult.success) return authResult;
    const adminUser = authResult.data!;

    // * Authorization check
    const adminResult = await requireAdmin(supabase, adminUser.id);
    if (!adminResult.success) return adminResult;

    // * Create permanent ban record
    const { error: moderationError } = await supabase
      .from('user_moderation_actions')
      .insert({
        user_id: validatedInput.userId,
        action_type: 'ban',
        reason: validatedInput.reason,
        duration_days: null, // NULL = permanent ban
        expires_at: null,
        actioned_by: adminUser.id,
      });

    if (moderationError) {
      return error(getUserFriendlyError(moderationError, 'Failed to ban user'));
    }

    // * Log activity (non-blocking)
    const { error: logError } = await supabase.from('admin_activity_log').insert({
      admin_id: adminUser.id,
      action: 'banned_user',
      target_type: 'user',
      target_id: validatedInput.userId,
      details: { reason: validatedInput.reason },
    });

    if (logError) {
      console.error('Error logging activity:', logError);
      // ! Don't fail the action if logging fails
    }

    revalidatePath('/admin/users');
    return success();
  } catch (err) {
    return error(getUserFriendlyError(err, 'Failed to ban user'));
  }
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

  // Delete the latest ban record to unban user (since 'unbanned' is not a valid action_type)
  // First, get the latest ban record
  const { data: latestBan } = await supabase
    .from('user_moderation_actions')
    .select('id')
    .eq('user_id', userId)
    .eq('action_type', 'ban')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latestBan) {
    return { success: false, error: 'User is not currently banned' };
  }

  // Delete the ban record
  const { error: moderationError } = await supabase
    .from('user_moderation_actions')
    .delete()
    .eq('id', latestBan.id);

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
    .eq('id', userId);

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
      stripe_customer_id: 'manual_grant_' + userId, // Placeholder for manually granted subscriptions
      stripe_subscription_id: 'manual_' + Date.now(), // Placeholder
      stripe_price_id: 'manual_pro_annual', // Placeholder
      status: 'active',
      plan_type: 'annual',
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
    .eq('id', userId);

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
      actioned_by_profile:users!actioned_by(first_name, last_name)
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

  // Check for permanent ban (ban exists means user is banned)
  const latestBan = actions.find((a) => a.action_type === 'ban');

  const isBanned = !!latestBan;

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
