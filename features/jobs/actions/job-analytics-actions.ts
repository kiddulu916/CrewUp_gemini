// features/jobs/actions/job-analytics-actions.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export type JobAnalytics = {
  totalViews: number;
  uniqueViews: number;
  applicationCount: number;
  conversionRate: number;
  viewsByDate: Array<{
    date: string;
    views: number;
    uniqueViews: number;
  }>;
};

export type AnalyticsResult = {
  success: boolean;
  error?: string;
  analytics?: JobAnalytics;
};

/**
 * Track a job view with session deduplication
 */
export async function trackJobView(
  jobId: string,
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();

    // Check if this session already viewed this job
    const { data: existing } = await supabase
      .from('job_views')
      .select('id')
      .eq('job_id', jobId)
      .eq('session_id', sessionId)
      .single();

    if (existing) {
      return { success: true }; // Already tracked, skip
    }

    // Insert new view
    const { error } = await supabase
      .from('job_views')
      .insert({
        job_id: jobId,
        viewer_id: user?.id || null,
        session_id: sessionId,
      });

    if (error) {
      console.error('Error tracking job view:', error);
      return { success: false, error: 'Failed to track view' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in trackJobView:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

/**
 * Get job analytics (Pro employer feature)
 */
export async function getJobAnalytics(
  jobId: string,
  dateRange: 'week' | 'month' | 'all' = 'month'
): Promise<AnalyticsResult> {
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
      return { success: false, error: 'Only employers can view analytics' };
    }

    // Verify user owns the job
    const { data: job } = await supabase
      .from('jobs')
      .select('employer_id, application_count')
      .eq('id', jobId)
      .single();

    if (!job || job.employer_id !== user.id) {
      return { success: false, error: 'Unauthorized' };
    }

    // Calculate date filter
    let dateFilter: string | null = null;
    if (dateRange === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      dateFilter = weekAgo.toISOString();
    } else if (dateRange === 'month') {
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);
      dateFilter = monthAgo.toISOString();
    }

    // Get all views for this job
    let query = supabase
      .from('job_views')
      .select('viewed_at, session_id, viewer_id')
      .eq('job_id', jobId)
      .order('viewed_at', { ascending: true });

    if (dateFilter) {
      query = query.gte('viewed_at', dateFilter);
    }

    const { data: views, error } = await query;

    if (error) {
      console.error('Error fetching job views:', error);
      return { success: false, error: 'Failed to fetch analytics' };
    }

    if (!views) {
      return {
        success: true,
        analytics: {
          totalViews: 0,
          uniqueViews: 0,
          applicationCount: job.application_count || 0,
          conversionRate: 0,
          viewsByDate: [],
        },
      };
    }

    // Calculate metrics
    const totalViews = views.length;
    const uniqueSessions = new Set(views.map((v) => v.session_id)).size;
    const applicationCount = job.application_count || 0;
    const conversionRate = uniqueSessions > 0
      ? (applicationCount / uniqueSessions) * 100
      : 0;

    // Group views by date
    const viewsByDateMap = new Map<string, { total: number; unique: Set<string> }>();

    views.forEach((view) => {
      const date = new Date(view.viewed_at).toISOString().split('T')[0];
      if (!viewsByDateMap.has(date)) {
        viewsByDateMap.set(date, { total: 0, unique: new Set() });
      }
      const dayData = viewsByDateMap.get(date)!;
      dayData.total++;
      dayData.unique.add(view.session_id);
    });

    // Convert to array
    const viewsByDate = Array.from(viewsByDateMap.entries())
      .map(([date, data]) => ({
        date,
        views: data.total,
        uniqueViews: data.unique.size,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      success: true,
      analytics: {
        totalViews,
        uniqueViews: uniqueSessions,
        applicationCount,
        conversionRate: Math.round(conversionRate * 10) / 10, // Round to 1 decimal
        viewsByDate,
      },
    };
  } catch (error) {
    console.error('Error in getJobAnalytics:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}
