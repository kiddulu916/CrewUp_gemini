'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import * as Sentry from '@sentry/nextjs';
import { ALLOWED_JOB_POSTING_EMPLOYER_TYPES } from '@/lib/constants';

export type TradeSelection = {
  trade: string;
  subTrades: string[];
};

export type CustomQuestion = {
  question: string;
  required: boolean;
};

export type JobData = {
  title: string;
  trades: string[];
  sub_trades?: string[];
  job_type: string;
  description: string;
  location: string;
  coords?: { lat: number; lng: number } | null;
  pay_rate: string;
  pay_min?: number;
  pay_max?: number;
  required_certs?: string[];
  status?: 'active' | 'filled' | 'closed' | 'draft';
  time_length?: string;
  // Extended fields for backward compatibility
  trade?: string;
  sub_trade?: string;
  trade_selections?: TradeSelection[];
  custom_questions?: CustomQuestion[];
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
  try {
    // Set Sentry tags for feature tracking
    Sentry.setTag('feature', 'job-posting');
    Sentry.setTag('action', 'create-job');

    const supabase = await createClient(await cookies());

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

  // Verify user is an employer
  const { data: profile } = await supabase
    .from('users')
    .select('role, subscription_status, employer_type')
    .eq('id', user.id)
    .single();

  // Step 1: Must be an employer role
  if (profile?.role !== 'employer') {
    return { success: false, error: 'Only employers can post jobs' };
  }

  // Step 2: Must be allowed employer type
  if (!profile?.employer_type || !ALLOWED_JOB_POSTING_EMPLOYER_TYPES.includes(profile.employer_type as any)) {
    return {
      success: false,
      error: 'Only contractors and developers can post jobs'
    };
  }

  // If coords are provided, use the Postgres function for proper PostGIS conversion
  if (data.coords && typeof data.coords.lat === 'number' && typeof data.coords.lng === 'number') {
    const { data: jobId, error: createError } = await supabase.rpc('create_job_with_coords', {
      p_employer_id: user.id,
      p_title: data.title,
      p_description: data.description,
      p_location: data.location,
      p_lng: data.coords.lng,
      p_lat: data.coords.lat,
      p_trades: data.trades,
      p_sub_trades: data.sub_trades || [],
      p_job_type: data.job_type,
      p_pay_rate: data.pay_rate,
      p_pay_min: data.pay_min || null,
      p_pay_max: data.pay_max || null,
      p_required_certs: data.required_certs || [],
      p_status: data.status || 'active',
    });

    if (createError) {
      throw createError;
    }

    Sentry.addBreadcrumb({
      message: 'Job created successfully',
      level: 'info',
      data: { jobId },
    });

    revalidatePath('/dashboard/jobs');
    redirect(`/dashboard/jobs/${jobId}`);
  } else {
    // If no coords provided, do regular insert
    const { data: job, error: createError } = await supabase
      .from('jobs')
      .insert({
        employer_id: user.id,
        title: data.title,
        trades: data.trades,
        sub_trades: data.sub_trades || [],
        job_type: data.job_type,
        description: data.description,
        location: data.location,
        pay_rate: data.pay_rate,
        pay_min: data.pay_min,
        pay_max: data.pay_max,
        required_certs: data.required_certs || [],
        status: data.status || 'active',
      })
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    Sentry.addBreadcrumb({
      message: 'Job created successfully',
      level: 'info',
      data: { jobId: job.id },
    });

    revalidatePath('/dashboard/jobs');
    redirect(`/dashboard/jobs/${job.id}`);
  }
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        feature: 'job-posting',
        action: 'create-job',
      },
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create job'
    };
  }
}

/**
 * Update an existing job
 */
export async function updateJob(jobId: string, data: Partial<JobData>): Promise<JobResult> {
  const supabase = await createClient(await cookies());

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
  // * Use proper RPC function for PostGIS operations
  if (data.coords && typeof data.coords.lat === 'number' && typeof data.coords.lng === 'number') {
    const { error: coordsError } = await supabase.rpc('update_job_coords', {
      p_job_id: jobId,
      p_lng: data.coords.lng,
      p_lat: data.coords.lat,
    });

    if (coordsError) {
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
  const supabase = await createClient(await cookies());

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
  const supabase = await createClient(await cookies());

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
  minPay?: number;
}): Promise<JobResult & { data?: any[] }> {
  const supabase = await createClient(await cookies());

  let query = supabase
    .from('jobs')
    .select('*')
    .order('created_at', { ascending: false });

  // Apply filters
  if (filters?.trade) {
    query = query.contains('trades', [filters.trade]);
  }

  if (filters?.subTrade) {
    query = query.contains('sub_trades', [filters.subTrade]);
  }

  if (filters?.jobType) {
    query = query.eq('job_type', filters.jobType);
  }

  if (filters?.minPay) {
    query = query.gte('pay_min', filters.minPay);
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
