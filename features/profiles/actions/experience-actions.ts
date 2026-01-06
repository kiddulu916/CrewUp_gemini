'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

export type ExperienceData = {
  job_title: string;
  company: string;
  start_date: string;
  end_date?: string | null;
  is_current?: boolean;
  description?: string;
};

export type ExperienceResult = {
  success: boolean;
  data?: any;
  error?: string;
};

/**
 * Add new work experience
 */
export async function addExperience(data: ExperienceData): Promise<ExperienceResult> {
  const supabase = await createClient(await cookies());

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Validate required fields
  if (!data.job_title || data.job_title.trim().length === 0) {
    return { success: false, error: 'Job title is required' };
  }

  if (!data.company || data.company.trim().length === 0) {
    return { success: false, error: 'Company name is required' };
  }

  if (!data.start_date) {
    return { success: false, error: 'Start date is required' };
  }

  // Validate dates
  if (!data.is_current && !data.end_date) {
    return { success: false, error: 'End date is required if not current position' };
  }

  if (data.end_date && new Date(data.end_date) < new Date(data.start_date)) {
    return { success: false, error: 'End date cannot be before start date' };
  }

  // Insert experience
  const { data: experience, error: insertError } = await supabase
    .from('experiences')
    .insert({
      user_id: user.id,
      job_title: data.job_title.trim(),
      company: data.company.trim(),
      start_date: data.start_date,
      end_date: data.is_current ? null : (data.end_date || null),
      is_current: data.is_current || false,
      description: data.description?.trim() || null,
    })
    .select()
    .single();

  if (insertError) {
    console.error('Add experience error:', insertError);
    // Provide more detailed error messages
    let errorMessage = 'Failed to add work experience';
    if (insertError.code === '23505') {
      errorMessage = 'This work experience already exists in your profile';
    } else if (insertError.message) {
      errorMessage = `Failed to add work experience: ${insertError.message}`;
    }
    return { success: false, error: errorMessage };
  }

  revalidatePath('/dashboard/profile');

  return { success: true, data: experience };
}

/**
 * Delete work experience
 */
export async function deleteExperience(experienceId: string): Promise<ExperienceResult> {
  const supabase = await createClient(await cookies());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Delete only if owned by user
  const { error } = await supabase
    .from('experiences')
    .delete()
    .eq('id', experienceId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Delete experience error:', error);
    return { success: false, error: 'Failed to delete work experience' };
  }

  revalidatePath('/dashboard/profile');

  return { success: true };
}

/**
 * Get user's work experience
 */
export async function getMyExperience(): Promise<ExperienceResult> {
  const supabase = await createClient(await cookies());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('experiences')
    .select('*')
    .eq('user_id', user.id)
    .order('start_date', { ascending: false });

  if (error) {
    console.error('Get experience error:', error);
    return { success: false, error: 'Failed to get work experience' };
  }

  return { success: true, data };
}
