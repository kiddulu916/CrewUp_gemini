'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export interface Notification {
  id: string;
  user_id: string;
  type: 'proximity_alert' | 'application_status' | 'new_message' | 'profile_view';
  title: string;
  message: string;
  data?: any;
  read_at: string | null;
  created_at: string;
}

/**
 * Get all notifications for the current user
 */
export async function getMyNotifications() {
  try {
    const supabase = await createClient(await cookies());

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notifications:', error);
      return { success: false, error: error.message };
    }

    return { success: true, notifications: data as Notification[] };
  } catch (error: any) {
    console.error('Error in getMyNotifications:', error);
    return { success: false, error: error.message || 'Failed to fetch notifications' };
  }
}

/**
 * Get unread notification count for the current user
 */
export async function getUnreadCount() {
  try {
    const supabase = await createClient(await cookies());

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated', count: 0 };
    }

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('read_at', null);

    if (error) {
      console.error('Error fetching unread count:', error);
      return { success: false, error: error.message, count: 0 };
    }

    return { success: true, count: count || 0 };
  } catch (error: any) {
    console.error('Error in getUnreadCount:', error);
    return { success: false, error: error.message || 'Failed to fetch unread count', count: 0 };
  }
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: string) {
  try {
    const supabase = await createClient(await cookies());

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', user.id); // Ensure user owns the notification

    if (error) {
      console.error('Error marking notification as read:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/notifications');
    return { success: true };
  } catch (error: any) {
    console.error('Error in markNotificationAsRead:', error);
    return { success: false, error: error.message || 'Failed to mark notification as read' };
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead() {
  try {
    const supabase = await createClient(await cookies());

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('read_at', null);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/notifications');
    return { success: true };
  } catch (error: any) {
    console.error('Error in markAllNotificationsAsRead:', error);
    return { success: false, error: error.message || 'Failed to mark all notifications as read' };
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string) {
  try {
    const supabase = await createClient(await cookies());

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', user.id); // Ensure user owns the notification

    if (error) {
      console.error('Error deleting notification:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/notifications');
    return { success: true };
  } catch (error: any) {
    console.error('Error in deleteNotification:', error);
    return { success: false, error: error.message || 'Failed to delete notification' };
  }
}
