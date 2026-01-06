// features/profiles/actions/experience-search-actions.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export type WorkerProfile = {
  id: string;
  name: string;
  trade: string;
  sub_trade: string | null;
  location: string;
  coords: any;
  total_experience_years: number;
  subscription_status: string;
  is_profile_boosted: boolean;
};

export type ExperienceSearchResult = {
  success: boolean;
  error?: string;
  workers?: WorkerProfile[];
};

/**
 * Search workers by minimum years of experience (Pro employer feature)
 */
export async function searchWorkersByExperience(
  minYears: number,
  trade?: string | null,
  limit: number = 50
): Promise<ExperienceSearchResult> {
  try {
    const supabase = await createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Check if user is Pro employer
    const { data: profile } = await supabase
      .from('users')
      .select('subscription_status, role')
      .eq('id', user.id)
      .single();

    if (profile?.subscription_status !== 'pro') {
      return { success: false, error: 'Pro subscription required' };
    }

    if (profile?.role !== 'employer') {
      return { success: false, error: 'Only employers can search by experience' };
    }

    // Call the database function
    const { data: workers, error } = await supabase
      .rpc('get_workers_by_experience', {
        p_min_years: minYears,
        p_trade_filter: trade || null,
        p_limit_count: limit,
      });

    if (error) {
      console.error('Error searching workers by experience:', error);
      return { success: false, error: 'Failed to search workers' };
    }

    return { success: true, workers: workers || [] };
  } catch (error) {
    console.error('Error in searchWorkersByExperience:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

/**
 * Get total experience for a worker
 */
export async function getWorkerExperience(
  workerId: string,
  trade?: string | null
): Promise<{ success: boolean; years?: number; error?: string }> {
  try {
    const supabase = await createClient(await cookies());

    // Call the database function
    const { data, error } = await supabase
      .rpc('calculate_total_experience', {
        p_user_id: workerId,
        p_trade_filter: trade || null,
      });

    if (error) {
      console.error('Error calculating experience:', error);
      return { success: false, error: 'Failed to calculate experience' };
    }

    return { success: true, years: data || 0 };
  } catch (error) {
    console.error('Error in getWorkerExperience:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}
