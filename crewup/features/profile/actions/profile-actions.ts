'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export type ProfileUpdateData = {
  name: string;
  trade: string;
  sub_trade?: string;
  location: string;
  coords?: { lat: number; lng: number } | null;
  phone?: string;
  bio?: string;
  employer_type?: 'contractor' | 'recruiter';
};

export type ProfileResult = {
  success: boolean;
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

  // Get current profile to check role
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  // If coords are provided, use the Postgres function for proper PostGIS conversion
  if (data.coords && typeof data.coords.lat === 'number' && typeof data.coords.lng === 'number') {
    const { error: updateError } = await supabase.rpc('update_profile_coords', {
      p_user_id: user.id,
      p_name: data.name,
      p_role: currentProfile?.role || 'worker',
      p_trade: data.trade,
      p_location: data.location,
      p_lng: data.coords.lng,
      p_lat: data.coords.lat,
      p_bio: data.bio || null,
      p_sub_trade: data.sub_trade || null,
      p_employer_type: currentProfile?.role === 'employer' ? data.employer_type || null : null,
    });

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Update phone separately if provided (not in RPC function)
    if (data.phone) {
      const { error: phoneError } = await supabase
        .from('profiles')
        .update({ phone: data.phone })
        .eq('id', user.id);

      if (phoneError) {
        return { success: false, error: phoneError.message };
      }
    }
  } else {
    // If no coords provided, do a regular update without coords
    const updateData: any = {
      name: data.name,
      trade: data.trade,
      location: data.location,
      bio: data.bio,
    };

    // Only include phone if provided
    if (data.phone) {
      updateData.phone = data.phone;
    }

    // Only set sub_trade if provided
    if (data.sub_trade) {
      updateData.sub_trade = data.sub_trade;
    }

    // Only set employer_type for employers
    if (currentProfile?.role === 'employer' && data.employer_type) {
      updateData.employer_type = data.employer_type;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }
  }

  revalidatePath('/dashboard/profile');
  return { success: true };
}
