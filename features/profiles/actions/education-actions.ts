'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

export type EducationData = {
  institution: string;
  degree?: string;
  field_of_study?: string;
  start_date?: string;
  end_date?: string;
};

export type EducationResult = {
  success: boolean;
  data?: any;
  error?: string;
};

/**
 * Add a new education entry
 */
export async function addEducation(data: EducationData): Promise<EducationResult> {
  const supabase = await createClient(await cookies());

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Validate required fields
  if (!data.institution || data.institution.trim().length === 0) {
    return { success: false, error: 'Institution name is required' };
  }

  // Insert education entry
  const { data: education, error: insertError } = await supabase
    .from('education')
    .insert({
      user_id: user.id,
      institution: data.institution.trim(),
      degree: data.degree?.trim() || null,
      field_of_study: data.field_of_study?.trim() || null,
      start_date: data.start_date || null,
      end_date: data.end_date || null,
    })
    .select()
    .single();

  if (insertError) {
    console.error('Add education error:', insertError);
    return { success: false, error: 'Failed to add education entry' };
  }

  revalidatePath('/dashboard/profile');

  return { success: true, data: education };
}

/**
 * Delete an education entry
 */
export async function deleteEducation(educationId: string): Promise<EducationResult> {
  const supabase = await createClient(await cookies());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Delete only if owned by user
  const { error } = await supabase
    .from('education')
    .delete()
    .eq('id', educationId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Delete education error:', error);
    return { success: false, error: 'Failed to delete education entry' };
  }

  revalidatePath('/dashboard/profile');

  return { success: true };
}

/**
 * Get current user's education entries
 */
export async function getMyEducation(): Promise<EducationResult> {
  const supabase = await createClient(await cookies());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data: education, error } = await supabase
    .from('education')
    .select('*')
    .eq('user_id', user.id)
    .order('end_date', { ascending: false, nullsFirst: false });

  if (error) {
    console.error('Get education error:', error);
    return { success: false, error: 'Failed to get education entries' };
  }

  return { success: true, data: education };
}
