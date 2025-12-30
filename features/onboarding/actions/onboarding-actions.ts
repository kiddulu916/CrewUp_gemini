'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { addCertification } from '@/features/profiles/actions/certification-actions';

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
  licenseData?: {
    license_type: string;
    license_number: string;
    issuing_authority: string;
    issuing_state: string;
    issue_date: string;
    expires_at: string;
    photo_url: string;
  };
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

  // Check if profile exists
  const { data: existingProfile, error: checkError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  console.log('[onboarding] Check existing profile:', { exists: !!existingProfile, error: checkError });

  // If profile doesn't exist, create it first
  if (!existingProfile) {
    console.log('[onboarding] Profile does not exist, creating it...');
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email || data.email,
        name: data.name,
        role: data.role,
        subscription_status: 'free',
        trade: data.trade || 'General Laborer',
        location: data.location || 'Update your location',
        bio: data.bio || `${data.role === 'worker' ? 'Skilled' : 'Hiring'} professional`,
        phone: data.phone,
      });

    if (insertError) {
      console.error('[onboarding] Error creating profile:', insertError);
      return { success: false, error: `Failed to create profile: ${insertError.message}` };
    }
    console.log('[onboarding] Profile created successfully');
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

  // If contractor, create license certification and set can_post_jobs to false
  if (data.employer_type === 'contractor' && data.licenseData) {
    // Save license as certification
    const certResult = await addCertification({
      credential_category: 'license',
      certification_type: data.licenseData.license_type,
      certification_number: data.licenseData.license_number,
      issued_by: data.licenseData.issuing_authority,
      issuing_state: data.licenseData.issuing_state,
      issue_date: data.licenseData.issue_date,
      expires_at: data.licenseData.expires_at,
      photo_url: data.licenseData.photo_url,
    });

    if (!certResult.success) {
      return { success: false, error: certResult.error || 'Failed to save license' };
    }

    // Set can_post_jobs to false until license verified
    const { error: postJobsError } = await supabase
      .from('profiles')
      .update({ can_post_jobs: false })
      .eq('id', user.id);

    if (postJobsError) {
      console.error('[onboarding] Error setting can_post_jobs:', postJobsError);
      return { success: false, error: 'Failed to update job posting permissions' };
    }

    console.log('[onboarding] Contractor license saved, can_post_jobs set to false');
  }

  // Verify the profile was updated correctly
  const { data: updatedProfile, error: verifyError } = await supabase
    .from('profiles')
    .select('name, role, trade, location, phone, email')
    .eq('id', user.id)
    .single();

  console.log('[onboarding-actions] Profile updated successfully');
  console.log('[onboarding-actions] User ID:', user.id);
  console.log('[onboarding-actions] Verify error:', verifyError);
  console.log('[onboarding-actions] Updated profile data:', updatedProfile);
  console.log('[onboarding-actions] Checking onboarding completion:');
  console.log('  - Name starts with User-?:', updatedProfile?.name?.startsWith('User-'));
  console.log('  - Location is "Update your location"?:', updatedProfile?.location === 'Update your location');
  console.log('  - Trade is "General Laborer"?:', updatedProfile?.trade === 'General Laborer');

  revalidatePath('/', 'layout');
  return { success: true };
}
