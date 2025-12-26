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
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return { success: false, error: 'Failed to load profile' };
    }

    // Load work experience
    const { data: workExperience = [] } = await supabase
      .from('work_experience')
      .select('*')
      .eq('user_id', user.id)
      .order('start_date', { ascending: false });

    // Load education
    const { data: education = [] } = await supabase
      .from('education')
      .select('*')
      .eq('user_id', user.id)
      .order('graduation_year', { ascending: false });

    // Load professional references
    const { data: professionalReferences = [] } = await supabase
      .from('professional_references')
      .select('*')
      .eq('user_id', user.id);

    // Load certifications
    const { data: certifications = [] } = await supabase
      .from('certifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

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
