// features/subscriptions/actions/profile-views-actions.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export type ProfileView = {
  id: string;
  viewed_at: string;
  viewer: {
    id: string;
    name: string;
    employer_type: string | null;
    location: string;
  };
};

export type ProfileViewsResult = {
  success: boolean;
  error?: string;
  views?: ProfileView[];
  weeklyCount?: number;
};

/**
 * Track a profile view
 * Automatically called when someone views a profile
 */
export async function trackProfileView(viewedProfileId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Don't track self-views (constraint will prevent it anyway)
    if (user.id === viewedProfileId) {
      return { success: true };
    }

    // Insert profile view (duplicates are OK, we want to track each view)
    const { error } = await supabase
      .from('profile_views')
      .insert({
        viewed_profile_id: viewedProfileId,
        viewer_id: user.id,
      });

    if (error) {
      console.error('Error tracking profile view:', error);
      return { success: false, error: 'Failed to track view' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in trackProfileView:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

/**
 * Get profile views for the current user (Pro feature)
 * Returns list of employers who viewed the worker's profile
 */
export async function getMyProfileViews(): Promise<ProfileViewsResult> {
  try {
    const supabase = await createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Check if user is Pro
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status, role')
      .eq('id', user.id)
      .single();

    if (profile?.subscription_status !== 'pro') {
      return { success: false, error: 'Pro subscription required' };
    }

    if (profile?.role !== 'worker') {
      return { success: false, error: 'Only workers can view profile views' };
    }

    // Get all profile views with viewer details
    const { data: views, error } = await supabase
      .from('profile_views')
      .select(`
        id,
        viewed_at,
        viewer:profiles!viewer_id(
          id,
          name,
          employer_type,
          location
        )
      `)
      .eq('viewed_profile_id', user.id)
      .order('viewed_at', { ascending: false })
      .limit(50); // Limit to last 50 views

    if (error) {
      console.error('Error fetching profile views:', error);
      return { success: false, error: 'Failed to fetch profile views' };
    }

    // Calculate weekly count (views in last 7 days)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const weeklyCount = views?.filter(
      (view) => new Date(view.viewed_at) >= oneWeekAgo
    ).length || 0;

    return {
      success: true,
      views: views as unknown as ProfileView[],
      weeklyCount,
    };
  } catch (error) {
    console.error('Error in getMyProfileViews:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

/**
 * Get profile view count for teaser (free users)
 */
export async function getProfileViewCount(): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const supabase = await createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { count, error } = await supabase
      .from('profile_views')
      .select('*', { count: 'exact', head: true })
      .eq('viewed_profile_id', user.id);

    if (error) {
      console.error('Error fetching profile view count:', error);
      return { success: false, error: 'Failed to fetch count' };
    }

    return { success: true, count: count || 0 };
  } catch (error) {
    console.error('Error in getProfileViewCount:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}
