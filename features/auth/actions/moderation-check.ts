'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export interface ModerationCheckResult {
  allowed: boolean;
  reason?: string;
  moderationType?: 'banned' | 'suspended';
  expiresAt?: string;
}

/**
 * Check if user is allowed to access the platform
 * Returns moderation status for banned or suspended users
 */
export async function checkUserModerationStatus(): Promise<ModerationCheckResult> {
  const supabase = await createClient(await cookies());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { allowed: true };
  }

  // Get the most recent moderation actions using service role (bypasses RLS)
  const serviceSupabase = await createServiceClient(await cookies());
  const { data: actions } = await serviceSupabase
    .from('user_moderation_actions')
    .select('*')
    .eq('user_id', user.id)
    .in('action_type', ['ban', 'suspension', 'unbanned'])
    .order('created_at', { ascending: false })
    .limit(10);

  if (!actions || actions.length === 0) {
    return { allowed: true };
  }

  // Check for permanent ban (most recent ban without an unban after it)
  const latestBan = actions.find((a) => a.action_type === 'ban');
  const latestUnban = actions.find((a) => a.action_type === 'unbanned');

  const isBanned =
    latestBan &&
    (!latestUnban || new Date(latestBan.created_at) > new Date(latestUnban.created_at));

  if (isBanned) {
    return {
      allowed: false,
      reason: latestBan.reason,
      moderationType: 'banned',
    };
  }

  // Check for active suspension (not expired)
  const activeSuspension = actions.find(
    (a) =>
      a.action_type === 'suspension' &&
      a.expires_at &&
      new Date(a.expires_at) > new Date()
  );

  if (activeSuspension) {
    return {
      allowed: false,
      reason: activeSuspension.reason,
      moderationType: 'suspended',
      expiresAt: activeSuspension.expires_at,
    };
  }

  return { allowed: true };
}
