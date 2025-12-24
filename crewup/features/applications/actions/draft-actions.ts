'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import type { ApplicationFormData, ApplicationDraft } from '../types/application.types';

type SaveDraftResult = {
  success: boolean;
  error?: string;
  draft?: ApplicationDraft;
};

/**
 * Save or update an application draft
 * Automatically sets expiration to 30 days from now
 * Uses upsert to update existing drafts for the same job+applicant
 */
export async function saveDraft(
  jobId: string,
  formData: Partial<ApplicationFormData>,
  resumeUrl?: string,
  coverLetterUrl?: string,
  resumeExtractedText?: string
): Promise<SaveDraftResult> {
  try {
    const supabase = await createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Calculate expiration date (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const draftData = {
      job_id: jobId,
      applicant_id: user.id,
      form_data: formData,
      resume_url: resumeUrl || null,
      cover_letter_url: coverLetterUrl || null,
      resume_extracted_text: resumeExtractedText || null,
      last_saved_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    };

    // Upsert will create or update based on unique constraint (job_id, applicant_id)
    const { data, error } = await supabase
      .from('application_drafts')
      .upsert(draftData, { onConflict: 'job_id,applicant_id' })
      .select()
      .single();

    if (error) {
      console.error('Error saving draft:', error);
      return { success: false, error: 'Failed to save draft' };
    }

    return { success: true, draft: data };
  } catch (error) {
    console.error('Error in saveDraft:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Load an existing draft for a specific job
 * Returns undefined if no draft exists or if draft has expired
 * Expired drafts are returned as undefined (soft delete)
 */
export async function loadDraft(jobId: string): Promise<SaveDraftResult> {
  try {
    const supabase = await createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('application_drafts')
      .select('*')
      .eq('job_id', jobId)
      .eq('applicant_id', user.id)
      .single();

    if (error) {
      // PGRST116 = no rows returned, which is not an error
      if (error.code === 'PGRST116') {
        return { success: true, draft: undefined };
      }
      console.error('Error loading draft:', error);
      return { success: false, error: 'Failed to load draft' };
    }

    // Check if draft has expired
    if (new Date(data.expires_at) < new Date()) {
      return { success: true, draft: undefined };
    }

    return { success: true, draft: data };
  } catch (error) {
    console.error('Error in loadDraft:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Delete a draft for a specific job
 * Uses RLS to ensure users can only delete their own drafts
 */
export async function deleteDraft(jobId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase
      .from('application_drafts')
      .delete()
      .eq('job_id', jobId)
      .eq('applicant_id', user.id);

    if (error) {
      console.error('Error deleting draft:', error);
      return { success: false, error: 'Failed to delete draft' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in deleteDraft:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
