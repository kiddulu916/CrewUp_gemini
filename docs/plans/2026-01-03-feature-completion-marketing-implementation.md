# Feature Completion & Marketing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement Pro analytics features (Profile Analytics, Candidate Analytics, Compatibility Scoring) and marketing pages (Landing, About, How-It-Works) with SEO optimization

**Architecture:** Server Actions for data fetching, React Query for caching, Recharts for visualization, Pro feature gating with FeatureGate component, mobile-first responsive design

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase, React Query, Recharts, Tailwind CSS

**Reference Design:** `docs/plans/2026-01-03-feature-completion-and-marketing-design.md`

---

## Phase A: Feature Completion (Pro Features)

### Task 1: Database Migrations - Analytics Indexes

**Goal:** Add database indexes for efficient analytics queries

**Files:**
- Create: `supabase/migrations/046_analytics_indexes.sql`

**Step 1: Create migration file**

```sql
-- supabase/migrations/046_analytics_indexes.sql
-- Add indexes for analytics performance

-- Profile views indexes
CREATE INDEX IF NOT EXISTS idx_profile_views_date
  ON profile_views(viewed_profile_id, viewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_profile_views_viewer
  ON profile_views(viewer_id, viewed_at DESC);

-- Job applications indexes
CREATE INDEX IF NOT EXISTS idx_applications_status
  ON job_applications(job_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_applications_employer
  ON job_applications(employer_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_applications_created
  ON job_applications(employer_id, created_at DESC);

-- Jobs indexes
CREATE INDEX IF NOT EXISTS idx_jobs_employer
  ON jobs(employer_id, created_at DESC);

-- Compatibility scoring indexes
CREATE INDEX IF NOT EXISTS idx_certifications_user
  ON certifications(user_id, certification_type);

CREATE INDEX IF NOT EXISTS idx_experiences_user
  ON experiences(user_id);
```

**Step 2: Apply migration to local database**

Run: `psql -h localhost -U postgres -d krewup < supabase/migrations/046_analytics_indexes.sql`
(Or use Supabase Dashboard SQL Editor to run the migration)
Expected: Indexes created successfully

**Step 3: Verify indexes created**

Run SQL query in Supabase Dashboard:
```sql
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY indexname;
```
Expected: All 8 new indexes listed

---

### Task 2: Job Compatibility Scoring - Algorithm & Types

**Goal:** Build pure function to calculate job-worker compatibility score

**Files:**
- Create: `features/jobs/utils/compatibility-scoring.ts`
- Create: `features/jobs/types/compatibility.ts`

**Step 1: Create compatibility types file**

```typescript
// features/jobs/types/compatibility.ts
export type CompatibilityScore = {
  totalScore: number; // 0-100
  breakdown: {
    tradeMatch: number;      // 0-30 points
    certMatch: number;       // 0-30 points
    distanceMatch: number;   // 0-20 points
    experienceMatch: number; // 0-20 points
  };
  gaps: string[]; // Missing certifications
  isPerfectMatch: boolean; // totalScore >= 90
};

export type CompatibilityInput = {
  job: {
    trade: string;
    sub_trade: string | null;
    required_certifications: string[];
    years_experience_required: number | null;
    location: string;
    coords: any; // PostGIS point
  };
  worker: {
    trade: string;
    sub_trade: string | null;
    location: string;
    coords: any; // PostGIS point
  };
  workerCerts: string[]; // certification types worker has
  workerExperience: number; // total years of experience
  distance: number; // in miles (pre-calculated)
};
```

**Step 2: Create compatibility scoring utility**

```typescript
// features/jobs/utils/compatibility-scoring.ts
import type { CompatibilityScore, CompatibilityInput } from '../types/compatibility';

/**
 * Calculate Trade/Sub-trade Match Score (0-30 points)
 */
function calculateTradeScore(
  jobTrade: string,
  jobSubTrade: string | null,
  workerTrade: string,
  workerSubTrade: string | null
): number {
  const jobTradeNorm = jobTrade.toLowerCase().trim();
  const workerTradeNorm = workerTrade.toLowerCase().trim();
  const jobSubTradeNorm = jobSubTrade?.toLowerCase().trim() || null;
  const workerSubTradeNorm = workerSubTrade?.toLowerCase().trim() || null;

  // Exact trade + sub-trade match
  if (jobTradeNorm === workerTradeNorm &&
      jobSubTradeNorm &&
      workerSubTradeNorm &&
      jobSubTradeNorm === workerSubTradeNorm) {
    return 30;
  }

  // Trade match, different or missing sub-trade
  if (jobTradeNorm === workerTradeNorm) {
    return 20;
  }

  // Related trades (simple heuristic - contains similar keywords)
  // This is a basic implementation - can be enhanced with a mapping table
  const relatedTrades: Record<string, string[]> = {
    'electrical': ['electrician', 'electric', 'electrical'],
    'plumbing': ['plumber', 'plumbing', 'pipefitter'],
    'carpentry': ['carpenter', 'carpentry', 'framing', 'framer'],
    'hvac': ['hvac', 'heating', 'cooling', 'air conditioning'],
  };

  for (const [key, variations] of Object.entries(relatedTrades)) {
    const jobInGroup = variations.some(v => jobTradeNorm.includes(v));
    const workerInGroup = variations.some(v => workerTradeNorm.includes(v));
    if (jobInGroup && workerInGroup) {
      return 10;
    }
  }

  return 0;
}

/**
 * Calculate Certifications Match Score (0-30 points)
 */
function calculateCertScore(
  requiredCerts: string[],
  workerCerts: string[]
): { score: number; gaps: string[] } {
  if (requiredCerts.length === 0) {
    // No certifications required - full score
    return { score: 30, gaps: [] };
  }

  const requiredSet = new Set(requiredCerts.map(c => c.toLowerCase().trim()));
  const workerSet = new Set(workerCerts.map(c => c.toLowerCase().trim()));

  const matches = [...requiredSet].filter(cert => workerSet.has(cert));
  const gaps = [...requiredSet].filter(cert => !workerSet.has(cert));

  const matchPercentage = matches.length / requiredCerts.length;
  const score = Math.round(matchPercentage * 30);

  return { score, gaps };
}

/**
 * Calculate Distance Match Score (0-20 points)
 */
function calculateDistanceScore(distanceMiles: number): number {
  if (distanceMiles <= 10) return 20;
  if (distanceMiles <= 25) return 15;
  if (distanceMiles <= 50) return 10;
  if (distanceMiles <= 100) return 5;
  return 2;
}

/**
 * Calculate Experience Match Score (0-20 points)
 */
function calculateExperienceScore(
  requiredYears: number | null,
  workerYears: number
): number {
  if (!requiredYears || requiredYears === 0) {
    // No experience requirement - full score
    return 20;
  }

  const percentage = workerYears / requiredYears;

  if (percentage >= 1.0) return 20;
  if (percentage >= 0.75) return 15;
  if (percentage >= 0.5) return 10;
  if (percentage >= 0.25) return 5;
  return 0;
}

/**
 * Main compatibility scoring function
 */
export function calculateCompatibility(input: CompatibilityInput): CompatibilityScore {
  const { job, worker, workerCerts, workerExperience, distance } = input;

  // Calculate individual scores
  const tradeMatch = calculateTradeScore(
    job.trade,
    job.sub_trade,
    worker.trade,
    worker.sub_trade
  );

  const { score: certMatch, gaps: certGaps } = calculateCertScore(
    job.required_certifications || [],
    workerCerts
  );

  const distanceMatch = calculateDistanceScore(distance);

  const experienceMatch = calculateExperienceScore(
    job.years_experience_required,
    workerExperience
  );

  // Calculate total score
  const totalScore = tradeMatch + certMatch + distanceMatch + experienceMatch;

  return {
    totalScore,
    breakdown: {
      tradeMatch,
      certMatch,
      distanceMatch,
      experienceMatch,
    },
    gaps: certGaps,
    isPerfectMatch: totalScore >= 90,
  };
}

/**
 * Get badge color based on score
 */
export function getScoreBadgeColor(score: number): {
  bg: string;
  text: string;
  label: string;
} {
  if (score >= 90) {
    return { bg: 'bg-green-100', text: 'text-green-700', label: 'Perfect' };
  }
  if (score >= 75) {
    return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Great' };
  }
  if (score >= 60) {
    return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Good' };
  }
  return { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Fair' };
}
```

**Step 3: Create unit test file**

```typescript
// __tests__/utils/compatibility-scoring.test.ts
import { describe, it, expect } from 'vitest';
import { calculateCompatibility } from '@/features/jobs/utils/compatibility-scoring';
import type { CompatibilityInput } from '@/features/jobs/types/compatibility';

describe('calculateCompatibility', () => {
  const mockInput: CompatibilityInput = {
    job: {
      trade: 'Electrical',
      sub_trade: 'Commercial',
      required_certifications: ['Licensed Electrician', 'OSHA 30'],
      years_experience_required: 5,
      location: 'Chicago, IL',
      coords: null,
    },
    worker: {
      trade: 'Electrical',
      sub_trade: 'Commercial',
      location: 'Chicago, IL',
      coords: null,
    },
    workerCerts: ['Licensed Electrician', 'OSHA 30'],
    workerExperience: 7,
    distance: 5,
  };

  it('should return perfect score (100) for perfect match', () => {
    const result = calculateCompatibility(mockInput);

    expect(result.totalScore).toBe(100);
    expect(result.breakdown.tradeMatch).toBe(30);
    expect(result.breakdown.certMatch).toBe(30);
    expect(result.breakdown.distanceMatch).toBe(20);
    expect(result.breakdown.experienceMatch).toBe(20);
    expect(result.gaps).toEqual([]);
    expect(result.isPerfectMatch).toBe(true);
  });

  it('should calculate trade match correctly - same trade, different sub-trade', () => {
    const input = {
      ...mockInput,
      worker: { ...mockInput.worker, sub_trade: 'Residential' },
    };

    const result = calculateCompatibility(input);
    expect(result.breakdown.tradeMatch).toBe(20);
  });

  it('should calculate trade match correctly - different trade', () => {
    const input = {
      ...mockInput,
      worker: { ...mockInput.worker, trade: 'Plumbing', sub_trade: null },
    };

    const result = calculateCompatibility(input);
    expect(result.breakdown.tradeMatch).toBe(0);
  });

  it('should calculate cert match with gaps', () => {
    const input = {
      ...mockInput,
      workerCerts: ['Licensed Electrician'], // Missing OSHA 30
    };

    const result = calculateCompatibility(input);
    expect(result.breakdown.certMatch).toBe(15); // 1/2 certs = 50% = 15 points
    expect(result.gaps).toContain('osha 30');
  });

  it('should give full cert score when no certs required', () => {
    const input = {
      ...mockInput,
      job: { ...mockInput.job, required_certifications: [] },
    };

    const result = calculateCompatibility(input);
    expect(result.breakdown.certMatch).toBe(30);
    expect(result.gaps).toEqual([]);
  });

  it('should calculate distance score correctly', () => {
    const testCases = [
      { distance: 5, expected: 20 },
      { distance: 15, expected: 15 },
      { distance: 35, expected: 10 },
      { distance: 75, expected: 5 },
      { distance: 150, expected: 2 },
    ];

    testCases.forEach(({ distance, expected }) => {
      const input = { ...mockInput, distance };
      const result = calculateCompatibility(input);
      expect(result.breakdown.distanceMatch).toBe(expected);
    });
  });

  it('should calculate experience score correctly', () => {
    const testCases = [
      { workerExp: 10, requiredExp: 5, expected: 20 }, // 200% = full score
      { workerExp: 4, requiredExp: 5, expected: 15 },  // 80% = 15 points
      { workerExp: 3, requiredExp: 5, expected: 10 },  // 60% = 10 points
      { workerExp: 1, requiredExp: 5, expected: 5 },   // 20% = 5 points
      { workerExp: 0, requiredExp: 5, expected: 0 },   // 0% = 0 points
    ];

    testCases.forEach(({ workerExp, requiredExp, expected }) => {
      const input = {
        ...mockInput,
        job: { ...mockInput.job, years_experience_required: requiredExp },
        workerExperience: workerExp,
      };
      const result = calculateCompatibility(input);
      expect(result.breakdown.experienceMatch).toBe(expected);
    });
  });

  it('should give full experience score when no experience required', () => {
    const input = {
      ...mockInput,
      job: { ...mockInput.job, years_experience_required: null },
      workerExperience: 0,
    };

    const result = calculateCompatibility(input);
    expect(result.breakdown.experienceMatch).toBe(20);
  });

  it('should handle edge case - all zeros', () => {
    const input: CompatibilityInput = {
      job: {
        trade: 'Electrical',
        sub_trade: null,
        required_certifications: ['Test Cert'],
        years_experience_required: 5,
        location: 'Test',
        coords: null,
      },
      worker: {
        trade: 'Plumbing',
        sub_trade: null,
        location: 'Test',
        coords: null,
      },
      workerCerts: [],
      workerExperience: 0,
      distance: 200,
    };

    const result = calculateCompatibility(input);
    expect(result.totalScore).toBe(2); // Only 2 points from distance
    expect(result.isPerfectMatch).toBe(false);
  });
});
```

**Step 4: Run tests to verify they pass**

Run: `npm test __tests__/utils/compatibility-scoring.test.ts`
Expected: All tests pass

---

### Task 3: Job Compatibility Scoring - Job Card Badge

**Goal:** Add compatibility score badge to job cards (Pro users only)

**Files:**
- Modify: `features/jobs/components/job-card.tsx`

**Step 1: Read existing job-card.tsx to understand structure**

Run: `cat features/jobs/components/job-card.tsx | head -50`
Expected: See existing JobCard component structure

**Step 2: Add compatibility badge to job card**

Add these imports at the top:
```typescript
import { useIsPro } from '@/features/subscriptions/hooks/use-subscription';
import { calculateCompatibility, getScoreBadgeColor } from '../utils/compatibility-scoring';
import type { CompatibilityInput } from '../types/compatibility';
```

Add compatibility calculation inside the component (before the return statement):
```typescript
const isPro = useIsPro();

// Calculate compatibility score for Pro users
const compatibilityScore = React.useMemo(() => {
  if (!isPro || !currentUser) return null;

  // Build compatibility input
  const input: CompatibilityInput = {
    job: {
      trade: job.trade,
      sub_trade: job.sub_trade,
      required_certifications: job.required_certifications || [],
      years_experience_required: job.years_experience_required,
      location: job.location,
      coords: job.coords,
    },
    worker: {
      trade: currentUser.trade || '',
      sub_trade: currentUser.sub_trade || null,
      location: currentUser.location || '',
      coords: currentUser.coords,
    },
    workerCerts: currentUser.certifications || [],
    workerExperience: currentUser.total_years_experience || 0,
    distance: job.distance || 999,
  };

  return calculateCompatibility(input);
}, [isPro, currentUser, job]);

const badgeColor = compatibilityScore
  ? getScoreBadgeColor(compatibilityScore.totalScore)
  : null;
```

Add badge to the card (in the return JSX, at the top-right corner):
```typescript
{/* Compatibility Badge - Pro Only */}
{isPro && compatibilityScore && badgeColor && (
  <div className="absolute top-2 right-2 z-10">
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${badgeColor.bg} ${badgeColor.text} shadow-md`}>
      {compatibilityScore.totalScore}% Match
    </span>
  </div>
)}
```

**Step 3: Test in browser**

1. Login as Pro worker
2. Navigate to /dashboard/jobs
3. Verify compatibility badges appear on job cards
4. Login as free worker
5. Verify NO badges appear

---

### Task 4: Job Compatibility Scoring - Job Detail Breakdown

**Goal:** Add detailed compatibility breakdown card to job detail page

**Files:**
- Create: `features/jobs/components/compatibility-breakdown.tsx`
- Modify: `app/dashboard/jobs/[id]/page.tsx`

**Step 1: Create compatibility breakdown component**

```typescript
// features/jobs/components/compatibility-breakdown.tsx
'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import type { CompatibilityScore } from '../types/compatibility';
import { getScoreBadgeColor } from '../utils/compatibility-scoring';

interface CompatibilityBreakdownProps {
  score: CompatibilityScore;
}

export function CompatibilityBreakdown({ score }: CompatibilityBreakdownProps) {
  const router = useRouter();
  const badgeColor = getScoreBadgeColor(score.totalScore);

  return (
    <Card className="p-6">
      <h3 className="text-xl font-bold mb-4">Your Compatibility</h3>

      {/* Overall Score */}
      <div className="flex items-center justify-center mb-6">
        <div className="relative w-32 h-32">
          {/* Simple percentage ring - can be enhanced with circular progress */}
          <div className={`w-full h-full rounded-full ${badgeColor.bg} flex items-center justify-center`}>
            <div className="text-center">
              <div className={`text-3xl font-bold ${badgeColor.text}`}>
                {score.totalScore}%
              </div>
              <div className={`text-sm ${badgeColor.text}`}>
                {badgeColor.label}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown */}
      <div className="space-y-3 mb-6">
        <ScoreBar
          label="Trade Match"
          score={score.breakdown.tradeMatch}
          maxScore={30}
          color="blue"
        />
        <ScoreBar
          label="Certifications"
          score={score.breakdown.certMatch}
          maxScore={30}
          color="green"
        />
        <ScoreBar
          label="Distance"
          score={score.breakdown.distanceMatch}
          maxScore={20}
          color="purple"
        />
        <ScoreBar
          label="Experience"
          score={score.breakdown.experienceMatch}
          maxScore={20}
          color="orange"
        />
      </div>

      {/* Missing Certifications */}
      {score.gaps.length > 0 && (
        <div className="border-t pt-4">
          <h4 className="font-semibold mb-2 text-gray-700">What You're Missing</h4>
          <ul className="space-y-1 mb-4">
            {score.gaps.map((cert, idx) => (
              <li key={idx} className="text-sm text-gray-600 flex items-start">
                <span className="text-red-500 mr-2">•</span>
                <span className="capitalize">{cert}</span>
              </li>
            ))}
          </ul>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/dashboard/profile/certifications')}
          >
            Add Certifications
          </Button>
        </div>
      )}

      {/* Perfect Match Message */}
      {score.isPerfectMatch && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <p className="text-green-800 font-semibold">
            🎯 Perfect Match! You meet all requirements for this job.
          </p>
        </div>
      )}
    </Card>
  );
}

interface ScoreBarProps {
  label: string;
  score: number;
  maxScore: number;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

function ScoreBar({ label, score, maxScore, color }: ScoreBarProps) {
  const percentage = (score / maxScore) * 100;

  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
  };

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="text-gray-600">{score}/{maxScore}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`${colorClasses[color]} h-2 rounded-full transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
```

**Step 2: Integrate into job detail page**

In `app/dashboard/jobs/[id]/page.tsx`, add after job description:

```typescript
import { CompatibilityBreakdown } from '@/features/jobs/components/compatibility-breakdown';
import { useIsPro } from '@/features/subscriptions/hooks/use-subscription';
import { calculateCompatibility } from '@/features/jobs/utils/compatibility-scoring';

// Inside the component:
const isPro = useIsPro();

// Calculate compatibility (same as job-card.tsx)
const compatibilityScore = React.useMemo(() => {
  if (!isPro || !currentUser) return null;
  // ... same calculation as job-card
}, [isPro, currentUser, job]);

// In the JSX, after job description card:
{isPro && compatibilityScore && (
  <CompatibilityBreakdown score={compatibilityScore} />
)}
```

**Step 3: Test breakdown display**

1. Login as Pro worker
2. Navigate to a job detail page
3. Verify compatibility breakdown card shows
4. Check all 4 score bars display correctly
5. If missing certs, verify gaps section shows

**Step 4: Commit compatibility scoring**

Expected: All compatibility scoring features working for Pro users

---

### Task 5: Profile Analytics - Enhance Server Action

**Goal:** Update getMyProfileViews to return daily aggregated view counts

**Files:**
- Modify: `features/subscriptions/actions/profile-views-actions.ts`

**Step 1: Read existing profile-views-actions.ts**

Run: `cat features/subscriptions/actions/profile-views-actions.ts`
Expected: See existing getMyProfileViews() function

**Step 2: Add daily aggregation to getMyProfileViews**

Update the return type first:
```typescript
export type ProfileViewsResult = {
  success: boolean;
  error?: string;
  views?: ProfileView[];
  weeklyCount?: number;
  dailyViews?: Array<{ date: string; count: number }>; // NEW
};
```

Update the `getMyProfileViews()` function to add daily aggregation:

After the existing views query, add:
```typescript
// Get daily aggregated views for last 30 days
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

const { data: allViews, error: allViewsError } = await supabase
  .from('profile_views')
  .select('viewed_at')
  .eq('viewed_profile_id', user.id)
  .gte('viewed_at', thirtyDaysAgo.toISOString())
  .order('viewed_at', { ascending: true });

if (allViewsError) {
  console.error('Error fetching all views:', allViewsError);
  // Continue without daily data - not critical
}

// Aggregate views by date
const dailyViewsMap = new Map<string, number>();
allViews?.forEach((view) => {
  const date = new Date(view.viewed_at).toISOString().split('T')[0]; // YYYY-MM-DD
  dailyViewsMap.set(date, (dailyViewsMap.get(date) || 0) + 1);
});

// Convert to array format for Recharts
const dailyViews = Array.from(dailyViewsMap.entries())
  .map(([date, count]) => ({ date, count }))
  .sort((a, b) => a.date.localeCompare(b.date));

// Fill in missing days with 0 counts
const filledDailyViews: Array<{ date: string; count: number }> = [];
const today = new Date();
for (let i = 29; i >= 0; i--) {
  const date = new Date(today);
  date.setDate(date.getDate() - i);
  const dateStr = date.toISOString().split('T')[0];
  const existingData = dailyViews.find(d => d.date === dateStr);
  filledDailyViews.push({
    date: dateStr,
    count: existingData?.count || 0,
  });
}

return {
  success: true,
  views: views as unknown as ProfileView[],
  weeklyCount,
  dailyViews: filledDailyViews, // NEW
};
```

**Step 3: Test the updated action**

Create a test API route temporarily to test:
```typescript
// app/api/test-profile-views/route.ts
import { getMyProfileViews } from '@/features/subscriptions/actions/profile-views-actions';

export async function GET() {
  const result = await getMyProfileViews();
  return Response.json(result);
}
```

Navigate to `/api/test-profile-views` and verify `dailyViews` array is present

**Step 4: Remove test API route**

Delete `app/api/test-profile-views/route.ts`

---

### Task 6: Profile Analytics - Chart Component

**Goal:** Create line chart component for profile views over time

**Files:**
- Create: `features/subscriptions/components/profile-views-chart.tsx`

**Step 1: Create profile views chart component**

```typescript
// features/subscriptions/components/profile-views-chart.tsx
'use client';

import { Card } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ProfileViewsChartProps {
  data: Array<{ date: string; count: number }>;
}

export function ProfileViewsChart({ data }: ProfileViewsChartProps) {
  // Format date for display (MM/DD)
  const formattedData = data.map(item => ({
    ...item,
    displayDate: new Date(item.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
  }));

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Profile Views (Last 30 Days)</h3>

      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="displayDate"
            tick={{ fontSize: 12 }}
            interval="preserveStartEnd"
            minTickGap={30}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
            }}
            labelStyle={{ fontWeight: 'bold' }}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#2563eb"
            strokeWidth={2}
            dot={{ fill: '#2563eb', r: 3 }}
            activeDot={{ r: 5 }}
            name="Views"
          />
        </LineChart>
      </ResponsiveContainer>

      <p className="text-sm text-gray-600 mt-4 text-center">
        Track how many employers are viewing your profile over time
      </p>
    </Card>
  );
}
```

**Step 2: Update ProfileViewsList to include chart**

In `features/subscriptions/components/profile-views-list.tsx`:

Add import:
```typescript
import { ProfileViewsChart } from './profile-views-chart';
```

Add chart before the views list (in the Pro user section):
```typescript
// Pro user - show views list
return (
  <div className="space-y-6">
    {/* Weekly Summary */}
    <Card className="p-4 bg-blue-50 border-blue-200">
      <p className="text-center text-blue-900">
        <strong className="text-2xl">{weeklyCount}</strong>{' '}
        <span className="text-sm">{weeklyCount === 1 ? 'view' : 'views'} this week</span>
      </p>
    </Card>

    {/* Chart */}
    {viewsData.dailyViews && viewsData.dailyViews.length > 0 && (
      <ProfileViewsChart data={viewsData.dailyViews} />
    )}

    {/* Recent Viewers List */}
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Recent Viewers</h3>
      {/* ... existing viewer list code ... */}
    </Card>
  </div>
);
```

**Step 3: Test profile analytics**

1. Login as Pro worker
2. Navigate to profile page (where ProfileViewsList is displayed)
3. Verify chart shows 30-day trend
4. Verify weekly summary card shows
5. Verify recent viewers list still works

---

### Task 7: Candidate Analytics - Server Actions

**Goal:** Create server actions for candidate analytics (employers)

**Files:**
- Create: `features/jobs/actions/candidate-analytics-actions.ts`
- Create: `features/jobs/types/candidate-analytics.ts`

**Step 1: Create candidate analytics types**

```typescript
// features/jobs/types/candidate-analytics.ts
export type CandidateAnalytics = {
  totalApplications: number;
  pipeline: {
    pending: number;
    viewed: number;
    contacted: number; // has messaged applicant
    hired: number;
  };
  conversionRate: number; // (hired / total) * 100
  avgTimeToHire: number | null; // avg days from application to hired
  chartData: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
};
```

**Step 2: Create candidate analytics server action**

```typescript
// features/jobs/actions/candidate-analytics-actions.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import type { CandidateAnalytics } from '../types/candidate-analytics';

type CandidateAnalyticsResult = {
  success: boolean;
  analytics?: CandidateAnalytics;
  error?: string;
};

/**
 * Get candidate analytics for employer
 * @param jobId - Optional job ID. If provided, returns analytics for that job only.
 *                If omitted, returns aggregated analytics across all employer's jobs.
 */
export async function getCandidateAnalytics(
  jobId?: string
): Promise<CandidateAnalyticsResult> {
  try {
    const supabase = await createClient(await cookies());

    // 1. Authentication check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // 2. Pro + Employer verification
    const { data: profile } = await supabase
      .from('users')
      .select('role, subscription_status')
      .eq('id', user.id)
      .single();

    if (profile?.subscription_status !== 'pro') {
      return { success: false, error: 'Pro subscription required' };
    }

    if (profile?.role !== 'employer') {
      return { success: false, error: 'This feature is only available to employers' };
    }

    // 3. Build query based on whether jobId is provided
    let query = supabase
      .from('job_applications')
      .select('id, status, created_at, updated_at, job_id');

    if (jobId) {
      // Per-job analytics: filter by job_id and verify ownership
      const { data: job } = await supabase
        .from('jobs')
        .select('id, employer_id')
        .eq('id', jobId)
        .single();

      if (!job || job.employer_id !== user.id) {
        return { success: false, error: 'Job not found or access denied' };
      }

      query = query.eq('job_id', jobId);
    } else {
      // All jobs analytics: get all jobs by this employer first
      const { data: employerJobs } = await supabase
        .from('jobs')
        .select('id')
        .eq('employer_id', user.id);

      if (!employerJobs || employerJobs.length === 0) {
        // No jobs yet - return empty analytics
        return {
          success: true,
          analytics: {
            totalApplications: 0,
            pipeline: { pending: 0, viewed: 0, contacted: 0, hired: 0 },
            conversionRate: 0,
            avgTimeToHire: null,
            chartData: [],
          },
        };
      }

      const jobIds = employerJobs.map(j => j.id);
      query = query.in('job_id', jobIds);
    }

    const { data: applications, error: appsError } = await query;

    if (appsError) {
      console.error('Error fetching applications:', appsError);
      return { success: false, error: 'Failed to fetch applications' };
    }

    if (!applications || applications.length === 0) {
      // No applications yet
      return {
        success: true,
        analytics: {
          totalApplications: 0,
          pipeline: { pending: 0, viewed: 0, contacted: 0, hired: 0 },
          conversionRate: 0,
          avgTimeToHire: null,
          chartData: [],
        },
      };
    }

    // 4. Calculate pipeline counts
    const pipeline = {
      pending: applications.filter(a => a.status === 'pending').length,
      viewed: applications.filter(a => a.status === 'viewed').length,
      contacted: applications.filter(a => a.status === 'contacted').length,
      hired: applications.filter(a => a.status === 'hired').length,
    };

    const totalApplications = applications.length;

    // 5. Calculate conversion rate
    const conversionRate = totalApplications > 0
      ? Math.round((pipeline.hired / totalApplications) * 100)
      : 0;

    // 6. Calculate average time-to-hire (only for hired applications)
    const hiredApps = applications.filter(a => a.status === 'hired');
    let avgTimeToHire: number | null = null;

    if (hiredApps.length > 0) {
      const totalDays = hiredApps.reduce((sum, app) => {
        const created = new Date(app.created_at);
        const hired = new Date(app.updated_at);
        const days = Math.floor((hired.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        return sum + days;
      }, 0);

      avgTimeToHire = Math.round(totalDays / hiredApps.length);
    }

    // 7. Build chart data (funnel)
    const chartData = [
      {
        status: 'Pending',
        count: pipeline.pending,
        percentage: Math.round((pipeline.pending / totalApplications) * 100),
      },
      {
        status: 'Viewed',
        count: pipeline.viewed,
        percentage: Math.round((pipeline.viewed / totalApplications) * 100),
      },
      {
        status: 'Contacted',
        count: pipeline.contacted,
        percentage: Math.round((pipeline.contacted / totalApplications) * 100),
      },
      {
        status: 'Hired',
        count: pipeline.hired,
        percentage: Math.round((pipeline.hired / totalApplications) * 100),
      },
    ];

    return {
      success: true,
      analytics: {
        totalApplications,
        pipeline,
        conversionRate,
        avgTimeToHire,
        chartData,
      },
    };
  } catch (error: any) {
    console.error('Error in getCandidateAnalytics:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
```

**Step 3: Test the server action**

Create temporary test route:
```typescript
// app/api/test-candidate-analytics/route.ts
import { getCandidateAnalytics } from '@/features/jobs/actions/candidate-analytics-actions';

export async function GET() {
  const result = await getCandidateAnalytics();
  return Response.json(result);
}
```

Login as Pro employer, navigate to `/api/test-candidate-analytics`
Verify analytics data structure is correct

**Step 4: Remove test route**

Delete `app/api/test-candidate-analytics/route.ts`

---

### Task 8: Candidate Analytics - Pipeline Component

**Goal:** Create reusable candidate pipeline funnel chart

**Files:**
- Create: `features/jobs/components/candidate-pipeline.tsx`

**Step 1: Create candidate pipeline component**

```typescript
// features/jobs/components/candidate-pipeline.tsx
'use client';

import { Card } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { CandidateAnalytics } from '../types/candidate-analytics';

interface CandidatePipelineProps {
  analytics: CandidateAnalytics;
  title?: string;
}

const STATUS_COLORS = {
  Pending: '#3b82f6',    // blue
  Viewed: '#8b5cf6',     // purple
  Contacted: '#f59e0b',  // orange
  Hired: '#10b981',      // green
};

export function CandidatePipeline({ analytics, title = 'Candidate Pipeline' }: CandidatePipelineProps) {
  const { totalApplications, pipeline, conversionRate, avgTimeToHire, chartData } = analytics;

  if (totalApplications === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="text-gray-600">No applications yet</p>
        <p className="text-sm text-gray-500 mt-2">
          Applications will appear here as candidates apply to your jobs
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-xl font-bold mb-6">{title}</h3>

      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <MetricCard
          label="Total Applications"
          value={totalApplications}
          color="blue"
        />
        <MetricCard
          label="Conversion Rate"
          value={`${conversionRate}%`}
          color="green"
        />
        <MetricCard
          label="Avg Time to Hire"
          value={avgTimeToHire !== null ? `${avgTimeToHire} days` : 'N/A'}
          color="purple"
        />
      </div>

      {/* Funnel Chart */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Application Status Breakdown</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis dataKey="status" type="category" tick={{ fontSize: 12 }} width={80} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
              }}
              formatter={(value: number, name: string, props: any) => [
                `${value} (${props.payload.percentage}%)`,
                'Applications',
              ]}
            />
            <Bar dataKey="count" radius={[0, 8, 8, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={STATUS_COLORS[entry.status as keyof typeof STATUS_COLORS]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pipeline Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <PipelineStage label="Pending" count={pipeline.pending} color="blue" />
        <PipelineStage label="Viewed" count={pipeline.viewed} color="purple" />
        <PipelineStage label="Contacted" count={pipeline.contacted} color="orange" />
        <PipelineStage label="Hired" count={pipeline.hired} color="green" />
      </div>
    </Card>
  );
}

interface MetricCardProps {
  label: string;
  value: string | number;
  color: 'blue' | 'green' | 'purple';
}

function MetricCard({ label, value, color }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    purple: 'bg-purple-50 text-purple-700',
  };

  return (
    <div className={`${colorClasses[color]} rounded-lg p-4 text-center`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm font-medium mt-1">{label}</p>
    </div>
  );
}

interface PipelineStageProps {
  label: string;
  count: number;
  color: 'blue' | 'purple' | 'orange' | 'green';
}

function PipelineStage({ label, count, color }: PipelineStageProps) {
  const colorClasses = {
    blue: 'border-blue-500 text-blue-700',
    purple: 'border-purple-500 text-purple-700',
    orange: 'border-orange-500 text-orange-700',
    green: 'border-green-500 text-green-700',
  };

  return (
    <div className={`border-l-4 ${colorClasses[color]} pl-3 py-2`}>
      <p className="text-lg font-bold">{count}</p>
      <p className="text-xs font-medium text-gray-600">{label}</p>
    </div>
  );
}
```

**Step 2: Test component in isolation**

Create a test page temporarily:
```typescript
// app/test-pipeline/page.tsx
import { CandidatePipeline } from '@/features/jobs/components/candidate-pipeline';

const mockAnalytics = {
  totalApplications: 42,
  pipeline: { pending: 15, viewed: 12, contacted: 10, hired: 5 },
  conversionRate: 12,
  avgTimeToHire: 14,
  chartData: [
    { status: 'Pending', count: 15, percentage: 36 },
    { status: 'Viewed', count: 12, percentage: 29 },
    { status: 'Contacted', count: 10, percentage: 24 },
    { status: 'Hired', count: 5, percentage: 12 },
  ],
};

export default function TestPipeline() {
  return (
    <div className="p-8">
      <CandidatePipeline analytics={mockAnalytics} />
    </div>
  );
}
```

Navigate to `/test-pipeline` and verify chart renders correctly

**Step 3: Delete test page**

Delete `app/test-pipeline/page.tsx`

---

### Task 9: Candidate Analytics - Central Dashboard Page

**Goal:** Create /dashboard/analytics page for Pro employers

**Files:**
- Create: `app/dashboard/analytics/page.tsx`

**Step 1: Create analytics page**

```typescript
// app/dashboard/analytics/page.tsx
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { FeatureGate } from '@/features/subscriptions/components/feature-gate';
import { getCandidateAnalytics } from '@/features/jobs/actions/candidate-analytics-actions';
import { CandidatePipeline } from '@/features/jobs/components/candidate-pipeline';

export default async function AnalyticsPage() {
  const supabase = await createClient(await cookies());

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role, subscription_status')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'employer') {
    redirect('/dashboard/feed');
  }

  // Get aggregated analytics across all jobs
  const analyticsResult = await getCandidateAnalytics();

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Track your hiring performance across all job postings
        </p>
      </div>

      <FeatureGate requiredPlan="pro">
        {analyticsResult.success && analyticsResult.analytics ? (
          <CandidatePipeline
            analytics={analyticsResult.analytics}
            title="All Jobs - Candidate Pipeline"
          />
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-800">
              {analyticsResult.error || 'Failed to load analytics'}
            </p>
          </div>
        )}
      </FeatureGate>
    </div>
  );
}
```

**Step 2: Add Analytics link to dashboard navigation**

In `app/dashboard/layout.tsx`, add navigation link for Pro employers:

Find the navigation section and add (after other nav links):
```typescript
{profile.role === 'employer' && profile.subscription_status === 'pro' && (
  <NavLink href="/dashboard/analytics" icon="📊" color="indigo">
    Analytics
  </NavLink>
)}
```

**Step 3: Test analytics page**

1. Login as Pro employer
2. Verify "Analytics" link appears in sidebar
3. Click link, verify `/dashboard/analytics` loads
4. Verify pipeline chart shows aggregated data
5. Login as free employer - verify no Analytics link
6. Navigate to `/dashboard/analytics` directly - verify feature gate blocks access

---

### Task 10: Candidate Analytics - Per-Job Integration

**Goal:** Embed candidate pipeline in job detail pages

**Files:**
- Modify: `app/dashboard/jobs/[id]/page.tsx`

**Step 1: Add per-job pipeline to job detail page**

In `app/dashboard/jobs/[id]/page.tsx`:

Add imports:
```typescript
import { getCandidateAnalytics } from '@/features/jobs/actions/candidate-analytics-actions';
import { CandidatePipeline } from '@/features/jobs/components/candidate-pipeline';
import { FeatureGate } from '@/features/subscriptions/components/feature-gate';
```

After loading the job, add analytics data:
```typescript
// Get candidate analytics for this job (if employer)
let jobAnalytics = null;
if (profile.role === 'employer' && profile.subscription_status === 'pro') {
  const analyticsResult = await getCandidateAnalytics(params.id);
  if (analyticsResult.success) {
    jobAnalytics = analyticsResult.analytics;
  }
}
```

In the JSX, after the job description card:
```typescript
{/* Candidate Pipeline - Employers Only, Pro Feature */}
{profile.role === 'employer' && (
  <FeatureGate requiredPlan="pro">
    {jobAnalytics && (
      <CandidatePipeline
        analytics={jobAnalytics}
        title="Applications for This Job"
      />
    )}
  </FeatureGate>
)}
```

**Step 2: Test per-job pipeline**

1. Login as Pro employer
2. Navigate to one of your job postings
3. Verify pipeline shows below job description
4. Verify it shows only applications for that specific job
5. Login as worker - verify pipeline doesn't show

---

## Phase B: Marketing & Growth

### Task 11: Marketing Layout & SEO Metadata

**Goal:** Create marketing route group with SEO-optimized metadata

**Files:**
- Create: `app/(marketing)/layout.tsx`

**Step 1: Create marketing layout with metadata**

```typescript
// app/(marketing)/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'KrewUp - Connect Skilled Trade Workers with Employers',
  description:
    'Find construction jobs near you or hire verified skilled trade workers. Free job posting, proximity-based matching, and direct messaging.',
  keywords: [
    // General
    'construction jobs',
    'skilled trades',
    'trade workers',
    'hire workers',
    'job search',
    'construction employment',
    'trade job board',
    'skilled labor jobs',

    // Specific Trades
    'electrician jobs',
    'plumber jobs',
    'carpenter jobs',
    'hvac jobs',
    'welder jobs',
    'mason jobs',
    'roofer jobs',
    'painter jobs',
    'heavy equipment operator jobs',
    'pipefitter jobs',
    'ironworker jobs',
    'concrete jobs',
    'framer jobs',

    // Location-based
    'local construction jobs',
    'nearby trade jobs',
    'construction jobs near me',
    'local contractors hiring',
    'trade workers in my area',

    // Employer-focused
    'hire electrician',
    'hire plumber',
    'hire carpenter',
    'post construction job',
    'find skilled workers',
    'construction hiring platform',
    'verified trade workers',
    'hire certified workers',
    'construction recruitment',

    // Features
    'certified trade workers',
    'construction job matching',
    'proximity job search',
    'trade worker profiles',
    'construction job alerts',
    'direct hire construction workers',
    'job application tracking',
    'construction worker certifications',
  ],
  authors: [{ name: 'KrewUp' }],
  openGraph: {
    title: 'KrewUp - Skilled Trade Job Matching',
    description: 'Connect with local construction jobs and skilled workers',
    url: 'https://krewup.net',
    siteName: 'KrewUp',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'KrewUp - Construction Job Matching Platform',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KrewUp - Skilled Trade Job Matching',
    description: 'Connect with local construction jobs and skilled workers',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
```

**Step 2: Verify metadata**

1. Create any marketing page temporarily
2. View page source
3. Verify `<meta>` tags present in `<head>`
4. Verify Open Graph tags present

---

### Task 12: Landing Page Redesign

**Goal:** Replace existing landing page with marketing-optimized version

**Files:**
- Modify: `app/page.tsx`

**Step 1: Backup existing page**

Run: `cp app/page.tsx app/page.tsx.backup`

**Step 2: Create new landing page**

```typescript
// app/page.tsx
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { cookies } from 'next/headers';

export default async function Home() {
  const supabase = await createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 py-20">
        {/* Decorative background elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-krewup-blue opacity-10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-krewup-orange opacity-10 rounded-full blur-3xl"></div>

        <div className="relative z-10 text-center max-w-5xl mx-auto">
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <Image
              src="/logo.png"
              alt="KrewUp Logo"
              width={256}
              height={256}
              priority
            />
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Find Your Next Construction Job
          </h1>
          <p className="text-2xl text-gray-700 mb-4">
            Hire Skilled Trade Workers
          </p>

          {/* Subheadline */}
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            Connect with verified professionals in your area through
            location-based job matching and direct messaging
          </p>

          {/* CTAs */}
          {user ? (
            <div className="flex flex-col items-center space-y-4">
              <p className="text-xl font-semibold text-gray-700">Welcome back! 🎉</p>
              <Link href="/dashboard/feed">
                <Button
                  size="lg"
                  className="w-64 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105"
                >
                  Go to Dashboard
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/signup?role=worker">
                <Button
                  size="lg"
                  className="w-64 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105"
                >
                  I'm Looking for Work
                </Button>
              </Link>
              <Link href="/signup?role=employer">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-64 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105"
                >
                  I'm Hiring
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Features Showcase */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4">
            Everything You Need to Connect
          </h2>
          <p className="text-center text-gray-600 mb-16 max-w-2xl mx-auto">
            Whether you're a skilled worker or an employer, KrewUp makes hiring simple
          </p>

          <div className="grid md:grid-cols-2 gap-12">
            {/* Workers Features */}
            <div>
              <h3 className="text-2xl font-bold mb-6 text-krewup-blue">For Workers</h3>
              <div className="space-y-6">
                <FeatureCard
                  icon="📍"
                  title="Find Local Jobs"
                  description="Browse construction jobs within miles of your location with smart proximity matching"
                />
                <FeatureCard
                  icon="👤"
                  title="Get Discovered"
                  description="Create your profile with certifications and experience to stand out to employers"
                />
                <FeatureCard
                  icon="💬"
                  title="Direct Messaging"
                  description="Chat directly with employers without phone tag or email delays"
                />
              </div>
            </div>

            {/* Employers Features */}
            <div>
              <h3 className="text-2xl font-bold mb-6 text-krewup-orange">For Employers</h3>
              <div className="space-y-6">
                <FeatureCard
                  icon="📝"
                  title="Post Jobs Free"
                  description="Unlimited job postings at no cost, forever. Reach qualified workers instantly"
                />
                <FeatureCard
                  icon="✅"
                  title="Filter by Certification"
                  description="Find workers with verified licenses and certifications for your specific needs"
                />
                <FeatureCard
                  icon="📊"
                  title="Track Applications"
                  description="Manage your hiring pipeline in one dashboard with real-time updates"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">How It Works</h2>

          <div className="grid md:grid-cols-2 gap-12">
            {/* Workers Process */}
            <div className="bg-white rounded-lg p-8 shadow-md">
              <h3 className="text-2xl font-bold mb-6 text-krewup-blue">For Workers</h3>
              <div className="space-y-6">
                <ProcessStep
                  number={1}
                  title="Create Profile"
                  description="Add certifications, experience, and location"
                />
                <ProcessStep
                  number={2}
                  title="Browse Jobs"
                  description="See nearby jobs matched to your skills"
                />
                <ProcessStep
                  number={3}
                  title="Apply & Connect"
                  description="One-click apply and direct messaging with employers"
                />
              </div>
            </div>

            {/* Employers Process */}
            <div className="bg-white rounded-lg p-8 shadow-md">
              <h3 className="text-2xl font-bold mb-6 text-krewup-orange">For Employers</h3>
              <div className="space-y-6">
                <ProcessStep
                  number={1}
                  title="Post Job"
                  description="Free unlimited job postings with detailed requirements"
                />
                <ProcessStep
                  number={2}
                  title="Review Applicants"
                  description="See certifications, experience, and compatibility scores"
                />
                <ProcessStep
                  number={3}
                  title="Hire & Manage"
                  description="Track your hiring pipeline and connect with top candidates"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pro Features Teaser */}
      <section className="py-20 px-4 bg-gradient-to-r from-krewup-blue to-krewup-light-blue text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">Unlock Pro Features</h2>
          <p className="text-xl mb-8">
            Get advanced analytics, profile boost, proximity alerts, and priority support
          </p>
          <Link href="/pricing">
            <Button
              size="lg"
              variant="outline"
              className="bg-white text-krewup-blue hover:bg-gray-100 w-64"
            >
              View Pricing
            </Button>
          </Link>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Get Started?</h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of skilled workers and employers connecting on KrewUp
          </p>
          <p className="text-sm text-gray-500 mb-6">No credit card required</p>
          <Link href="/signup">
            <Button
              size="lg"
              className="w-64 shadow-lg hover:shadow-2xl transition-all duration-300"
            >
              Get Started Free
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm mb-4 md:mb-0">© 2026 KrewUp. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/about" className="text-sm hover:text-krewup-light-blue">
              About
            </Link>
            <Link href="/how-it-works" className="text-sm hover:text-krewup-light-blue">
              How It Works
            </Link>
            <Link href="/pricing" className="text-sm hover:text-krewup-light-blue">
              Pricing
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Helper Components
function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="text-4xl flex-shrink-0">{icon}</div>
      <div>
        <h4 className="font-semibold text-lg mb-2">{title}</h4>
        <p className="text-gray-600">{description}</p>
      </div>
    </div>
  );
}

function ProcessStep({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-krewup-blue to-krewup-light-blue rounded-full flex items-center justify-center text-white font-bold">
        {number}
      </div>
      <div>
        <h4 className="font-semibold text-lg mb-1">{title}</h4>
        <p className="text-gray-600 text-sm">{description}</p>
      </div>
    </div>
  );
}
```

**Step 3: Test landing page**

1. Navigate to `/` (logged out)
2. Verify all sections display
3. Verify CTAs link correctly with role query params
4. Test on mobile (responsive)
5. Login and verify "Go to Dashboard" shows

---

### Task 13: About Page

**Goal:** Create About page explaining KrewUp's mission

**Files:**
- Create: `app/(marketing)/about/page.tsx`

**Step 1: Create About page**

```typescript
// app/(marketing)/about/page.tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      <div className="max-w-4xl mx-auto px-4 py-20">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">About KrewUp</h1>
          <p className="text-2xl text-gray-700">
            Building the future of construction hiring
          </p>
        </div>

        {/* Mission Statement */}
        <section className="mb-16">
          <div className="bg-white rounded-lg p-8 shadow-md border-l-4 border-krewup-blue">
            <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
            <p className="text-xl text-gray-700 leading-relaxed">
              KrewUp connects skilled trade workers with employers through location-based
              job matching and verified certifications. We're building the future of
              construction hiring by making it faster, easier, and more transparent for
              everyone.
            </p>
          </div>
        </section>

        {/* The Problem */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-6">The Problem</h2>
          <div className="bg-white rounded-lg p-8 shadow-md">
            <ul className="space-y-4">
              <li className="flex gap-4">
                <span className="text-2xl">🔍</span>
                <p className="text-gray-700">
                  <strong>Skilled workers struggle to find local jobs quickly.</strong> Traditional
                  job boards don't prioritize proximity, forcing workers to commute long distances
                  or miss nearby opportunities.
                </p>
              </li>
              <li className="flex gap-4">
                <span className="text-2xl">📋</span>
                <p className="text-gray-700">
                  <strong>Employers can't verify worker certifications easily.</strong> Hiring
                  managers waste time reviewing unqualified candidates or struggle to confirm
                  licenses and certifications.
                </p>
              </li>
              <li className="flex gap-4">
                <span className="text-2xl">💼</span>
                <p className="text-gray-700">
                  <strong>Traditional job boards lack construction-specific features.</strong>{' '}
                  Generic platforms don't understand the unique needs of skilled trades, from
                  certification requirements to trade specializations.
                </p>
              </li>
            </ul>
          </div>
        </section>

        {/* The Solution */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-6">The Solution</h2>
          <div className="bg-gradient-to-r from-krewup-blue to-krewup-light-blue text-white rounded-lg p-8 shadow-md">
            <ul className="space-y-4">
              <li className="flex gap-4">
                <span className="text-2xl">📍</span>
                <p>
                  <strong>Proximity-based job matching</strong> connects workers with nearby
                  opportunities automatically, reducing commute time and increasing job satisfaction.
                </p>
              </li>
              <li className="flex gap-4">
                <span className="text-2xl">✅</span>
                <p>
                  <strong>Certification verification</strong> ensures qualified candidates. Workers
                  upload certifications, and employers can filter by specific licenses and credentials.
                </p>
              </li>
              <li className="flex gap-4">
                <span className="text-2xl">💬</span>
                <p>
                  <strong>Direct messaging</strong> eliminates hiring delays. No more phone tag or
                  slow email chains—workers and employers connect instantly.
                </p>
              </li>
            </ul>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center">
          <h2 className="text-3xl font-bold mb-6">Join KrewUp Today</h2>
          <p className="text-xl text-gray-600 mb-8">
            Whether you're a skilled worker or an employer, we're here to help you succeed.
          </p>
          <Link href="/signup">
            <Button size="lg" className="w-64">
              Get Started Free
            </Button>
          </Link>
        </section>

        {/* Back to Home */}
        <div className="text-center mt-12">
          <Link href="/" className="text-krewup-blue hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Test About page**

1. Navigate to `/about`
2. Verify all sections display correctly
3. Verify responsive on mobile
4. Test CTA link to `/signup`

---

### Task 14: How-It-Works Page

**Goal:** Create How-It-Works page with detailed process for both user types

**Files:**
- Create: `app/(marketing)/how-it-works/page.tsx`

**Step 1: Create How-It-Works page**

```typescript
// app/(marketing)/how-it-works/page.tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      <div className="max-w-6xl mx-auto px-4 py-20">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">How KrewUp Works</h1>
          <p className="text-2xl text-gray-700">
            Simple, fast, and built for construction professionals
          </p>
        </div>

        {/* Two-Column Layout */}
        <div className="grid md:grid-cols-2 gap-12 mb-16">
          {/* Workers Column */}
          <div className="bg-white rounded-lg p-8 shadow-md">
            <h2 className="text-3xl font-bold mb-8 text-krewup-blue">For Workers</h2>

            <div className="space-y-8">
              <Step
                number={1}
                title="Create Your Profile"
                description="Sign up in minutes and build your professional profile. Add certifications with verification, list your work experience and skills, and set your location for local job matching."
                icon="📋"
              />

              <Step
                number={2}
                title="Browse Local Jobs"
                description="See construction jobs within your proximity, automatically sorted by distance. Filter by trade, pay rate, and job type. Pro members can view compatibility scores showing how well you match each job."
                icon="🔍"
              />

              <Step
                number={3}
                title="Apply with One Click"
                description="Submit applications instantly with your profile information. Add an optional cover letter to stand out. Track your application status in real-time as employers review your profile."
                icon="✉️"
              />

              <Step
                number={4}
                title="Message Employers"
                description="Chat directly with hiring managers through our built-in messaging system. No phone tag or email delays—build relationships before your first day on the job."
                icon="💬"
              />

              <Step
                number={5}
                title="Go Pro for More"
                badge="Optional"
                description={
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    <li>Profile boost - appear first to employers</li>
                    <li>Proximity job alerts - get notified of new nearby jobs</li>
                    <li>See who viewed your profile</li>
                    <li>Detailed analytics and insights</li>
                  </ul>
                }
                icon="⭐"
              />
            </div>

            <div className="mt-8 pt-8 border-t">
              <Link href="/signup?role=worker">
                <Button size="lg" className="w-full">
                  Get Started as a Worker
                </Button>
              </Link>
            </div>
          </div>

          {/* Employers Column */}
          <div className="bg-white rounded-lg p-8 shadow-md">
            <h2 className="text-3xl font-bold mb-8 text-krewup-orange">For Employers</h2>

            <div className="space-y-8">
              <Step
                number={1}
                title="Post Your Job"
                description="Create unlimited job postings at no cost, forever. Set location and trade requirements to attract the right candidates. Pro members can add custom screening questions to pre-qualify applicants."
                icon="📝"
              />

              <Step
                number={2}
                title="Review Applications"
                description="See worker certifications and licenses instantly. View detailed experience history and skills. Pro members can check compatibility scores showing how well each candidate matches your requirements."
                icon="👥"
              />

              <Step
                number={3}
                title="Message Candidates"
                description="Direct chat with applicants to ask questions and schedule interviews. Build rapport before bringing them on site. No middleman—connect directly with skilled workers."
                icon="💬"
              />

              <Step
                number={4}
                title="Hire & Track"
                description="Manage your application pipeline with status tracking (pending, viewed, contacted, hired). Update candidate statuses as you move through your hiring process. Keep all your hiring organized in one place."
                icon="💼"
              />

              <Step
                number={5}
                title="Go Pro for Advanced Features"
                badge="Optional"
                description={
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    <li>Detailed job analytics and performance tracking</li>
                    <li>Custom screening questions (up to 5 per job)</li>
                    <li>Verified certification filtering</li>
                    <li>Candidate pipeline analytics with conversion rates</li>
                  </ul>
                }
                icon="⭐"
              />
            </div>

            <div className="mt-8 pt-8 border-t">
              <Link href="/signup?role=employer">
                <Button size="lg" className="w-full bg-krewup-orange hover:bg-orange-600">
                  Get Started as an Employer
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center">
          <Link href="/" className="text-krewup-blue hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

// Helper Component
interface StepProps {
  number: number;
  title: string;
  description: string | React.ReactNode;
  icon: string;
  badge?: string;
}

function Step({ number, title, description, icon, badge }: StepProps) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0">
        <div className="w-12 h-12 bg-gradient-to-br from-krewup-blue to-krewup-light-blue rounded-full flex items-center justify-center text-white font-bold text-lg">
          {number}
        </div>
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">{icon}</span>
          <h3 className="font-bold text-xl">{title}</h3>
          {badge && (
            <span className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded-full">
              {badge}
            </span>
          )}
        </div>
        {typeof description === 'string' ? (
          <p className="text-gray-600">{description}</p>
        ) : (
          description
        )}
      </div>
    </div>
  );
}
```

**Step 2: Test How-It-Works page**

1. Navigate to `/how-it-works`
2. Verify two-column layout (side-by-side on desktop)
3. Verify stacked on mobile
4. Test both CTA buttons
5. Verify query params in signup links

---

### Task 15: SEO - Sitemap & Robots.txt

**Goal:** Create sitemap and robots.txt for SEO

**Files:**
- Create: `app/sitemap.ts`
- Create: `public/robots.txt`

**Step 1: Create sitemap**

```typescript
// app/sitemap.ts
import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://krewup.net';

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/how-it-works`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/signup`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
  ];
}
```

**Step 2: Create robots.txt**

```
# public/robots.txt
User-agent: *
Allow: /
Disallow: /dashboard/
Disallow: /onboarding/
Disallow: /api/

# Sitemap
Sitemap: https://krewup.net/sitemap.xml
```

**Step 3: Test sitemap and robots.txt**

1. Run build: `npm run build`
2. Navigate to `/sitemap.xml`
3. Verify XML with all pages listed
4. Navigate to `/robots.txt`
5. Verify content matches

---

### Task 16: Open Graph Image (Manual)

**Goal:** Create Open Graph image for social sharing

**Files:**
- Create: `public/og-image.png`

**Manual Task - Instructions:**

1. Use design tool (Figma, Canva, Photoshop)
2. Create 1200x630px image
3. Add KrewUp logo (centered or left-aligned)
4. Add tagline: "Connect Skilled Trade Workers with Employers"
5. Use brand colors: Blue (#2563EB) and Orange (#EA580C)
6. Keep design clean and professional
7. Ensure text is readable in small previews
8. Export as `og-image.png`
9. Save to `public/og-image.png`

Test: Share `/about` on Facebook/Twitter, verify image shows

---

## Testing & Verification

### Task 17: E2E Tests - Profile Analytics

**Goal:** Test profile analytics feature end-to-end

**Files:**
- Create: `e2e/profile-analytics.spec.ts`

**Step 1: Create E2E test**

```typescript
// e2e/profile-analytics.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Profile Analytics', () => {
  test('Pro worker can view profile analytics chart', async ({ page }) => {
    // TODO: Login as Pro worker
    // TODO: Navigate to profile page
    // TODO: Verify chart is visible
    // TODO: Verify weekly summary shows
    // TODO: Verify recent viewers list shows
  });

  test('Free worker sees teaser with upgrade CTA', async ({ page }) => {
    // TODO: Login as free worker
    // TODO: Navigate to profile page
    // TODO: Verify chart is NOT visible
    // TODO: Verify teaser card shows
    // TODO: Verify "Upgrade to Pro" button present
  });
});
```

**Step 2: Run E2E tests**

Run: `npm run test:e2e e2e/profile-analytics.spec.ts`
Expected: Tests pass (after implementing TODO sections)

---

### Task 18: Final Manual Testing

**Manual Testing Checklist:**

**Compatibility Scoring:**
- [ ] Pro worker sees badges on job cards
- [ ] Badge colors match score ranges
- [ ] Breakdown card shows on job detail
- [ ] Gaps section shows missing certs
- [ ] Free worker sees NO scores

**Profile Analytics:**
- [ ] Pro worker sees 30-day chart
- [ ] Weekly summary displays correctly
- [ ] Recent viewers list works
- [ ] Free worker sees teaser only

**Candidate Analytics:**
- [ ] Pro employer can access /dashboard/analytics
- [ ] Pipeline funnel displays correctly
- [ ] Per-job analytics embedded in job detail
- [ ] Metrics accurate (test with real data)
- [ ] Free employer blocked from analytics

**Marketing Pages:**
- [ ] Landing page loads fast (< 2 seconds)
- [ ] All CTAs link correctly
- [ ] About page displays correctly
- [ ] How-It-Works shows both columns
- [ ] Mobile responsive on all pages
- [ ] Sitemap accessible at /sitemap.xml
- [ ] Robots.txt accessible at /robots.txt

---

## Deployment & Completion

### Task 19: Final Build & Deploy

**Step 1: Run production build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 2: Run type check**

Run: `npm run type-check`
Expected: No TypeScript errors

**Step 3: Run all tests**

Run: `npm run test:all`
Expected: All tests pass

**Step 4: Deploy to production**

(User will handle git operations)
Push to main branch → Vercel auto-deploys

**Step 5: Test in production**

1. Navigate to https://krewup.net
2. Test all new features
3. Verify SEO tags in production
4. Test social sharing (Open Graph image)

---

## Success Criteria

### Phase A: Feature Completion
- ✅ Pro workers see profile analytics chart with 30-day trend
- ✅ Pro employers access central analytics dashboard at /dashboard/analytics
- ✅ Candidate pipeline funnel displays on both central dashboard and per-job pages
- ✅ Pro workers see compatibility scores on all job cards and detail pages
- ✅ Free users see upgrade prompts instead of Pro features
- ✅ All features work correctly on mobile/tablet/desktop
- ✅ E2E tests pass for all new features
- ✅ Database queries perform well with indexes

### Phase B: Marketing & Growth
- ✅ Landing page loads in < 2 seconds
- ✅ All marketing pages mobile-responsive
- ✅ SEO meta tags present on all pages
- ✅ Sitemap accessible at /sitemap.xml
- ✅ Robots.txt accessible at /robots.txt
- ✅ Open Graph image displays correctly on social media
- ✅ All CTAs link to correct routes

---

**Plan Status:** Ready for execution
**Next Step:** Use superpowers:executing-plans or superpowers:subagent-driven-development to implement
