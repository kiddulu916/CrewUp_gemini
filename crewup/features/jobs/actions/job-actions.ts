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
  coords?: { lat: number; lng: number } | null;
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

  // If coords are provided, use the Postgres function for proper PostGIS conversion
  if (data.coords && typeof data.coords.lat === 'number' && typeof data.coords.lng === 'number') {
    const { data: jobId, error: createError } = await supabase.rpc('create_job_with_coords', {
      p_employer_id: user.id,
      p_title: data.title,
      p_trade: data.trade,
      p_job_type: data.job_type,
      p_description: data.description,
      p_location: data.location,
      p_lng: data.coords.lng,
      p_lat: data.coords.lat,
      p_pay_rate: data.pay_rate,
      p_sub_trade: data.sub_trade || null,
      p_pay_min: data.pay_min || null,
      p_pay_max: data.pay_max || null,
      p_required_certs: data.required_certs || null,
    });

    if (createError) {
      return { success: false, error: createError.message };
    }

    revalidatePath('/dashboard/jobs');
    redirect(`/dashboard/jobs/${jobId}`);
  } else {
    // If no coords provided, do regular insert
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

  // Handle coords update if provided
  if (data.coords && typeof data.coords.lat === 'number' && typeof data.coords.lng === 'number') {
    // First update the coords using PostGIS
    const { error: coordsError } = await supabase.rpc('sql', {
      query: `
        UPDATE jobs
        SET coords = ST_SetSRID(ST_MakePoint($1, $2), 4326)
        WHERE id = $3
      `,
      params: [data.coords.lng, data.coords.lat, jobId]
    });

    if (coordsError) {
      // Fallback: try direct update (may not work with geometry)
      console.error('Coords update error:', coordsError);
    }

    // Update other fields (excluding coords)
    const { coords, ...otherData } = data;
    if (Object.keys(otherData).length > 0) {
      const { error: updateError } = await supabase
        .from('jobs')
        .update(otherData)
        .eq('id', jobId);

      if (updateError) {
        return { success: false, error: updateError.message };
      }
    }
  } else {
    // No coords update, just update other fields
    const { coords, ...updateData } = data;
    const { error: updateError } = await supabase
      .from('jobs')
      .update(updateData)
      .eq('id', jobId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }
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

/**
 * Get a single job by ID
 */
export async function getJob(jobId: string): Promise<JobResult & { data?: any }> {
  const supabase = await createClient();

  const { data: job, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (error) {
    console.error('Get job error:', error);
    return { success: false, error: 'Job not found' };
  }

  return { success: true, data: job };
}

/**
 * Get jobs with optional filters
 */
export async function getJobs(filters?: {
  trade?: string;
  subTrade?: string;
  jobType?: string;
  status?: string;
  employerId?: string;
}): Promise<JobResult & { data?: any[] }> {
  const supabase = await createClient();

  let query = supabase
    .from('jobs')
    .select('*')
    .order('created_at', { ascending: false });

  // Apply filters
  if (filters?.trade) {
    query = query.eq('trade', filters.trade);
  }

  if (filters?.subTrade) {
    query = query.eq('sub_trade', filters.subTrade);
  }

  if (filters?.jobType) {
    query = query.eq('job_type', filters.jobType);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  } else {
    // Default to active jobs only
    query = query.eq('status', 'active');
  }

  if (filters?.employerId) {
    query = query.eq('employer_id', filters.employerId);
  }

  const { data: jobs, error } = await query;

  if (error) {
    console.error('Get jobs error:', error);
    return { success: false, error: 'Failed to get jobs' };
  }

  return { success: true, data: jobs || [] };
}
