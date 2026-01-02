'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import type { DateRangeValue } from '@/components/admin/date-range-picker';
import type { SegmentValue } from '@/components/admin/segment-filter';
import { buildDateRangeFilter, applySegmentFilters, getComparisonDates, calculatePercentageChange } from '@/lib/analytics/filters';

/**
 * Represents an activity record from database tables (jobs, job_applications, messages)
 */
type ActivityRecord = {
  user_id?: string;
  sender_id?: string;
  created_at: string;
};

/**
 * Result type for active users analytics
 */
export type ActiveUsersResult = {
  dau: number;
  wau: number;
  mau: number;
  comparison: {
    dau: number;
    wau: number;
    mau: number;
    dauChange: number;
    wauChange: number;
    mauChange: number;
  } | null;
};

export async function getUserGrowthData() {
  const supabase = await createClient(await cookies());

  const { data } = await supabase
    .from('profiles')
    .select('created_at')
    .order('created_at', { ascending: true });

  // Group by date
  const grouped = data?.reduce((acc, profile) => {
    const date = new Date(profile.created_at).toISOString().split('T')[0];
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(grouped || {}).map(([date, count]) => ({
    date,
    users: count,
  }));
}

export async function getEngagementMetrics() {
  const supabase = await createClient(await cookies());

  const [{ count: jobs }, { count: apps }, { count: messages }] =
    await Promise.all([
      supabase.from('jobs').select('*', { count: 'exact', head: true }),
      supabase.from('job_applications').select('*', { count: 'exact', head: true }),
      supabase.from('messages').select('*', { count: 'exact', head: true }),
    ]);

  return { jobs, apps, messages };
}

/**
 * Get active users metrics (DAU/WAU/MAU)
 *
 * Calculates Daily Active Users, Weekly Active Users, and Monthly Active Users
 * based on user activity across jobs, applications, and messages.
 *
 * Calculation Logic:
 * - DAU: Unique users who performed any action (job post, application, message) today (00:00 - 23:59)
 * - WAU: Unique users who performed any action in the last 7 days
 * - MAU: Unique users who performed any action in the last 30 days
 *
 * All metrics respect the provided date range and segment filters (role, subscription, location, employer type).
 *
 * @param dateRange - Date range filter with optional comparison period
 * @param segment - User segment filters (role, subscription, location, employer type)
 * @returns Active users metrics with optional comparison to previous period
 * @throws Error if database queries fail or date range is invalid
 */
export async function getActiveUsers(
  dateRange: DateRangeValue,
  segment: SegmentValue = {}
): Promise<ActiveUsersResult> {
  const supabase = await createClient(await cookies());
  const { gte, lte } = buildDateRangeFilter(dateRange);

  // Define activity: user performed any action (job post, application, message, login)
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Get unique user IDs from all activity tables with query limits to prevent memory exhaustion
  const [jobsData, appsData, messagesData] = await Promise.all([
    supabase
      .from('jobs')
      .select('user_id, created_at')
      .gte('created_at', gte)
      .lte('created_at', lte)
      .limit(10000),
    supabase
      .from('job_applications')
      .select('user_id, created_at')
      .gte('created_at', gte)
      .lte('created_at', lte)
      .limit(10000),
    supabase
      .from('messages')
      .select('sender_id, created_at')
      .gte('created_at', gte)
      .lte('created_at', lte)
      .limit(10000),
  ]);

  // Check for database errors
  if (jobsData.error) {
    throw new Error(`Failed to fetch jobs data: ${jobsData.error.message}`);
  }
  if (appsData.error) {
    throw new Error(`Failed to fetch applications data: ${appsData.error.message}`);
  }
  if (messagesData.error) {
    throw new Error(`Failed to fetch messages data: ${messagesData.error.message}`);
  }

  // Combine all user IDs
  const allUserIds = new Set<string>();
  jobsData.data?.forEach((job) => allUserIds.add(job.user_id));
  appsData.data?.forEach((app) => allUserIds.add(app.user_id));
  messagesData.data?.forEach((msg) => allUserIds.add(msg.sender_id));

  // Handle empty result sets
  if (allUserIds.size === 0) {
    return {
      dau: 0,
      wau: 0,
      mau: 0,
      comparison: null,
    };
  }

  // Get user profiles with segment filters
  let profileQuery = supabase
    .from('profiles')
    .select('id, role, subscription_status, location, employer_type, created_at')
    .in('id', Array.from(allUserIds))
    .limit(10000);

  profileQuery = applySegmentFilters(profileQuery, segment);
  const { data: profiles, error: profilesError } = await profileQuery;

  if (profilesError) {
    throw new Error(`Failed to fetch profiles data: ${profilesError.message}`);
  }

  const activeUserIds = new Set(profiles?.map((p) => p.id) || []);

  // Calculate DAU (users active today)
  const todayStart = new Date(today.setHours(0, 0, 0, 0)).toISOString();
  const todayEnd = new Date(today.setHours(23, 59, 59, 999)).toISOString();

  const dauUserIds = new Set<string>();
  [jobsData.data, appsData.data, messagesData.data].forEach((dataset) => {
    dataset?.forEach((item: ActivityRecord) => {
      const createdAt = new Date(item.created_at);
      if (
        createdAt >= new Date(todayStart) &&
        createdAt <= new Date(todayEnd) &&
        activeUserIds.has(item.user_id || item.sender_id || '')
      ) {
        dauUserIds.add(item.user_id || item.sender_id || '');
      }
    });
  });

  const dau = dauUserIds.size;

  // Calculate WAU (users active in last 7 days)
  const wauUserIds = new Set<string>();
  [jobsData.data, appsData.data, messagesData.data].forEach((dataset) => {
    dataset?.forEach((item: ActivityRecord) => {
      const createdAt = new Date(item.created_at);
      if (
        createdAt >= weekAgo &&
        activeUserIds.has(item.user_id || item.sender_id || '')
      ) {
        wauUserIds.add(item.user_id || item.sender_id || '');
      }
    });
  });

  const wau = wauUserIds.size;

  // Calculate MAU (users active in last 30 days)
  const mau = activeUserIds.size;

  // Get comparison period metrics if enabled
  let comparison = null;
  if (dateRange.compareEnabled) {
    const comparisonDates = getComparisonDates(dateRange);
    const comparisonMetrics = await getActiveUsers(
      {
        preset: 'custom',
        startDate: comparisonDates.startDate,
        endDate: comparisonDates.endDate,
        compareEnabled: false,
      },
      segment
    );

    comparison = {
      dau: comparisonMetrics.dau,
      wau: comparisonMetrics.wau,
      mau: comparisonMetrics.mau,
      dauChange: calculatePercentageChange(dau, comparisonMetrics.dau),
      wauChange: calculatePercentageChange(wau, comparisonMetrics.wau),
      mauChange: calculatePercentageChange(mau, comparisonMetrics.mau),
    };
  }

  return {
    dau,
    wau,
    mau,
    comparison,
  };
}

export type ConversionFunnelStage = {
  stage: string;
  count: number;
  percentage: number;
  dropOffRate: number | null;
};

/**
 * Get conversion funnel metrics
 *
 * Calculates user progression through the onboarding funnel across three key stages:
 * 1. Signup - Users who created an account in the date range
 * 2. Profile Complete - Users who filled required profile fields (name, trade, location)
 * 3. First Action - Users who posted a job OR submitted an application
 *
 * Calculation Logic:
 * - Signup Count: All users created within the date range, filtered by segment
 * - Profile Complete: Subset of signups with non-null name, trade, and location
 * - First Action: Subset of profile-complete users who have at least one job or application
 *
 * Metrics per Stage:
 * - count: Number of users who reached this stage
 * - percentage: (count / signupCount) * 100 - percentage of total signups
 * - dropOffRate: Percentage of users from previous stage who didn't progress to current stage
 *   - Signup: null (first stage, no drop-off)
 *   - Profile Complete: ((signupCount - profileCompleteCount) / signupCount) * 100
 *   - First Action: ((profileCompleteCount - firstActionCount) / profileCompleteCount) * 100
 *
 * Security: Requires admin role authorization
 * Performance: Applies 10,000 record limit to prevent memory exhaustion
 *
 * @param dateRange - Date range filter for signup creation dates
 * @param segment - User segment filters (role, subscription, location, employer type)
 * @returns Array of 3 funnel stages with counts, percentages, and drop-off rates
 * @throws Error if user is not authenticated
 * @throws Error if user is not admin
 * @throws Error if database queries fail
 */
export async function getConversionFunnel(
  dateRange: DateRangeValue,
  segment: SegmentValue = {}
): Promise<ConversionFunnelStage[]> {
  const supabase = await createClient(await cookies());

  // Admin authorization check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Unauthorized: User not authenticated');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    throw new Error('Forbidden: Admin access required');
  }

  const { gte, lte } = buildDateRangeFilter(dateRange);

  // Stage 1: Signups (users created in date range)
  let signupQuery = supabase
    .from('profiles')
    .select('id, role, subscription_status, location, employer_type, name, trade, created_at')
    .gte('created_at', gte)
    .lte('created_at', lte)
    .limit(10000);

  signupQuery = applySegmentFilters(signupQuery, segment);
  const { data: signups, error: signupsError } = await signupQuery;

  if (signupsError) {
    throw new Error(`Failed to fetch signups data: ${signupsError.message}`);
  }

  const signupCount = signups?.length || 0;

  // Stage 2: Profile Complete (required fields: name, trade, location)
  const profileComplete = signups?.filter(
    (user) => user.name && user.trade && user.location
  ) || [];
  const profileCompleteCount = profileComplete.length;

  // Stage 3: First Action (posted job OR submitted application)
  const profileCompleteIds = profileComplete.map((u) => u.id);

  let firstActionCount = 0;
  if (profileCompleteIds.length > 0) {
    const [jobsData, appsData] = await Promise.all([
      supabase
        .from('jobs')
        .select('user_id')
        .in('user_id', profileCompleteIds)
        .limit(Math.min(profileCompleteIds.length, 10000)),
      supabase
        .from('job_applications')
        .select('user_id')
        .in('user_id', profileCompleteIds)
        .limit(Math.min(profileCompleteIds.length, 10000)),
    ]);

    if (jobsData.error) {
      throw new Error(`Failed to fetch jobs data: ${jobsData.error.message}`);
    }
    if (appsData.error) {
      throw new Error(`Failed to fetch applications data: ${appsData.error.message}`);
    }

    const firstActionUserIds = new Set<string>();
    jobsData.data?.forEach((job) => firstActionUserIds.add(job.user_id));
    appsData.data?.forEach((app) => firstActionUserIds.add(app.user_id));

    firstActionCount = firstActionUserIds.size;
  }

  // Calculate percentages and drop-off rates
  const stages: ConversionFunnelStage[] = [
    {
      stage: 'Signup',
      count: signupCount,
      percentage: 100,
      dropOffRate: null,
    },
    {
      stage: 'Profile Complete',
      count: profileCompleteCount,
      percentage: signupCount > 0 ? (profileCompleteCount / signupCount) * 100 : 0,
      dropOffRate:
        signupCount > 0
          ? ((signupCount - profileCompleteCount) / signupCount) * 100
          : 0,
    },
    {
      stage: 'First Action',
      count: firstActionCount,
      percentage: signupCount > 0 ? (firstActionCount / signupCount) * 100 : 0,
      dropOffRate:
        profileCompleteCount > 0
          ? ((profileCompleteCount - firstActionCount) / profileCompleteCount) * 100
          : 0,
    },
  ];

  return stages;
}
