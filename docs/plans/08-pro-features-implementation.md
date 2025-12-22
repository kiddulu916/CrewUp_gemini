# 08 - Pro Features Implementation

## Overview

This document details the implementation strategy for all CrewUp Pro subscription features, including feature gating architecture, prioritization, and specific implementation guidance.

## Feature Gating Architecture

### Three-Layer System

**Layer 1: Component-Level Gates**

Use the `FeatureGate` wrapper component for entire features or sections.

```typescript
// features/subscriptions/components/feature-gate.tsx
'use client'

import { useIsPro } from '../hooks/use-is-pro'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

interface FeatureGateProps {
  feature?: string  // Optional feature identifier for analytics
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
          Upgrade to CrewUp Pro to unlock {feature || 'this feature'}
        </p>
        <Button onClick={() => router.push('/pricing')}>
          Upgrade to Pro - $15/month
        </Button>
      </div>
    )
  }

  return <>{children}</>
}

// Usage Examples
<FeatureGate feature="proximity alerts">
  <ProximityAlertSettings />
</FeatureGate>

<FeatureGate
  feature="profile views"
  fallback={<div>Upgrade to see who viewed your profile</div>}
>
  <ProfileViewsList />
</FeatureGate>
```

**Layer 2: Hook-Level Checks**

Use hooks for conditional rendering and feature checks.

```typescript
// features/subscriptions/hooks/use-is-pro.ts
import { useAuth } from '@/features/auth/hooks/use-auth'

export function useIsPro() {
  const { data: auth } = useAuth()
  return auth?.profile?.subscription_status === 'pro'
}

// features/subscriptions/hooks/use-has-feature.ts
export function useHasFeature(featureName: string) {
  const isPro = useIsPro()

  // Free features available to all
  const freeFeatures = ['job_posting', 'job_browsing', 'messaging', 'basic_profile']

  if (freeFeatures.includes(featureName)) return true

  // All other features require Pro
  return isPro
}

// Usage in components
function JobCard({ job }) {
  const isPro = useIsPro()
  const score = useCompatibilityScore(job.id)

  return (
    <Card>
      <JobTitle>{job.title}</JobTitle>
      <JobLocation>{job.location}</JobLocation>

      {isPro ? (
        <div className="mt-2">
          <DetailedCompatibilityScore score={score} />
          <CertificationGapAnalysis job={job} />
        </div>
      ) : (
        <div className="mt-2">
          <BasicMatchIndicator />
          <button className="text-sm text-blue-600">
            Upgrade for detailed matching →
          </button>
        </div>
      )}
    </Card>
  )
}
```

**Layer 3: API-Level Enforcement**

Always enforce subscription requirements on the server.

```typescript
// lib/utils/api-guards.ts
import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function requireProSubscription() {
  const supabase = createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status')
    .eq('id', user.id)
    .single()

  if (profile?.subscription_status !== 'pro') {
    return {
      error: NextResponse.json(
        { error: 'Pro subscription required' },
        { status: 403 }
      )
    }
  }

  return { user, profile }
}

// Usage in API routes
export async function GET(request: Request) {
  const { user, profile, error } = await requireProSubscription()
  if (error) return error

  // Return Pro-only data
  const analytics = await getProfileAnalytics(user.id)
  return NextResponse.json({ data: analytics })
}
```

### Key Principle

**NEVER TRUST CLIENT-SIDE CHECKS FOR SECURITY**

Client-side gates are for UX only. Always enforce on the server:
- API routes must verify subscription status
- Database RLS policies can also check subscription status
- Stripe webhooks are the source of truth for subscription state

---

## Pro Features Priority Matrix

### Tier 1: Quick Wins (Phase 2 - Week 2)

**Estimated time: 3-5 days**

#### 1. Profile Boost (Workers)

**Value**: High visibility for workers, visual indicator drives urgency
**Complexity**: Low
**Implementation time**: 1 day

```typescript
// Auto-boost Pro users
// Database: profiles.is_profile_boosted, profiles.boost_expires_at

// On subscription activation (webhook):
await supabase
  .from('profiles')
  .update({
    is_profile_boosted: true,
    boost_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  })
  .eq('id', user_id)

// In job applicant queries:
const { data: applicants } = await supabase
  .from('job_applications')
  .select(`
    *,
    worker:profiles!worker_id(*)
  `)
  .eq('job_id', jobId)
  .order('worker.is_profile_boosted', { ascending: false })  // Boosted first
  .order('created_at', { ascending: false })

// UI indicator:
{profile.is_profile_boosted && (
  <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500">
    ⭐ Boosted Profile
  </Badge>
)}
```

#### 2. Certification Filtering (Employers)

**Value**: High - employers pay for quality candidates
**Complexity**: Low
**Implementation time**: 1 day

```typescript
// Add filter to job search/applications
<FeatureGate feature="verified certification filter">
  <Checkbox
    checked={showOnlyVerified}
    onChange={setShowOnlyVerified}
  >
    Show only verified certifications
  </Checkbox>
</FeatureGate>

// API filter:
let query = supabase.from('job_applications').select(`
  *,
  worker:profiles(
    *,
    certifications(*)
  )
`)

if (showOnlyVerified && isPro) {
  // Filter to only workers with verified certifications
  query = query.filter('worker.certifications.is_verified', 'eq', true)
}
```

#### 3. "Who Viewed Me" (Workers)

**Value**: High engagement, FOMO driver
**Complexity**: Low
**Implementation time**: 1-2 days

```typescript
// Track profile views (all users)
// app/api/profiles/views/route.ts
export async function POST(request: Request) {
  const { viewed_profile_id } = await request.json()

  await supabase.from('profile_views').insert({
    viewed_profile_id,
    viewer_id: user.id,
    viewed_at: new Date().toISOString()
  })

  return NextResponse.json({ success: true })
}

// Display to Pro users only
<FeatureGate feature="profile views">
  <ProfileViewsList views={recentViews} />
</FeatureGate>

// Component shows:
// - "12 people viewed your profile this week"
// - List of recent viewers (name, photo, trade)
// - Click to view their profile
```

---

### Tier 2: Core Value Props (Phase 3 - Week 1)

**Estimated time: 5-7 days**

#### 4. Proximity Alerts (Workers)

**Value**: Very high - immediate job notifications drive applications
**Complexity**: Medium (requires background job)
**Implementation time**: 3-4 days

**Architecture**:
1. User configures alert preferences (radius, trades)
2. Background job runs every 10 minutes
3. Queries new jobs within user's radius
4. Creates notifications for matching jobs
5. Sends push notification (optional)

```typescript
// User settings component
function ProximityAlertSettings() {
  const [radius, setRadius] = useState(25) // km
  const [trades, setTrades] = useState<string[]>([])
  const [isActive, setIsActive] = useState(true)

  return (
    <FeatureGate feature="proximity alerts">
      <div className="space-y-4">
        <h3>Get notified about jobs near you</h3>

        <div>
          <label>Alert Radius: {radius} km</label>
          <Slider value={radius} onChange={setRadius} min={5} max={50} />
        </div>

        <div>
          <label>Trades to Monitor</label>
          <MultiSelect options={TRADES} value={trades} onChange={setTrades} />
        </div>

        <Switch checked={isActive} onChange={setIsActive}>
          Enable proximity alerts
        </Switch>
      </div>
    </FeatureGate>
  )
}

// Background worker (Vercel Cron or Supabase Edge Function)
// features/notifications/workers/proximity-checker.ts
export async function checkProximityAlerts() {
  // Get all active Pro users with proximity alerts enabled
  const { data: users } = await supabase
    .from('proximity_alerts')
    .select('*, profile:profiles(*)')
    .eq('is_active', true)
    .eq('profile.subscription_status', 'pro')

  for (const user of users) {
    // Find new jobs within radius (last 10 minutes)
    const { data: nearbyJobs } = await supabase.rpc('find_nearby_jobs', {
      user_lat: user.profile.coords.coordinates[1],
      user_lng: user.profile.coords.coordinates[0],
      radius_km: user.radius_km,
      trades: user.trades,
      since: new Date(Date.now() - 10 * 60 * 1000) // Last 10 minutes
    })

    // Create notifications
    for (const job of nearbyJobs) {
      await supabase.from('notifications').insert({
        user_id: user.user_id,
        type: 'new_job',
        title: `New ${job.trade} job nearby`,
        message: `${job.title} - ${job.distance_km.toFixed(1)}km away`,
        data: { job_id: job.id }
      })
    }
  }
}

// PostgreSQL function for proximity search
CREATE OR REPLACE FUNCTION find_nearby_jobs(
  user_lat FLOAT,
  user_lng FLOAT,
  radius_km FLOAT,
  trades TEXT[],
  since TIMESTAMPTZ
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  trade TEXT,
  distance_km FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    j.id,
    j.title,
    j.trade,
    ST_Distance(
      j.coords::geography,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) / 1000 AS distance_km
  FROM jobs j
  WHERE
    j.status = 'active'
    AND j.created_at >= since
    AND j.trade = ANY(trades)
    AND ST_DWithin(
      j.coords::geography,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      radius_km * 1000
    )
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql;
```

#### 5. Job View Analytics (Employers)

**Value**: High - data-driven hiring decisions
**Complexity**: Medium (requires charting)
**Implementation time**: 2-3 days

```typescript
// Track job views (all users)
// Enhance GET /api/jobs/[id] to track views
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient()
  const sessionId = cookies().get('session_id')?.value || generateSessionId()

  // Track view (deduplicate by session)
  const { data: existingView } = await supabase
    .from('job_views')
    .select('id')
    .eq('job_id', params.id)
    .eq('session_id', sessionId)
    .single()

  if (!existingView) {
    await supabase.from('job_views').insert({
      job_id: params.id,
      viewer_id: user?.id,
      session_id: sessionId
    })

    // Increment view count
    await supabase.rpc('increment_job_views', { job_id: params.id })
  }

  // Return job data
  const { data: job } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', params.id)
    .single()

  return NextResponse.json({ data: job })
}

// Analytics API
// app/api/analytics/job-views/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const jobId = searchParams.get('job_id')

  const { error } = await requireProSubscription()
  if (error) return error

  // Aggregate views by date
  const { data } = await supabase.rpc('get_job_view_analytics', {
    job_id: jobId,
    start_date: searchParams.get('start_date'),
    end_date: searchParams.get('end_date')
  })

  return NextResponse.json({ data })
}

// Analytics dashboard component
function JobAnalyticsDashboard() {
  const { data: jobs } = useJobs({ employer_id: user.id })
  const [selectedJob, setSelectedJob] = useState(jobs?.[0])
  const { data: analytics } = useQuery({
    queryKey: ['job-analytics', selectedJob?.id],
    queryFn: () => fetch(`/api/analytics/job-views?job_id=${selectedJob.id}`).then(r => r.json())
  })

  return (
    <FeatureGate feature="job analytics">
      <div className="space-y-6">
        <JobSelector jobs={jobs} selected={selectedJob} onChange={setSelectedJob} />

        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Total Views" value={analytics.total_views} />
          <StatCard label="Unique Viewers" value={analytics.unique_views} />
          <StatCard label="Applications" value={selectedJob.application_count} />
        </div>

        <LineChart data={analytics.views_by_date} />
      </div>
    </FeatureGate>
  )
}
```

---

### Tier 3: Advanced Differentiators (Phase 3 - Week 2-3)

**Estimated time: 7-10 days**

#### 6. Job Compatibility Scoring (Workers)

**Value**: Medium-high - helps workers prioritize applications
**Complexity**: Medium (algorithm development)
**Implementation time**: 2-3 days

```typescript
// features/jobs/utils/compatibility-scoring.ts
export interface CompatibilityScore {
  overall: number  // 0-100
  breakdown: {
    tradeMatch: number      // 0-30 points
    certifications: number  // 0-30 points
    distance: number        // 0-20 points
    experience: number      // 0-20 points
  }
  gaps: string[]  // Missing certifications
  strengths: string[]
}

export function calculateCompatibilityScore(
  job: Job,
  profile: Profile
): CompatibilityScore {
  let tradeMatch = 0
  let certifications = 0
  let distance = 0
  let experience = 0
  const gaps: string[] = []
  const strengths: string[] = []

  // Trade matching (30 points)
  if (job.trade === profile.trade) {
    tradeMatch = 30
    if (job.sub_trade === profile.sub_trade) {
      strengths.push('Exact sub-trade match')
    } else {
      strengths.push('Trade match')
    }
  } else if (isRelatedTrade(job.trade, profile.trade)) {
    tradeMatch = 15
  }

  // Certification matching (30 points)
  if (job.required_certs?.length > 0) {
    const userCertTypes = profile.certifications.map(c => c.certification_type)
    const matchedCerts = job.required_certs.filter(req =>
      userCertTypes.includes(req)
    )
    const missingCerts = job.required_certs.filter(req =>
      !userCertTypes.includes(req)
    )

    certifications = (matchedCerts.length / job.required_certs.length) * 30

    if (matchedCerts.length > 0) {
      strengths.push(`${matchedCerts.length} required certifications`)
    }
    gaps.push(...missingCerts.map(cert => `Missing ${cert}`))
  } else {
    certifications = 30 // No requirements = full points
  }

  // Distance scoring (20 points)
  const distanceKm = calculateDistance(job.coords, profile.coords)
  if (distanceKm <= 10) {
    distance = 20
    strengths.push('Very close location')
  } else if (distanceKm <= 25) {
    distance = 15
  } else if (distanceKm <= 50) {
    distance = 10
  } else {
    distance = 5
  }

  // Experience scoring (20 points)
  const relevantYears = calculateRelevantExperience(
    profile.work_experience,
    job.trade
  )
  if (relevantYears >= 5) {
    experience = 20
    strengths.push('5+ years experience')
  } else if (relevantYears >= 2) {
    experience = 15
  } else if (relevantYears >= 1) {
    experience = 10
  } else {
    experience = 5
  }

  const overall = tradeMatch + certifications + distance + experience

  return {
    overall,
    breakdown: { tradeMatch, certifications, distance, experience },
    gaps,
    strengths
  }
}

// Component display
function CompatibilityScoreDisplay({ job, profile }) {
  const isPro = useIsPro()
  const score = calculateCompatibilityScore(job, profile)

  if (!isPro) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">
          {score.overall >= 70 ? '✅ Good match' : '❓ Check details'}
        </span>
        <button className="text-xs text-blue-600">Upgrade for detailed score</button>
      </div>
    )
  }

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold">Compatibility Score</h4>
        <div className={`text-3xl font-bold ${
          score.overall >= 80 ? 'text-green-600' :
          score.overall >= 60 ? 'text-yellow-600' :
          'text-gray-600'
        }`}>
          {score.overall}%
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <ScoreBar label="Trade Match" value={score.breakdown.tradeMatch} max={30} />
        <ScoreBar label="Certifications" value={score.breakdown.certifications} max={30} />
        <ScoreBar label="Location" value={score.breakdown.distance} max={20} />
        <ScoreBar label="Experience" value={score.breakdown.experience} max={20} />
      </div>

      {score.strengths.length > 0 && (
        <div className="mb-2">
          <p className="text-sm font-medium text-green-700">Strengths:</p>
          <ul className="text-sm text-green-600">
            {score.strengths.map(s => <li key={s}>✓ {s}</li>)}
          </ul>
        </div>
      )}

      {score.gaps.length > 0 && (
        <div>
          <p className="text-sm font-medium text-orange-700">To Improve:</p>
          <ul className="text-sm text-orange-600">
            {score.gaps.map(g => <li key={g}>• {g}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}
```

#### 7. Custom Screening Questions (Employers)

**Value**: Medium - better candidate filtering
**Complexity**: Medium (JSONB handling)
**Implementation time**: 2-3 days

```typescript
// Job form with custom questions builder
function CustomQuestionsBuilder({ questions, onChange }) {
  function addQuestion() {
    onChange([...questions, { question: '', required: false }])
  }

  function updateQuestion(index: number, updates: Partial<CustomQuestion>) {
    const updated = [...questions]
    updated[index] = { ...updated[index], ...updates }
    onChange(updated)
  }

  function removeQuestion(index: number) {
    onChange(questions.filter((_, i) => i !== index))
  }

  return (
    <FeatureGate feature="custom screening questions">
      <div className="space-y-4">
        <h4 className="font-semibold">Custom Screening Questions</h4>

        {questions.map((q, i) => (
          <div key={i} className="flex gap-2">
            <Input
              value={q.question}
              onChange={e => updateQuestion(i, { question: e.target.value })}
              placeholder="e.g., Do you have experience with commercial projects?"
            />
            <Checkbox
              checked={q.required}
              onChange={checked => updateQuestion(i, { required: checked })}
            >
              Required
            </Checkbox>
            <Button variant="ghost" onClick={() => removeQuestion(i)}>×</Button>
          </div>
        ))}

        <Button variant="outline" onClick={addQuestion}>+ Add Question</Button>
      </div>
    </FeatureGate>
  )
}

// Store in jobs.custom_questions as JSONB
// Application form shows custom questions
function JobApplicationForm({ job }) {
  const [answers, setAnswers] = useState<Record<string, string>>({})

  return (
    <form>
      {/* Standard fields */}
      <Textarea label="Cover Message" />

      {/* Custom questions */}
      {job.custom_questions?.map((q, i) => (
        <div key={i}>
          <label>
            {q.question}
            {q.required && <span className="text-red-500">*</span>}
          </label>
          <Textarea
            value={answers[i] || ''}
            onChange={e => setAnswers({ ...answers, [i]: e.target.value })}
            required={q.required}
          />
        </div>
      ))}
    </form>
  )
}

// Display answers to employer
function ApplicationDetail({ application, job }) {
  return (
    <div>
      <h3>{application.worker.name}</h3>
      <p>{application.cover_message}</p>

      {job.custom_questions && (
        <div className="mt-4">
          <h4 className="font-semibold">Screening Questions</h4>
          {job.custom_questions.map((q, i) => (
            <div key={i} className="mt-2">
              <p className="text-sm text-gray-600">{q.question}</p>
              <p className="font-medium">{application.custom_answers?.[i] || 'No answer'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

#### 8. Bulk Job Posting & Templates (Employers)

**Value**: Medium - time saver for repeat posters
**Complexity**: Low-medium
**Implementation time**: 2 days

```typescript
// Save job as template
async function saveAsTemplate(job: Job, templateName: string) {
  await fetch('/api/jobs/templates', {
    method: 'POST',
    body: JSON.stringify({
      name: templateName,
      template_data: {
        trade: job.trade,
        sub_trade: job.sub_trade,
        job_type: job.job_type,
        description: job.description,
        pay_rate: job.pay_rate,
        required_certs: job.required_certs,
        custom_questions: job.custom_questions
      }
    })
  })
}

// Load and use template
function PostJobFromTemplate() {
  const { data: templates } = useQuery({
    queryKey: ['job-templates'],
    queryFn: () => fetch('/api/jobs/templates').then(r => r.json())
  })

  function useTemplate(template: Template) {
    // Pre-fill form with template data
    setFormData({
      ...template.template_data,
      location: '', // User must provide
      title: template.template_data.title || ''
    })
  }

  return (
    <FeatureGate feature="job templates">
      <div>
        <h4>Start from template</h4>
        {templates?.map(template => (
          <button key={template.id} onClick={() => useTemplate(template)}>
            {template.name}
          </button>
        ))}
      </div>
    </FeatureGate>
  )
}

// Bulk posting: Duplicate job with different locations
function BulkPostJobs({ baseJob }: { baseJob: Job }) {
  const [locations, setLocations] = useState<string[]>([''])

  async function postAll() {
    for (const location of locations.filter(l => l)) {
      await fetch('/api/jobs', {
        method: 'POST',
        body: JSON.stringify({
          ...baseJob,
          location,
          coords: await geocodeLocation(location)
        })
      })
    }
  }

  return (
    <FeatureGate feature="bulk job posting">
      <div>
        <h4>Post to multiple locations</h4>
        {locations.map((loc, i) => (
          <Input
            key={i}
            value={loc}
            onChange={e => {
              const updated = [...locations]
              updated[i] = e.target.value
              setLocations(updated)
            }}
            placeholder="Enter location"
          />
        ))}
        <Button onClick={() => setLocations([...locations, ''])}>
          + Add Location
        </Button>
        <Button onClick={postAll}>Post All ({locations.filter(l => l).length} jobs)</Button>
      </div>
    </FeatureGate>
  )
}
```

---

## Implementation Best Practices

### 1. Progressive Enhancement

Implement Pro features as enhancements, not replacements:
- Free users get basic version
- Pro users get enhanced version
- Never break free user experience

### 2. Analytics Tracking

Track Pro feature usage to understand value:
```typescript
// Track when Pro features are used
function trackFeatureUsage(feature: string) {
  fetch('/api/analytics/feature-usage', {
    method: 'POST',
    body: JSON.stringify({ feature, timestamp: new Date() })
  })
}

// Use in components
<FeatureGate feature="proximity_alerts">
  <ProximityAlertSettings
    onActivate={() => trackFeatureUsage('proximity_alerts_enabled')}
  />
</FeatureGate>
```

### 3. Feature Flags

Use feature flags for gradual rollout:
```typescript
// lib/feature-flags.ts
export const FEATURES = {
  PROXIMITY_ALERTS: process.env.NEXT_PUBLIC_FEATURE_PROXIMITY_ALERTS === 'true',
  CUSTOM_QUESTIONS: process.env.NEXT_PUBLIC_FEATURE_CUSTOM_QUESTIONS === 'true',
}

// Conditional rendering
{FEATURES.PROXIMITY_ALERTS && (
  <FeatureGate feature="proximity_alerts">
    <ProximityAlertSettings />
  </FeatureGate>
)}
```

### 4. Graceful Degradation

Handle subscription expiration gracefully:
- Don't delete Pro data when subscription ends
- Show "Your Pro subscription expired" message
- Allow re-upgrade with one click
- Preserve settings for when they re-subscribe

---

## Testing Pro Features

```typescript
// tests/features/subscriptions/feature-gate.test.ts
describe('FeatureGate', () => {
  it('shows content to Pro users', () => {
    mockUseIsPro(true)
    render(<FeatureGate><div>Pro Content</div></FeatureGate>)
    expect(screen.getByText('Pro Content')).toBeInTheDocument()
  })

  it('shows upgrade prompt to free users', () => {
    mockUseIsPro(false)
    render(<FeatureGate><div>Pro Content</div></FeatureGate>)
    expect(screen.getByText(/Upgrade to Pro/)).toBeInTheDocument()
    expect(screen.queryByText('Pro Content')).not.toBeInTheDocument()
  })
})

// tests/api/pro-features.test.ts
describe('Pro Feature API Protection', () => {
  it('blocks free users from Pro endpoints', async () => {
    mockUserSubscription('free')
    const response = await fetch('/api/analytics/profile-views')
    expect(response.status).toBe(403)
  })

  it('allows Pro users to access Pro endpoints', async () => {
    mockUserSubscription('pro')
    const response = await fetch('/api/analytics/profile-views')
    expect(response.status).toBe(200)
  })
})
```
