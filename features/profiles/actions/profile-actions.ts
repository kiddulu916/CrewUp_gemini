'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

export type ProfileUpdateData = {
  name?: string;
  phone?: string | null;
  location?: string;
  coords?: { lat: number; lng: number } | null;
  trade?: string;
  sub_trade?: string | null;
  bio?: string | null;
  employer_type?: string | null;
  company_name?: string | null;
  profile_image_url?: string | null;
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
  const supabase = await createClient(await cookies());

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

  // Handle coords update separately if provided with valid lat/lng
  if (data.coords && typeof data.coords.lat === 'number' && typeof data.coords.lng === 'number') {
    // Use RPC function to update coords with PostGIS
    const { error: coordsError } = await supabase.rpc('update_profile_coords_only', {
      p_user_id: user.id,
      p_lng: data.coords.lng,
      p_lat: data.coords.lat
    });

    if (coordsError) {
      console.error('Coords update error:', coordsError);
      // Continue with other updates even if coords fail
    }
  }

  // Update other profile fields (excluding coords)
  const updateData: any = {};
  if (data.name) updateData.name = data.name.trim();
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.location !== undefined) updateData.location = data.location;
  if (data.trade !== undefined) updateData.trade = data.trade;
  if (data.sub_trade !== undefined) updateData.sub_trade = data.sub_trade;
  if (data.bio !== undefined) updateData.bio = data.bio;
  if (data.employer_type !== undefined) updateData.employer_type = data.employer_type;
  if (data.company_name !== undefined) updateData.company_name = data.company_name;
  if (data.profile_image_url !== undefined) updateData.profile_image_url = data.profile_image_url;

  // Only update if there are fields to update
  if (Object.keys(updateData).length > 0) {
    const { error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', user.id);

    if (updateError) {
      console.error('Update profile error:', updateError);
      return { success: false, error: 'Failed to update profile' };
    }
  }

  // Fetch updated profile
  const { data: profile, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (fetchError) {
    console.error('Fetch profile error:', fetchError);
    return { success: false, error: 'Failed to fetch updated profile' };
  }

  revalidatePath('/dashboard/profile');
  revalidatePath('/dashboard/profile/edit');

  return { success: true, data: profile };
}

/**
 * Get current user's profile
 */
export async function getMyProfile(): Promise<ProfileResult> {
  const supabase = await createClient(await cookies());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data: profile, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Get profile error:', error);
    return { success: false, error: 'Failed to get profile' };
  }

  return { success: true, data: profile };
}
