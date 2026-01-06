'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import type { ProfileWithRelations } from '@/lib/types/profile.types';

export type ProfileDataResult = {
  success: boolean;
  data?: ProfileWithRelations;
  error?: string;
};

/**
 * Load worker's profile data with all related tables for application auto-fill
 */
export async function loadProfileDataForApplication(): Promise<ProfileDataResult> {
  const supabase = await createClient(await cookies());

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    // Load profile
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .select(`
        *,
        workers(trade, sub_trade, years_of_experience),
        contractors(company_name)
      `)
      .eq('id', user.id)
      .single();

    if (profileError) {
      return { success: false, error: 'Failed to load profile' };
    }

    const profile = {
      ...profileData,
      name: `${profileData.first_name} ${profileData.last_name}`.trim(),
      trade: profileData.workers?.[0]?.trade,
      sub_trade: profileData.workers?.[0]?.sub_trade,
      company_name: profileData.contractors?.[0]?.company_name,
    };

    // Load work experience
    const { data: workExperienceData = [] } = await supabase
      .from('experiences')
      .select('*')
      .eq('user_id', user.id)
      .order('start_date', { ascending: false });

    const workExperience = (workExperienceData || []).map(exp => ({
      ...exp,
      company_name: exp.company, // Map for backward compatibility
    }));

    // Load education
    const { data: educationData = [] } = await supabase
      .from('education')
      .select('*')
      .eq('user_id', user.id)
      .order('end_date', { ascending: false, nullsFirst: false });

    const education = (educationData || []).map(edu => ({
      ...edu,
      institution_name: edu.institution,
      degree_type: edu.degree,
      graduation_year: edu.end_date ? new Date(edu.end_date).getFullYear() : null,
    }));

    // Load professional references
    const { data: professionalReferences = [] } = await supabase
      .from('professional_references')
      .select('*')
      .eq('user_id', user.id);

    // Load certifications
    const { data: certificationsData = [] } = await supabase
      .from('certifications')
      .select('*')
      .eq('worker_id', user.id)
      .order('created_at', { ascending: false });

    const certifications = (certificationsData || []).map(c => ({
      ...c,
      certification_type: c.name,
      is_verified: c.verification_status === 'verified',
    }));

    return {
      success: true,
      data: {
        profile,
        workExperience: workExperience || [],
        education: education || [],
        professionalReferences: professionalReferences || [],
        certifications: certifications || [],
      },
    };
  } catch (error) {
    console.error('Error loading profile data:', error);
    return { success: false, error: 'Failed to load profile data' };
  }
}
