# JobCard Component Usage Guide

## Overview

The `JobCard` component now supports **Pro-only compatibility scoring** for workers. When a Pro worker views job listings, they will see a compatibility badge in the top-right corner showing how well they match the job requirements.

## Component Interface

```typescript
type JobCardProps = {
  job: {
    id: string;
    title: string;
    trade: string;
    sub_trade?: string | null;
    job_type: string;
    location: string;
    coords?: { lat: number; lng: number } | null;
    pay_rate: string;
    employer_name: string;
    required_certs?: string[];
    created_at: string;
    status: string;
  };
  userCoords?: { lat: number; lng: number } | null;
  currentUser?: {
    trade?: string | null;
    sub_trade?: string | null;
    location?: string | null;
    coords?: any; // PostGIS point
    years_of_experience?: number | null;
    certifications?: Certification[];
  } | null;
};
```

## Required Data for Compatibility Scoring

To enable compatibility scoring, the **parent component must**:

1. **Fetch the current user's profile** including:
   - `trade`, `sub_trade`, `location`, `coords`
   - `years_of_experience`

2. **Fetch the current user's certifications** from the `certifications` table:
   ```sql
   SELECT * FROM certifications WHERE user_id = $1
   ```

3. **Pass this data** to the JobCard component via the `currentUser` prop

## Example Usage (Server Component)

```tsx
// app/dashboard/jobs/page.tsx
import { createClient } from '@/lib/supabase/server';
import { JobCard } from '@/features/jobs/components/job-card';
import { cookies } from 'next/headers';

export default async function JobsPage() {
  const supabase = await createClient(await cookies());

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Fetch profile with coords
  const { data: profile } = await supabase
    .from('profiles')
    .select('trade, sub_trade, location, coords, years_of_experience')
    .eq('id', user.id)
    .single();

  // Fetch certifications
  const { data: certifications } = await supabase
    .from('certifications')
    .select('*')
    .eq('user_id', user.id);

  // Fetch jobs
  const { data: jobs } = await supabase
    .from('jobs')
    .select(`
      id,
      title,
      trade,
      sub_trade,
      job_type,
      location,
      coords,
      pay_rate,
      required_certs,
      created_at,
      status,
      employer:profiles!employer_id(name, company_name)
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  // Transform data to match JobCard interface
  const transformedJobs = jobs?.map(job => ({
    ...job,
    employer_name: job.employer?.company_name || job.employer?.name || 'Unknown',
  }));

  // Build currentUser object for compatibility scoring
  const currentUser = profile ? {
    trade: profile.trade,
    sub_trade: profile.sub_trade,
    location: profile.location,
    coords: profile.coords,
    years_of_experience: profile.years_of_experience,
    certifications: certifications || [],
  } : null;

  return (
    <div>
      {transformedJobs?.map(job => (
        <JobCard
          key={job.id}
          job={job}
          userCoords={profile?.coords}
          currentUser={currentUser}
        />
      ))}
    </div>
  );
}
```

## Example Usage (Client Component)

```tsx
'use client';

import { JobCard } from '@/features/jobs/components/job-card';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useCertifications } from '@/features/profiles/hooks/use-certifications';

export function JobsList({ jobs }) {
  const { data: authData } = useAuth();
  const { data: certifications } = useCertifications();

  const profile = authData?.profile;

  // Build currentUser object
  const currentUser = profile ? {
    trade: profile.trade,
    sub_trade: profile.sub_trade,
    location: profile.location,
    coords: profile.coords,
    years_of_experience: profile.years_of_experience,
    certifications: certifications || [],
  } : null;

  return (
    <div>
      {jobs.map(job => (
        <JobCard
          key={job.id}
          job={job}
          userCoords={profile?.coords}
          currentUser={currentUser}
        />
      ))}
    </div>
  );
}
```

## Compatibility Badge Behavior

The compatibility badge will **only show** when:
- ✅ User is a **Pro subscriber** (checked via `useIsPro()`)
- ✅ User is a **worker** (checked via `useIsWorker()`)
- ✅ `currentUser` prop is provided with all required data
- ✅ The job has sufficient data for scoring

The badge will **NOT show** when:
- ❌ User is on the free plan
- ❌ User is an employer (even if Pro)
- ❌ `currentUser` prop is missing or null
- ❌ User is not authenticated

## Badge Color Scheme

The badge color changes based on the compatibility score:

| Score Range | Color | Label | Class |
|------------|-------|-------|-------|
| 90-100% | Green | Perfect | `bg-green-100 text-green-700` |
| 75-89% | Blue | Great | `bg-blue-100 text-blue-700` |
| 60-74% | Yellow | Good | `bg-yellow-100 text-yellow-700` |
| 0-59% | Gray | Fair | `bg-gray-100 text-gray-700` |

## Scoring Breakdown

The compatibility score is calculated from four components:

1. **Trade Match** (0-30 points):
   - Exact trade + sub-trade match: 30 points
   - Trade match only: 20 points
   - Related trades: 10 points
   - No match: 0 points

2. **Certification Match** (0-30 points):
   - Based on percentage of required certifications the worker has
   - No certifications required: Full 30 points

3. **Distance Match** (0-20 points):
   - ≤10 miles: 20 points
   - ≤25 miles: 15 points
   - ≤50 miles: 10 points
   - ≤100 miles: 5 points
   - >100 miles: 2 points

4. **Experience Match** (0-20 points):
   - Currently always gives **full 20 points** because `years_experience_required` field doesn't exist in the database
   - When the field is added in the future, it will score based on percentage of required experience

## Field Mapping Notes

### Database Field Names → CompatibilityInput

- `job.required_certs` (TEXT[]) → `required_certifications`
- `profile.years_of_experience` → `workerExperience`
- `certifications.certification_type` → extracted into array for `workerCerts`
- `years_experience_required` → hardcoded as `null` (field doesn't exist yet)

### PostGIS Coordinates

- Jobs table: `coords` is stored as `GEOGRAPHY(POINT)`
- Profiles table: `coords` is stored as PostGIS point `{x, y}`
- Both are compatible with the `calculateDistance()` function

## Testing Checklist

To verify the compatibility badge works correctly:

1. ✅ Login as a **Pro worker**
2. ✅ Navigate to `/dashboard/jobs`
3. ✅ Verify compatibility badges appear on job cards
4. ✅ Verify badge shows percentage (e.g., "85% Match")
5. ✅ Verify badge color matches score range
6. ✅ Login as a **free worker**
7. ✅ Verify NO badges appear
8. ✅ Login as an **employer** (even Pro)
9. ✅ Verify NO badges appear

## Future Enhancements

When `years_experience_required` is added to the jobs table:

1. Update the job fetch query to include the field
2. Update `JobCardProps.job` type to include `years_experience_required?: number | null`
3. Change line 56 in `job-card.tsx` from:
   ```typescript
   years_experience_required: null,
   ```
   to:
   ```typescript
   years_experience_required: job.years_experience_required || null,
   ```

This will enable the experience matching component of the scoring algorithm.
