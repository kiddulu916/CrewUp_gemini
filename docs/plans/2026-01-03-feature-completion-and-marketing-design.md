# Feature Completion & Marketing Design

**Date:** 2026-01-03
**Priority:** Phase A (Feature Completion) → Phase B (Marketing & Growth)
**Estimated Timeline:** 10-11 days total

---

## Overview

This design covers the implementation of remaining Pro features and marketing pages for KrewUp's public launch preparation.

**Phase A: Feature Completion (Pro Features)**
- Profile Analytics Dashboard (Workers)
- Candidate Analytics Dashboard (Employers)
- Job Compatibility Scoring System

**Phase B: Marketing & Growth**
- Marketing landing page redesign
- About & How-it-works pages
- SEO optimization suite

---

## Architecture & Principles

### Architectural Pattern
All features follow the existing KrewUp architecture:
- Server Actions for data fetching (`'use server'`)
- React Query for client-side caching
- Recharts for data visualization (already installed)
- Feature-based folder structure (`features/[feature]/`)
- Pro feature gating using `FeatureGate` component
- Mobile-first responsive design

### Key Design Principles
1. **Reuse existing patterns** - Job analytics dashboard is our template for all analytics features
2. **Database efficiency** - Aggregate data at query time, add indexes where needed
3. **Progressive enhancement** - Free users see teasers, Pro users get full access
4. **YAGNI ruthlessly** - Build exactly what's in the checklist, no extra features

---

## Phase A: Feature Completion

### 1. Profile Analytics Dashboard (Workers - Pro Only)

**Feature Location:** `features/subscriptions/`

**Objective:** Show workers how many employers have viewed their profile over time with a time-series chart.

#### Components
- `profile-views-chart.tsx` - New line chart component showing views over time (30 days)
- Update `profile-views-list.tsx` - Add chart above existing viewer list

#### Data Flow
1. Enhance `getMyProfileViews()` in `profile-views-actions.ts`
2. Return structure:
```typescript
{
  dailyViews: Array<{date: string, count: number}>, // Last 30 days
  recentViewers: Array<ProfileView>,
  weeklyCount: number
}
```

#### Database Query
```sql
-- Aggregate views by date for last 30 days
SELECT DATE(viewed_at) as date, COUNT(*) as count
FROM profile_views
WHERE viewed_profile_id = $1
  AND viewed_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(viewed_at)
ORDER BY date ASC
```

#### UI Layout
- **Top Card:** Weekly summary ("12 views this week")
- **Middle Card:** Line chart showing 30-day trend (Recharts)
- **Bottom Card:** Recent viewers list (existing component)

#### Pro Gating
- Server action checks: `subscription_status === 'pro'` AND `role === 'worker'`
- UI wrapped in `<FeatureGate requiredPlan="pro">`
- Free users see count-only teaser with upgrade CTA

---

### 2. Candidate Analytics Dashboard (Employers - Pro Only)

**Feature Location:** `features/jobs/`

**Objective:** Help employers track their hiring pipeline with funnel charts, conversion rates, and time-to-hire metrics.

#### Components
- `candidate-analytics-dashboard.tsx` - Overview component for all jobs
- `candidate-pipeline.tsx` - Reusable pipeline/funnel chart component
- `app/dashboard/analytics/page.tsx` - New central analytics page (employers only)

#### Data Structure
```typescript
type CandidateAnalytics = {
  totalApplications: number;
  pipeline: {
    pending: number;
    viewed: number;
    contacted: number; // has messaged applicant
    hired: number;
  };
  conversionRate: number; // (hired / total) * 100
  avgTimeToHire: number; // avg days from application to hired
  chartData: Array<{status: string, count: number, percentage: number}>;
};
```

#### Two Views

**A) Central Analytics Dashboard (`/dashboard/analytics`):**
- Aggregated stats across ALL employer's jobs
- Funnel chart: Pending → Viewed → Contacted → Hired
- Key metrics cards:
  - Total applications
  - Conversion rate (% hired)
  - Average time-to-hire (days)
- Only visible to Pro employers
- Navigation: Add "Analytics" link to sidebar (employers only, Pro only)

**B) Per-Job Analytics (embedded in job detail page):**
- Same funnel chart but filtered to specific job
- Shows job-specific pipeline and metrics
- Embedded below job description (similar to job view analytics)
- Gated with `<FeatureGate requiredPlan="pro">`

#### Server Actions
```typescript
// features/jobs/actions/candidate-analytics-actions.ts
export async function getCandidateAnalytics(
  jobId?: string
): Promise<{ success: boolean; analytics?: CandidateAnalytics; error?: string }>
```

- If `jobId` provided: returns analytics for that job
- If `jobId` is null: returns aggregated analytics across all employer's jobs
- Queries `job_applications` table with grouping by status
- Calculates time-to-hire using `created_at` and `updated_at` timestamps

#### Pro Gating
- Entire `/dashboard/analytics` page wrapped in `<FeatureGate requiredPlan="pro">`
- Server-side checks: `subscription_status === 'pro'` AND `role === 'employer'`
- Navigation link only visible to Pro employers
- Per-job pipelines gated individually

#### Time-to-Hire Calculation
```sql
-- Average days from application to hire
SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/86400)
FROM job_applications
WHERE employer_id = $1
  AND status = 'hired'
```

---

### 3. Job Compatibility Scoring (Workers - Pro Only)

**Feature Location:** `features/jobs/utils/compatibility-scoring.ts`

**Objective:** Show workers how well they match each job based on trade, certifications, distance, and experience.

#### Scoring Algorithm

```typescript
type CompatibilityScore = {
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
```

#### Scoring Logic

**Trade/Sub-trade Match (30 points max):**
- Exact trade + sub-trade match: 30 points
- Trade match, different sub-trade: 20 points
- Related trade: 10 points
- No match: 0 points

**Certifications Match (30 points max):**
- Formula: `(worker certs ∩ job required certs) / job required certs × 30`
- If job requires no certs: 30 points (N/A)
- Track missing certifications in `gaps` array

**Distance Match (20 points max):**
- 0-10 miles: 20 points
- 10-25 miles: 15 points
- 25-50 miles: 10 points
- 50-100 miles: 5 points
- 100+ miles: 2 points

**Experience Match (20 points max):**
- Years of experience >= job requirement: 20 points
- 75-99% of requirement: 15 points
- 50-74% of requirement: 10 points
- 25-49% of requirement: 5 points
- <25% of requirement: 0 points

#### Component Updates

**A) Job Feed (`job-card.tsx`):**
- Add compatibility badge at top-right corner
- Display: "85% Match" with color coding:
  - 90-100%: Green (Perfect)
  - 75-89%: Blue (Great)
  - 60-74%: Yellow (Good)
  - <60%: Gray (Fair)
- Badge only visible to Pro users
- Free users see no badge

**B) Job Detail Page (`app/dashboard/jobs/[id]/page.tsx`):**
- Add "Your Compatibility" card below job description
- Show total score with percentage ring chart
- Breakdown of all 4 factors with individual scores
- "What You're Missing" section showing `gaps` array
- Call-to-action for certifications if gaps exist
- Entire card gated with `useIsPro()` hook

#### Pro Gating
- Scoring calculation only runs for Pro users
- `useIsPro()` hook checks subscription status
- Free users never see scores or badges
- No server-side gating needed (calculation happens client-side)

#### Implementation Details
- Pure function: `calculateCompatibility(job, workerProfile, workerCerts, workerExperience)`
- No database changes needed
- Uses existing data from profiles, certifications, experiences, jobs tables
- Real-time calculation (no caching needed)

---

## Phase B: Marketing & Growth

### 4. Marketing Landing Page Redesign

**File:** `app/page.tsx` (replace existing)

**Objective:** Create an attractive, concise landing page that converts visitors to signups.

#### Page Sections

**1. Hero Section (Full viewport)**
- Background: Gradient from blue-50 via white to orange-50 (existing brand colors)
- KrewUp logo (centered, large)
- Headline: "Find Your Next Construction Job" / "Hire Skilled Trade Workers"
- Subheadline: "Connect with verified professionals in your area"
- Dual CTAs:
  - Primary: "I'm Looking for Work" → `/signup?role=worker`
  - Secondary: "I'm Hiring" → `/signup?role=employer`
- Optional: Background construction imagery or abstract shapes (keep it clean)

**2. Features Showcase (3-column grid, responsive)**

**For Workers:**
- 📍 **Find Local Jobs** - "Browse construction jobs within miles of your location"
- 👤 **Get Discovered** - "Create your profile with certifications and experience"
- 💬 **Direct Messaging** - "Chat directly with employers, no middleman"

**For Employers:**
- 📝 **Post Jobs Free** - "Unlimited job postings at no cost, forever"
- ✅ **Filter by Certification** - "Find workers with verified licenses and certifications"
- 📊 **Track Applications** - "Manage your hiring pipeline in one dashboard"

Each feature:
- Icon (emoji or SVG)
- Title (4-6 words max)
- Description (15-20 words - concise but descriptive)

**3. How It Works (Tabbed or toggle view)**

Toggle between "For Workers" and "For Employers"

**Workers:**
1. 📋 Create Profile → Add certifications, experience, and location
2. 🔍 Browse Jobs → See nearby jobs matched to your skills
3. ✉️ Apply & Connect → One-click apply and direct messaging

**Employers:**
1. 📝 Post Job → Free unlimited job postings with detailed requirements
2. 👥 Review Applicants → See certifications, experience, and compatibility
3. 💼 Hire & Manage → Track your hiring pipeline and analytics

**4. Pro Pricing Teaser (Small section)**
- Heading: "Unlock Pro Features"
- Brief: "Get advanced analytics, profile boost, and priority support"
- CTA: "View Pricing" → `/pricing`
- **Note:** No full pricing table on landing page (kept on dedicated pricing page)

**5. Final CTA Section**
- Large centered CTA: "Get Started Free"
- Subtext: "No credit card required"
- Button → `/signup`

#### Design Principles
- Mobile-first responsive design
- Fast loading (minimal images)
- Clear visual hierarchy
- Strong CTAs throughout
- Accessible (WCAG AA compliant)

---

### 5. About Page

**File:** `app/(marketing)/about/page.tsx`

**Objective:** Establish credibility and explain KrewUp's mission.

#### Content Sections

**1. Mission Statement**
> "KrewUp connects skilled trade workers with employers through location-based job matching and verified certifications. We're building the future of construction hiring."

**2. The Problem (2-3 sentences)**
- Skilled workers struggle to find local jobs quickly
- Employers can't verify worker certifications easily
- Traditional job boards lack construction-specific features

**3. The Solution (2-3 sentences)**
- Proximity-based job matching connects workers with nearby opportunities
- Certification verification ensures qualified candidates
- Direct messaging eliminates hiring delays

**4. Team Section (Optional - can add later)**
- Can skip for MVP or add placeholder "Built by construction industry veterans"

**5. Call-to-Action**
- "Join KrewUp Today" → `/signup`

#### Page Style
- Clean, professional single-column layout
- 60% text width, centered
- Minimal graphics
- Focus on credibility and trust

---

### 6. How-It-Works Page

**File:** `app/(marketing)/how-it-works/page.tsx`

**Objective:** Detailed explanation of the platform for both user types.

#### Layout: Two-Column Side-by-Side

**Left Column: For Workers**

1. **Create Your Profile**
   - Add certifications with verification
   - List work experience and skills
   - Set your location for local job matching

2. **Browse Local Jobs**
   - See jobs within your proximity
   - Filter by trade, pay rate, job type
   - View compatibility scores (Pro feature)

3. **Apply with One Click**
   - Submit applications instantly
   - Add optional cover letter
   - Track application status

4. **Message Employers**
   - Direct chat with hiring managers
   - No phone tag or email delays
   - Build relationships before hiring

5. **Go Pro for More**
   - Profile boost (appear first)
   - Proximity job alerts
   - See who viewed your profile
   - Detailed analytics

**Right Column: For Employers**

1. **Post Your Job**
   - Free unlimited job postings
   - Set location, trade requirements
   - Add custom screening questions (Pro)

2. **Review Applications**
   - See worker certifications
   - View experience history
   - Check compatibility scores (Pro)

3. **Message Candidates**
   - Direct chat with applicants
   - Ask questions before interviews
   - Schedule meetings in-app

4. **Hire & Track**
   - Manage application pipeline
   - Update candidate statuses
   - Track hiring progress

5. **Go Pro for Advanced Features**
   - Detailed job analytics
   - Custom screening questions
   - Verified certification filtering
   - Candidate pipeline analytics

#### Visual Design
- Each step: Numbered badge, title, 1-2 sentence description
- Icons or simple illustrations per step
- Responsive: Stacked on mobile, side-by-side on tablet+
- CTA at bottom: "Get Started as [Worker/Employer]"

---

### 7. SEO Optimization

**Objective:** Improve search visibility and social sharing.

#### Meta Tags & Open Graph

**File:** `app/(marketing)/layout.tsx`

```typescript
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'KrewUp - Connect Skilled Trade Workers with Employers',
  description: 'Find construction jobs near you or hire verified skilled trade workers. Free job posting, proximity-based matching, and direct messaging.',
  keywords: [
    // General
    'construction jobs', 'skilled trades', 'trade workers', 'hire workers', 'job search',
    'construction employment', 'trade job board', 'skilled labor jobs',

    // Specific Trades
    'electrician jobs', 'plumber jobs', 'carpenter jobs', 'hvac jobs', 'welder jobs',
    'mason jobs', 'roofer jobs', 'painter jobs', 'heavy equipment operator jobs',
    'pipefitter jobs', 'ironworker jobs', 'concrete jobs', 'framer jobs',

    // Location-based
    'local construction jobs', 'nearby trade jobs', 'construction jobs near me',
    'local contractors hiring', 'trade workers in my area',

    // Employer-focused
    'hire electrician', 'hire plumber', 'hire carpenter', 'post construction job',
    'find skilled workers', 'construction hiring platform', 'verified trade workers',
    'hire certified workers', 'construction recruitment',

    // Features
    'certified trade workers', 'construction job matching', 'proximity job search',
    'trade worker profiles', 'construction job alerts', 'direct hire construction workers',
    'job application tracking', 'construction worker certifications',
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
```

#### Sitemap

**File:** `app/sitemap.ts`

```typescript
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

#### Robots.txt

**File:** `public/robots.txt`

```
User-agent: *
Allow: /
Disallow: /dashboard/
Disallow: /onboarding/
Disallow: /api/

# Sitemap
Sitemap: https://krewup.net/sitemap.xml
```

#### Open Graph Image

**File:** `public/og-image.png` (1200x630px)

Design requirements:
- KrewUp logo centered or left-aligned
- Tagline: "Connect Skilled Trade Workers with Employers"
- Brand colors: Blue (#2563EB) and Orange (#EA580C)
- Clean, professional design
- Readable on small previews (Facebook/Twitter cards)

Tools: Figma, Canva, or Photoshop

---

## Error Handling & Testing

### Error Handling Patterns

#### Server Actions
All analytics and scoring actions follow this pattern:

```typescript
export async function actionName(params: any) {
  try {
    const supabase = await createClient(await cookies());

    // 1. Authentication check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // 2. Pro verification (if Pro feature)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, subscription_status')
      .eq('id', user.id)
      .single();

    if (profile?.subscription_status !== 'pro') {
      return { success: false, error: 'Pro subscription required' };
    }

    // 3. Role verification (if role-specific)
    if (profile?.role !== 'worker') {
      return { success: false, error: 'This feature is only available to workers' };
    }

    // 4. Execute database operation
    const { data, error } = await supabase.from('table').select('*');

    if (error) {
      console.error('Database error:', error);
      return { success: false, error: 'Failed to fetch data' };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
```

#### Client Components
- React Query handles loading/error states automatically
- Display user-friendly error messages (no technical jargon)
- Fallback UI for failed chart renders
- Toast notifications for action failures
- Retry buttons on error states

### Testing Strategy

#### E2E Tests (Playwright)

**New Test Files:**

1. `e2e/profile-analytics.spec.ts`
   - Pro worker can view profile analytics chart
   - Free worker sees teaser with upgrade CTA
   - Chart displays correct data for last 30 days
   - Weekly count matches database

2. `e2e/candidate-analytics.spec.ts`
   - Pro employer can access /dashboard/analytics
   - Central dashboard shows aggregated stats
   - Per-job pipeline embedded correctly
   - Funnel chart displays accurate percentages
   - Free employer sees upgrade prompt

3. `e2e/compatibility-scoring.spec.ts`
   - Pro worker sees compatibility badges on job cards
   - Score matches expected calculation
   - Breakdown shows all 4 factors
   - Gaps array lists missing certifications
   - Free worker sees no scores

4. `e2e/marketing-pages.spec.ts`
   - Landing page loads with all sections
   - About page displays correctly
   - How-it-works page shows both columns
   - All CTAs link to correct routes
   - Mobile responsive layout works

5. `e2e/seo.spec.ts`
   - Meta tags present on all marketing pages
   - Open Graph tags correct
   - Sitemap.xml accessible and valid
   - Robots.txt accessible

#### Component Tests (Vitest)

1. `__tests__/utils/compatibility-scoring.test.ts`
   - Test all scoring scenarios
   - Perfect match: 100 score
   - No match: Low score
   - Partial cert match: Correct calculation
   - Distance scoring accuracy
   - Edge cases: Missing data, zero experience

2. `__tests__/components/candidate-pipeline.test.ts`
   - Renders funnel chart correctly
   - Handles zero applications gracefully
   - Percentage calculations accurate

#### Manual Testing Checklist

**Analytics Features:**
- [ ] Profile analytics chart displays on mobile/tablet/desktop
- [ ] Candidate pipeline funnel renders correctly across viewports
- [ ] Date range filters work (7 days, 30 days, all time)
- [ ] Pro gating prevents free users from accessing features
- [ ] Analytics data matches database queries

**Compatibility Scoring:**
- [ ] Badge colors correct for score ranges
- [ ] Breakdown adds up to total score
- [ ] Gaps array shows correct missing certifications
- [ ] Free users never see any compatibility data

**Marketing Pages:**
- [ ] All sections visible on landing page
- [ ] CTAs link to correct routes with query params
- [ ] Mobile responsive on iPhone/Android
- [ ] Fast loading (< 2 seconds)
- [ ] SEO tags validate with tools

### Performance Optimization

#### Database Indexes

```sql
-- Add these indexes for analytics performance
CREATE INDEX IF NOT EXISTS idx_profile_views_date
  ON profile_views(viewed_profile_id, viewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_applications_status
  ON job_applications(job_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_applications_employer
  ON job_applications(employer_id, status, updated_at);

CREATE INDEX IF NOT EXISTS idx_jobs_employer
  ON jobs(employer_id, created_at DESC);
```

#### Query Optimization
- Use database aggregations instead of fetching all rows and aggregating in code
- Limit result sets (e.g., last 30 days, top 50 viewers)
- Cache analytics data in React Query with 1-minute stale time

---

## Implementation Sequence

### Recommended Build Order (10-11 days total)

#### Phase A: Feature Completion (Days 1-7)

**Day 1-2: Job Compatibility Scoring**
- ✅ No dependencies - can start immediately
- Build `compatibility-scoring.ts` algorithm (pure function)
- Write unit tests for all scoring scenarios
- Update `job-card.tsx` to show score badge
- Add breakdown card to job detail page
- Test with various worker profiles

**Day 3-4: Profile Analytics (Workers)**
- ✅ Reuses existing profile views tracking
- Enhance `getMyProfileViews()` for daily aggregation
- Create `profile-views-chart.tsx` (copy pattern from job analytics)
- Update `profile-views-list.tsx` to include chart
- Test with Pro and free worker accounts

**Day 5-7: Candidate Analytics (Employers)**
- ✅ Depends on job_applications table (already exists)
- Create `getCandidateAnalytics()` server action
- Build `candidate-pipeline.tsx` funnel chart
- Create `/dashboard/analytics` page
- Add "Analytics" navigation link (Pro employers)
- Embed per-job pipeline in job detail page
- Write E2E tests

#### Phase B: Marketing & Growth (Days 8-11)

**Day 8-9: Landing Page Redesign**
- ✅ No dependencies
- Replace `app/page.tsx` with new design
- Create hero section with dual CTAs
- Build features showcase grid
- Add "How It Works" toggle section
- Implement Pro pricing teaser
- Test mobile responsiveness

**Day 10-11: Marketing Pages + SEO**
- ✅ No dependencies
- Create About page (`app/(marketing)/about/page.tsx`)
- Create How-It-Works page (`app/(marketing)/how-it-works/page.tsx`)
- Implement `sitemap.ts`
- Create `robots.txt`
- Add metadata to marketing layout with enhanced keywords
- Design and create Open Graph image (1200x630px)
- Test SEO tags with validators
- Run Lighthouse audit

---

## Database Migrations Required

### Migration File: `supabase/migrations/046_analytics_indexes.sql`

```sql
-- Add indexes for analytics performance
CREATE INDEX IF NOT EXISTS idx_profile_views_date
  ON profile_views(viewed_profile_id, viewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_profile_views_viewer
  ON profile_views(viewer_id, viewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_applications_status
  ON job_applications(job_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_applications_employer
  ON job_applications(employer_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_applications_created
  ON job_applications(employer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_jobs_employer
  ON jobs(employer_id, created_at DESC);

-- Add index for compatibility scoring queries (if needed)
CREATE INDEX IF NOT EXISTS idx_certifications_user
  ON certifications(user_id, certification_type);

CREATE INDEX IF NOT EXISTS idx_experiences_user
  ON experiences(user_id);
```

Apply migration:
```bash
# Locally
psql -h localhost -U postgres -d krewup < supabase/migrations/046_analytics_indexes.sql

# Production (via Supabase Dashboard or CLI)
supabase db push
```

---

## File Structure Summary

### New Files Created

```
features/
├── jobs/
│   ├── utils/
│   │   └── compatibility-scoring.ts          # NEW: Scoring algorithm
│   ├── actions/
│   │   └── candidate-analytics-actions.ts    # NEW: Candidate analytics server actions
│   └── components/
│       ├── candidate-analytics-dashboard.tsx # NEW: Central analytics dashboard
│       └── candidate-pipeline.tsx            # NEW: Pipeline funnel chart
├── subscriptions/
│   └── components/
│       └── profile-views-chart.tsx           # NEW: Profile views time-series chart

app/
├── (marketing)/                               # NEW: Marketing route group
│   ├── layout.tsx                            # NEW: Marketing layout with SEO metadata
│   ├── about/
│   │   └── page.tsx                          # NEW: About page
│   └── how-it-works/
│       └── page.tsx                          # NEW: How-it-works page
├── dashboard/
│   └── analytics/
│       └── page.tsx                          # NEW: Central analytics page (employers)
├── page.tsx                                  # UPDATED: Landing page redesign
├── sitemap.ts                                # NEW: Auto-generated sitemap
└── robots.txt (public/)                      # NEW: Robots.txt file

public/
└── og-image.png                              # NEW: Open Graph image (1200x630px)

supabase/
└── migrations/
    └── 046_analytics_indexes.sql             # NEW: Performance indexes

__tests__/
└── utils/
    └── compatibility-scoring.test.ts         # NEW: Scoring algorithm tests

e2e/
├── profile-analytics.spec.ts                 # NEW: Profile analytics E2E tests
├── candidate-analytics.spec.ts               # NEW: Candidate analytics E2E tests
├── compatibility-scoring.spec.ts             # NEW: Compatibility scoring E2E tests
├── marketing-pages.spec.ts                   # NEW: Marketing pages E2E tests
└── seo.spec.ts                               # NEW: SEO validation tests
```

### Modified Files

```
features/
├── jobs/
│   └── components/
│       ├── job-card.tsx                      # UPDATED: Add compatibility badge
│       └── job-detail-page.tsx               # UPDATED: Add compatibility breakdown + candidate pipeline
├── subscriptions/
│   ├── actions/
│   │   └── profile-views-actions.ts          # UPDATED: Add daily aggregation
│   └── components/
│       └── profile-views-list.tsx            # UPDATED: Include chart component

app/
└── dashboard/
    └── layout.tsx                            # UPDATED: Add Analytics nav link (employers)
```

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
- ✅ Lighthouse score > 90 for performance, accessibility, SEO
- ✅ All CTAs link to correct routes

---

## Next Steps After Implementation

1. **Manual Testing:** Test all features with Pro and free accounts
2. **Run E2E Tests:** Verify all new test suites pass
3. **Performance Audit:** Run Lighthouse on all pages
4. **Deploy to Production:** Push to main branch (Vercel auto-deploy)
5. **Update Progress Checklist:** Mark completed items
6. **Beta User Testing:** Invite users to test new features
7. **Monitor Analytics:** Track feature usage and engagement
8. **Iterate Based on Feedback:** Refine features based on user data

---

## Appendix: Key Dependencies

### NPM Packages (Already Installed)
- `recharts` - For all chart components
- `@tanstack/react-query` - For data fetching and caching
- `next` - For sitemap and metadata APIs

### No New Dependencies Required
All features use existing libraries and patterns.

---

**Design Status:** ✅ Validated and ready for implementation
**Next Step:** Begin Day 1 implementation (Job Compatibility Scoring)
