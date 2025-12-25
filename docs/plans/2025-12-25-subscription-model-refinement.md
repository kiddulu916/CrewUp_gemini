# KrewUp Pro Subscription Model - Refined Design

**Created**: December 25, 2025
**Status**: Design Complete - Ready for Implementation
**Goal**: Define 4 exclusive Pro features for workers and 4 for employers at $15/month

---

## Table of Contents

1. [Overview](#overview)
2. [Worker Pro Features](#worker-pro-features)
3. [Employer Pro Features](#employer-pro-features)
4. [Subscription Tiers & Pricing](#subscription-tiers--pricing)
5. [Feature Gating Architecture](#feature-gating-architecture)
6. [Database Schema Changes](#database-schema-changes)
7. [Implementation Priorities](#implementation-priorities)
8. [Email Service Integration](#email-service-integration)
9. [Testing Strategy](#testing-strategy)
10. [Feature Rollout Timeline](#feature-rollout-timeline)

---

## Overview

KrewUp Pro subscription provides role-specific features to both workers and employers. The subscription is **$15/month or $150/year** with a single subscription status but different features based on user role.

### Design Principles

1. **Role-Based Value**: Workers and employers get different features but pay the same price
2. **Clear Differentiation**: Free tier provides core functionality, Pro adds premium capabilities
3. **Feature Parity**: Each role gets exactly 4 exclusive Pro features
4. **Progressive Enhancement**: Pro features enhance (not replace) the free experience

---

## Worker Pro Features

### 1. Profile Boost ⭐

**Value Proposition**: Get noticed first by employers

**How It Works**:
- Pro workers' profiles automatically appear at the top of:
  - Job application lists viewed by employers
  - Candidate search results
  - Application notifications
- Visual "⭐ Boosted Profile" badge displayed on all profile cards
- Automatic 7-day boost periods renewed monthly for active Pro subscribers
- Countdown timer shows boost expiration: "Boost expires in 5 days"

**User Experience**:
```
Free Worker:  Listed by application date (newest first)
Pro Worker:   Always appears above free workers, then sorted by date
```

**Implementation Details**:
- Database fields: `profiles.is_profile_boosted` (boolean), `profiles.boost_expires_at` (timestamp)
- Webhook sets boost on subscription activation:
  ```sql
  UPDATE profiles
  SET is_profile_boosted = true,
      boost_expires_at = NOW() + INTERVAL '7 days'
  WHERE id = user_id
  ```
- All applicant queries modified to sort by boost first:
  ```sql
  ORDER BY worker.is_profile_boosted DESC, created_at DESC
  ```
- Background job (daily cron) resets expired boosts

**Complexity**: Low (1 day)
**Value**: High - immediate visibility boost

---

### 2. Proximity Alerts 📍

**Value Proposition**: Never miss nearby job opportunities

**How It Works**:
- Configure custom alert settings:
  - Radius: 5-50 km from current location
  - Trades to monitor: Select one or multiple trades
  - Active/inactive toggle
- Background job runs every 10 minutes checking for new jobs
- Notifications created when matching jobs are posted within radius
- In-app notifications + optional push notifications
- Email digest option (daily summary of nearby jobs)

**User Experience**:
```
1. Worker enables proximity alerts (25 km, Electrician trade)
2. New electrician job posted 20 km away
3. Within 10 minutes, worker receives notification:
   "New Electrician job nearby: Residential Wiring - 20.3 km away"
4. Click notification → Navigate directly to job posting
```

**Implementation Details**:
- Settings stored in `proximity_alerts` table
- Background worker (Vercel Cron) runs every 10 minutes:
  ```typescript
  // Find new jobs in last 10 minutes within user's radius
  SELECT * FROM jobs
  WHERE created_at >= NOW() - INTERVAL '10 minutes'
  AND trade = ANY(user_alert_trades)
  AND ST_DWithin(
    coords::geography,
    user_coords::geography,
    radius_km * 1000
  )
  ```
- Creates notifications in `notifications` table
- Notification bell shows unread count
- Push notifications via web Push API (optional)

**Complexity**: Medium-High (3-4 days)
**Value**: Very High - real-time job discovery

---

### 3. Who Viewed My Profile 👀

**Value Proposition**: Know which employers are interested in you

**How It Works**:
- System tracks all profile views automatically (for all users)
- Pro workers can see:
  - Full list of employers who viewed their profile
  - Employer name, company type (Contractor/Recruiter), view timestamp
  - Weekly summary: "12 employers viewed your profile this week"
  - Click to view employer's profile and send message
- Free workers see teaser: "5 employers viewed your profile - Upgrade to see who"

**User Experience**:
```
Pro Worker Profile View:
┌─────────────────────────────────────┐
│ Who Viewed Your Profile             │
├─────────────────────────────────────┤
│ 12 employers this week              │
│                                     │
│ ⚡ John's Electric (Contractor)     │
│    Viewed 2 hours ago    [Message]  │
│                                     │
│ 🏗️  ABC Construction (Contractor)   │
│    Viewed yesterday      [Message]  │
│                                     │
│ 📋 ProStaff Recruiting (Recruiter)  │
│    Viewed 3 days ago     [Message]  │
└─────────────────────────────────────┘
```

**Implementation Details**:
- Track views in `profile_views` table:
  ```sql
  INSERT INTO profile_views (viewed_profile_id, viewer_id)
  VALUES (profile_id, current_user_id)
  ```
- Query for Pro workers:
  ```sql
  SELECT viewer:profiles(name, employer_type), viewed_at
  FROM profile_views
  WHERE viewed_profile_id = current_user_id
  ORDER BY viewed_at DESC
  ```
- Gate display with `FeatureGate` component
- Show weekly count for engagement

**Complexity**: Low (1-2 days)
**Value**: High - engagement driver, FOMO effect

---

### 4. Verified Work History with Employer Endorsements ✅

**Value Proposition**: Build trust and credibility with third-party verification

**How It Works**:
- Workers request endorsements from previous employers listed in work history
- Employer receives email with one-click endorsement link
- Employer can verify work dates and optionally write 200-character recommendation
- Verified experiences show green checkmark icon
- Profile displays "Endorsed by 5 employers" badge
- Endorsements include:
  - Employer name and company
  - Verification of dates worked
  - Optional recommendation text
  - Timestamp of endorsement

**User Experience**:
```
Worker Flow:
1. Navigate to Profile → Experience
2. Click "Request Endorsement" on experience entry
3. Employer receives email: "John Doe requests work history endorsement"
4. Employer clicks "Review Request" → Redirects to endorsement page
5. Employer verifies details, writes recommendation, clicks "Approve"
6. Worker's experience now shows ✅ verified badge
7. Profile shows "Endorsed by 1 employer" badge

Employer View (on worker profile):
┌─────────────────────────────────────┐
│ ✅ Endorsed by 3 employers          │
│                                     │
│ Senior Electrician                  │
│ ABC Electric Co.                    │
│ Jan 2020 - Dec 2022 ✅ Verified     │
│                                     │
│ Endorsed by Mike Johnson            │
│ "Excellent worker, always on time.  │
│  Highly skilled in commercial       │
│  wiring. Would hire again."         │
└─────────────────────────────────────┘
```

**Implementation Details**:
- New tables: `endorsement_requests`, `endorsements`
- New columns: `experiences.is_verified`, `experiences.endorsement_count`
- Request flow:
  1. Worker calls `requestEndorsement(experienceId)` server action
  2. Action checks Pro status, creates request in DB
  3. Sends email to employer with approval link
  4. Employer approves via `approveEndorsement(requestId, recommendationText)`
  5. Creates endorsement record, marks experience as verified
  6. Increments endorsement count via trigger
- Display EndorsementBadge on profile cards
- Show checkmark on verified experiences

**Complexity**: Medium (3-4 days)
**Value**: Very High - trust signal, competitive advantage

---

## Employer Pro Features

### 1. Certified Candidate Filtering 🎓

**Value Proposition**: Find qualified candidates faster by filtering for verified certifications

**How It Works**:
- Pro-only filter checkbox: "Show only verified certifications"
- Filters job applications and candidate searches to workers who have:
  - Uploaded certification photos
  - Provided certification numbers
  - Marked certifications as verified
- Can filter by specific certification types:
  - OSHA 10 / OSHA 30
  - First Aid & CPR
  - Journeyman License
  - Forklift Certification
  - Welding Certifications
  - etc.
- Dramatically reduces screening time

**User Experience**:
```
Job Application List (Pro Employer):
┌─────────────────────────────────────┐
│ Filters                             │
│ ☑ Show only verified certifications│
│ ☑ OSHA 30 required                  │
└─────────────────────────────────────┘

Results (3 of 15 applicants):
┌─────────────────────────────────────┐
│ John Doe - Electrician              │
│ ✅ OSHA 30 (Verified)                │
│ ✅ Journeyman License (Verified)     │
│ [View Application]                  │
├─────────────────────────────────────┤
│ Jane Smith - Electrician            │
│ ✅ OSHA 30 (Verified)                │
│ ✅ First Aid & CPR (Verified)        │
│ [View Application]                  │
└─────────────────────────────────────┘
```

**Implementation Details**:
- Add Pro-only filter to job applications page
- Modify query to filter by certification:
  ```sql
  SELECT * FROM job_applications
  WHERE job_id = job_id
  AND EXISTS (
    SELECT 1 FROM certifications
    WHERE certifications.worker_id = job_applications.worker_id
    AND certifications.certification_type = 'OSHA 30'
    AND certifications.photo_url IS NOT NULL
  )
  ```
- Gate filter UI with `FeatureGate` component
- Show certification badges on application cards

**Complexity**: Low (1 day)
**Value**: High - saves screening time

---

### 2. Job View Analytics Dashboard 📊

**Value Proposition**: Understand job posting performance with data-driven insights

**How It Works**:
- Automatic tracking of all job views (all users, Pro display only)
- Analytics dashboard shows:
  - Total views per job
  - Unique viewers (deduplicated by session)
  - Views over time (line chart)
  - Comparison across multiple job postings
  - View-to-application conversion rate
- Date range filtering (last 7 days, 30 days, all time)
- Helps optimize job descriptions and posting strategy

**User Experience**:
```
Analytics Dashboard:
┌─────────────────────────────────────┐
│ Job Analytics                       │
│ [Select Job: Residential Electrician ▼] │
├─────────────────────────────────────┤
│ ┌───────┐ ┌───────┐ ┌───────┐      │
│ │  156  │ │  142  │ │   12  │      │
│ │ Views │ │Unique │ │ Apps  │      │
│ └───────┘ └───────┘ └───────┘      │
│                                     │
│ Views Over Time (Last 30 Days)      │
│ [Line Chart showing daily views]    │
│                                     │
│ Conversion Rate: 8.5%               │
│ (12 applications / 142 unique views)│
└─────────────────────────────────────┘
```

**Implementation Details**:
- Track views in `job_views` table with session deduplication:
  ```typescript
  // On job detail page load
  const sessionId = cookies().get('session_id') || generateSessionId()

  // Check if already viewed in this session
  const existing = await supabase
    .from('job_views')
    .select('id')
    .eq('job_id', jobId)
    .eq('session_id', sessionId)
    .single()

  if (!existing) {
    await supabase.from('job_views').insert({
      job_id: jobId,
      viewer_id: user?.id,
      session_id: sessionId
    })
  }
  ```
- Analytics API aggregates by date:
  ```sql
  SELECT
    DATE(viewed_at) as date,
    COUNT(*) as views,
    COUNT(DISTINCT session_id) as unique_views
  FROM job_views
  WHERE job_id = job_id
  GROUP BY DATE(viewed_at)
  ORDER BY date DESC
  ```
- Display with recharts LineChart component
- Gate entire analytics page with Pro check

**Complexity**: Medium (2-3 days)
**Value**: High - data-driven hiring decisions

---

### 3. Custom Screening Questions ❓

**Value Proposition**: Pre-qualify candidates with job-specific questions

**How It Works**:
- When posting a job, employers can add up to 5 custom questions
- Questions can be marked as required or optional
- Examples:
  - "Do you have experience with commercial roofing?"
  - "Are you comfortable working at heights over 100ft?"
  - "Do you have your own tools and transportation?"
  - "What is your daily rate expectation?"
- Questions appear during job application process
- Answers stored and displayed alongside worker's profile
- Helps filter candidates before interview stage

**User Experience**:
```
Job Posting Form (Pro Employer):
┌─────────────────────────────────────┐
│ Custom Screening Questions          │
├─────────────────────────────────────┤
│ Question 1:                         │
│ [Do you have commercial experience?]│
│ ☑ Required                          │
│                                     │
│ Question 2:                         │
│ [Are you comfortable with heights?] │
│ ☐ Required                          │
│                                     │
│ [+ Add Question]                    │
└─────────────────────────────────────┘

Application View (Worker):
┌─────────────────────────────────────┐
│ Screening Questions                 │
├─────────────────────────────────────┤
│ 1. Do you have commercial           │
│    experience? *                    │
│ [Yes, 5 years in commercial roofing]│
│                                     │
│ 2. Are you comfortable with heights?│
│ [Yes, I have worked on buildings    │
│  up to 150ft tall]                  │
└─────────────────────────────────────┘

Employer View (Application Review):
┌─────────────────────────────────────┐
│ John Doe's Application              │
├─────────────────────────────────────┤
│ Screening Responses:                │
│                                     │
│ Q: Do you have commercial           │
│    experience?                      │
│ A: Yes, 5 years in commercial       │
│    roofing                          │
│                                     │
│ Q: Are you comfortable with heights?│
│ A: Yes, I have worked on buildings  │
│    up to 150ft tall                 │
└─────────────────────────────────────┘
```

**Implementation Details**:
- Store questions in `jobs.custom_questions` JSONB field:
  ```json
  [
    { "question": "Do you have commercial experience?", "required": true },
    { "question": "Are you comfortable with heights?", "required": false }
  ]
  ```
- Store answers in `job_applications.custom_answers` JSONB field:
  ```json
  {
    "0": "Yes, 5 years in commercial roofing",
    "1": "Yes, I have worked on buildings up to 150ft tall"
  }
  ```
- Question builder component with add/remove/edit
- Application form dynamically shows questions
- Validation enforces required answers
- Display answers in application detail view

**Complexity**: Medium (2-3 days)
**Value**: Medium-High - better candidate filtering

---

### 4. Experience-Based Advanced Search 🔍

**Value Proposition**: Find senior talent quickly by filtering on years of experience

**How It Works**:
- Pro-only filter: "Minimum years of experience" (0-20 years slider)
- Automatically calculates total experience from worker's work history
- Can filter by specific trade experience
- Results sorted by most experienced first
- Shows experience summary on each profile card: "8 years experience"
- Experience breakdown visible: "8 years total: 5 years residential, 3 years commercial"

**User Experience**:
```
Worker Search (Pro Employer):
┌─────────────────────────────────────┐
│ Filters                             │
│ Trade: [Electrician ▼]              │
│                                     │
│ Minimum Experience: 5 years         │
│ [━━━━━●━━━━━━━━━━━━━━] 0-20        │
└─────────────────────────────────────┘

Results (sorted by experience):
┌─────────────────────────────────────┐
│ John Doe                            │
│ Electrician - Residential           │
│ Chicago, IL                         │
│ [10 years experience]               │
│ [View Profile] [Message]            │
├─────────────────────────────────────┤
│ Jane Smith                          │
│ Electrician - Commercial            │
│ Naperville, IL                      │
│ [8 years experience]                │
│ [View Profile] [Message]            │
├─────────────────────────────────────┤
│ Mike Johnson                        │
│ Electrician - Industrial            │
│ Aurora, IL                          │
│ [6 years experience]                │
│ [View Profile] [Message]            │
└─────────────────────────────────────┘
```

**Implementation Details**:
- PostgreSQL function to calculate experience:
  ```sql
  CREATE FUNCTION calculate_total_experience(
    user_id UUID,
    trade_filter TEXT DEFAULT NULL
  ) RETURNS INTEGER AS $$
  DECLARE
    total_months INTEGER;
  BEGIN
    SELECT COALESCE(SUM(
      EXTRACT(YEAR FROM AGE(
        COALESCE(end_date, NOW()::DATE),
        start_date
      ))::INTEGER * 12 +
      EXTRACT(MONTH FROM AGE(
        COALESCE(end_date, NOW()::DATE),
        start_date
      ))::INTEGER
    ), 0)
    INTO total_months
    FROM experiences
    WHERE worker_id = user_id
    AND (trade_filter IS NULL OR trade = trade_filter);

    RETURN total_months / 12;
  END;
  $$ LANGUAGE plpgsql;
  ```
- Search function:
  ```sql
  CREATE FUNCTION get_workers_by_experience(
    min_years INTEGER,
    trade_filter TEXT,
    limit_count INTEGER DEFAULT 50
  ) RETURNS TABLE (...) AS $$
    SELECT
      p.*,
      calculate_total_experience(p.id, trade_filter) as total_experience_years
    FROM profiles p
    WHERE p.role = 'Worker'
    AND calculate_total_experience(p.id, trade_filter) >= min_years
    ORDER BY total_experience_years DESC
    LIMIT limit_count;
  $$;
  ```
- Server action with Pro check:
  ```typescript
  export async function searchWorkersByExperience(params) {
    // Verify Pro employer
    if (profile.subscription_status !== 'pro' || profile.role !== 'Employer') {
      return { error: 'Employer Pro subscription required' }
    }

    // Call RPC function
    const { data } = await supabase.rpc('get_workers_by_experience', params)
    return { data }
  }
  ```
- UI: ExperienceFilter slider component, gated with FeatureGate
- Display experience badge on worker cards

**Complexity**: Medium (2-3 days)
**Value**: High - find seasoned professionals

---

## Subscription Tiers & Pricing

### Free Tier (All Users)

**Core Functionality** - No credit card required

**Features**:
- ✅ Post unlimited jobs (employers)
- ✅ Browse and apply to unlimited jobs (workers)
- ✅ Send and receive unlimited messages
- ✅ Create profile with certifications and work experience
- ✅ Basic job search filters (trade, location, job type, distance)
- ✅ View job details and employer profiles
- ✅ Receive application notifications

**Limitations**:
- ❌ Profile appears below boosted profiles
- ❌ No proximity alerts for nearby jobs
- ❌ Cannot see who viewed profile (teaser only)
- ❌ No work history endorsements
- ❌ No certification filtering
- ❌ No job analytics
- ❌ No custom screening questions
- ❌ No experience-based search

---

### Pro Tier ($15/month or $150/year)

**Premium Features** - Role-based benefits

**All Free features, plus**:

**For Workers ($15/month)**:
1. ⭐ **Profile Boost** - Appear first in employer searches and application lists
2. 📍 **Proximity Alerts** - Get notified about nearby jobs in real-time
3. 👀 **Who Viewed Me** - See which employers viewed your profile
4. ✅ **Verified Work History** - Request endorsements from previous employers

**For Employers ($15/month)**:
1. 🎓 **Certification Filtering** - Filter candidates by verified certifications
2. 📊 **Job Analytics** - View job performance metrics and conversion rates
3. ❓ **Custom Screening Questions** - Add pre-qualification questions to job postings
4. 🔍 **Experience Search** - Filter candidates by years of experience

**Pricing**:
- Monthly: $15/month (billed monthly)
- Annual: $150/year (save $30, equivalent to $12.50/month)
- Single subscription, role-based features
- Cancel anytime, access retained until period end

---

### Subscription Management

**Single Subscription Status**:
- Stored in `profiles.subscription_status` (free/pro)
- Features shown/hidden based on `profiles.role` (Worker/Employer)
- Same pricing page for both roles
- Automatic feature access based on role

**Upgrade Flow**:
1. User clicks "Upgrade to Pro" anywhere in app
2. Redirects to `/pricing` page
3. Selects monthly or annual plan
4. Stripe Checkout handles payment
5. Webhook updates `subscription_status = 'pro'`
6. User immediately sees Pro features

**Cancellation Flow**:
1. User goes to subscription management page
2. Clicks "Cancel Subscription"
3. Subscription marked `cancel_at_period_end = true`
4. User retains Pro access until period ends
5. At period end, webhook updates `subscription_status = 'free'`
6. Pro features become gated with upgrade prompts

---

## Feature Gating Architecture

### Three-Layer Enforcement System

**Layer 1: UI Components (UX Only)**

```typescript
// features/subscriptions/components/feature-gate.tsx
'use client'

import { useIsPro } from '../hooks/use-is-pro'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

interface FeatureGateProps {
  feature?: string
  children: React.ReactNode
  fallback?: React.ReactNode
  showUpgradePrompt?: boolean
}

export function FeatureGate({
  feature,
  children,
  fallback,
  showUpgradePrompt = true
}: FeatureGateProps) {
  const isPro = useIsPro()
  const router = useRouter()

  if (!isPro) {
    if (fallback) return <>{fallback}</>

    if (!showUpgradePrompt) return null

    return (
      <div className="p-6 text-center border-2 border-dashed rounded-lg bg-gray-50">
        <div className="inline-flex items-center justify-center w-12 h-12 mb-4 bg-blue-100 rounded-full">
          <span className="text-2xl">⭐</span>
        </div>
        <h3 className="font-bold text-lg mb-2">Pro Feature</h3>
        <p className="text-gray-600 mb-4">
          Upgrade to KrewUp Pro to unlock {feature || 'this feature'}
        </p>
        <Button onClick={() => router.push('/pricing')}>
          Upgrade to Pro - $15/month
        </Button>
      </div>
    )
  }

  return <>{children}</>
}

// Usage Examples:

// Worker feature
<FeatureGate feature="proximity alerts">
  <ProximityAlertSettings />
</FeatureGate>

// Employer feature
<FeatureGate feature="experience-based search">
  <ExperienceFilterSlider />
</FeatureGate>

// Custom fallback
<FeatureGate
  feature="verified work history"
  fallback={<div>Upgrade to request endorsements</div>}
>
  <RequestEndorsementButton />
</FeatureGate>

// No prompt (silent hiding)
<FeatureGate feature="job analytics" showUpgradePrompt={false}>
  <AnalyticsChart />
</FeatureGate>
```

**Layer 2: Server Actions (Security)**

```typescript
// features/endorsements/actions/endorsement-actions.ts
'use server'

import { createServerClient } from '@/lib/supabase/server'

export async function requestEndorsement(experienceId: string) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized' }
  }

  // Check Pro subscription
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, role')
    .eq('id', user.id)
    .single()

  if (profile.subscription_status !== 'pro') {
    return { error: 'Pro subscription required' }
  }

  if (profile.role !== 'Worker') {
    return { error: 'Only workers can request endorsements' }
  }

  // ... proceed with endorsement request
}

// Reusable Pro check utility
// lib/utils/subscription-guards.ts
export async function requireProSubscription(requiredRole?: 'Worker' | 'Employer') {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized', user: null, profile: null }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, role, name, email')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return { error: 'Profile not found', user, profile: null }
  }

  if (profile.subscription_status !== 'pro') {
    return { error: 'Pro subscription required', user, profile }
  }

  if (requiredRole && profile.role !== requiredRole) {
    return { error: `${requiredRole} role required`, user, profile }
  }

  return { user, profile, error: null }
}

// Usage in server actions
export async function searchWorkersByExperience(params: SearchParams) {
  const { user, profile, error } = await requireProSubscription('Employer')

  if (error) {
    return { error }
  }

  // ... proceed with search
}
```

**Layer 3: Database RLS Policies (Defense in Depth)**

```sql
-- Only Pro workers can insert endorsement requests
CREATE POLICY "Pro workers can request endorsements"
  ON endorsement_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    worker_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'Worker'
      AND profiles.subscription_status = 'pro'
    )
  );

-- Only Pro employers can access analytics
CREATE POLICY "Pro employers can view job analytics"
  ON job_views
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_views.job_id
      AND jobs.employer_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'Employer'
        AND profiles.subscription_status = 'pro'
      )
    )
  );

-- Only Pro workers can access proximity alerts
CREATE POLICY "Pro workers can manage proximity alerts"
  ON proximity_alerts
  FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'Worker'
      AND profiles.subscription_status = 'pro'
    )
  );
```

### Key Principle: Never Trust the Client

**CRITICAL**: Client-side gates are for UX only. Always enforce on server.

- ✅ API routes verify subscription status
- ✅ Server actions check Pro before executing
- ✅ RLS policies protect at database level
- ✅ Stripe webhooks are source of truth for subscription state
- ❌ Never rely on client-side `isPro` check for security

---

## Database Schema Changes

### New Tables

#### `endorsement_requests`

```sql
CREATE TABLE endorsement_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experience_id UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  employer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  request_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(experience_id, employer_id) -- One request per experience per employer
);

CREATE INDEX idx_endorsement_requests_worker ON endorsement_requests(worker_id);
CREATE INDEX idx_endorsement_requests_employer ON endorsement_requests(employer_id);
CREATE INDEX idx_endorsement_requests_experience ON endorsement_requests(experience_id);
CREATE INDEX idx_endorsement_requests_status ON endorsement_requests(status);
```

#### `endorsements`

```sql
CREATE TABLE endorsements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experience_id UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  endorsed_by_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endorsed_by_name TEXT NOT NULL,
  endorsed_by_company TEXT,
  recommendation_text TEXT CHECK (LENGTH(recommendation_text) <= 200),
  verified_dates_worked BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(experience_id, endorsed_by_user_id) -- One endorsement per employer per experience
);

CREATE INDEX idx_endorsements_experience ON endorsements(experience_id);
CREATE INDEX idx_endorsements_endorsed_by ON endorsements(endorsed_by_user_id);
```

### Modified Tables

#### `experiences`

```sql
-- Add new columns
ALTER TABLE experiences
ADD COLUMN is_verified BOOLEAN DEFAULT false,
ADD COLUMN endorsement_count INTEGER DEFAULT 0;

-- Trigger to auto-update endorsement count
CREATE OR REPLACE FUNCTION update_endorsement_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE experiences
    SET
      endorsement_count = endorsement_count + 1,
      is_verified = true
    WHERE id = NEW.experience_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE experiences
    SET endorsement_count = GREATEST(0, endorsement_count - 1)
    WHERE id = OLD.experience_id;

    -- Unverify if no more endorsements
    UPDATE experiences
    SET is_verified = false
    WHERE id = OLD.experience_id
    AND endorsement_count = 0;

    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER endorsement_count_trigger
AFTER INSERT OR DELETE ON endorsements
FOR EACH ROW
EXECUTE FUNCTION update_endorsement_count();
```

### New Functions

#### Calculate Total Experience

```sql
CREATE OR REPLACE FUNCTION calculate_total_experience(
  user_id UUID,
  trade_filter TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  total_months INTEGER;
BEGIN
  SELECT COALESCE(SUM(
    EXTRACT(YEAR FROM AGE(
      COALESCE(end_date, NOW()::DATE),
      start_date
    ))::INTEGER * 12 +
    EXTRACT(MONTH FROM AGE(
      COALESCE(end_date, NOW()::DATE),
      start_date
    ))::INTEGER
  ), 0)
  INTO total_months
  FROM experiences
  WHERE worker_id = user_id
  AND (trade_filter IS NULL OR trade = trade_filter);

  RETURN total_months / 12; -- Return years
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant access
GRANT EXECUTE ON FUNCTION calculate_total_experience TO authenticated;
```

#### Search Workers by Experience

```sql
CREATE OR REPLACE FUNCTION get_workers_by_experience(
  min_years INTEGER DEFAULT 0,
  trade_filter TEXT DEFAULT NULL,
  limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  trade TEXT,
  sub_trade TEXT,
  location TEXT,
  coords GEOMETRY(POINT, 4326),
  total_experience_years INTEGER,
  subscription_status TEXT,
  is_profile_boosted BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.trade,
    p.sub_trade,
    p.location,
    p.coords,
    calculate_total_experience(p.id, trade_filter) as total_experience_years,
    p.subscription_status,
    p.is_profile_boosted
  FROM profiles p
  WHERE p.role = 'Worker'
  AND calculate_total_experience(p.id, trade_filter) >= min_years
  AND (trade_filter IS NULL OR p.trade = trade_filter)
  ORDER BY total_experience_years DESC, is_profile_boosted DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant access
GRANT EXECUTE ON FUNCTION get_workers_by_experience TO authenticated;
```

### Complete Migration Script

See full migration in `/supabase/migrations/XXX_add_endorsement_and_experience_features.sql`

---

## Implementation Priorities

### Phase Breakdown

```
Phase 2A: Core Subscription (Week 1-2)
  ✅ Stripe checkout (already designed)
  ✅ Webhook handlers (already designed)
  ✅ Feature gates (already designed)

Phase 2B: Quick Wins (Week 3-4)
  1. Profile Boost (1 day)
  2. Who Viewed Me (1-2 days)
  3. Certification Filtering (1 day)

Phase 2C: Medium Complexity (Week 5-7)
  4. Job View Analytics (2-3 days)
  5. Experience-Based Search (2-3 days)
  6. Custom Screening Questions (2-3 days)

Phase 3: Advanced Features (Week 8-10)
  7. Email Service Setup (1 week)
  8. Verified Work History & Endorsements (3-4 days)
  9. Proximity Alerts (3-4 days)

Phase 4: Polish & Launch (Week 11-12)
  - Testing & bug fixes
  - Analytics & monitoring
  - Marketing prep
```

### Implementation Order Rationale

**Week 3-4: Quick Wins First**
- Profile Boost: Immediate value, simple implementation
- Who Viewed Me: High engagement, builds FOMO
- Certification Filtering: Solves real employer pain point
- **Goal**: Get first Pro conversions fast

**Week 5-7: Data-Driven Features**
- Job Analytics: Employer retention driver
- Experience Search: Quality hiring tool
- Custom Questions: Screening efficiency
- **Goal**: Demonstrate ROI to employers

**Week 8-10: Advanced Differentiation**
- Email System: Foundation for endorsements
- Endorsements: Trust signal, competitive moat
- Proximity Alerts: Worker retention driver
- **Goal**: Create features competitors can't easily copy

---

## Email Service Integration

### Recommended Provider: Resend

**Why Resend**:
- ✅ Free tier: 3,000 emails/month
- ✅ Excellent Next.js integration
- ✅ React email templates
- ✅ Good deliverability
- ✅ Simple API

**Alternative**: SendGrid (more complex, better for high volume)

### Setup

#### 1. Installation

```bash
npm install resend @react-email/components
```

#### 2. Environment Variables

```env
# .env.local
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@get-krewup.com
```

#### 3. Email Client

```typescript
// lib/email/client.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

export interface EmailParams {
  to: string
  subject: string
  body: string
  html?: string
}

export async function sendEmail({ to, subject, body, html }: EmailParams) {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to,
      subject,
      text: body,
      html: html || body.replace(/\n/g, '<br>')
    })

    if (error) {
      console.error('Email send error:', error)
      return { error: error.message }
    }

    return { data }
  } catch (error) {
    console.error('Email send exception:', error)
    return { error: 'Failed to send email' }
  }
}
```

### Email Templates

#### Endorsement Request Email

```typescript
// lib/email/templates/endorsement-request.tsx
import { Html, Head, Body, Container, Text, Button } from '@react-email/components'

interface EndorsementRequestEmailProps {
  workerName: string
  position: string
  companyName: string
  startDate: string
  endDate: string | null
  approveUrl: string
}

export function EndorsementRequestEmail({
  workerName,
  position,
  companyName,
  startDate,
  endDate,
  approveUrl
}: EndorsementRequestEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'sans-serif', backgroundColor: '#f6f9fc' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff', padding: '20px' }}>
          <Text style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a202c' }}>
            Work History Endorsement Request
          </Text>

          <Text style={{ fontSize: '16px', color: '#4a5568', lineHeight: '1.6' }}>
            Hi there,
          </Text>

          <Text style={{ fontSize: '16px', color: '#4a5568', lineHeight: '1.6' }}>
            <strong>{workerName}</strong> is requesting that you verify their work experience at your company.
          </Text>

          <div style={{ backgroundColor: '#f7fafc', padding: '16px', borderRadius: '8px', margin: '20px 0' }}>
            <Text style={{ margin: '8px 0', color: '#2d3748' }}>
              <strong>Position:</strong> {position}
            </Text>
            <Text style={{ margin: '8px 0', color: '#2d3748' }}>
              <strong>Company:</strong> {companyName}
            </Text>
            <Text style={{ margin: '8px 0', color: '#2d3748' }}>
              <strong>Dates:</strong> {startDate} - {endDate || 'Present'}
            </Text>
          </div>

          <Text style={{ fontSize: '16px', color: '#4a5568', lineHeight: '1.6' }}>
            By endorsing this work history, you'll help {workerName} build credibility with future employers.
            You can also optionally leave a short recommendation.
          </Text>

          <Button
            href={approveUrl}
            style={{
              backgroundColor: '#3182ce',
              color: '#ffffff',
              padding: '12px 24px',
              borderRadius: '6px',
              textDecoration: 'none',
              display: 'inline-block',
              fontWeight: 'bold',
              margin: '20px 0'
            }}
          >
            Review Endorsement Request
          </Button>

          <Text style={{ fontSize: '14px', color: '#718096' }}>
            If you don't recognize this worker, you can safely ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
```

#### Usage in Server Action

```typescript
// features/endorsements/actions/endorsement-actions.ts
import { sendEmail } from '@/lib/email/client'
import { render } from '@react-email/render'
import { EndorsementRequestEmail } from '@/lib/email/templates/endorsement-request'

export async function requestEndorsement(experienceId: string) {
  // ... validation and request creation ...

  const approveUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/endorsements/${request.id}`

  const html = render(
    EndorsementRequestEmail({
      workerName: profile.name,
      position: experience.position,
      companyName: experience.company_name,
      startDate: formatDate(experience.start_date),
      endDate: experience.end_date ? formatDate(experience.end_date) : null,
      approveUrl
    })
  )

  const emailResult = await sendEmail({
    to: experience.employer.email,
    subject: `${profile.name} requests work history endorsement`,
    body: `${profile.name} is requesting endorsement. Click: ${approveUrl}`,
    html
  })

  // Don't fail request if email fails
  if (emailResult.error) {
    console.error('Email failed:', emailResult.error)
  }

  return { data: request }
}
```

### Email Best Practices

1. **Never block on email delivery**
   - Send asynchronously
   - Log failures, don't fail the action
   - Consider retry queue for important emails

2. **Rate limiting**
   - Max 10 endorsement requests per worker per day
   - Track in `endorsement_requests` table

3. **Testing**
   - Use Resend test mode in development
   - Send to your email first
   - Check spam folder

4. **Unsubscribe**
   - Add unsubscribe link to promotional emails
   - Store preferences in `profiles.email_preferences`

---

## Testing Strategy

### Testing Pyramid

```
           /\
          /E2E\ (5% - Manual)
         /____\
        /      \
       /Integr.\ (20% - Vitest)
      /________\
     /          \
    /   Unit     \ (75% - Vitest)
   /______________\
```

### Unit Tests

#### Experience Calculation

```typescript
// features/workers/__tests__/calculate-experience.test.ts
import { describe, it, expect } from 'vitest'
import { calculateTotalExperience } from '../utils/calculate-experience'

describe('calculateTotalExperience', () => {
  it('calculates total years from multiple experiences', () => {
    const experiences = [
      { start_date: '2020-01-01', end_date: '2022-01-01', trade: 'Electrician' },
      { start_date: '2022-02-01', end_date: '2024-02-01', trade: 'Electrician' }
    ]

    const total = calculateTotalExperience(experiences)
    expect(total).toBe(4)
  })

  it('includes ongoing experience (null end_date)', () => {
    const experiences = [
      { start_date: '2023-01-01', end_date: null, trade: 'Plumber' }
    ]

    const total = calculateTotalExperience(experiences)
    expect(total).toBeGreaterThanOrEqual(1)
  })

  it('filters by trade when specified', () => {
    const experiences = [
      { start_date: '2020-01-01', end_date: '2022-01-01', trade: 'Electrician' },
      { start_date: '2022-01-01', end_date: '2024-01-01', trade: 'Plumber' }
    ]

    const electricianYears = calculateTotalExperience(experiences, 'Electrician')
    expect(electricianYears).toBe(2)
  })

  it('handles empty experience array', () => {
    const total = calculateTotalExperience([])
    expect(total).toBe(0)
  })
})
```

### Integration Tests

#### Endorsement Flow

```typescript
// features/endorsements/__tests__/endorsement-flow.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'

describe('Endorsement Flow', () => {
  let workerId: string
  let employerId: string
  let experienceId: string

  beforeEach(async () => {
    // Create test worker (Pro)
    workerId = await createTestUser({ role: 'Worker', subscription_status: 'pro' })

    // Create test employer
    employerId = await createTestUser({ role: 'Employer' })

    // Create experience
    experienceId = await createTestExperience({ worker_id: workerId, employer_id: employerId })
  })

  afterEach(async () => {
    await cleanupTestData([workerId, employerId])
  })

  it('completes full endorsement flow', async () => {
    // 1. Worker requests endorsement
    const request = await requestEndorsement(experienceId)
    expect(request.status).toBe('pending')

    // 2. Employer approves
    const endorsement = await approveEndorsement(request.id, 'Great worker!')
    expect(endorsement).toBeDefined()

    // 3. Experience marked as verified
    const exp = await getExperience(experienceId)
    expect(exp.is_verified).toBe(true)
    expect(exp.endorsement_count).toBe(1)
  })

  it('prevents duplicate requests', async () => {
    await requestEndorsement(experienceId)

    // Second request should fail
    await expect(requestEndorsement(experienceId)).rejects.toThrow()
  })

  it('requires Pro subscription', async () => {
    // Downgrade worker to free
    await updateUserSubscription(workerId, 'free')

    // Request should fail
    const result = await requestEndorsement(experienceId)
    expect(result.error).toBe('Pro subscription required')
  })
})
```

### Manual Testing Checklist

#### Endorsement Feature

```markdown
## Endorsement Request Flow

### As Worker (Pro)
- [ ] Navigate to Profile → Experience
- [ ] Click "Request Endorsement" on an experience
- [ ] Verify button changes to "Endorsement Requested"
- [ ] Verify success toast appears
- [ ] Check employer receives email

### As Employer
- [ ] Receive endorsement request email
- [ ] Click "Review Endorsement Request"
- [ ] Verify redirected to correct page
- [ ] Enter recommendation (optional)
- [ ] Click "Approve Endorsement"
- [ ] Verify success message

### Verification
- [ ] Navigate to worker's profile
- [ ] Verify "Endorsed by 1 employer" badge
- [ ] Verify green checkmark on experience
- [ ] Click endorsement badge
- [ ] Verify shows endorser name and recommendation

### Edge Cases
- [ ] Request endorsement as free worker (should show upgrade)
- [ ] Request same endorsement twice (should show error)
- [ ] Approve as wrong employer (should fail)
```

#### Experience Search Feature

```markdown
## Experience-Based Search

### As Employer (Pro)
- [ ] Navigate to Worker Search
- [ ] Verify "Minimum Experience" slider appears
- [ ] Drag slider to 5 years
- [ ] Verify results update
- [ ] Verify experience badges show on cards
- [ ] Verify sorted by experience (highest first)
- [ ] Change trade filter
- [ ] Verify experience recalculates for trade
- [ ] Set slider to 0
- [ ] Verify all workers appear

### As Employer (Free)
- [ ] Navigate to Worker Search
- [ ] Verify slider shows upgrade prompt
- [ ] Click "Upgrade to Pro"
- [ ] Verify redirected to pricing page

### Edge Cases
- [ ] Worker with no experience (0 years)
- [ ] Worker with ongoing job (calculates to present)
- [ ] Worker with multiple trades (correct filtering)
```

---

## Feature Rollout Timeline

### Total Timeline: 10 weeks from Stripe to all features live

---

### **Week 1-2: Stripe Integration & Foundation**

#### Week 1: Stripe Setup

**Day 1-2**: Account & Products
- [ ] Create Stripe account (test mode)
- [ ] Create KrewUp Pro Monthly product ($15/month)
- [ ] Create KrewUp Pro Annual product ($150/year)
- [ ] Get price IDs
- [ ] Add to environment variables

**Day 3-4**: Integration Testing
- [ ] Test checkout with test cards (4242 4242 4242 4242)
- [ ] Test webhook with Stripe CLI locally
- [ ] Verify subscription creation in database
- [ ] Test cancellation flow

**Day 5**: Production Deploy
- [ ] Deploy pricing page
- [ ] Test in production (test mode)
- [ ] Verify all flows work

**Deliverable**: Working checkout in test mode ✅

#### Week 2: Quick Win Features (3 features)

**Day 1**: Profile Boost
- [ ] Modify webhook to set boost fields
- [ ] Update applicant queries (ORDER BY boost DESC)
- [ ] Create boost badge component
- [ ] Test boost display
- [ ] Deploy

**Day 2**: Profile View Tracking
- [ ] Add view tracking to profile page
- [ ] Create profile_views insert
- [ ] Test logging

**Day 3**: Who Viewed Me UI
- [ ] Create ProfileViewsList component
- [ ] Gate with FeatureGate
- [ ] Show weekly stats
- [ ] Add to profile page
- [ ] Deploy

**Day 4**: Certification Filtering
- [ ] Add Pro-only filter checkbox
- [ ] Modify application queries
- [ ] Test filtering
- [ ] Deploy

**Day 5**: Testing & Launch 🚀
- [ ] End-to-end test all 3 features
- [ ] Test free vs Pro experience
- [ ] **GO LIVE**: Switch to Stripe live keys
- [ ] Announce Pro features to beta users
- [ ] Monitor conversions

**Deliverable**: 3 Pro features live, first conversions ✅

---

### **Week 3-5: Analytics & Search Features**

#### Week 3: Job View Analytics

**Day 1**: Backend
- [ ] Add view tracking to job detail page
- [ ] Session-based deduplication
- [ ] Create analytics RPC function

**Day 2-3**: Dashboard
- [ ] Create analytics page
- [ ] Build StatCard components
- [ ] Integrate recharts
- [ ] Add job selector

**Day 4**: Testing
- [ ] Generate test view data
- [ ] Verify charts render
- [ ] Test date ranges

**Day 5**: Deploy
- [ ] Add loading/empty states
- [ ] Gate with Pro check
- [ ] Deploy

**Deliverable**: Analytics dashboard live ✅

#### Week 4: Experience-Based Search

**Day 1**: Database
- [ ] Run endorsement migration (includes functions)
- [ ] Test `calculate_total_experience()`
- [ ] Test `get_workers_by_experience()`

**Day 2**: Server Actions
- [ ] Create `searchWorkersByExperience`
- [ ] Add Pro check
- [ ] Test with params

**Day 3**: UI Components
- [ ] Create ExperienceFilter slider
- [ ] Create WorkerSearchResults
- [ ] Add experience badges

**Day 4**: Integration
- [ ] Create search page
- [ ] Connect filter to query
- [ ] Test real-time filtering

**Day 5**: Deploy
- [ ] Create test workers
- [ ] Verify calculations
- [ ] Deploy

**Deliverable**: Experience search live ✅

#### Week 5: Custom Screening Questions

**Day 1**: Backend
- [ ] Add JSONB validation
- [ ] Update job creation action

**Day 2**: Question Builder
- [ ] Create CustomQuestionsBuilder
- [ ] Integrate into job form
- [ ] Gate with FeatureGate

**Day 3**: Application Form
- [ ] Show questions in modal
- [ ] Validate required answers
- [ ] Save to JSONB

**Day 4**: Display Answers
- [ ] Show in application detail
- [ ] Format nicely

**Day 5**: Deploy
- [ ] Test with 0-5 questions
- [ ] Deploy

**Deliverable**: Custom questions live ✅

---

### **Week 6-8: Endorsements & Proximity Alerts**

#### Week 6: Email Service Setup

**Day 1**: Integration
- [ ] Sign up for Resend
- [ ] Add API key
- [ ] Create email client
- [ ] Test basic sending

**Day 2**: Templates
- [ ] Install @react-email
- [ ] Create EndorsementRequestEmail
- [ ] Create SubscriptionConfirmedEmail
- [ ] Test templates

**Day 3**: Testing
- [ ] Send test emails
- [ ] Verify formatting
- [ ] Test links
- [ ] Check spam folder

**Day 4-5**: DNS & Deliverability
- [ ] Configure SPF/DKIM if needed
- [ ] Test on multiple providers
- [ ] Fix deliverability issues

**Deliverable**: Email system ready ✅

#### Week 7: Endorsements

**Day 1**: Backend (migration already exists)
- [ ] Verify tables
- [ ] Test RLS policies
- [ ] Test triggers

**Day 2**: Request Flow
- [ ] Create `requestEndorsement` action
- [ ] Create RequestEndorsementButton
- [ ] Add to experience items
- [ ] Test email sending

**Day 3**: Approve Flow
- [ ] Create endorsement review page
- [ ] Create `approveEndorsement` action
- [ ] Build approval form

**Day 4**: Display
- [ ] Create EndorsementBadge
- [ ] Show on profile
- [ ] Show checkmarks
- [ ] Create detail modal

**Day 5**: Deploy
- [ ] End-to-end test
- [ ] Test as worker and employer
- [ ] Verify emails
- [ ] Deploy

**Deliverable**: Endorsements live ✅

#### Week 8: Proximity Alerts

**Day 1**: Settings UI
- [ ] Create ProximityAlertSettings
- [ ] Radius slider
- [ ] Trade multi-select
- [ ] Save to DB

**Day 2**: Notifications
- [ ] Create notifications table
- [ ] Create notification bell
- [ ] Show unread count
- [ ] Create list

**Day 3**: Background Worker
- [ ] Create cron function
- [ ] PostGIS proximity query
- [ ] Create notifications
- [ ] Deploy cron (Vercel)

**Day 4**: Testing
- [ ] Create test jobs
- [ ] Configure alerts
- [ ] Trigger cron manually
- [ ] Verify notifications

**Day 5**: Deploy
- [ ] Add preferences
- [ ] Test clicking notifications
- [ ] Deploy

**Deliverable**: Proximity alerts live ✅

---

### **Week 9-10: Polish & Launch**

#### Week 9: Testing & Optimization

**Day 1-2**: Feature Testing
- [ ] Test all 8 Pro features end-to-end
- [ ] Test free vs Pro UX
- [ ] Test upgrade flow
- [ ] Test cancellation

**Day 3**: Cross-Browser
- [ ] Chrome, Firefox, Safari, Edge
- [ ] iOS Safari
- [ ] Chrome Mobile
- [ ] Fix issues

**Day 4**: Performance
- [ ] Lighthouse audit
- [ ] Optimize queries
- [ ] Add indexes
- [ ] Optimize images

**Day 5**: Bug Fixes
- [ ] Fix critical bugs
- [ ] UI polish
- [ ] Test fixes

**Deliverable**: All features stable ✅

#### Week 10: Analytics & Marketing

**Day 1**: Analytics
- [ ] Track feature usage
- [ ] Track conversions
- [ ] Track engagement

**Day 2**: Monitoring
- [ ] Set up Sentry
- [ ] Uptime monitoring
- [ ] Error alerts

**Day 3**: Documentation
- [ ] Update user docs
- [ ] Pro feature guide
- [ ] Help articles

**Day 4-5**: Marketing
- [ ] Pro announcement email
- [ ] Update landing page
- [ ] Create comparison table
- [ ] Prepare social posts

**Deliverable**: Ready for full launch ✅

---

### Launch Checklist

#### Pre-Launch (Week 10, Day 5)
- [ ] All 8 Pro features tested
- [ ] Stripe in live mode
- [ ] Email delivering reliably
- [ ] Error monitoring active
- [ ] Analytics working
- [ ] Pricing page accurate
- [ ] Feature gates working

#### Launch Day
- [ ] Announce to beta users
- [ ] Post on social media
- [ ] Monitor errors
- [ ] Monitor conversions
- [ ] Ready for support

#### Post-Launch (Week 11+)
- [ ] Track conversion rate (target: 15%)
- [ ] Track feature usage
- [ ] Gather feedback
- [ ] Fix bugs
- [ ] Iterate

---

### Success Metrics

**Week 2** (Quick Wins):
- Target: 5% conversion
- Track: Which feature drove conversion

**Week 5** (Analytics & Search):
- Target: 10% conversion
- Track: Employer vs Worker rates

**Week 8** (All Features):
- Target: 15% conversion
- Track: Most-used features
- Track: Churn rate (<5%)

**Week 12** (One Month Post-Launch):
- Target: 50+ Pro subscribers
- Target: $750+ MRR
- Track: Feature engagement per feature

---

## Summary

### What We've Designed

**4 Worker Pro Features**:
1. ⭐ Profile Boost - Appear first in searches
2. 📍 Proximity Alerts - Real-time nearby jobs
3. 👀 Who Viewed Me - See employer interest
4. ✅ Verified Work History - Employer endorsements

**4 Employer Pro Features**:
1. 🎓 Certification Filtering - Find qualified candidates
2. 📊 Job Analytics - Performance metrics
3. ❓ Custom Screening Questions - Pre-qualification
4. 🔍 Experience Search - Filter by years of experience

**Implementation Ready**:
- ✅ Complete database schema
- ✅ Feature gating architecture
- ✅ Email service integration
- ✅ Testing strategy
- ✅ 10-week rollout plan

**Next Steps**:
1. Review and approve this design
2. Begin Week 1: Stripe setup
3. Execute week-by-week plan
4. Launch Pro features incrementally
5. Monitor, iterate, and grow

---

**Document Status**: Complete and ready for implementation
**Estimated Timeline**: 10 weeks
**Expected Outcome**: 8 Pro features, 15%+ conversion rate, $750+ MRR
