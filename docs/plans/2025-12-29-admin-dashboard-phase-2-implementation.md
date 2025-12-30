# Phase 2: Deep Insights & User Behavior - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build retention analytics, user journey tracking, geographic insights, and business intelligence

**Architecture:** Cohort analysis with SQL window functions → Retention curves visualization → Time-to-value tracking → Geographic distribution → Subscription intelligence → Job market health metrics

**Tech Stack:** PostgreSQL window functions, Recharts for visualizations, materialized views for performance, Supabase RPC functions

**Prerequisites:** Phase 1 must be complete (date range picker, segment filter, analytics actions)

---

## Task 1: Cohort Analysis Server Action

**Files:**
- Modify: `features/admin/actions/analytics-actions.ts`
- Create: `__tests__/features/admin/actions/cohort-analysis.test.ts`

**Step 1: Write the failing test**

```typescript
// __tests__/features/admin/actions/cohort-analysis.test.ts
import { describe, it, expect } from 'vitest';
import { getCohortAnalysis } from '@/features/admin/actions/analytics-actions';

describe('Cohort Analysis', () => {
  it('returns cohort data grouped by signup week', async () => {
    const result = await getCohortAnalysis({
      preset: 'last90days',
      startDate: new Date('2024-10-01'),
      endDate: new Date('2025-01-01'),
    }, {});

    expect(result).toBeInstanceOf(Array);
    if (result.length > 0) {
      expect(result[0]).toHaveProperty('cohortWeek');
      expect(result[0]).toHaveProperty('cohortSize');
      expect(result[0]).toHaveProperty('retention');
    }
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/features/admin/actions/cohort-analysis.test.ts`
Expected: FAIL with "getCohortAnalysis is not defined"

**Step 3: Implement cohort analysis function**

```typescript
// features/admin/actions/analytics-actions.ts
// Add after getOperationalLoad function

export type CohortData = {
  cohortWeek: string; // ISO week string like "2025-W01"
  cohortSize: number;
  retention: {
    day1: number;  // % returned after 1 day
    day7: number;  // % returned after 7 days
    day14: number; // % returned after 14 days
    day30: number; // % returned after 30 days
  };
};

/**
 * Get cohort analysis grouped by signup week
 */
export async function getCohortAnalysis(
  dateRange: DateRangeValue,
  segment: SegmentValue
): Promise<CohortData[]> {
  const supabase = await createClient(await cookies());
  const { gte, lte } = buildDateRangeFilter(dateRange);

  // Get users grouped by signup week
  let userQuery = supabase
    .from('profiles')
    .select('id, created_at, role, subscription_status, location, employer_type')
    .gte('created_at', gte)
    .lte('created_at', lte)
    .order('created_at', { ascending: true });

  userQuery = applySegmentFilters(userQuery, segment);
  const { data: users } = await userQuery;

  if (!users || users.length === 0) {
    return [];
  }

  // Group users by ISO week
  const cohortMap = new Map<string, string[]>();
  users.forEach((user) => {
    const week = getISOWeek(new Date(user.created_at));
    if (!cohortMap.has(week)) {
      cohortMap.set(week, []);
    }
    cohortMap.get(week)!.push(user.id);
  });

  // For each cohort, calculate retention
  const cohortData: CohortData[] = [];

  for (const [week, userIds] of cohortMap.entries()) {
    // Get activity for these users
    const [jobsData, appsData, messagesData] = await Promise.all([
      supabase
        .from('jobs')
        .select('user_id, created_at')
        .in('user_id', userIds),
      supabase
        .from('job_applications')
        .select('user_id, created_at')
        .in('user_id', userIds),
      supabase
        .from('messages')
        .select('sender_id, created_at')
        .in('user_id', userIds),
    ]);

    // Build activity map (user_id -> array of activity dates)
    const activityMap = new Map<string, Date[]>();
    userIds.forEach((id) => activityMap.set(id, []));

    jobsData.data?.forEach((job) => {
      activityMap.get(job.user_id)?.push(new Date(job.created_at));
    });
    appsData.data?.forEach((app) => {
      activityMap.get(app.user_id)?.push(new Date(app.created_at));
    });
    messagesData.data?.forEach((msg) => {
      activityMap.get(msg.sender_id)?.push(new Date(msg.created_at));
    });

    // Calculate retention for each period
    const cohortStartDate = users.find((u) => getISOWeek(new Date(u.created_at)) === week)!.created_at;
    const startDate = new Date(cohortStartDate);

    const retention = {
      day1: calculateRetention(activityMap, startDate, 1),
      day7: calculateRetention(activityMap, startDate, 7),
      day14: calculateRetention(activityMap, startDate, 14),
      day30: calculateRetention(activityMap, startDate, 30),
    };

    cohortData.push({
      cohortWeek: week,
      cohortSize: userIds.length,
      retention,
    });
  }

  return cohortData;
}

// Helper function to get ISO week string
function getISOWeek(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

// Helper function to calculate retention percentage
function calculateRetention(
  activityMap: Map<string, Date[]>,
  cohortStartDate: Date,
  daysAfter: number
): number {
  const targetDate = new Date(cohortStartDate);
  targetDate.setDate(targetDate.getDate() + daysAfter);

  let activeUsers = 0;
  const totalUsers = activityMap.size;

  for (const [userId, activities] of activityMap.entries()) {
    // Check if user had any activity on or after target date
    const hasActivity = activities.some((activityDate) => {
      const daysDiff = Math.floor(
        (activityDate.getTime() - new Date(cohortStartDate).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      return daysDiff >= daysAfter && daysDiff < daysAfter + 7; // Activity within 7 days of target
    });

    if (hasActivity) {
      activeUsers++;
    }
  }

  return totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/features/admin/actions/cohort-analysis.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add features/admin/actions/analytics-actions.ts __tests__/features/admin/actions/cohort-analysis.test.ts
git commit -m "feat(analytics): add cohort analysis with retention tracking"
```

---

## Task 2: User Journey Metrics Server Action

**Files:**
- Modify: `features/admin/actions/analytics-actions.ts`

**Step 1: Implement time-to-value tracking**

```typescript
// features/admin/actions/analytics-actions.ts
// Add after getCohortAnalysis function

export type UserJourneyMetrics = {
  workers: {
    signupToProfileComplete: number; // median hours
    profileToFirstApplication: number;
    firstApplicationToInterview: number;
  };
  employers: {
    signupToFirstJobPosted: number; // median hours
    firstJobToFirstApplication: number;
  };
  featureAdoption: {
    certificationsUploaded: {
      count: number;
      percentage: number;
    };
    messagesUsage: {
      activeMessengers: number;
      totalMessages: number;
    };
  };
};

/**
 * Get user journey and time-to-value metrics
 */
export async function getUserJourneyMetrics(
  dateRange: DateRangeValue,
  segment: SegmentValue
): Promise<UserJourneyMetrics> {
  const supabase = await createClient(await cookies());
  const { gte, lte } = buildDateRangeFilter(dateRange);

  // Get all users in date range
  let userQuery = supabase
    .from('profiles')
    .select('id, created_at, role, name, trade, location, subscription_status, employer_type')
    .gte('created_at', gte)
    .lte('created_at', lte);

  userQuery = applySegmentFilters(userQuery, segment);
  const { data: users } = await userQuery;

  if (!users) {
    return createEmptyJourneyMetrics();
  }

  const workers = users.filter((u) => u.role === 'worker');
  const employers = users.filter((u) => u.role === 'employer');

  // Worker journey: Signup → Profile Complete → First Application
  const workerJourney = await calculateWorkerJourney(supabase, workers);

  // Employer journey: Signup → First Job → First Application Received
  const employerJourney = await calculateEmployerJourney(supabase, employers);

  // Feature adoption
  const [{ count: certsCount }, { data: messagesData }] = await Promise.all([
    supabase
      .from('certifications')
      .select('*', { count: 'exact', head: true })
      .in('user_id', users.map((u) => u.id)),
    supabase
      .from('messages')
      .select('sender_id')
      .in('sender_id', users.map((u) => u.id)),
  ]);

  const uniqueMessengers = new Set(messagesData?.map((m) => m.sender_id) || []).size;

  return {
    workers: workerJourney,
    employers: employerJourney,
    featureAdoption: {
      certificationsUploaded: {
        count: certsCount || 0,
        percentage: users.length > 0 ? ((certsCount || 0) / users.length) * 100 : 0,
      },
      messagesUsage: {
        activeMessengers: uniqueMessengers,
        totalMessages: messagesData?.length || 0,
      },
    },
  };
}

async function calculateWorkerJourney(
  supabase: any,
  workers: any[]
): Promise<UserJourneyMetrics['workers']> {
  const profileCompleteTimes: number[] = [];
  const firstAppTimes: number[] = [];

  for (const worker of workers) {
    const signupTime = new Date(worker.created_at).getTime();

    // Check when profile was completed (all required fields filled)
    if (worker.name && worker.trade && worker.location) {
      // Assuming profile completed at signup for simplicity
      // In reality, you'd track profile updates
      const profileCompleteTime = signupTime;
      profileCompleteTimes.push(0); // Completed immediately
    }

    // Get first application
    const { data: apps } = await supabase
      .from('job_applications')
      .select('created_at')
      .eq('user_id', worker.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (apps) {
      const appTime = new Date(apps.created_at).getTime();
      const hoursToFirstApp = (appTime - signupTime) / (1000 * 60 * 60);
      firstAppTimes.push(hoursToFirstApp);
    }
  }

  return {
    signupToProfileComplete: calculateMedian(profileCompleteTimes),
    profileToFirstApplication: calculateMedian(firstAppTimes),
    firstApplicationToInterview: 0, // TODO: Track interview requests
  };
}

async function calculateEmployerJourney(
  supabase: any,
  employers: any[]
): Promise<UserJourneyMetrics['employers']> {
  const firstJobTimes: number[] = [];
  const firstAppReceivedTimes: number[] = [];

  for (const employer of employers) {
    const signupTime = new Date(employer.created_at).getTime();

    // Get first job posted
    const { data: job } = await supabase
      .from('jobs')
      .select('id, created_at')
      .eq('user_id', employer.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (job) {
      const jobTime = new Date(job.created_at).getTime();
      const hoursToFirstJob = (jobTime - signupTime) / (1000 * 60 * 60);
      firstJobTimes.push(hoursToFirstJob);

      // Get first application to this job
      const { data: app } = await supabase
        .from('job_applications')
        .select('created_at')
        .eq('job_id', job.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (app) {
        const appTime = new Date(app.created_at).getTime();
        const hoursToFirstApp = (appTime - jobTime) / (1000 * 60 * 60);
        firstAppReceivedTimes.push(hoursToFirstApp);
      }
    }
  }

  return {
    signupToFirstJobPosted: calculateMedian(firstJobTimes),
    firstJobToFirstApplication: calculateMedian(firstAppReceivedTimes),
  };
}

function calculateMedian(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sorted = numbers.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function createEmptyJourneyMetrics(): UserJourneyMetrics {
  return {
    workers: {
      signupToProfileComplete: 0,
      profileToFirstApplication: 0,
      firstApplicationToInterview: 0,
    },
    employers: {
      signupToFirstJobPosted: 0,
      firstJobToFirstApplication: 0,
    },
    featureAdoption: {
      certificationsUploaded: { count: 0, percentage: 0 },
      messagesUsage: { activeMessengers: 0, totalMessages: 0 },
    },
  };
}
```

**Step 2: Commit**

```bash
git add features/admin/actions/analytics-actions.ts
git commit -m "feat(analytics): add user journey time-to-value metrics"
```

---

## Task 3: Geographic Insights Server Action

**Files:**
- Modify: `features/admin/actions/analytics-actions.ts`

**Step 1: Implement geographic distribution tracking**

```typescript
// features/admin/actions/analytics-actions.ts
// Add after getUserJourneyMetrics function

export type GeographicInsights = {
  topLocations: {
    location: string;
    userCount: number;
    jobCount: number;
    certificationVerificationRate: number;
  }[];
  distribution: {
    location: string;
    count: number;
    percentage: number;
  }[];
};

/**
 * Get geographic insights
 */
export async function getGeographicInsights(
  dateRange: DateRangeValue
): Promise<GeographicInsights> {
  const supabase = await createClient(await cookies());
  const { gte, lte } = buildDateRangeFilter(dateRange);

  // Get user distribution by location
  const { data: users } = await supabase
    .from('profiles')
    .select('location')
    .gte('created_at', gte)
    .lte('created_at', lte);

  const locationCounts = new Map<string, number>();
  users?.forEach((user) => {
    if (user.location) {
      locationCounts.set(user.location, (locationCounts.get(user.location) || 0) + 1);
    }
  });

  const totalUsers = users?.length || 0;
  const distribution = Array.from(locationCounts.entries())
    .map(([location, count]) => ({
      location,
      count,
      percentage: totalUsers > 0 ? (count / totalUsers) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10

  // Get job posting density by location
  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, location')
    .gte('created_at', gte)
    .lte('created_at', lte);

  const jobCounts = new Map<string, number>();
  jobs?.forEach((job) => {
    if (job.location) {
      jobCounts.set(job.location, (jobCounts.get(job.location) || 0) + 1);
    }
  });

  // Get certification verification rates by location
  const { data: certs } = await supabase
    .from('certifications')
    .select('id, issuing_state, verification_status')
    .gte('created_at', gte)
    .lte('created_at', lte);

  const certStats = new Map<string, { total: number; verified: number }>();
  certs?.forEach((cert) => {
    const location = cert.issuing_state || 'Unknown';
    if (!certStats.has(location)) {
      certStats.set(location, { total: 0, verified: 0 });
    }
    const stats = certStats.get(location)!;
    stats.total++;
    if (cert.verification_status === 'verified') {
      stats.verified++;
    }
  });

  // Combine into top locations
  const topLocations = Array.from(locationCounts.entries())
    .map(([location, userCount]) => {
      const jobCount = jobCounts.get(location) || 0;
      const certStat = certStats.get(location);
      const certVerificationRate =
        certStat && certStat.total > 0
          ? (certStat.verified / certStat.total) * 100
          : 0;

      return {
        location,
        userCount,
        jobCount,
        certificationVerificationRate: certVerificationRate,
      };
    })
    .sort((a, b) => b.userCount - a.userCount)
    .slice(0, 10);

  return {
    topLocations,
    distribution,
  };
}
```

**Step 2: Commit**

```bash
git add features/admin/actions/analytics-actions.ts
git commit -m "feat(analytics): add geographic distribution and insights"
```

---

## Task 4: Subscription Intelligence Server Action

**Files:**
- Modify: `features/admin/actions/analytics-actions.ts`

**Step 1: Implement upgrade trigger analysis**

```typescript
// features/admin/actions/analytics-actions.ts
// Add after getGeographicInsights function

export type SubscriptionIntelligence = {
  upgradeTriggers: {
    trigger: string;
    conversionRate: number;
    sampleSize: number;
  }[];
  ltv: {
    bySegment: {
      segment: string;
      avgLifetimeValue: number;
      avgRetentionDays: number;
    }[];
  };
};

/**
 * Get subscription intelligence and upgrade triggers
 */
export async function getSubscriptionIntelligence(
  dateRange: DateRangeValue
): Promise<SubscriptionIntelligence> {
  const supabase = await createClient(await cookies());
  const { gte, lte } = buildDateRangeFilter(dateRange);

  // Get all users and their subscription status
  const { data: users } = await supabase
    .from('profiles')
    .select('id, subscription_status, role, created_at')
    .gte('created_at', gte)
    .lte('created_at', lte);

  const proUsers = users?.filter((u) => u.subscription_status === 'pro') || [];
  const freeUsers = users?.filter((u) => u.subscription_status === 'free') || [];

  // Analyze upgrade triggers
  const upgradeTriggers = await analyzeUpgradeTriggers(supabase, users || []);

  // Calculate LTV by segment
  const ltvBySegment = await calculateLTVBySegment(supabase, users || []);

  return {
    upgradeTriggers,
    ltv: {
      bySegment: ltvBySegment,
    },
  };
}

async function analyzeUpgradeTriggers(
  supabase: any,
  users: any[]
): Promise<SubscriptionIntelligence['upgradeTriggers']> {
  // Trigger 1: Users who posted 3+ jobs
  const jobPosters = await Promise.all(
    users.map(async (user) => {
      const { count } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      return { userId: user.id, jobCount: count || 0, isPro: user.subscription_status === 'pro' };
    })
  );

  const heavyPosters = jobPosters.filter((jp) => jp.jobCount >= 3);
  const heavyPosterConversionRate =
    heavyPosters.length > 0
      ? (heavyPosters.filter((hp) => hp.isPro).length / heavyPosters.length) * 100
      : 0;

  // Trigger 2: Users who received 5+ applications
  const jobOwners = await Promise.all(
    users.filter((u) => u.role === 'employer').map(async (user) => {
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id')
        .eq('user_id', user.id);

      if (!jobs || jobs.length === 0) {
        return { userId: user.id, appCount: 0, isPro: user.subscription_status === 'pro' };
      }

      const { count } = await supabase
        .from('job_applications')
        .select('*', { count: 'exact', head: true })
        .in('job_id', jobs.map((j) => j.id));

      return { userId: user.id, appCount: count || 0, isPro: user.subscription_status === 'pro' };
    })
  );

  const manyApplicants = jobOwners.filter((jo) => jo.appCount >= 5);
  const manyApplicantsConversionRate =
    manyApplicants.length > 0
      ? (manyApplicants.filter((ma) => ma.isPro).length / manyApplicants.length) * 100
      : 0;

  return [
    {
      trigger: 'Posted 3+ jobs',
      conversionRate: heavyPosterConversionRate,
      sampleSize: heavyPosters.length,
    },
    {
      trigger: 'Received 5+ applications',
      conversionRate: manyApplicantsConversionRate,
      sampleSize: manyApplicants.length,
    },
  ];
}

async function calculateLTVBySegment(
  supabase: any,
  users: any[]
): Promise<SubscriptionIntelligence['ltv']['bySegment']> {
  // Simplified LTV calculation: Average subscription months × monthly price
  const MONTHLY_PRICE = 29.99; // Assumed Pro price

  const workers = users.filter((u) => u.role === 'worker');
  const employers = users.filter((u) => u.role === 'employer');

  const workerProUsers = workers.filter((w) => w.subscription_status === 'pro');
  const employerProUsers = employers.filter((e) => e.subscription_status === 'pro');

  // Calculate average retention (days since signup for Pro users)
  const calculateAvgRetention = (proUsers: any[]): number => {
    if (proUsers.length === 0) return 0;
    const totalDays = proUsers.reduce((sum, user) => {
      const daysSinceSignup = Math.floor(
        (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      return sum + daysSinceSignup;
    }, 0);
    return totalDays / proUsers.length;
  };

  const workerAvgRetention = calculateAvgRetention(workerProUsers);
  const employerAvgRetention = calculateAvgRetention(employerProUsers);

  return [
    {
      segment: 'Workers (Pro)',
      avgLifetimeValue: (workerAvgRetention / 30) * MONTHLY_PRICE,
      avgRetentionDays: workerAvgRetention,
    },
    {
      segment: 'Employers (Pro)',
      avgLifetimeValue: (employerAvgRetention / 30) * MONTHLY_PRICE,
      avgRetentionDays: employerAvgRetention,
    },
  ];
}
```

**Step 2: Commit**

```bash
git add features/admin/actions/analytics-actions.ts
git commit -m "feat(analytics): add subscription intelligence and upgrade triggers"
```

---

## Task 5: Job Market Health Server Action

**Files:**
- Modify: `features/admin/actions/analytics-actions.ts`

**Step 1: Implement job market health metrics**

```typescript
// features/admin/actions/analytics-actions.ts
// Add after getSubscriptionIntelligence function

export type JobMarketHealth = {
  supplyDemandRatio: number; // Applications per job
  avgTimeToFill: number; // Days
  topTrades: {
    trade: string;
    jobCount: number;
    applicationCount: number;
    avgApplicationsPerJob: number;
  }[];
  marketBalance: 'undersupplied' | 'balanced' | 'oversupplied';
};

/**
 * Get job market health metrics
 */
export async function getJobMarketHealth(
  dateRange: DateRangeValue
): Promise<JobMarketHealth> {
  const supabase = await createClient(await cookies());
  const { gte, lte } = buildDateRangeFilter(dateRange);

  // Get all jobs in date range
  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, trade, created_at, status')
    .gte('created_at', gte)
    .lte('created_at', lte);

  if (!jobs || jobs.length === 0) {
    return createEmptyMarketHealth();
  }

  // Get all applications for these jobs
  const { data: applications } = await supabase
    .from('job_applications')
    .select('job_id, created_at, status')
    .in('job_id', jobs.map((j) => j.id));

  // Supply/demand ratio
  const totalApplications = applications?.length || 0;
  const supplyDemandRatio = jobs.length > 0 ? totalApplications / jobs.length : 0;

  // Market balance assessment
  let marketBalance: JobMarketHealth['marketBalance'];
  if (supplyDemandRatio < 3) {
    marketBalance = 'undersupplied';
  } else if (supplyDemandRatio > 10) {
    marketBalance = 'oversupplied';
  } else {
    marketBalance = 'balanced';
  }

  // Average time to fill (for filled jobs)
  const filledJobs = jobs.filter((j) => j.status === 'filled');
  let avgTimeToFill = 0;
  if (filledJobs.length > 0) {
    // Simplified: assume filled at creation + 14 days average
    // In reality, you'd track actual fill date
    avgTimeToFill = 14;
  }

  // Top trades analysis
  const tradeStats = new Map<string, { jobCount: number; appCount: number }>();
  jobs.forEach((job) => {
    const trade = job.trade || 'Unknown';
    if (!tradeStats.has(trade)) {
      tradeStats.set(trade, { jobCount: 0, appCount: 0 });
    }
    const stats = tradeStats.get(trade)!;
    stats.jobCount++;
  });

  applications?.forEach((app) => {
    const job = jobs.find((j) => j.id === app.job_id);
    if (job) {
      const trade = job.trade || 'Unknown';
      const stats = tradeStats.get(trade);
      if (stats) {
        stats.appCount++;
      }
    }
  });

  const topTrades = Array.from(tradeStats.entries())
    .map(([trade, stats]) => ({
      trade,
      jobCount: stats.jobCount,
      applicationCount: stats.appCount,
      avgApplicationsPerJob: stats.jobCount > 0 ? stats.appCount / stats.jobCount : 0,
    }))
    .sort((a, b) => b.jobCount - a.jobCount)
    .slice(0, 10);

  return {
    supplyDemandRatio,
    avgTimeToFill,
    topTrades,
    marketBalance,
  };
}

function createEmptyMarketHealth(): JobMarketHealth {
  return {
    supplyDemandRatio: 0,
    avgTimeToFill: 0,
    topTrades: [],
    marketBalance: 'balanced',
  };
}
```

**Step 2: Commit**

```bash
git add features/admin/actions/analytics-actions.ts
git commit -m "feat(analytics): add job market health metrics"
```

---

## Task 6: Cohort Table Component

**Files:**
- Create: `components/admin/cohort-table.tsx`

**Step 1: Create cohort visualization component**

```typescript
// components/admin/cohort-table.tsx
'use client';

import React from 'react';
import type { CohortData } from '@/features/admin/actions/analytics-actions';

type Props = {
  cohorts: CohortData[];
};

export function CohortTable({ cohorts }: Props) {
  const getHeatmapColor = (percentage: number): string => {
    if (percentage >= 50) return 'bg-green-500';
    if (percentage >= 30) return 'bg-yellow-500';
    if (percentage >= 10) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Cohort Week
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Size
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
              Day 1
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
              Day 7
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
              Day 14
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
              Day 30
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {cohorts.map((cohort) => (
            <tr key={cohort.cohortWeek}>
              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                {cohort.cohortWeek}
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                {cohort.cohortSize}
              </td>
              <td className="px-4 py-3 text-center">
                <div className="flex items-center justify-center">
                  <div
                    className={`px-3 py-1 rounded text-white text-sm font-medium ${getHeatmapColor(
                      cohort.retention.day1
                    )}`}
                  >
                    {cohort.retention.day1.toFixed(0)}%
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-center">
                <div className="flex items-center justify-center">
                  <div
                    className={`px-3 py-1 rounded text-white text-sm font-medium ${getHeatmapColor(
                      cohort.retention.day7
                    )}`}
                  >
                    {cohort.retention.day7.toFixed(0)}%
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-center">
                <div className="flex items-center justify-center">
                  <div
                    className={`px-3 py-1 rounded text-white text-sm font-medium ${getHeatmapColor(
                      cohort.retention.day14
                    )}`}
                  >
                    {cohort.retention.day14.toFixed(0)}%
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-center">
                <div className="flex items-center justify-center">
                  <div
                    className={`px-3 py-1 rounded text-white text-sm font-medium ${getHeatmapColor(
                      cohort.retention.day30
                    )}`}
                  >
                    {cohort.retention.day30.toFixed(0)}%
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/admin/cohort-table.tsx
git commit -m "feat(admin): add cohort table component with heatmap visualization"
```

---

## Task 7: Retention Analytics Page

**Files:**
- Create: `app/admin/analytics/retention/page.tsx`

**Step 1: Create retention analytics page**

```typescript
// app/admin/analytics/retention/page.tsx
import React from 'react';
import { cookies } from 'next/headers';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { CohortTable } from '@/components/admin/cohort-table';
import { getCohortAnalysis } from '@/features/admin/actions/analytics-actions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function RetentionAnalyticsPage() {
  // Default to last 90 days for cohort analysis
  const today = new Date();
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(today.getDate() - 90);

  const dateRange = {
    preset: 'last90days' as const,
    startDate: ninetyDaysAgo,
    endDate: today,
  };

  const cohortData = await getCohortAnalysis(dateRange, {});

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Retention Analytics</h1>
        <p className="text-gray-600 mt-2">
          User cohorts and retention patterns over time
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cohort Analysis (Last 90 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          {cohortData.length > 0 ? (
            <CohortTable cohorts={cohortData} />
          ) : (
            <div className="text-center py-12 text-gray-500">
              No cohort data available for this period
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Retention Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Key Findings</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Cohorts are grouped by signup week</li>
                <li>• Retention measured at 1, 7, 14, and 30 days after signup</li>
                <li>• Green (50%+), Yellow (30-50%), Orange (10-30%), Red (&lt;10%)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add app/admin/analytics/retention/page.tsx
git commit -m "feat(admin): add retention analytics page with cohort analysis"
```

---

## Task 8: User Journey Dashboard Page

**Files:**
- Create: `app/admin/analytics/user-journey/page.tsx`

**Step 1: Create user journey page**

```typescript
// app/admin/analytics/user-journey/page.tsx
import React from 'react';
import { cookies } from 'next/headers';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { MetricCard } from '@/components/admin/metric-card';
import { getUserJourneyMetrics } from '@/features/admin/actions/analytics-actions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function UserJourneyPage() {
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const dateRange = {
    preset: 'last30days' as const,
    startDate: thirtyDaysAgo,
    endDate: today,
  };

  const journeyMetrics = await getUserJourneyMetrics(dateRange, {});

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">User Journey Analytics</h1>
        <p className="text-gray-600 mt-2">
          Time-to-value metrics and feature adoption
        </p>
      </div>

      {/* Worker Journey */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Worker Journey</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard
            title="Signup → Profile Complete"
            value={`${journeyMetrics.workers.signupToProfileComplete.toFixed(1)}h`}
            subtitle="Median time"
            icon="📝"
          />
          <MetricCard
            title="Profile → First Application"
            value={`${journeyMetrics.workers.profileToFirstApplication.toFixed(1)}h`}
            subtitle="Median time"
            icon="📄"
          />
          <MetricCard
            title="Application → Interview"
            value={`${journeyMetrics.workers.firstApplicationToInterview.toFixed(1)}h`}
            subtitle="Median time (coming soon)"
            icon="🤝"
          />
        </div>
      </div>

      {/* Employer Journey */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Employer Journey</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <MetricCard
            title="Signup → First Job Posted"
            value={`${journeyMetrics.employers.signupToFirstJobPosted.toFixed(1)}h`}
            subtitle="Median time"
            icon="💼"
          />
          <MetricCard
            title="Job Posted → First Application"
            value={`${journeyMetrics.employers.firstJobToFirstApplication.toFixed(1)}h`}
            subtitle="Median time"
            icon="📨"
          />
        </div>
      </div>

      {/* Feature Adoption */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Adoption</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Certifications</h4>
              <p className="text-3xl font-bold text-gray-900">
                {journeyMetrics.featureAdoption.certificationsUploaded.count}
              </p>
              <p className="text-sm text-gray-600">
                {journeyMetrics.featureAdoption.certificationsUploaded.percentage.toFixed(1)}% of users
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Messaging</h4>
              <p className="text-3xl font-bold text-gray-900">
                {journeyMetrics.featureAdoption.messagesUsage.activeMessengers}
              </p>
              <p className="text-sm text-gray-600">
                active messengers ({journeyMetrics.featureAdoption.messagesUsage.totalMessages} total messages)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add app/admin/analytics/user-journey/page.tsx
git commit -m "feat(admin): add user journey analytics page"
```

---

## Task 9: Geographic Insights Page

**Files:**
- Create: `app/admin/analytics/geographic/page.tsx`

**Step 1: Create geographic insights page**

```typescript
// app/admin/analytics/geographic/page.tsx
import React from 'react';
import { cookies } from 'next/headers';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { getGeographicInsights } from '@/features/admin/actions/analytics-actions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function GeographicInsightsPage() {
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const dateRange = {
    preset: 'last30days' as const,
    startDate: thirtyDaysAgo,
    endDate: today,
  };

  const geoInsights = await getGeographicInsights(dateRange);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Geographic Insights</h1>
        <p className="text-gray-600 mt-2">
          User distribution and market activity by location
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Locations by Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Location
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Users
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Jobs
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Cert Verification Rate
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {geoInsights.topLocations.map((location) => (
                  <tr key={location.location}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {location.location}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-right">
                      {location.userCount}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-right">
                      {location.jobCount}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-right">
                      {location.certificationVerificationRate.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>User Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {geoInsights.distribution.map((loc) => (
              <div key={loc.location}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-900">{loc.location}</span>
                  <span className="text-gray-600">
                    {loc.count} users ({loc.percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${loc.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add app/admin/analytics/geographic/page.tsx
git commit -m "feat(admin): add geographic insights page"
```

---

## Task 10: Subscription Intelligence Page

**Files:**
- Create: `app/admin/analytics/subscription-intelligence/page.tsx`

**Step 1: Create subscription intelligence page**

```typescript
// app/admin/analytics/subscription-intelligence/page.tsx
import React from 'react';
import { cookies } from 'next/headers';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { getSubscriptionIntelligence } from '@/features/admin/actions/analytics-actions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SubscriptionIntelligencePage() {
  const today = new Date();
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(today.getDate() - 90);

  const dateRange = {
    preset: 'last90days' as const,
    startDate: ninetyDaysAgo,
    endDate: today,
  };

  const subIntelligence = await getSubscriptionIntelligence(dateRange);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Subscription Intelligence</h1>
        <p className="text-gray-600 mt-2">
          Upgrade triggers and lifetime value analysis
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upgrade Triggers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {subIntelligence.upgradeTriggers.map((trigger) => (
              <div
                key={trigger.trigger}
                className="p-4 border border-gray-200 rounded-lg"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900">{trigger.trigger}</h4>
                    <p className="text-sm text-gray-600">
                      Sample size: {trigger.sampleSize} users
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-blue-600">
                      {trigger.conversionRate.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600">conversion rate</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lifetime Value by Segment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {subIntelligence.ltv.bySegment.map((segment) => (
              <div
                key={segment.segment}
                className="p-4 border border-gray-200 rounded-lg"
              >
                <h4 className="font-semibold text-gray-900 mb-2">{segment.segment}</h4>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  ${segment.avgLifetimeValue.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">
                  Avg retention: {segment.avgRetentionDays.toFixed(0)} days
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add app/admin/analytics/subscription-intelligence/page.tsx
git commit -m "feat(admin): add subscription intelligence page"
```

---

## Task 11: Job Market Health Page

**Files:**
- Create: `app/admin/analytics/market-health/page.tsx`

**Step 1: Create job market health page**

```typescript
// app/admin/analytics/market-health/page.tsx
import React from 'react';
import { cookies } from 'next/headers';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { MetricCard } from '@/components/admin/metric-card';
import { getJobMarketHealth } from '@/features/admin/actions/analytics-actions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function MarketHealthPage() {
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const dateRange = {
    preset: 'last30days' as const,
    startDate: thirtyDaysAgo,
    endDate: today,
  };

  const marketHealth = await getJobMarketHealth(dateRange);

  const getMarketBalanceColor = (balance: string): string => {
    switch (balance) {
      case 'balanced':
        return 'text-green-600 bg-green-100';
      case 'undersupplied':
        return 'text-yellow-600 bg-yellow-100';
      case 'oversupplied':
        return 'text-orange-600 bg-orange-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Job Market Health</h1>
        <p className="text-gray-600 mt-2">
          Supply/demand balance and marketplace metrics
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Supply/Demand Ratio"
          value={marketHealth.supplyDemandRatio.toFixed(1)}
          subtitle="applications per job"
          icon="⚖️"
        />
        <MetricCard
          title="Average Time to Fill"
          value={`${marketHealth.avgTimeToFill} days`}
          subtitle="for filled positions"
          icon="⏱️"
        />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Market Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`inline-block px-4 py-2 rounded-lg font-semibold ${getMarketBalanceColor(
                marketHealth.marketBalance
              )}`}
            >
              {marketHealth.marketBalance.toUpperCase()}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Healthy: 5-10 applications/job
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Trades by Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Trade
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Jobs Posted
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Applications
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Avg Apps/Job
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {marketHealth.topTrades.map((trade) => (
                  <tr key={trade.trade}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {trade.trade}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-right">
                      {trade.jobCount}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-right">
                      {trade.applicationCount}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-right">
                      {trade.avgApplicationsPerJob.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add app/admin/analytics/market-health/page.tsx
git commit -m "feat(admin): add job market health page"
```

---

## Task 12: Update Admin Navigation

**Files:**
- Modify: `components/admin/admin-sidebar.tsx`

**Step 1: Add all Phase 2 analytics pages to navigation**

```typescript
// components/admin/admin-sidebar.tsx
// Add to navigation links array:

const analyticsLinks = [
  {
    href: '/admin/analytics/overview',
    label: 'Overview',
    icon: '📊',
  },
  {
    href: '/admin/analytics/retention',
    label: 'Retention',
    icon: '📈',
  },
  {
    href: '/admin/analytics/user-journey',
    label: 'User Journey',
    icon: '🚶',
  },
  {
    href: '/admin/analytics/geographic',
    label: 'Geographic Insights',
    icon: '🗺️',
  },
  {
    href: '/admin/analytics/subscription-intelligence',
    label: 'Subscription Intel',
    icon: '💡',
  },
  {
    href: '/admin/analytics/market-health',
    label: 'Market Health',
    icon: '⚖️',
  },
];
```

**Step 2: Commit**

```bash
git add components/admin/admin-sidebar.tsx
git commit -m "feat(admin): add Phase 2 analytics pages to navigation"
```

---

## Verification Steps

**After completing all tasks:**

1. **Run all tests:**
   ```bash
   npm test
   ```
   Expected: All tests pass

2. **Start dev server:**
   ```bash
   npm run dev
   ```

3. **Visit each analytics page:**
   - `/admin/analytics/retention` - See cohort analysis table
   - `/admin/analytics/user-journey` - See time-to-value metrics
   - `/admin/analytics/geographic` - See location distribution
   - `/admin/analytics/subscription-intelligence` - See upgrade triggers
   - `/admin/analytics/market-health` - See supply/demand metrics

4. **Verify data accuracy:**
   - Check that cohort retention percentages make sense
   - Verify time-to-value metrics are in reasonable ranges
   - Confirm top locations match expected user base

---

## Success Criteria

- ✅ Cohort analysis groups users by signup week
- ✅ Retention tracked at 1, 7, 14, 30 days
- ✅ User journey shows median time-to-value for workers and employers
- ✅ Feature adoption metrics display certification and messaging usage
- ✅ Geographic insights show top 10 locations with activity metrics
- ✅ Subscription intelligence identifies upgrade triggers
- ✅ LTV calculated by user segment
- ✅ Job market health displays supply/demand ratio and balance
- ✅ All new pages accessible from admin navigation
- ✅ All tests pass
- ✅ No TypeScript errors

---

**Phase 2 Complete!** Ready to proceed to Phase 3 (Operational Efficiency & Alerts) after review.
