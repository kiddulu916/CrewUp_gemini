'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { moveFileToApplication } from './file-upload-actions';
import { deleteDraft } from './draft-actions';
import { saveApplicationDataToProfile } from './save-to-profile-actions';
import type { ApplicationFormData } from '../types/application.types';

type ApplicationResult = {
  success: boolean;
  error?: string;
};

type CreateApplicationData = {
  jobId: string;
  coverLetter?: string;
};

/**
 * Submit a job application
 */
export async function createApplication(
  data: CreateApplicationData
): Promise<ApplicationResult> {
  try {
    const supabase = await createClient(await cookies());

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Check if user is a worker
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'worker') {
      return { success: false, error: 'Only workers can apply to jobs' };
    }

    // Check if already applied
    const { data: existingApp } = await supabase
      .from('job_applications')
      .select('id')
      .eq('job_id', data.jobId)
      .eq('applicant_id', user.id)
      .single();

    if (existingApp) {
      return { success: false, error: 'You have already applied to this job' };
    }

    // Create application
    const { error } = await supabase.from('job_applications').insert({
      job_id: data.jobId,
      applicant_id: user.id,
      cover_letter: data.coverLetter || null,
      status: 'pending',
    });

    if (error) {
      console.error('Error creating application:', error);
      return { success: false, error: 'Failed to submit application' };
    }

    revalidatePath('/dashboard/applications');
    revalidatePath('/dashboard/jobs');

    return { success: true };
  } catch (error) {
    console.error('Error in createApplication:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Update application status (for employers)
 */
export async function updateApplicationStatus(
  applicationId: string,
  status: 'pending' | 'viewed' | 'hired' | 'rejected'
): Promise<ApplicationResult> {
  try {
    const supabase = await createClient(await cookies());

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Check if user is an employer and owns the job
    const { data: application } = await supabase
      .from('job_applications')
      .select('id, job_id')
      .eq('id', applicationId)
      .single();

    if (!application) {
      return { success: false, error: 'Application not found' };
    }

    // Verify the job belongs to the user
    const { data: job } = await supabase
      .from('jobs')
      .select('employer_id')
      .eq('id', application.job_id)
      .single();

    if (!job || job.employer_id !== user.id) {
      return { success: false, error: 'You can only update applications to your jobs' };
    }

    // Update status
    const { error } = await supabase
      .from('job_applications')
      .update({ status })
      .eq('id', applicationId);

    if (error) {
      console.error('Error updating application:', error);
      return { success: false, error: 'Failed to update application status' };
    }

    revalidatePath('/dashboard/applications');

    return { success: true };
  } catch (error) {
    console.error('Error in updateApplicationStatus:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Check if user has applied to a job
 */
export async function hasApplied(jobId: string): Promise<boolean> {
  try {
    const supabase = await createClient(await cookies());

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return false;
    }

    const { data } = await supabase
      .from('job_applications')
      .select('id')
      .eq('job_id', jobId)
      .eq('applicant_id', user.id)
      .single();

    return !!data;
  } catch (error) {
    return false;
  }
}

/**
 * Get applications for a specific job (for employers)
 */
export async function getJobApplications(jobId: string) {
  try {
    const supabase = await createClient(await cookies());

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated', data: null };
    }

    // Verify user owns the job
    const { data: job } = await supabase
      .from('jobs')
      .select('employer_id')
      .eq('id', jobId)
      .single();

    if (!job || job.employer_id !== user.id) {
      return { success: false, error: 'Unauthorized', data: null };
    }

    const { data: applications, error } = await supabase
      .from('job_applications')
      .select(
        `
        *,
        applicant:users!applicant_id(
          id,
          name,
          trade,
          sub_trade,
          location,
          bio,
          is_profile_boosted,
          boost_expires_at
        )
      `
      )
      .eq('job_id', jobId)
      .order('created_at', { ascending: false});

    if (error) {
      console.error('Error fetching applications:', error);
      return { success: false, error: 'Failed to fetch applications', data: null };
    }

    // Sort applications: boosted profiles first, then by creation date
    const sortedApplications = applications?.sort((a, b) => {
      // Check if boosts are active (not expired)
      const aIsBoosted = a.worker?.is_profile_boosted &&
        a.worker?.boost_expires_at &&
        new Date(a.worker.boost_expires_at) > new Date();
      const bIsBoosted = b.worker?.is_profile_boosted &&
        b.worker?.boost_expires_at &&
        new Date(b.worker.boost_expires_at) > new Date();

      // Boosted profiles come first
      if (aIsBoosted && !bIsBoosted) return -1;
      if (!aIsBoosted && bIsBoosted) return 1;

      // If both have same boost status, sort by created_at (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return { success: true, data: sortedApplications };
  } catch (error) {
    console.error('Error in getJobApplications:', error);
    return { success: false, error: 'An unexpected error occurred', data: null };
  }
}

/**
 * Submit comprehensive job application from wizard
 * Moves files from draft to application storage and creates final application
 */
export async function submitApplication(
  jobId: string,
  formData: ApplicationFormData,
  resumeUrl?: string,
  coverLetterUrl?: string,
  resumeExtractedText?: string
): Promise<{ success: boolean; error?: string; applicationId?: string }> {
  try {
    const supabase = await createClient(await cookies());

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Check if user is a worker
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'worker') {
      return { success: false, error: 'Only workers can apply to jobs' };
    }

    // Check if already applied
    const { data: existingApp } = await supabase
      .from('job_applications')
      .select('id')
      .eq('job_id', jobId)
      .eq('applicant_id', user.id)
      .single();

    if (existingApp) {
      return { success: false, error: 'You have already applied to this job' };
    }

    // Extract custom answers if present (not part of ApplicationFormData type)
    const customAnswers = (formData as any).customAnswers || null;

    // Create the application
    const { data: application, error: createError } = await supabase
      .from('job_applications')
      .insert({
        job_id: jobId,
        applicant_id: user.id,
        status: 'pending',
        form_data: formData,
        custom_answers: customAnswers,
        resume_extracted_text: resumeExtractedText || null,
      })
      .select('id')
      .single();

    if (createError || !application) {
      console.error('Error creating application:', createError);
      return { success: false, error: 'Failed to submit application' };
    }

    const applicationId = application.id;

    // Move files from draft storage to application storage
    let finalResumeUrl = resumeUrl;
    let finalCoverLetterUrl = coverLetterUrl;

    if (resumeUrl && resumeUrl.includes('application-drafts')) {
      // Extract the file path from the URL
      const urlParts = resumeUrl.split('/application-drafts/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        const moveResult = await moveFileToApplication(
          filePath,
          applicationId,
          'resume.' + filePath.split('.').pop()
        );
        if (moveResult.success && moveResult.url) {
          finalResumeUrl = moveResult.url;
        }
      }
    }

    if (coverLetterUrl && coverLetterUrl.includes('application-drafts')) {
      const urlParts = coverLetterUrl.split('/application-drafts/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        const moveResult = await moveFileToApplication(
          filePath,
          applicationId,
          'cover-letter.' + filePath.split('.').pop()
        );
        if (moveResult.success && moveResult.url) {
          finalCoverLetterUrl = moveResult.url;
        }
      }
    }

    // Update application with final file URLs
    if (finalResumeUrl || finalCoverLetterUrl) {
      await supabase
        .from('job_applications')
        .update({
          resume_url: finalResumeUrl || null,
          cover_letter_url: finalCoverLetterUrl || null,
        })
        .eq('id', applicationId);
    }

    // Save application data back to profile (for future auto-fill)
    await saveApplicationDataToProfile(formData);

    // Delete the draft
    await deleteDraft(jobId);

    // Revalidate paths
    revalidatePath('/dashboard/applications');
    revalidatePath('/dashboard/jobs');
    revalidatePath(`/dashboard/jobs/${jobId}`);

    return { success: true, applicationId };
  } catch (error) {
    console.error('Error in submitApplication:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
