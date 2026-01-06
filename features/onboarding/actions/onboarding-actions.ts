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
    .from('users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  console.log('[onboarding] Check existing profile:', { exists: !!existingProfile, error: checkError });

  // If profile doesn't exist, create it first
  if (!existingProfile) {
    console.log('[onboarding] Profile does not exist, creating it...');
    const [firstName, ...lastNameParts] = data.name.trim().split(' ');
    const lastName = lastNameParts.join(' ') || '';

    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: user.id,
        email: user.email || data.email,
        first_name: firstName,
        last_name: lastName,
        role: data.role,
        subscription_status: 'free',
        location: data.location || 'Update Location',
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

  // 1. Update users table
  const [firstName, ...lastNameParts] = data.name.trim().split(' ');
  const lastName = lastNameParts.join(' ') || '';

  const userUpdate: any = {
    first_name: firstName,
    last_name: lastName,
    phone: data.phone,
    email: data.email,
    role: data.role,
    location: location,
    bio: data.bio || `${data.role === 'worker' ? 'Skilled' : 'Hiring'} ${data.trade} professional`,
    employer_type: data.role === 'employer' ? data.employer_type || null : null,
  };

  const { error: userError } = await supabase
    .from('users')
    .update(userUpdate)
    .eq('id', user.id);

  if (userError) {
    return { success: false, error: userError.message };
  }

  // 2. Update role-specific tables
  if (data.role === 'worker') {
    const { error: workerError } = await supabase
      .from('workers')
      .update({
        trade: data.trade || 'General Laborer',
        sub_trade: data.sub_trade || null,
      })
      .eq('user_id', user.id);

    if (workerError) {
      console.error('[onboarding] Worker table update error:', workerError);
    }
  } else if (data.role === 'employer') {
    if (data.employer_type === 'contractor') {
      const { error: contractorError } = await supabase
        .from('contractors')
        .update({
          company_name: data.company_name || null,
        })
        .eq('user_id', user.id);

      if (contractorError) {
        console.error('[onboarding] Contractor table update error:', contractorError);
      }
    } else if (data.employer_type === 'recruiter') {
      const { error: recruiterError } = await supabase
        .from('recruiters')
        .update({
          company_name: data.company_name || null,
        })
        .eq('user_id', user.id);

      if (recruiterError) {
        console.error('[onboarding] Recruiter table update error:', recruiterError);
      }
    }
  }

  // 3. Handle coords update separately with PostGIS
  // * Use proper RPC function for PostGIS operations
  if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number') {
    const { error: coordsError } = await supabase.rpc('update_user_coords', {
      p_user_id: user.id,
      p_lng: coords.lng,
      p_lat: coords.lat,
    });

    if (coordsError) {
      console.error('Coords update error:', coordsError);
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

    console.log('[onboarding] Contractor license saved');
  }

  // Verify the profile was updated correctly
  const { data: updatedProfile, error: verifyError } = await supabase
    .from('users')
    .select('first_name, last_name, role, location, phone, email')
    .eq('id', user.id)
    .single();

  const profile = updatedProfile ? {
    ...updatedProfile,
    name: `${updatedProfile.first_name} ${updatedProfile.last_name}`.trim()
  } : null;

  console.log('[onboarding-actions] Profile updated successfully');
  console.log('[onboarding-actions] User ID:', user.id);
  console.log('[onboarding-actions] Verify error:', verifyError);
  console.log('[onboarding-actions] Updated profile data:', profile);
  console.log('[onboarding-actions] Checking onboarding completion:');
  console.log('  - Name starts with User-?:', profile?.name?.startsWith('User-'));
  console.log('  - Location is "Update Location"?:', profile?.location === 'Update Location');

  revalidatePath('/', 'layout');
  return { success: true };
}
