'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

/**
 * Grant lifetime Pro status to a user
 * Admin only
 */
export async function grantLifetimePro(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient(await cookies());

  // 1. Get authenticated admin
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // 2. Verify admin status
  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!adminProfile?.is_admin) {
    return { success: false, error: 'Unauthorized - admin access required' };
  }

  // 3. Validate UUID format
  const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!userId || !UUID_REGEX.test(userId)) {
    return { success: false, error: 'Invalid user ID' };
  }

  // 4. Check target user exists and current state
  const { data: targetProfile, error: targetError } = await supabase
    .from('profiles')
    .select('id, is_lifetime_pro')
    .eq('id', userId)
    .single();

  if (targetError || !targetProfile) {
    return { success: false, error: 'User not found' };
  }

  // 5. Check if already has lifetime Pro (idempotency)
  if (targetProfile.is_lifetime_pro) {
    return { success: false, error: 'User already has lifetime Pro status' };
  }

  // 6. Grant lifetime Pro
  const { error } = await supabase
    .from('profiles')
    .update({
      is_lifetime_pro: true,
      lifetime_pro_granted_at: new Date().toISOString(),
      lifetime_pro_granted_by: user.id,
    })
    .eq('id', userId);

  if (error) {
    console.error('Grant lifetime Pro error:', error);
    return { success: false, error: 'Failed to grant lifetime Pro' };
  }

  // 7. Log to admin activity
  const { error: logError } = await supabase
    .from('admin_activity_log')
    .insert({
      admin_id: user.id,
      action: 'grant_lifetime_pro',
      target_type: 'user',
      target_id: userId,
      details: { granted_at: new Date().toISOString() },
    });

  if (logError) {
    console.error('Error logging activity:', logError);
  }

  revalidatePath('/admin/users');
  return { success: true };
}

/**
 * Revoke lifetime Pro status from a user
 * Admin only
 */
export async function revokeLifetimePro(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient(await cookies());

  // 1. Get authenticated admin
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // 2. Verify admin status
  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!adminProfile?.is_admin) {
    return { success: false, error: 'Unauthorized - admin access required' };
  }

  // 3. Validate UUID format
  const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!userId || !UUID_REGEX.test(userId)) {
    return { success: false, error: 'Invalid user ID' };
  }

  // 4. Check target user exists and current state
  const { data: targetProfile, error: targetError } = await supabase
    .from('profiles')
    .select('id, is_lifetime_pro')
    .eq('id', userId)
    .single();

  if (targetError || !targetProfile) {
    return { success: false, error: 'User not found' };
  }

  // 5. Check if already doesn't have lifetime Pro (idempotency)
  if (!targetProfile.is_lifetime_pro) {
    return { success: false, error: 'User does not have lifetime Pro status' };
  }

  // 6. Revoke lifetime Pro
  const { error } = await supabase
    .from('profiles')
    .update({
      is_lifetime_pro: false,
      lifetime_pro_granted_at: null,
      lifetime_pro_granted_by: null,
    })
    .eq('id', userId);

  if (error) {
    console.error('Revoke lifetime Pro error:', error);
    return { success: false, error: 'Failed to revoke lifetime Pro' };
  }

  // 7. Log to admin activity
  const { error: logError } = await supabase
    .from('admin_activity_log')
    .insert({
      admin_id: user.id,
      action: 'revoke_lifetime_pro',
      target_type: 'user',
      target_id: userId,
      details: { revoked_at: new Date().toISOString() },
    });

  if (logError) {
    console.error('Error logging activity:', logError);
  }

  revalidatePath('/admin/users');
  return { success: true };
}
