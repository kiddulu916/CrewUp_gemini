'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

export type OnboardingData = {
  name: string;
  phone: string;
  email: string;
  role: 'worker' | 'employer';
  employer_type?: 'contractor' | 'recruiter';
  company_name?: string; // Business name for employers
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
  const supabase = await createClient(await cookies());

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Set default location if not provided
  const location = data.location || 'United States';
  const coords = data.coords;

  // If coords are provided, use the Postgres function for proper PostGIS conversion
  if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number') {
    // First, update the profile with coords using the RPC function
    const { error: coordsError } = await supabase.rpc('update_profile_coords', {
      p_user_id: user.id,
      p_name: data.name,
      p_phone: data.phone,
      p_email: data.email,
      p_role: data.role,
      p_trade: data.trade,
      p_location: location,
      p_lng: coords.lng,
      p_lat: coords.lat,
      p_bio: data.bio || `${data.role === 'worker' ? 'Skilled' : 'Hiring'} ${data.trade} professional`,
      p_sub_trade: data.sub_trade || null,
      p_employer_type: data.role === 'employer' ? data.employer_type || null : null,
    });

    if (coordsError) {
      return { success: false, error: coordsError.message };
    }

    // Then update company_name separately (not in the RPC function)
    if (data.role === 'employer' && data.company_name) {
      const { error: companyError } = await supabase
        .from('profiles')
        .update({ company_name: data.company_name })
        .eq('id', user.id);

      if (companyError) {
        return { success: false, error: companyError.message };
      }
    }
  } else {
    // If no coords provided, do a regular update without coords
    const updateData: any = {
      name: data.name,
      phone: data.phone,
      email: data.email,
      role: data.role,
      trade: data.trade,
      location: location,
      bio: data.bio || `${data.role === 'worker' ? 'Skilled' : 'Hiring'} ${data.trade} professional`,
    };

    // Only set employer_type for employers
    if (data.role === 'employer' && data.employer_type) {
      updateData.employer_type = data.employer_type;
    } else {
      updateData.employer_type = null;
    }

    // Only set company_name for employers
    if (data.role === 'employer' && data.company_name) {
      updateData.company_name = data.company_name;
    } else {
      updateData.company_name = null;
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

  console.log('[onboarding-actions] Profile updated successfully, returning success');
  revalidatePath('/', 'layout');
  return { success: true };
}
