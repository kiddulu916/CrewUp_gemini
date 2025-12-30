# Phase 1: Foundation & Quick Wins - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build analytics infrastructure and critical metrics dashboard with enhanced Sentry context

**Architecture:** Reusable filter components (date range, segments) → Server actions for data fetching → Analytics overview page displaying DAU/WAU/MAU, conversion funnel, subscription metrics, and operational load

**Tech Stack:** Next.js 14, TypeScript, Supabase, Recharts, Sentry SDK, shadcn/ui components

---

## Task 1: Date Range Picker Component

**Files:**
- Create: `components/admin/date-range-picker.tsx`
- Create: `__tests__/components/admin/date-range-picker.test.tsx`

**Step 1: Write the failing test**

```typescript
// __tests__/components/admin/date-range-picker.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DateRangePicker } from '@/components/admin/date-range-picker';

describe('DateRangePicker', () => {
  it('renders with default preset (Last 7 days)', () => {
    const onChange = vi.fn();
    render(<DateRangePicker value={{ preset: 'last7days' }} onChange={onChange} />);

    expect(screen.getByText('Last 7 days')).toBeInTheDocument();
  });

  it('calls onChange when preset is selected', () => {
    const onChange = vi.fn();
    render(<DateRangePicker value={{ preset: 'last7days' }} onChange={onChange} />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'last30days' } });

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      preset: 'last30days',
    }));
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/components/admin/date-range-picker.test.tsx`
Expected: FAIL with "Cannot find module '@/components/admin/date-range-picker'"

**Step 3: Write minimal implementation**

```typescript
// components/admin/date-range-picker.tsx
'use client';

import React from 'react';

export type DateRangePreset = 'last7days' | 'last30days' | 'last90days' | 'custom';

export type DateRangeValue = {
  preset: DateRangePreset;
  startDate?: Date;
  endDate?: Date;
  compareEnabled?: boolean;
};

type Props = {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
};

const PRESET_LABELS: Record<DateRangePreset, string> = {
  last7days: 'Last 7 days',
  last30days: 'Last 30 days',
  last90days: 'Last 90 days',
  custom: 'Custom range',
};

export function DateRangePicker({ value, onChange }: Props) {
  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const preset = e.target.value as DateRangePreset;
    const today = new Date();
    const startDate = new Date();

    switch (preset) {
      case 'last7days':
        startDate.setDate(today.getDate() - 7);
        break;
      case 'last30days':
        startDate.setDate(today.getDate() - 30);
        break;
      case 'last90days':
        startDate.setDate(today.getDate() - 90);
        break;
      case 'custom':
        // Keep current dates
        onChange({ ...value, preset });
        return;
    }

    onChange({
      preset,
      startDate,
      endDate: today,
      compareEnabled: value.compareEnabled,
    });
  };

  return (
    <div className="flex gap-4 items-center">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Date Range
        </label>
        <select
          value={value.preset}
          onChange={handlePresetChange}
          className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {Object.entries(PRESET_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {value.preset === 'custom' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={value.startDate?.toISOString().split('T')[0] || ''}
              onChange={(e) =>
                onChange({
                  ...value,
                  startDate: new Date(e.target.value),
                })
              }
              className="h-10 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={value.endDate?.toISOString().split('T')[0] || ''}
              onChange={(e) =>
                onChange({
                  ...value,
                  endDate: new Date(e.target.value),
                })
              }
              className="h-10 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </>
      )}

      <div className="flex items-center mt-6">
        <input
          type="checkbox"
          id="compare-enabled"
          checked={value.compareEnabled || false}
          onChange={(e) =>
            onChange({ ...value, compareEnabled: e.target.checked })
          }
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label
          htmlFor="compare-enabled"
          className="ml-2 text-sm text-gray-700"
        >
          Compare to previous period
        </label>
      </div>
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/components/admin/date-range-picker.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add components/admin/date-range-picker.tsx __tests__/components/admin/date-range-picker.test.tsx
git commit -m "feat(admin): add date range picker component with presets and comparison mode"
```

---

## Task 2: Segment Filter Component

**Files:**
- Create: `components/admin/segment-filter.tsx`
- Create: `__tests__/components/admin/segment-filter.test.tsx`

**Step 1: Write the failing test**

```typescript
// __tests__/components/admin/segment-filter.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SegmentFilter } from '@/components/admin/segment-filter';

describe('SegmentFilter', () => {
  it('renders all filter options', () => {
    const onChange = vi.fn();
    render(<SegmentFilter value={{}} onChange={onChange} />);

    expect(screen.getByText('User Role')).toBeInTheDocument();
    expect(screen.getByText('Subscription')).toBeInTheDocument();
  });

  it('calls onChange when role filter is selected', () => {
    const onChange = vi.fn();
    render(<SegmentFilter value={{}} onChange={onChange} />);

    const roleSelect = screen.getByLabelText('User Role');
    fireEvent.change(roleSelect, { target: { value: 'worker' } });

    expect(onChange).toHaveBeenCalledWith({ role: 'worker' });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/components/admin/segment-filter.test.tsx`
Expected: FAIL with "Cannot find module '@/components/admin/segment-filter'"

**Step 3: Write minimal implementation**

```typescript
// components/admin/segment-filter.tsx
'use client';

import React from 'react';

export type SegmentValue = {
  role?: 'worker' | 'employer' | null;
  subscription?: 'free' | 'pro' | null;
  location?: string | null;
  employerType?: 'general_contractor' | 'subcontractor' | 'property_owner' | null;
};

type Props = {
  value: SegmentValue;
  onChange: (value: SegmentValue) => void;
};

export function SegmentFilter({ value, onChange }: Props) {
  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const role = e.target.value || null;
    onChange({
      ...value,
      role: role as SegmentValue['role'],
    });
  };

  const handleSubscriptionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const subscription = e.target.value || null;
    onChange({
      ...value,
      subscription: subscription as SegmentValue['subscription'],
    });
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...value,
      location: e.target.value || null,
    });
  };

  const handleEmployerTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const employerType = e.target.value || null;
    onChange({
      ...value,
      employerType: employerType as SegmentValue['employerType'],
    });
  };

  const clearFilters = () => {
    onChange({});
  };

  const hasFilters = Object.values(value).some((v) => v !== null && v !== undefined);

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Filters</h3>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label
            htmlFor="role-filter"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            User Role
          </label>
          <select
            id="role-filter"
            value={value.role || ''}
            onChange={handleRoleChange}
            className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Roles</option>
            <option value="worker">Worker</option>
            <option value="employer">Employer</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="subscription-filter"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Subscription
          </label>
          <select
            id="subscription-filter"
            value={value.subscription || ''}
            onChange={handleSubscriptionChange}
            className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Tiers</option>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="location-filter"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Location
          </label>
          <input
            id="location-filter"
            type="text"
            placeholder="Enter city or state..."
            value={value.location || ''}
            onChange={handleLocationChange}
            className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label
            htmlFor="employer-type-filter"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Employer Type
          </label>
          <select
            id="employer-type-filter"
            value={value.employerType || ''}
            onChange={handleEmployerTypeChange}
            className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Types</option>
            <option value="general_contractor">General Contractor</option>
            <option value="subcontractor">Subcontractor</option>
            <option value="property_owner">Property Owner</option>
          </select>
        </div>
      </div>
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/components/admin/segment-filter.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add components/admin/segment-filter.tsx __tests__/components/admin/segment-filter.test.tsx
git commit -m "feat(admin): add segment filter component for user segmentation"
```

---

## Task 3: Analytics Query Helpers

**Files:**
- Create: `lib/analytics/filters.ts`
- Create: `__tests__/lib/analytics/filters.test.ts`

**Step 1: Write the failing test**

```typescript
// __tests__/lib/analytics/filters.test.ts
import { describe, it, expect } from 'vitest';
import { buildDateRangeFilter, buildSegmentFilter, getComparisonDates } from '@/lib/analytics/filters';
import type { DateRangeValue } from '@/components/admin/date-range-picker';
import type { SegmentValue } from '@/components/admin/segment-filter';

describe('Analytics Filters', () => {
  describe('buildDateRangeFilter', () => {
    it('returns correct SQL filter for last 7 days', () => {
      const dateRange: DateRangeValue = {
        preset: 'last7days',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-08'),
      };

      const filter = buildDateRangeFilter(dateRange, 'created_at');
      expect(filter).toContain('created_at >=');
      expect(filter).toContain('created_at <=');
    });
  });

  describe('getComparisonDates', () => {
    it('returns previous period for comparison', () => {
      const dateRange: DateRangeValue = {
        preset: 'last7days',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-08'),
      };

      const { startDate, endDate } = getComparisonDates(dateRange);
      expect(startDate.getTime()).toBeLessThan(dateRange.startDate!.getTime());
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/analytics/filters.test.ts`
Expected: FAIL with "Cannot find module '@/lib/analytics/filters'"

**Step 3: Write minimal implementation**

```typescript
// lib/analytics/filters.ts
import type { DateRangeValue } from '@/components/admin/date-range-picker';
import type { SegmentValue } from '@/components/admin/segment-filter';
import type { PostgrestFilterBuilder } from '@supabase/postgrest-js';

/**
 * Build date range filter for SQL queries
 */
export function buildDateRangeFilter(
  dateRange: DateRangeValue,
  column: string = 'created_at'
): { gte: string; lte: string } {
  const startDate = dateRange.startDate || new Date();
  const endDate = dateRange.endDate || new Date();

  return {
    gte: startDate.toISOString(),
    lte: endDate.toISOString(),
  };
}

/**
 * Get comparison period dates (previous period of same length)
 */
export function getComparisonDates(dateRange: DateRangeValue): {
  startDate: Date;
  endDate: Date;
} {
  const start = dateRange.startDate || new Date();
  const end = dateRange.endDate || new Date();
  const duration = end.getTime() - start.getTime();

  const comparisonEnd = new Date(start.getTime() - 1);
  const comparisonStart = new Date(comparisonEnd.getTime() - duration);

  return {
    startDate: comparisonStart,
    endDate: comparisonEnd,
  };
}

/**
 * Apply segment filters to Supabase query
 */
export function applySegmentFilters<T>(
  query: PostgrestFilterBuilder<any, any, T>,
  segment: SegmentValue
): PostgrestFilterBuilder<any, any, T> {
  let filteredQuery = query;

  if (segment.role) {
    filteredQuery = filteredQuery.eq('role', segment.role);
  }

  if (segment.subscription) {
    filteredQuery = filteredQuery.eq('subscription_status', segment.subscription);
  }

  if (segment.location) {
    filteredQuery = filteredQuery.ilike('location', `%${segment.location}%`);
  }

  if (segment.employerType) {
    filteredQuery = filteredQuery.eq('employer_type', segment.employerType);
  }

  return filteredQuery;
}

/**
 * Calculate percentage change between two values
 */
export function calculatePercentageChange(
  current: number,
  previous: number
): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Format date range for display
 */
export function formatDateRange(dateRange: DateRangeValue): string {
  const { startDate, endDate, preset } = dateRange;

  if (preset !== 'custom') {
    const labels = {
      last7days: 'Last 7 days',
      last30days: 'Last 30 days',
      last90days: 'Last 90 days',
    };
    return labels[preset] || 'Custom range';
  }

  if (startDate && endDate) {
    return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
  }

  return 'Custom range';
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/analytics/filters.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/analytics/filters.ts __tests__/lib/analytics/filters.test.ts
git commit -m "feat(analytics): add filter helper utilities for date ranges and segments"
```

---

## Task 4: Active Users Analytics Actions

**Files:**
- Modify: `features/admin/actions/analytics-actions.ts`
- Create: `__tests__/features/admin/actions/analytics-actions.test.ts`

**Step 1: Write the failing test**

```typescript
// __tests__/features/admin/actions/analytics-actions.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getActiveUsers } from '@/features/admin/actions/analytics-actions';
import type { DateRangeValue } from '@/components/admin/date-range-picker';

describe('Analytics Actions', () => {
  describe('getActiveUsers', () => {
    it('returns DAU/WAU/MAU metrics', async () => {
      const dateRange: DateRangeValue = {
        preset: 'last7days',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-08'),
      };

      const result = await getActiveUsers(dateRange, {});

      expect(result).toHaveProperty('dau');
      expect(result).toHaveProperty('wau');
      expect(result).toHaveProperty('mau');
      expect(result.dau).toBeGreaterThanOrEqual(0);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/features/admin/actions/analytics-actions.test.ts`
Expected: FAIL with "getActiveUsers is not defined"

**Step 3: Add implementation to existing file**

```typescript
// features/admin/actions/analytics-actions.ts
// Add to existing file after the current functions

import type { DateRangeValue } from '@/components/admin/date-range-picker';
import type { SegmentValue } from '@/components/admin/segment-filter';
import { buildDateRangeFilter, applySegmentFilters, getComparisonDates, calculatePercentageChange } from '@/lib/analytics/filters';

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
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/features/admin/actions/analytics-actions.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add features/admin/actions/analytics-actions.ts __tests__/features/admin/actions/analytics-actions.test.ts
git commit -m "feat(analytics): add active users metrics (DAU/WAU/MAU) with comparison"
```

---

## Task 5: Conversion Funnel Analytics Action

**Files:**
- Modify: `features/admin/actions/analytics-actions.ts`

**Step 1: Add conversion funnel function**

```typescript
// features/admin/actions/analytics-actions.ts
// Add after getActiveUsers function

export type ConversionFunnelStage = {
  stage: string;
  count: number;
  percentage: number;
  dropOffRate: number | null;
};

/**
 * Get conversion funnel metrics
 * Stages: Signup → Profile Complete → First Action
 */
export async function getConversionFunnel(
  dateRange: DateRangeValue,
  segment: SegmentValue
): Promise<ConversionFunnelStage[]> {
  const supabase = await createClient(await cookies());
  const { gte, lte } = buildDateRangeFilter(dateRange);

  // Stage 1: Signups (users created in date range)
  let signupQuery = supabase
    .from('profiles')
    .select('id, role, subscription_status, location, employer_type, name, trade, created_at')
    .gte('created_at', gte)
    .lte('created_at', lte);

  signupQuery = applySegmentFilters(signupQuery, segment);
  const { data: signups } = await signupQuery;
  const signupCount = signups?.length || 0;

  // Stage 2: Profile Complete (required fields: name, trade, location)
  const profileComplete = signups?.filter(
    (user) => user.name && user.trade && user.location
  ) || [];
  const profileCompleteCount = profileComplete.length;

  // Stage 3: First Action (posted job OR submitted application)
  const profileCompleteIds = profileComplete.map((u) => u.id);

  const [jobsData, appsData] = await Promise.all([
    supabase
      .from('jobs')
      .select('user_id')
      .in('user_id', profileCompleteIds)
      .limit(profileCompleteIds.length),
    supabase
      .from('job_applications')
      .select('user_id')
      .in('user_id', profileCompleteIds)
      .limit(profileCompleteIds.length),
  ]);

  const firstActionUserIds = new Set<string>();
  jobsData.data?.forEach((job) => firstActionUserIds.add(job.user_id));
  appsData.data?.forEach((app) => firstActionUserIds.add(app.user_id));

  const firstActionCount = firstActionUserIds.size;

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
```

**Step 2: Commit**

```bash
git add features/admin/actions/analytics-actions.ts
git commit -m "feat(analytics): add conversion funnel tracking (signup → profile → action)"
```

---

## Task 6: Subscription Metrics Analytics Action

**Files:**
- Modify: `features/admin/actions/analytics-actions.ts`

**Step 1: Add subscription metrics function**

```typescript
// features/admin/actions/analytics-actions.ts
// Add after getConversionFunnel function

export type SubscriptionMetrics = {
  freeUsers: number;
  proUsers: number;
  conversionRate: number;
  mrr: number;
  churnRate: number;
  comparison: {
    freeUsersChange: number;
    proUsersChange: number;
    conversionRateChange: number;
    mrrChange: number;
  } | null;
};

/**
 * Get subscription metrics
 */
export async function getSubscriptionMetrics(
  dateRange: DateRangeValue
): Promise<SubscriptionMetrics> {
  const supabase = await createClient(await cookies());
  const { gte, lte } = buildDateRangeFilter(dateRange);

  // Get all users created in date range
  const { data: allUsers } = await supabase
    .from('profiles')
    .select('id, subscription_status')
    .gte('created_at', gte)
    .lte('created_at', lte);

  const freeUsers = allUsers?.filter((u) => u.subscription_status === 'free').length || 0;
  const proUsers = allUsers?.filter((u) => u.subscription_status === 'pro').length || 0;
  const totalUsers = allUsers?.length || 0;

  const conversionRate = totalUsers > 0 ? (proUsers / totalUsers) * 100 : 0;

  // Get active subscriptions for MRR calculation
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('amount')
    .eq('status', 'active');

  const mrr = subscriptions?.reduce((sum, sub) => sum + (sub.amount || 0), 0) || 0;

  // Calculate churn rate (users who canceled in this period)
  // This requires tracking subscription status changes - simplified for now
  const churnRate = 0; // TODO: Implement when subscription history tracking is added

  // Get comparison if enabled
  let comparison = null;
  if (dateRange.compareEnabled) {
    const comparisonDates = getComparisonDates(dateRange);
    const comparisonMetrics = await getSubscriptionMetrics({
      preset: 'custom',
      startDate: comparisonDates.startDate,
      endDate: comparisonDates.endDate,
      compareEnabled: false,
    });

    comparison = {
      freeUsersChange: calculatePercentageChange(freeUsers, comparisonMetrics.freeUsers),
      proUsersChange: calculatePercentageChange(proUsers, comparisonMetrics.proUsers),
      conversionRateChange: calculatePercentageChange(
        conversionRate,
        comparisonMetrics.conversionRate
      ),
      mrrChange: calculatePercentageChange(mrr, comparisonMetrics.mrr),
    };
  }

  return {
    freeUsers,
    proUsers,
    conversionRate,
    mrr,
    churnRate,
    comparison,
  };
}
```

**Step 2: Commit**

```bash
git add features/admin/actions/analytics-actions.ts
git commit -m "feat(analytics): add subscription metrics (free/pro, MRR, conversion rate)"
```

---

## Task 7: Operational Load Metrics Analytics Action

**Files:**
- Modify: `features/admin/actions/analytics-actions.ts`

**Step 1: Add operational load function**

```typescript
// features/admin/actions/analytics-actions.ts
// Add after getSubscriptionMetrics function

export type OperationalLoadMetrics = {
  pendingCertifications: number;
  avgCertificationReviewTime: number; // in hours
  moderationQueueBacklog: number;
  avgModerationResolutionTime: number; // in hours
  weeklyTrend: {
    date: string;
    pendingCerts: number;
    pendingReports: number;
  }[];
};

/**
 * Get operational load metrics
 */
export async function getOperationalLoad(
  dateRange: DateRangeValue
): Promise<OperationalLoadMetrics> {
  const supabase = await createClient(await cookies());

  // Current pending certifications
  const { count: pendingCertifications } = await supabase
    .from('certifications')
    .select('*', { count: 'exact', head: true })
    .eq('verification_status', 'pending');

  // Average certification review time (from submission to review)
  const { data: verifiedCerts } = await supabase
    .from('certifications')
    .select('created_at, verified_at')
    .eq('verification_status', 'verified')
    .not('verified_at', 'is', null)
    .gte('verified_at', buildDateRangeFilter(dateRange).gte)
    .lte('verified_at', buildDateRangeFilter(dateRange).lte)
    .limit(1000);

  let avgCertificationReviewTime = 0;
  if (verifiedCerts && verifiedCerts.length > 0) {
    const totalTime = verifiedCerts.reduce((sum, cert) => {
      const created = new Date(cert.created_at).getTime();
      const verified = new Date(cert.verified_at!).getTime();
      return sum + (verified - created);
    }, 0);
    avgCertificationReviewTime = totalTime / verifiedCerts.length / (1000 * 60 * 60); // Convert to hours
  }

  // Moderation queue backlog
  const { count: moderationQueueBacklog } = await supabase
    .from('content_reports')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  // Average moderation resolution time
  const { data: reviewedReports } = await supabase
    .from('content_reports')
    .select('created_at, reviewed_at')
    .in('status', ['actioned', 'dismissed'])
    .not('reviewed_at', 'is', null)
    .gte('reviewed_at', buildDateRangeFilter(dateRange).gte)
    .lte('reviewed_at', buildDateRangeFilter(dateRange).lte)
    .limit(1000);

  let avgModerationResolutionTime = 0;
  if (reviewedReports && reviewedReports.length > 0) {
    const totalTime = reviewedReports.reduce((sum, report) => {
      const created = new Date(report.created_at).getTime();
      const reviewed = new Date(report.reviewed_at!).getTime();
      return sum + (reviewed - created);
    }, 0);
    avgModerationResolutionTime = totalTime / reviewedReports.length / (1000 * 60 * 60);
  }

  // Weekly trend (last 7 days)
  const weeklyTrend = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const [{ count: pendingCerts }, { count: pendingReports }] = await Promise.all([
      supabase
        .from('certifications')
        .select('*', { count: 'exact', head: true })
        .eq('verification_status', 'pending')
        .lte('created_at', dateStr + 'T23:59:59'),
      supabase
        .from('content_reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .lte('created_at', dateStr + 'T23:59:59'),
    ]);

    weeklyTrend.push({
      date: dateStr,
      pendingCerts: pendingCerts || 0,
      pendingReports: pendingReports || 0,
    });
  }

  return {
    pendingCertifications: pendingCertifications || 0,
    avgCertificationReviewTime,
    moderationQueueBacklog: moderationQueueBacklog || 0,
    avgModerationResolutionTime,
    weeklyTrend,
  };
}
```

**Step 2: Commit**

```bash
git add features/admin/actions/analytics-actions.ts
git commit -m "feat(analytics): add operational load metrics for cert/moderation queues"
```

---

## Task 8: Enhanced Sentry User Context

**Files:**
- Modify: `lib/supabase/middleware.ts`

**Step 1: Read current middleware implementation**

Run: `cat lib/supabase/middleware.ts` to see the current updateSession function

**Step 2: Add Sentry context to middleware**

```typescript
// lib/supabase/middleware.ts
// Add Sentry import at top
import * as Sentry from '@sentry/nextjs';

// In the updateSession function, after getting the user session, add:

export async function updateSession(request: NextRequest) {
  // ... existing session refresh code ...

  // Get user from session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Add Sentry user context
  if (user) {
    // Fetch full profile for additional context
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, subscription_status, location, employer_type')
      .eq('id', user.id)
      .single();

    if (profile) {
      Sentry.setUser({
        id: user.id,
        email: user.email,
        role: profile.role,
        subscription_status: profile.subscription_status,
        location: profile.location,
        employer_type: profile.employer_type,
      });

      Sentry.setTags({
        user_role: profile.role,
        subscription_tier: profile.subscription_status,
      });
    }
  } else {
    // Clear Sentry user context on logout
    Sentry.setUser(null);
  }

  // ... rest of existing middleware code ...
}
```

**Step 3: Commit**

```bash
git add lib/supabase/middleware.ts
git commit -m "feat(sentry): add enhanced user context to Sentry tracking"
```

---

## Task 9: Sentry Feature Tags in Job Actions

**Files:**
- Modify: `features/jobs/actions/job-actions.ts`

**Step 1: Add Sentry breadcrumbs to job creation**

```typescript
// features/jobs/actions/job-actions.ts
// Add at top
import * as Sentry from '@sentry/nextjs';

// In createJob or similar functions, add:
export async function createJob(formData: FormData) {
  try {
    Sentry.setTag('feature', 'job-posting');
    Sentry.setTag('action', 'create-job');

    // ... existing job creation code ...

    Sentry.addBreadcrumb({
      message: 'Job created successfully',
      level: 'info',
      data: { jobId: newJob.id },
    });

    return { success: true, data: newJob };
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        feature: 'job-posting',
        action: 'create-job',
      },
    });
    throw error;
  }
}
```

**Step 2: Commit**

```bash
git add features/jobs/actions/job-actions.ts
git commit -m "feat(sentry): add feature tags and breadcrumbs to job actions"
```

---

## Task 10: Analytics Overview Page

**Files:**
- Create: `app/admin/analytics/overview/page.tsx`
- Create: `components/admin/trend-indicator.tsx`
- Create: `components/admin/funnel-chart.tsx`

**Step 1: Create trend indicator component**

```typescript
// components/admin/trend-indicator.tsx
'use client';

import React from 'react';

type Props = {
  value: number;
  isPositive?: boolean; // Undefined means neutral
};

export function TrendIndicator({ value, isPositive }: Props) {
  const isNeutral = isPositive === undefined;
  const color = isNeutral
    ? 'text-gray-600'
    : isPositive
    ? 'text-green-600'
    : 'text-red-600';

  const arrow = isNeutral ? '' : isPositive ? '↑' : '↓';

  return (
    <span className={`text-sm font-medium ${color}`}>
      {arrow} {Math.abs(value).toFixed(1)}%
    </span>
  );
}
```

**Step 2: Create funnel chart component**

```typescript
// components/admin/funnel-chart.tsx
'use client';

import React from 'react';
import type { ConversionFunnelStage } from '@/features/admin/actions/analytics-actions';

type Props = {
  stages: ConversionFunnelStage[];
};

export function FunnelChart({ stages }: Props) {
  return (
    <div className="space-y-4">
      {stages.map((stage, index) => (
        <div key={stage.stage} className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-gray-900">{stage.stage}</h4>
              <p className="text-sm text-gray-600">
                {stage.count} users ({stage.percentage.toFixed(1)}%)
              </p>
            </div>
            {stage.dropOffRate !== null && (
              <div className="text-right">
                <p className="text-sm text-red-600 font-medium">
                  {stage.dropOffRate.toFixed(1)}% drop-off
                </p>
              </div>
            )}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-8">
            <div
              className="bg-blue-600 h-8 rounded-full flex items-center justify-end px-3 text-white text-sm font-medium"
              style={{ width: `${stage.percentage}%` }}
            >
              {stage.percentage.toFixed(0)}%
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

**Step 3: Create analytics overview page**

```typescript
// app/admin/analytics/overview/page.tsx
import React from 'react';
import { cookies } from 'next/headers';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { MetricCard } from '@/components/admin/metric-card';
import { DateRangePicker } from '@/components/admin/date-range-picker';
import { SegmentFilter } from '@/components/admin/segment-filter';
import { FunnelChart } from '@/components/admin/funnel-chart';
import { TrendIndicator } from '@/components/admin/trend-indicator';
import {
  getActiveUsers,
  getConversionFunnel,
  getSubscriptionMetrics,
  getOperationalLoad,
} from '@/features/admin/actions/analytics-actions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AnalyticsOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{
    preset?: string;
    startDate?: string;
    endDate?: string;
    compareEnabled?: string;
  }>;
}) {
  const params = await searchParams;

  // Parse date range from URL
  const dateRange = {
    preset: (params.preset as any) || 'last30days',
    startDate: params.startDate ? new Date(params.startDate) : undefined,
    endDate: params.endDate ? new Date(params.endDate) : undefined,
    compareEnabled: params.compareEnabled === 'true',
  };

  // Set default dates if not provided
  if (!dateRange.startDate || !dateRange.endDate) {
    const today = new Date();
    dateRange.endDate = today;
    dateRange.startDate = new Date();
    dateRange.startDate.setDate(today.getDate() - 30);
  }

  // Fetch all metrics
  const [activeUsers, funnelData, subscriptionMetrics, operationalLoad] =
    await Promise.all([
      getActiveUsers(dateRange, {}),
      getConversionFunnel(dateRange, {}),
      getSubscriptionMetrics(dateRange),
      getOperationalLoad(dateRange),
    ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics Overview</h1>
        <p className="text-gray-600 mt-2">
          Key metrics and insights across the platform
        </p>
      </div>

      {/* Filters - Client component will be added in next task */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-gray-500">
            Showing data for last 30 days
          </p>
        </CardContent>
      </Card>

      {/* User Activity Metrics */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">User Activity</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard
            title="Daily Active Users"
            value={activeUsers.dau}
            icon="📊"
            trend={
              activeUsers.comparison
                ? {
                    value: activeUsers.comparison.dauChange,
                    isPositive: activeUsers.comparison.dauChange > 0,
                  }
                : undefined
            }
          />
          <MetricCard
            title="Weekly Active Users"
            value={activeUsers.wau}
            icon="📈"
            trend={
              activeUsers.comparison
                ? {
                    value: activeUsers.comparison.wauChange,
                    isPositive: activeUsers.comparison.wauChange > 0,
                  }
                : undefined
            }
          />
          <MetricCard
            title="Monthly Active Users"
            value={activeUsers.mau}
            icon="📅"
            trend={
              activeUsers.comparison
                ? {
                    value: activeUsers.comparison.mauChange,
                    isPositive: activeUsers.comparison.mauChange > 0,
                  }
                : undefined
            }
          />
        </div>
      </div>

      {/* Conversion Funnel */}
      <Card>
        <CardHeader>
          <CardTitle>Conversion Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <FunnelChart stages={funnelData} />
        </CardContent>
      </Card>

      {/* Subscription Metrics */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Subscription Metrics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <MetricCard
            title="Free Users"
            value={subscriptionMetrics.freeUsers}
            icon="👤"
          />
          <MetricCard
            title="Pro Users"
            value={subscriptionMetrics.proUsers}
            icon="⭐"
          />
          <MetricCard
            title="Conversion Rate"
            value={`${subscriptionMetrics.conversionRate.toFixed(1)}%`}
            subtitle="Free → Pro"
            icon="📊"
          />
          <MetricCard
            title="MRR"
            value={`$${subscriptionMetrics.mrr.toFixed(0)}`}
            subtitle="Monthly Recurring Revenue"
            icon="💰"
          />
        </div>
      </div>

      {/* Operational Load */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Operational Load
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <MetricCard
            title="Pending Certifications"
            value={operationalLoad.pendingCertifications}
            subtitle={`Avg review time: ${operationalLoad.avgCertificationReviewTime.toFixed(1)}h`}
            icon="⏳"
            href="/admin/certifications"
          />
          <MetricCard
            title="Moderation Queue"
            value={operationalLoad.moderationQueueBacklog}
            subtitle={`Avg resolution: ${operationalLoad.avgModerationResolutionTime.toFixed(1)}h`}
            icon="🚨"
            href="/admin/moderation"
          />
        </div>

        {/* Weekly Trend Chart */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Queue Trends (7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {operationalLoad.weeklyTrend.map((day) => (
                <div key={day.date} className="flex items-center gap-4">
                  <span className="text-sm text-gray-600 w-24">
                    {new Date(day.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  <div className="flex-1 flex gap-2">
                    <div className="flex-1">
                      <div className="text-xs text-gray-600 mb-1">
                        Certifications: {day.pendingCerts}
                      </div>
                      <div className="w-full bg-gray-200 rounded h-4">
                        <div
                          className="bg-blue-500 h-4 rounded"
                          style={{
                            width: `${Math.min(
                              (day.pendingCerts / 100) * 100,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-gray-600 mb-1">
                        Reports: {day.pendingReports}
                      </div>
                      <div className="w-full bg-gray-200 rounded h-4">
                        <div
                          className="bg-red-500 h-4 rounded"
                          style={{
                            width: `${Math.min(
                              (day.pendingReports / 50) * 100,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add app/admin/analytics/overview/page.tsx components/admin/trend-indicator.tsx components/admin/funnel-chart.tsx
git commit -m "feat(admin): add analytics overview page with all Phase 1 metrics"
```

---

## Task 11: Update Admin Navigation

**Files:**
- Modify: `components/admin/admin-sidebar.tsx`

**Step 1: Add analytics overview link**

```typescript
// components/admin/admin-sidebar.tsx
// Add to navigation links array:

const navLinks = [
  // ... existing links ...
  {
    href: '/admin/analytics/overview',
    label: 'Analytics Overview',
    icon: '📊',
  },
  // ... rest of links ...
];
```

**Step 2: Commit**

```bash
git add components/admin/admin-sidebar.tsx
git commit -m "feat(admin): add analytics overview to navigation"
```

---

## Task 12: Update Monitoring Dashboard with Role/Subscription Filters

**Files:**
- Modify: `app/admin/monitoring/page.tsx`

**Step 1: Add filter UI and grouping to monitoring page**

```typescript
// app/admin/monitoring/page.tsx
// In the MonitoringContent component, add after health metrics:

<Card>
  <CardHeader>
    <CardTitle>Error Distribution by User Segment</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <h4 className="font-semibold mb-2">By Role</h4>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Workers:</span>
            <span className="font-medium">--</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Employers:</span>
            <span className="font-medium">--</span>
          </div>
        </div>
      </div>
      <div>
        <h4 className="font-semibold mb-2">By Subscription</h4>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Free:</span>
            <span className="font-medium">--</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Pro:</span>
            <span className="font-medium">--</span>
          </div>
        </div>
      </div>
    </div>
    <p className="text-xs text-gray-500 mt-4">
      Note: User segment tracking will populate as errors are reported with enhanced context
    </p>
  </CardContent>
</Card>
```

**Step 2: Commit**

```bash
git add app/admin/monitoring/page.tsx
git commit -m "feat(monitoring): add error distribution by user segment placeholder"
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

3. **Visit analytics overview:**
   Navigate to: `http://localhost:3000/admin/analytics/overview`
   Expected: See DAU/WAU/MAU metrics, conversion funnel, subscription metrics, operational load

4. **Check Sentry context:**
   - Trigger an error while logged in
   - Check Sentry dashboard for user context (role, subscription_status, location)
   - Verify tags are present (user_role, subscription_tier)

5. **Verify monitoring updates:**
   Navigate to: `http://localhost:3000/admin/monitoring`
   Expected: See error distribution section (will populate with real data over time)

---

## Success Criteria

- ✅ Date range picker works with presets and custom range
- ✅ Segment filter allows filtering by role, subscription, location
- ✅ Analytics overview shows DAU/WAU/MAU with trend indicators
- ✅ Conversion funnel displays signup → profile → action with drop-off rates
- ✅ Subscription metrics show free/pro split and MRR
- ✅ Operational load displays pending queues and average times
- ✅ Sentry captures enhanced user context (role, subscription, location)
- ✅ Sentry logs feature tags for job creation actions
- ✅ All tests pass
- ✅ No TypeScript errors

---

**Phase 1 Complete!** Ready to proceed to Phase 2 (Retention Analytics) after review.
