'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

/**
 * Get all content reports with related data
 */
export async function getContentReports(status?: string) {
  const supabase = await createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated', data: null };
  }

  // Verify admin status
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return { success: false, error: 'Not authorized', data: null };
  }

  let query = supabase
    .from('content_reports')
    .select(
      `
      *,
      reporter:profiles!content_reports_reporter_id_fkey(name, email),
      reported_user:profiles!content_reports_reported_user_id_fkey(name, email),
      reviewed_by_profile:profiles!content_reports_reviewed_by_fkey(name)
    `
    )
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching content reports:', error);
    return { success: false, error: 'Failed to fetch content reports', data: null };
  }

  return { success: true, data };
}

/**
 * Get reported content details based on type and ID
 */
export async function getReportedContent(contentType: string, contentId: string) {
  const supabase = await createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated', data: null };
  }

  // Verify admin status
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return { success: false, error: 'Not authorized', data: null };
  }

  let data = null;
  let error = null;

  // Fetch content based on type
  switch (contentType) {
    case 'job':
      const jobResult = await supabase
        .from('jobs')
        .select(
          `
          *,
          employer:profiles!jobs_employer_id_fkey(name, email)
        `
        )
        .eq('id', contentId)
        .single();
      data = jobResult.data;
      error = jobResult.error;
      break;

    case 'profile':
      const profileResult = await supabase
        .from('profiles')
        .select('*')
        .eq('id', contentId)
        .single();
      data = profileResult.data;
      error = profileResult.error;
      break;

    case 'message':
      const messageResult = await supabase
        .from('messages')
        .select(
          `
          *,
          sender:profiles!messages_sender_id_fkey(name, email),
          recipient:profiles!messages_recipient_id_fkey(name, email)
        `
        )
        .eq('id', contentId)
        .single();
      data = messageResult.data;
      error = messageResult.error;
      break;

    default:
      return { success: false, error: 'Invalid content type', data: null };
  }

  if (error) {
    console.error(`Error fetching ${contentType}:`, error);
    return { success: false, error: `Failed to fetch ${contentType}`, data: null };
  }

  return { success: true, data };
}

/**
 * Remove reported content (delete job/message or hide profile)
 */
export async function removeContent(
  reportId: string,
  contentType: string,
  contentId: string,
  adminNotes: string
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
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return { success: false, error: 'Not authorized' };
  }

  let contentError = null;

  // Delete or hide content based on type
  switch (contentType) {
    case 'job':
      const { error: jobError } = await supabase
        .from('jobs')
        .delete()
        .eq('id', contentId);
      contentError = jobError;
      break;

    case 'profile':
      // For profiles, we don't delete but mark them as hidden/banned
      // This is handled separately via banUser action
      return {
        success: false,
        error: 'Use ban/suspend actions to moderate user profiles',
      };

    case 'message':
      const { error: messageError } = await supabase
        .from('messages')
        .delete()
        .eq('id', contentId);
      contentError = messageError;
      break;

    default:
      return { success: false, error: 'Invalid content type' };
  }

  if (contentError) {
    console.error('Error removing content:', contentError);
    return { success: false, error: 'Failed to remove content' };
  }

  // Update report
  const { error: reportError } = await supabase
    .from('content_reports')
    .update({
      status: 'actioned',
      action_taken: 'content_removed',
      admin_notes: adminNotes,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', reportId);

  if (reportError) {
    console.error('Error updating report:', reportError);
    return { success: false, error: 'Failed to update report' };
  }

  // Log activity
  const { error: logError } = await supabase.from('admin_activity_log').insert({
    admin_id: user.id,
    action: 'removed_content',
    target_type: contentType,
    target_id: contentId,
    details: {
      report_id: reportId,
      admin_notes: adminNotes,
    },
  });

  if (logError) {
    console.error('Error logging activity:', logError);
  }

  revalidatePath('/admin/moderation');
  return { success: true };
}

/**
 * Warn user about reported content
 */
export async function warnUser(
  reportId: string,
  userId: string,
  reason: string,
  adminNotes: string
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
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return { success: false, error: 'Not authorized' };
  }

  if (!reason || reason.trim().length === 0) {
    return { success: false, error: 'Warning reason is required' };
  }

  // Create warning record
  const { error: moderationError } = await supabase
    .from('user_moderation_actions')
    .insert({
      user_id: userId,
      action_type: 'warning',
      reason,
      duration_days: null,
      expires_at: null,
      actioned_by: user.id,
    });

  if (moderationError) {
    console.error('Error creating warning:', moderationError);
    return { success: false, error: 'Failed to warn user' };
  }

  // Update report
  const { error: reportError } = await supabase
    .from('content_reports')
    .update({
      status: 'actioned',
      action_taken: 'user_warned',
      admin_notes: adminNotes,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', reportId);

  if (reportError) {
    console.error('Error updating report:', reportError);
    return { success: false, error: 'Failed to update report' };
  }

  // Log activity
  const { error: logError } = await supabase.from('admin_activity_log').insert({
    admin_id: user.id,
    action: 'warned_user',
    target_type: 'user',
    target_id: userId,
    details: {
      report_id: reportId,
      reason,
      admin_notes: adminNotes,
    },
  });

  if (logError) {
    console.error('Error logging activity:', logError);
  }

  revalidatePath('/admin/moderation');
  return { success: true };
}

/**
 * Suspend user from moderation panel
 */
export async function suspendUserFromReport(
  reportId: string,
  userId: string,
  reason: string,
  durationDays: number,
  adminNotes: string
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
    .from('profiles')
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

  // Create suspension record
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
    console.error('Error creating suspension:', moderationError);
    return { success: false, error: 'Failed to suspend user' };
  }

  // Update report
  const { error: reportError } = await supabase
    .from('content_reports')
    .update({
      status: 'actioned',
      action_taken: 'user_suspended',
      admin_notes: adminNotes,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', reportId);

  if (reportError) {
    console.error('Error updating report:', reportError);
    return { success: false, error: 'Failed to update report' };
  }

  // Log activity
  const { error: logError } = await supabase.from('admin_activity_log').insert({
    admin_id: user.id,
    action: 'suspended_user',
    target_type: 'user',
    target_id: userId,
    details: {
      report_id: reportId,
      reason,
      duration_days: durationDays,
      expires_at: expiresAt.toISOString(),
      admin_notes: adminNotes,
    },
  });

  if (logError) {
    console.error('Error logging activity:', logError);
  }

  revalidatePath('/admin/moderation');
  return { success: true };
}

/**
 * Ban user from moderation panel
 */
export async function banUserFromReport(
  reportId: string,
  userId: string,
  reason: string,
  adminNotes: string
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
    .from('profiles')
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
    console.error('Error creating ban:', moderationError);
    return { success: false, error: 'Failed to ban user' };
  }

  // Update report
  const { error: reportError } = await supabase
    .from('content_reports')
    .update({
      status: 'actioned',
      action_taken: 'user_banned',
      admin_notes: adminNotes,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', reportId);

  if (reportError) {
    console.error('Error updating report:', reportError);
    return { success: false, error: 'Failed to update report' };
  }

  // Log activity
  const { error: logError } = await supabase.from('admin_activity_log').insert({
    admin_id: user.id,
    action: 'banned_user',
    target_type: 'user',
    target_id: userId,
    details: {
      report_id: reportId,
      reason,
      admin_notes: adminNotes,
    },
  });

  if (logError) {
    console.error('Error logging activity:', logError);
  }

  revalidatePath('/admin/moderation');
  return { success: true };
}

/**
 * Dismiss a report (no action needed)
 */
export async function dismissReport(reportId: string, adminNotes: string) {
  const supabase = await createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Verify admin status
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return { success: false, error: 'Not authorized' };
  }

  // Update report
  const { error: reportError } = await supabase
    .from('content_reports')
    .update({
      status: 'dismissed',
      action_taken: 'no_action',
      admin_notes: adminNotes,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', reportId);

  if (reportError) {
    console.error('Error dismissing report:', reportError);
    return { success: false, error: 'Failed to dismiss report' };
  }

  // Log activity
  const { error: logError } = await supabase.from('admin_activity_log').insert({
    admin_id: user.id,
    action: 'dismissed_report',
    target_type: 'content_report',
    target_id: reportId,
    details: {
      admin_notes: adminNotes,
    },
  });

  if (logError) {
    console.error('Error logging activity:', logError);
  }

  revalidatePath('/admin/moderation');
  return { success: true };
}
