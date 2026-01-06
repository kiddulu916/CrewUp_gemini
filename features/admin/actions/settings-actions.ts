'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

/**
 * Get all platform settings
 */
export async function getPlatformSettings() {
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
    .from('platform_settings')
    .select('*')
    .order('key', { ascending: true });

  if (error) {
    console.error('Error fetching platform settings:', error);
    return { success: false, error: 'Failed to fetch settings', data: null };
  }

  return { success: true, data };
}

/**
 * Update a platform setting
 */
export async function updatePlatformSetting(
  key: string,
  value: string | boolean | number,
  description?: string
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

  // Update or insert the setting
  const { error } = await supabase
    .from('platform_settings')
    .upsert({
      key,
      value,
      description,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Error updating platform setting:', error);
    return { success: false, error: 'Failed to update setting' };
  }

  // Log activity
  const { error: logError } = await supabase.from('admin_activity_log').insert({
    admin_id: user.id,
    action: 'updated_setting',
    target_type: 'platform_setting',
    target_id: null,
    details: {
      key,
      value,
      description,
    },
  });

  if (logError) {
    console.error('Error logging activity:', logError);
  }

  revalidatePath('/admin/settings');
  return { success: true };
}

/**
 * Get all admin users
 */
export async function getAdminUsers() {
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
    .from('users')
    .select('id, first_name, last_name, email, is_admin, created_at')
    .eq('is_admin', true)
    .order('first_name', { ascending: true });

  if (error) {
    console.error('Error fetching admin users:', error);
    return { success: false, error: 'Failed to fetch admin users', data: null };
  }

  return { success: true, data };
}

/**
 * Grant admin access to a user
 */
export async function grantAdminAccess(userId: string, reason: string) {
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
    return { success: false, error: 'Reason is required' };
  }

  // Update user to admin
  const { error: updateError } = await supabase
    .from('users')
    .update({ is_admin: true })
    .eq('id', userId);

  if (updateError) {
    console.error('Error granting admin access:', updateError);
    return { success: false, error: 'Failed to grant admin access' };
  }

  // Log activity
  const { error: logError } = await supabase.from('admin_activity_log').insert({
    admin_id: user.id,
    action: 'granted_admin',
    target_type: 'user',
    target_id: userId,
    details: { reason },
  });

  if (logError) {
    console.error('Error logging activity:', logError);
  }

  revalidatePath('/admin/settings');
  return { success: true };
}

/**
 * Revoke admin access from a user
 */
export async function revokeAdminAccess(userId: string, reason: string) {
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

  // Prevent self-revocation
  if (user.id === userId) {
    return { success: false, error: 'You cannot revoke your own admin access' };
  }

  if (!reason || reason.trim().length === 0) {
    return { success: false, error: 'Reason is required' };
  }

  // Update user to remove admin
  const { error: updateError } = await supabase
    .from('users')
    .update({ is_admin: false })
    .eq('id', userId);

  if (updateError) {
    console.error('Error revoking admin access:', updateError);
    return { success: false, error: 'Failed to revoke admin access' };
  }

  // Log activity
  const { error: logError } = await supabase.from('admin_activity_log').insert({
    admin_id: user.id,
    action: 'revoked_admin',
    target_type: 'user',
    target_id: userId,
    details: { reason },
  });

  if (logError) {
    console.error('Error logging activity:', logError);
  }

  revalidatePath('/admin/settings');
  return { success: true };
}

/**
 * Search for users to grant admin access
 */
export async function searchUsersForAdmin(query: string) {
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

  if (!query || query.trim().length < 2) {
    return { success: true, data: [] };
  }

  const searchTerm = `%${query.toLowerCase()}%`;

  const { data, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, email, role, is_admin')
    .eq('is_admin', false)
    .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm}`)
    .limit(10);

  if (error) {
    console.error('Error searching users:', error);
    return { success: false, error: 'Failed to search users', data: null };
  }

  return { success: true, data };
}

/**
 * Get admin activity log
 */
export async function getAdminActivityLog(limit: number = 50) {
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
    .from('admin_activity_log')
    .select(
      `
      *,
      admin:users!admin_activity_log_admin_id_fkey(name, email)
    `
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching admin activity log:', error);
    return { success: false, error: 'Failed to fetch activity log', data: null };
  }

  return { success: true, data };
}
