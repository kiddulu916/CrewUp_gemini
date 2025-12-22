'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type ProfileUpdateData = {
  name?: string;
  phone?: string | null;
  location?: string;
  coords?: { lat: number; lng: number } | null;
  trade?: string;
  sub_trade?: string | null;
  bio?: string | null;
  employer_type?: string | null;
};

export type ProfileResult = {
  success: boolean;
  data?: any;
  error?: string;
};

/**
 * Update user profile
 */
export async function updateProfile(data: ProfileUpdateData): Promise<ProfileResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Validate required fields
  if (data.name && data.name.trim().length === 0) {
    return { success: false, error: 'Name is required' };
  }

  if (data.name && data.name.length > 100) {
    return { success: false, error: 'Name is too long (max 100 characters)' };
  }

  if (data.bio && data.bio.length > 500) {
    return { success: false, error: 'Bio is too long (max 500 characters)' };
  }

  if (data.location && data.location.length > 200) {
    return { success: false, error: 'Location is too long (max 200 characters)' };
  }

  // Update profile
  const { data: profile, error: updateError } = await supabase
    .from('profiles')
    .update({
      ...(data.name && { name: data.name.trim() }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.location !== undefined && { location: data.location }),
      ...(data.coords !== undefined && { coords: data.coords }),
      ...(data.trade !== undefined && { trade: data.trade }),
      ...(data.sub_trade !== undefined && { sub_trade: data.sub_trade }),
      ...(data.bio !== undefined && { bio: data.bio }),
      ...(data.employer_type !== undefined && { employer_type: data.employer_type }),
    })
    .eq('id', user.id)
    .select()
    .single();

  if (updateError) {
    console.error('Update profile error:', updateError);
    return { success: false, error: 'Failed to update profile' };
  }

  revalidatePath('/dashboard/profile');
  revalidatePath('/dashboard/profile/edit');

  return { success: true, data: profile };
}

/**
 * Get current user's profile
 */
export async function getMyProfile(): Promise<ProfileResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Get profile error:', error);
    return { success: false, error: 'Failed to get profile' };
  }

  return { success: true, data: profile };
}
