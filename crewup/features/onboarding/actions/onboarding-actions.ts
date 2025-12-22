'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export type OnboardingData = {
  name: string;
  role: 'worker' | 'employer';
  employer_type?: 'contractor' | 'recruiter';
  trade: string;
  sub_trade?: string;
  location: string;
  coords?: { lat: number; lng: number } | null;
  bio?: string;
};

export type OnboardingResult = {
  success: boolean;
  error?: string;
};

/**
 * Complete user onboarding and update profile
 */
export async function completeOnboarding(data: OnboardingData): Promise<OnboardingResult> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // If coords are provided, use the Postgres function for proper PostGIS conversion
  if (data.coords && typeof data.coords.lat === 'number' && typeof data.coords.lng === 'number') {
    const { error: updateError } = await supabase.rpc('update_profile_coords', {
      p_user_id: user.id,
      p_name: data.name,
      p_role: data.role,
      p_trade: data.trade,
      p_location: data.location,
      p_lng: data.coords.lng,
      p_lat: data.coords.lat,
      p_bio: data.bio || `${data.role === 'worker' ? 'Skilled' : 'Hiring'} ${data.trade} professional`,
      p_sub_trade: data.sub_trade || null,
      p_employer_type: data.role === 'employer' ? data.employer_type || null : null,
    });

    if (updateError) {
      return { success: false, error: updateError.message };
    }
  } else {
    // If no coords provided, do a regular update without coords
    const updateData: any = {
      name: data.name,
      role: data.role,
      trade: data.trade,
      location: data.location,
      bio: data.bio || `${data.role === 'worker' ? 'Skilled' : 'Hiring'} ${data.trade} professional`,
    };

    // Only set employer_type for employers
    if (data.role === 'employer' && data.employer_type) {
      updateData.employer_type = data.employer_type;
    } else {
      updateData.employer_type = null;
    }

    // Only set sub_trade if provided
    if (data.sub_trade) {
      updateData.sub_trade = data.sub_trade;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard/feed');
}
