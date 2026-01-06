'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

export type ApplicationResult = {
  success: boolean;
  error?: string;
};

/**
 * Apply to a job as a worker
 */
export async function applyToJob(
  jobId: string,
  coverLetter?: string
): Promise<ApplicationResult> {
  const supabase = await createClient(await cookies());

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Verify user is a worker
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'worker') {
    return { success: false, error: 'Only workers can apply to jobs' };
  }

  // Verify job exists and is active
  const { data: job } = await supabase
    .from('jobs')
    .select('id, status')
    .eq('id', jobId)
    .single();

  if (!job) {
    return { success: false, error: 'Job not found' };
  }

  if (job.status !== 'active') {
    return { success: false, error: 'This job is no longer accepting applications' };
  }

  // Check if already applied
  const { data: existingApplication } = await supabase
    .from('job_applications')
    .select('id')
    .eq('job_id', jobId)
    .eq('applicant_id', user.id)
    .single();

  if (existingApplication) {
    return { success: false, error: 'You have already applied to this job' };
  }

  // Create application
  const { error: insertError } = await supabase.from('job_applications').insert({
    job_id: jobId,
    applicant_id: user.id,
    cover_letter: coverLetter || null,
    status: 'pending',
  });

  if (insertError) {
    console.error('Application error:', insertError);
    return { success: false, error: 'Failed to submit application' };
  }

  revalidatePath(`/dashboard/jobs/${jobId}`);
  revalidatePath('/dashboard/applications');

  return { success: true };
}

/**
 * Withdraw an application
 */
export async function withdrawApplication(applicationId: string): Promise<ApplicationResult> {
  const supabase = await createClient(await cookies());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Verify ownership
  const { data: application } = await supabase
    .from('job_applications')
    .select('applicant_id, job_id')
    .eq('id', applicationId)
    .single();

  if (!application || application.applicant_id !== user.id) {
    return { success: false, error: 'Application not found' };
  }

  const { error } = await supabase.from('job_applications').delete().eq('id', applicationId);

  if (error) {
    return { success: false, error: 'Failed to withdraw application' };
  }

  revalidatePath(`/dashboard/jobs/${application.job_id}`);
  revalidatePath('/dashboard/applications');

  return { success: true };
}

/**
 * Update application status (employer only)
 */
export async function updateApplicationStatus(
  applicationId: string,
  status: 'pending' | 'viewed' | 'contacted' | 'rejected' | 'hired'
): Promise<ApplicationResult> {
  const supabase = await createClient(await cookies());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Verify user is employer and owns the job
  const { data: application } = await supabase
    .from('job_applications')
    .select(
      `
      id,
      job_id,
      jobs!inner(employer_id)
    `
    )
    .eq('id', applicationId)
    .single();

  if (!application) {
    return { success: false, error: 'Application not found' };
  }

  // @ts-ignore - Supabase types can be tricky with nested selects
  if (application.jobs.employer_id !== user.id) {
    return { success: false, error: 'Not authorized' };
  }

  const { error } = await supabase
    .from('job_applications')
    .update({ status })
    .eq('id', applicationId);

  if (error) {
    return { success: false, error: 'Failed to update application status' };
  }

  revalidatePath(`/dashboard/jobs/${application.job_id}`);
  revalidatePath('/dashboard/applications');

  return { success: true };
}
