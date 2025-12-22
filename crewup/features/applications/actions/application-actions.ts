'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

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
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Check if user is a worker
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'worker') {
      return { success: false, error: 'Only workers can apply to jobs' };
    }

    // Check if already applied
    const { data: existingApp } = await supabase
      .from('applications')
      .select('id')
      .eq('job_id', data.jobId)
      .eq('worker_id', user.id)
      .single();

    if (existingApp) {
      return { success: false, error: 'You have already applied to this job' };
    }

    // Create application
    const { error } = await supabase.from('applications').insert({
      job_id: data.jobId,
      worker_id: user.id,
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
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Check if user is an employer and owns the job
    const { data: application } = await supabase
      .from('applications')
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
      .from('applications')
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
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return false;
    }

    const { data } = await supabase
      .from('applications')
      .select('id')
      .eq('job_id', jobId)
      .eq('worker_id', user.id)
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
    const supabase = await createClient();

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
      .from('applications')
      .select(
        `
        *,
        worker:profiles!worker_id(
          id,
          name,
          trade,
          sub_trade,
          location,
          bio
        )
      `
      )
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching applications:', error);
      return { success: false, error: 'Failed to fetch applications', data: null };
    }

    return { success: true, data: applications };
  } catch (error) {
    console.error('Error in getJobApplications:', error);
    return { success: false, error: 'An unexpected error occurred', data: null };
  }
}
