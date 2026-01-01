'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import type { DateRangeValue } from '@/components/admin/date-range-picker';
import type { SegmentValue } from '@/components/admin/segment-filter';
import { buildDateRangeFilter, applySegmentFilters, getComparisonDates, calculatePercentageChange } from '@/lib/analytics/filters';

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
 */
export async function getActiveUsers(
  dateRange: DateRangeValue,
  segment: SegmentValue
) {
  const supabase = await createClient(await cookies());
  const { gte, lte } = buildDateRangeFilter(dateRange);

  // Define activity: user performed any action (job post, application, message, login)
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Get unique user IDs from all activity tables
  const [jobsData, appsData, messagesData] = await Promise.all([
    supabase
      .from('jobs')
      .select('user_id, created_at')
      .gte('created_at', gte)
      .lte('created_at', lte),
    supabase
      .from('job_applications')
      .select('user_id, created_at')
      .gte('created_at', gte)
      .lte('created_at', lte),
    supabase
      .from('messages')
      .select('sender_id, created_at')
      .gte('created_at', gte)
      .lte('created_at', lte),
  ]);

  // Combine all user IDs
  const allUserIds = new Set<string>();
  jobsData.data?.forEach((job) => allUserIds.add(job.user_id));
  appsData.data?.forEach((app) => allUserIds.add(app.user_id));
  messagesData.data?.forEach((msg) => allUserIds.add(msg.sender_id));

  // Get user profiles with segment filters
  let profileQuery = supabase
    .from('profiles')
    .select('id, role, subscription_status, location, employer_type, created_at')
    .in('id', Array.from(allUserIds));

  profileQuery = applySegmentFilters(profileQuery, segment);
  const { data: profiles } = await profileQuery;

  const activeUserIds = new Set(profiles?.map((p) => p.id) || []);

  // Calculate DAU (users active today)
  const todayStart = new Date(today.setHours(0, 0, 0, 0)).toISOString();
  const todayEnd = new Date(today.setHours(23, 59, 59, 999)).toISOString();

  const dauUserIds = new Set<string>();
  [jobsData.data, appsData.data, messagesData.data].forEach((dataset) => {
    dataset?.forEach((item: any) => {
      const createdAt = new Date(item.created_at || item.created_at);
      if (
        createdAt >= new Date(todayStart) &&
        createdAt <= new Date(todayEnd) &&
        activeUserIds.has(item.user_id || item.sender_id)
      ) {
        dauUserIds.add(item.user_id || item.sender_id);
      }
    });
  });

  const dau = dauUserIds.size;

  // Calculate WAU (users active in last 7 days)
  const wauUserIds = new Set<string>();
  [jobsData.data, appsData.data, messagesData.data].forEach((dataset) => {
    dataset?.forEach((item: any) => {
      const createdAt = new Date(item.created_at || item.created_at);
      if (
        createdAt >= weekAgo &&
        activeUserIds.has(item.user_id || item.sender_id)
      ) {
        wauUserIds.add(item.user_id || item.sender_id);
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
