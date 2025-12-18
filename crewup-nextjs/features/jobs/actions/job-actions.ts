'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export type JobData = {
  title: string;
  trade: string;
  sub_trade?: string;
  job_type: string;
  description: string;
  location: string;
  pay_rate: string;
  pay_min?: number;
  pay_max?: number;
  required_certs?: string[];
};

export type JobResult = {
  success: boolean;
  error?: string;
  jobId?: string;
};

/**
 * Create a new job posting (employers only)
 */
export async function createJob(data: JobData): Promise<JobResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Verify user is an employer
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'employer') {
    return { success: false, error: 'Only employers can post jobs' };
  }

  const { data: job, error: createError } = await supabase
    .from('jobs')
    .insert({
      employer_id: user.id,
      title: data.title,
      trade: data.trade,
      sub_trade: data.sub_trade,
      job_type: data.job_type,
      description: data.description,
      location: data.location,
      pay_rate: data.pay_rate,
      pay_min: data.pay_min,
      pay_max: data.pay_max,
      required_certs: data.required_certs || [],
      status: 'active',
    })
    .select()
    .single();

  if (createError) {
    return { success: false, error: createError.message };
  }

  revalidatePath('/dashboard/jobs');
  redirect(`/dashboard/jobs/${job.id}`);
}

/**
 * Update an existing job
 */
export async function updateJob(jobId: string, data: Partial<JobData>): Promise<JobResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Verify user owns this job
  const { data: job } = await supabase
    .from('jobs')
    .select('employer_id')
    .eq('id', jobId)
    .single();

  if (job?.employer_id !== user.id) {
    return { success: false, error: 'Unauthorized' };
  }

  const { error: updateError } = await supabase
    .from('jobs')
    .update(data)
    .eq('id', jobId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  revalidatePath(`/dashboard/jobs/${jobId}`);
  revalidatePath('/dashboard/jobs');

  return { success: true, jobId };
}

/**
 * Delete a job posting
 */
export async function deleteJob(jobId: string): Promise<JobResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Verify user owns this job
  const { data: job } = await supabase
    .from('jobs')
    .select('employer_id')
    .eq('id', jobId)
    .single();

  if (job?.employer_id !== user.id) {
    return { success: false, error: 'Unauthorized' };
  }

  const { error: deleteError } = await supabase
    .from('jobs')
    .delete()
    .eq('id', jobId);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  revalidatePath('/dashboard/jobs');
  redirect('/dashboard/jobs');
}
