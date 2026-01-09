'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export interface NotificationPreferences {
  id: string;
  user_id: string;
  // Notification types
  application_status_changes: boolean;
  new_applications: boolean;
  new_messages: boolean;
  job_matches: boolean;
  endorsement_requests: boolean;
  profile_views: boolean;
  // Delivery channels
  email_notifications: boolean;
  email_digest: 'immediate' | 'daily' | 'weekly' | 'never';
  push_notifications: boolean;
  desktop_notifications: boolean;
  notification_sound: boolean;
  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Get current user's notification preferences
 */
export async function getNotificationPreferences(): Promise<{
  success: boolean;
  data?: NotificationPreferences;
  error?: string;
}> {
  try {
    const supabase = await createClient(await cookies());

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Fetch preferences
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      // If no preferences exist, create default ones
      if (error.code === 'PGRST116') {
        const { data: newPrefs, error: createError } = await supabase
          .from('notification_preferences')
          .insert({
            user_id: user.id,
            application_status_changes: true,
            new_applications: true,
            new_messages: true,
            job_matches: true,
            endorsement_requests: true,
            profile_views: true,
            email_notifications: true,
            email_digest: 'daily',
            push_notifications: true,
            desktop_notifications: true,
            notification_sound: true,
          })
          .select()
          .single();

        if (createError) {
          return { success: false, error: createError.message };
        }

        return { success: true, data: newPrefs };
      }

      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return { success: false, error: 'Failed to fetch preferences' };
  }
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(
  preferences: Partial<Omit<NotificationPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<{
  success: boolean;
  data?: NotificationPreferences;
  error?: string;
}> {
  try {
    const supabase = await createClient(await cookies());

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Update preferences
    const { data, error } = await supabase
      .from('notification_preferences')
      .update({
        ...preferences,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Revalidate settings page
    revalidatePath('/dashboard/settings/notifications');

    return { success: true, data };
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return { success: false, error: 'Failed to update preferences' };
  }
}

/**
 * Reset notification preferences to defaults
 */
export async function resetNotificationPreferences(): Promise<{
  success: boolean;
  data?: NotificationPreferences;
  error?: string;
}> {
  return updateNotificationPreferences({
    application_status_changes: true,
    new_applications: true,
    new_messages: true,
    job_matches: true,
    endorsement_requests: true,
    profile_views: true,
    email_notifications: true,
    email_digest: 'daily',
    push_notifications: true,
    desktop_notifications: true,
    notification_sound: true,
  });
}
