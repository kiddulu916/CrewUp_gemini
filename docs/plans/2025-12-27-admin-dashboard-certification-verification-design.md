# Admin Dashboard & Certification Verification System

**Design Document**
**Created:** 2025-12-27
**Status:** Approved for Implementation
**Estimated Timeline:** 10 days across 5 phases

---

## Overview

This document outlines the design for a comprehensive admin dashboard and certification/license verification system for KrewUp. The system ensures platform trust by verifying worker certifications and contractor licenses through manual admin review, while providing robust monitoring, analytics, and moderation tools.

### Goals

1. **Trust & Safety:** Verify all certifications and contractor licenses to prevent fraud
2. **Platform Visibility:** Provide admin with comprehensive analytics and monitoring
3. **User Experience:** Clear verification status, fast turnaround, helpful rejection feedback
4. **Scalability:** Manual verification is sustainable at 10-100 uploads/month (first 6 months)
5. **Compliance:** Audit trail for all admin actions

### Key Design Decisions

- **Verification Method:** Manual admin review (free, 95%+ confidence at current volume)
- **Contractor Requirement:** Contractors must upload verified license before posting jobs
- **New Employer Type:** "Developer/Home Owner" added (no license required)
- **Authentication:** Role-based access (admin flag on user account, not separate login)
- **Monitoring:** Sentry integration for error tracking and performance monitoring

---

## User-Facing Experience

### Worker Certification Workflow

**Adding a Certification:**

1. Worker navigates to profile → Add Certification
2. Fills out certification form (already implemented):
   - Certification type
   - Certification number (required)
   - Issuing organization (required)
   - Issue date (optional)
   - Expiration date (optional)
   - Photo upload (required - JPEG, PNG, WebP, PDF up to 5MB)
3. Submits form → certification saved with `verification_status = 'pending'`
4. User sees success message: "Certification submitted for verification. You'll be notified when it's reviewed (usually within 24-48 hours)."

**Viewing Certifications:**

- Profile page shows all certifications with verification badges:
  - **Pending:** Yellow badge with ⏳ icon - "Pending Verification"
  - **Verified:** Green badge with ✓ icon - "Verified"
  - **Rejected:** Red badge with ✗ icon - "Rejected" (with reason displayed)
- Certification photo is visible regardless of status
- Rejected certifications show rejection reason and "Re-upload" button

**Notifications:**

- Email notification when certification is verified
- Email notification when certification is rejected (includes reason)
- In-app notification system (future enhancement)

### Contractor License Workflow

**Onboarding Requirement:**

1. User selects "Employer" role in onboarding Step 2
2. Step 3 now asks "Employer Type" with 3 options:
   - **Contractor:** Licensed professional contractor
   - **Recruiter:** Recruits workers for companies
   - **Developer/Home Owner:** Property developers or homeowners hiring for projects
3. If "Contractor" selected → **License upload section appears (REQUIRED)**:
   - License type (dropdown of common contractor licenses by state)
   - License number (text input)
   - Issuing state/authority (dropdown)
   - Expiration date (date picker)
   - License photo upload (required - same validation as certifications)
4. Cannot complete onboarding without license upload
5. Profile created with `can_post_jobs = false`
6. Dashboard shows prominent banner: "Your contractor license is pending verification. You'll be notified within 24-48 hours. You cannot post jobs until verified."

**Job Posting Restriction:**

- Contractors with unverified licenses see "Post Job" button as disabled
- Clicking shows tooltip: "You must have a verified contractor license to post jobs"
- Once license verified → `can_post_jobs = true` → can post jobs
- Recruiters and Developer/Home Owner types: `can_post_jobs = true` by default (no license required)

**License Display:**

- Contractor profiles show "Contractor License" section with verification badge
- Workers and recruiters viewing contractor profiles see license status
- Verified contractors get special badge on job postings: "Licensed & Verified"

### Developer/Home Owner Employer Type

**Purpose:** Allow property developers and homeowners to hire contractors/workers for their own projects without requiring a contractor license.

**Use Cases:**
- Home renovations/additions
- Property development projects
- Maintenance and repairs
- Small odd jobs (fence repair, door replacement, etc.)

**Capabilities:**
- Can post jobs immediately (no license required)
- Profile shows "Developer/Home Owner" badge
- No verification requirements

---

## Admin Dashboard

### Authentication & Access Control

**Role-Based Access:**

- Admin users have `is_admin = true` flag in `profiles` table
- Middleware protects all `/admin/*` routes
- Only users with `is_admin = true` can access admin routes
- Regular users attempting to access `/admin/*` receive 404 error
- No separate admin login - admin users log in normally and have additional route access

**Initial Setup:**

- Set your user account to `is_admin = true` via SQL:
  ```sql
  UPDATE profiles SET is_admin = true WHERE user_id = 'YOUR_USER_ID';
  ```

### Dashboard Structure

**Main Navigation:**

Located at `/admin/dashboard` with sidebar navigation to:

1. **Overview** (`/admin/dashboard`) - Metrics and system status
2. **Certifications** (`/admin/certifications`) - Verification queue
3. **Users** (`/admin/users`) - User management
4. **Analytics** (`/admin/analytics`) - Platform insights
5. **Monitoring** (`/admin/monitoring`) - Errors and performance
6. **Moderation** (`/admin/moderation`) - Content reports and user actions
7. **Settings** (`/admin/settings`) - Platform configuration

### 1. Overview Dashboard

**Top Metrics Cards (4 cards):**
- **Total Users:** Count with growth % vs last month, breakdown by role
- **Active Jobs:** Currently open job postings
- **Pending Certifications:** Number awaiting review (clickable → goes to queue)
- **Pro Subscribers:** Count with MRR (Monthly Recurring Revenue)

**Charts:**
- User growth chart (last 30 days, line chart)
- Revenue chart (Pro subscriptions, bar chart by month)

**Recent Activity Feed:**
- Last 20 actions (new signups, job posts, applications, certifications submitted)
- Timestamp, user, action type
- Clickable to view details

**Quick Actions:**
- "Review Pending Certifications" button
- "View Recent Errors" button
- "Manage Flagged Content" button

**System Status Indicators:**
- Supabase status (green/yellow/red)
- Stripe status (green/yellow/red)
- Vercel deployment status
- Last deployment time

### 2. Certifications Queue

**Route:** `/admin/certifications`

**Tabs:**
- **Pending** (default) - Awaiting review
- **Verified** - Approved certifications
- **Rejected** - Rejected with reasons
- **Flagged** - Flagged for later review

**Pending Queue Display:**

Each item shows:
- User avatar and name (clickable → user profile)
- Credential type badge (Certification vs License)
- Credential name (e.g., "OSHA 30", "CA Contractor License")
- Submission date/time (oldest first)
- Thumbnail of uploaded image
- "Review" button

**Review Panel (Modal/Slide-over):**

**Left Side - Image Viewer:**
- Full-size uploaded image with zoom controls
- Download original file button
- For PDFs: embedded PDF viewer
- Image quality indicator (resolution, file size)

**Right Side - Details Panel:**

**User-Entered Information:**
- Credential Type (Certification or License)
- Credential Name
- Certification/License Number
- Issuing Organization/State
- Issue Date
- Expiration Date
- User's name (to cross-check against certificate)

**Quick Verification Links:**
Pre-configured links to common verification databases (open in new tab):
- OSHA Certification Lookup (for OSHA certs)
- State Contractor Licensing Boards (by state)
- Red Cross Verification (for First Aid/CPR)
- Custom links can be configured in Settings

**Admin Notes Field:**
- Internal notes not visible to user
- Text area for admin to document verification process

**Action Buttons:**

1. **Approve (Green):**
   - Marks `verification_status = 'verified'`
   - Sets `verified_at = NOW()`, `verified_by = admin_user_id`
   - If contractor license: sets `can_post_jobs = true`
   - Sends notification to user
   - Logs action in `admin_activity_log`

2. **Reject (Red):**
   - Opens rejection reason modal
   - Predefined reasons dropdown + custom text field
   - Common reasons: "Photo unclear/unreadable", "Certification number mismatch", "Expired certification", "Invalid issuing organization", "Other (specify)"
   - Marks `verification_status = 'rejected'`
   - Saves rejection reason
   - Sends notification to user with reason
   - Logs action in `admin_activity_log`

3. **Flag for Later (Yellow):**
   - Moves to "Flagged" tab
   - For certifications that need more research
   - Add flag reason/notes
   - Can review later

**Batch Actions:**
- Select multiple pending certifications
- Bulk approve/reject (only for obvious cases)

### 3. Users Management

**Route:** `/admin/users`

**Search & Filters:**
- Search by name, email, user_id
- Filter by role (Worker, Employer)
- Filter by subscription status (Free, Pro)
- Filter by employer type (Contractor, Recruiter, Developer/Home Owner)
- Filter by account status (Active, Suspended, Banned)

**User List Display:**

Table showing:
- Avatar, Name, Email
- Role badge
- Subscription badge (Free/Pro)
- Joined date
- Last active
- Account status
- Actions dropdown

**User Detail View:**

Clicking a user opens detail panel:

**Profile Information:**
- All profile fields (name, email, phone, location, trade, bio)
- Profile picture
- Certifications list with verification status
- Work experience
- Education

**Account Information:**
- User ID
- Created date
- Last login
- Email verified status
- Auth provider (email/password, Google OAuth)

**Activity Summary:**
- Jobs posted (for employers)
- Applications submitted (for workers)
- Messages sent
- Profile views

**Subscription Information:**
- Current subscription (Free/Pro)
- If Pro: plan type (Monthly/Annual), start date, next billing date
- Stripe customer ID (link to Stripe dashboard)
- Subscription history

**Admin Actions:**
- **Impersonate User:** Log in as this user (for support/debugging)
- **Reset Password:** Send password reset email
- **Verify Email:** Manually mark email as verified
- **Grant Pro Subscription:** Manually give Pro access (for testing/support)
- **Revoke Pro Subscription:** Remove Pro access
- **Suspend Account:** Temporary suspension (set duration)
- **Ban Account:** Permanent ban
- **Delete Account:** Permanently delete user and all data

**Moderation History:**
- List of all moderation actions taken on this user
- Warnings, suspensions, bans with reasons and dates

### 4. Analytics Dashboard

**Route:** `/admin/analytics`

**User Analytics:**

**User Growth Chart:**
- Line chart showing daily/weekly/monthly signups
- Date range selector (7 days, 30 days, 90 days, all time)
- Breakdown by role (Workers vs Employers)

**User Metrics Cards:**
- Total users
- Active users (logged in last 30 days)
- New users this month
- User retention rate

**Role Distribution:**
- Pie chart: Workers vs Employers
- Employer type breakdown: Contractor, Recruiter, Developer/Home Owner

**Engagement Metrics:**

**Jobs:**
- Total jobs posted
- Active jobs (currently open)
- Jobs posted this month
- Average time to first application
- Chart: Jobs posted over time

**Applications:**
- Total applications submitted
- Applications this month
- Average applications per job
- Chart: Applications over time

**Messages:**
- Total messages sent
- Messages this month
- Active conversations
- Chart: Messages over time

**Certification Verification:**
- Total certifications/licenses
- Pending verification count
- Average verification time
- Verification approval rate
- Chart: Verifications over time

**Revenue Analytics:**

**Subscription Metrics Cards:**
- Total Pro subscribers
- Monthly Recurring Revenue (MRR)
- Annual Recurring Revenue (ARR)
- Conversion rate (free → Pro)
- Churn rate (Pro → Free cancellations)

**Revenue Charts:**
- MRR over time (line chart)
- New subscriptions vs cancellations (bar chart)
- Plan distribution (Monthly vs Annual pie chart)

**Geographic Analytics:**

**User Distribution Map:**
- Interactive map showing user locations
- Heatmap of concentration areas
- Filterable by role, subscription status

**Top Locations:**
- Table of top cities/states by user count
- Job posting concentration by location

### 5. Monitoring Dashboard

**Route:** `/admin/monitoring`

**Sentry Integration:**

**Error Tracking Widget:**
- Last 10 errors from Sentry (title, count, last seen)
- Click to view full details in Sentry dashboard
- "View All in Sentry" button (opens Sentry in new tab)

**Error Rate Chart:**
- Line chart showing errors per hour/day over last 7 days
- Color-coded severity (critical, error, warning)

**Top Issues:**
- Most frequent errors (by occurrence count)
- Affected user count
- First seen / Last seen timestamps
- Quick link to Sentry issue

**Performance Metrics:**

**API Performance:**
- Average response time for key endpoints
- Slowest endpoints list
- Chart: Response times over time

**Page Performance:**
- Average page load times by route
- Core Web Vitals (LCP, FID, CLS)
- Slowest pages

**Database Performance:**
- Average query time
- Slow query log (if available)
- Connection pool status

**System Health:**

**Service Status:**
- Supabase database (ping test, green/red indicator)
- Supabase Storage (API test)
- Stripe API (last successful call)
- Google Maps API (quota usage)

**Deployment Info:**
- Current deployment version/commit
- Last deployment time
- Environment (production/staging)
- Link to Vercel dashboard

**Alerts Configuration:**
- Email notifications for critical errors
- Slack integration (optional)
- Alert threshold settings

### 6. Moderation Dashboard

**Route:** `/admin/moderation`

**Content Reports Queue:**

**Tabs:**
- Pending Reports
- Reviewed Reports
- Actioned Reports
- Dismissed Reports

**Report Display:**

Each report shows:
- Reporter name (user who submitted report)
- Reported content type (Job, Profile, Message)
- Reported user name (person being reported)
- Reason category (Spam, Inappropriate, Fraud, Harassment, Other)
- Description (detailed explanation)
- Submission date
- Status (Pending, Reviewed, Actioned, Dismissed)

**Review Panel:**

**Reported Content Preview:**
- Full content display (job post, profile, message text)
- User profile of reported person
- Reporter's profile

**Report Details:**
- All information submitted by reporter
- Any previous reports on this user/content

**Admin Actions:**
- **Remove Content:** Delete the reported job/profile/message
- **Warn User:** Send warning to reported user
- **Suspend User:** Temporary account suspension (set duration)
- **Ban User:** Permanent account ban
- **Dismiss Report:** Mark as invalid/false report
- Add admin notes explaining decision

**User Moderation Actions:**

**Active Suspensions/Bans:**
- List of currently suspended or banned users
- Expiration dates for temporary suspensions
- Reason for action
- Actions: Lift suspension, Extend suspension, Make ban permanent

**Moderation History:**
- Searchable log of all moderation actions taken
- Filter by action type, admin user, date range
- User, action, reason, date, admin who performed action

### 7. Settings Dashboard

**Route:** `/admin/settings`

**Platform Settings:**

**General:**
- Platform name
- Contact email
- Support email
- Maintenance mode toggle (takes site offline with maintenance message)

**Certification Verification:**
- Expected verification turnaround time (display to users)
- Auto-rejection for expired certifications toggle
- Verification database links (configure custom links)

**User Registration:**
- Allow new signups toggle
- Require email verification toggle
- Allowed email domains (restrict signups)

**Job Posting:**
- Maximum job duration (auto-close after X days)
- Job moderation toggle (require admin approval for jobs)

**Notifications:**
- Email notification templates
- Email sending service configuration
- Notification frequency settings

**Feature Flags:**
- Enable/disable specific features for testing
- Beta features toggle
- Pro features configuration

**Admin Management:**

**Admin Users List:**
- All users with `is_admin = true`
- Name, email, admin since date
- Actions: Remove admin access

**Add New Admin:**
- Search for user by email
- Grant admin access button

**Admin Activity Log:**
- Searchable audit trail of all admin actions
- Admin user, action type, target, timestamp, details
- Export to CSV

---

## Database Schema

### Schema Changes

**1. Profiles Table - Add Admin Flag:**

```sql
ALTER TABLE profiles
  ADD COLUMN is_admin BOOLEAN DEFAULT FALSE,
  ADD COLUMN can_post_jobs BOOLEAN DEFAULT TRUE;
```

**Fields:**
- `is_admin`: Grants access to `/admin/*` routes
- `can_post_jobs`: Controls job posting ability (false for unverified contractors)

**2. Certifications Table - Add Verification Fields:**

```sql
ALTER TABLE certifications
  ADD COLUMN verification_status TEXT DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  ADD COLUMN verified_at TIMESTAMPTZ,
  ADD COLUMN verified_by UUID REFERENCES profiles(user_id),
  ADD COLUMN rejection_reason TEXT,
  ADD COLUMN verification_notes TEXT;
```

**Fields:**
- `verification_status`: Current verification state
- `verified_at`: Timestamp when verification completed
- `verified_by`: Admin user who verified (for audit trail)
- `rejection_reason`: Displayed to user if rejected
- `verification_notes`: Internal admin notes (not shown to user)

**3. Admin Activity Log Table (New):**

```sql
CREATE TABLE admin_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  -- 'verified_cert', 'rejected_cert', 'banned_user', 'deleted_job', etc.
  target_type TEXT,
  -- 'certification', 'user', 'job', 'application', etc.
  target_id UUID,
  details JSONB,
  -- Flexible field for action-specific data
  -- e.g., {"rejection_reason": "Expired", "cert_type": "OSHA 30"}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_activity_admin ON admin_activity_log(admin_id);
CREATE INDEX idx_admin_activity_date ON admin_activity_log(created_at DESC);
CREATE INDEX idx_admin_activity_target ON admin_activity_log(target_type, target_id);
```

**4. Platform Settings Table (New):**

```sql
CREATE TABLE platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(user_id)
);

-- Seed with default settings
INSERT INTO platform_settings (key, value, description) VALUES
  ('maintenance_mode', 'false', 'Site-wide maintenance mode'),
  ('verification_turnaround_hours', '48', 'Expected cert verification time'),
  ('allow_signups', 'true', 'Allow new user registrations'),
  ('require_email_verification', 'true', 'Require email verification on signup');
```

**5. Content Reports Table (New):**

```sql
CREATE TABLE content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  reported_content_type TEXT NOT NULL,
  -- 'job', 'profile', 'message'
  reported_content_id UUID NOT NULL,
  reported_user_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  -- 'spam', 'inappropriate', 'fraud', 'harassment', 'other'
  description TEXT,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  reviewed_by UUID REFERENCES profiles(user_id),
  reviewed_at TIMESTAMPTZ,
  action_taken TEXT,
  -- 'content_removed', 'user_warned', 'user_banned', 'no_action'
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_content_reports_status ON content_reports(status);
CREATE INDEX idx_content_reports_reporter ON content_reports(reporter_id);
CREATE INDEX idx_content_reports_reported_user ON content_reports(reported_user_id);
```

**6. User Moderation Actions Table (New):**

```sql
CREATE TABLE user_moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  -- 'warning', 'suspension', 'ban', 'unbanned'
  reason TEXT NOT NULL,
  duration_days INTEGER,
  -- For temporary suspensions (NULL = permanent ban)
  expires_at TIMESTAMPTZ,
  actioned_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_moderation_user ON user_moderation_actions(user_id);
CREATE INDEX idx_user_moderation_active ON user_moderation_actions(expires_at)
  WHERE expires_at IS NOT NULL AND expires_at > NOW();
```

**7. Analytics Events Table (New - Optional):**

```sql
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  -- 'page_view', 'job_view', 'application_submitted', 'message_sent', etc.
  user_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  session_id TEXT,
  metadata JSONB,
  -- Flexible event data: {"job_id": "...", "route": "/dashboard/feed"}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_date ON analytics_events(created_at DESC);
CREATE INDEX idx_analytics_events_user ON analytics_events(user_id);
```

**Note:** This table is optional. Most analytics can be computed from existing tables (profiles, jobs, applications, messages). Use this for custom event tracking if needed.

### Row Level Security (RLS) Policies

**Admin Activity Log:**
```sql
ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read admin activity
CREATE POLICY "Admins can view activity log"
  ON admin_activity_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Only admins can insert activity
CREATE POLICY "Admins can log activity"
  ON admin_activity_log FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );
```

**Platform Settings:**
```sql
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Admins can read all settings
CREATE POLICY "Admins can view settings"
  ON platform_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Admins can update settings
CREATE POLICY "Admins can update settings"
  ON platform_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );
```

**Content Reports:**
```sql
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports
CREATE POLICY "Users can submit reports"
  ON content_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own reports
CREATE POLICY "Users can view own reports"
  ON content_reports FOR SELECT
  USING (auth.uid() = reporter_id);

-- Admins can view all reports
CREATE POLICY "Admins can view all reports"
  ON content_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Admins can update reports
CREATE POLICY "Admins can update reports"
  ON content_reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );
```

**User Moderation Actions:**
```sql
ALTER TABLE user_moderation_actions ENABLE ROW LEVEL SECURITY;

-- Admins only
CREATE POLICY "Admins can view moderation actions"
  ON user_moderation_actions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can create moderation actions"
  ON user_moderation_actions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );
```

**Analytics Events:**
```sql
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Service role can insert (server-side tracking)
CREATE POLICY "Service role can insert events"
  ON analytics_events FOR INSERT
  WITH CHECK (true); -- Service role bypasses RLS

-- Admins can view all events
CREATE POLICY "Admins can view events"
  ON analytics_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );
```

---

## Sentry Integration

### Setup

**1. Create Sentry Account:**
- Sign up at [sentry.io](https://sentry.io)
- Create new project: "KrewUp" (select Next.js platform)
- Note DSN (Data Source Name)

**2. Install Sentry SDK:**

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

**3. Configure Environment Variables:**

```bash
# .env.local
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn_here
SENTRY_AUTH_TOKEN=your_auth_token_here (for source maps)
```

**4. Configure Sentry:**

The wizard creates these files:
- `sentry.client.config.ts` - Client-side error tracking
- `sentry.server.config.ts` - Server-side error tracking
- `sentry.edge.config.ts` - Edge runtime error tracking

**5. Add User Context:**

In `sentry.client.config.ts`:

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  beforeSend(event, hint) {
    // Add user context to all errors
    if (event.user) {
      event.user.role = getUserRole(); // Add custom user data
      event.user.subscription = getUserSubscription();
    }
    return event;
  },
});
```

### Admin Dashboard Integration

**Sentry API Integration:**

Create server action to fetch Sentry data:

```typescript
// features/admin/actions/sentry-actions.ts
'use server';

export async function getSentryIssues() {
  const response = await fetch(
    `https://sentry.io/api/0/projects/YOUR_ORG/YOUR_PROJECT/issues/`,
    {
      headers: {
        Authorization: `Bearer ${process.env.SENTRY_AUTH_TOKEN}`,
      },
    }
  );

  const issues = await response.json();
  return issues;
}

export async function getSentryStats() {
  // Fetch error stats from Sentry API
  // Return: error count, affected users, top issues
}
```

**Display in Admin Dashboard:**

```typescript
// app/admin/monitoring/page.tsx
import { getSentryIssues, getSentryStats } from '@/features/admin/actions/sentry-actions';

export default async function MonitoringPage() {
  const issues = await getSentryIssues();
  const stats = await getSentryStats();

  return (
    <div>
      <h1>Monitoring</h1>

      {/* Error Stats */}
      <div className="grid grid-cols-3 gap-4">
        <MetricCard title="Errors (24h)" value={stats.errorCount} />
        <MetricCard title="Affected Users" value={stats.affectedUsers} />
        <MetricCard title="Error Rate" value={`${stats.errorRate}%`} />
      </div>

      {/* Top Issues */}
      <div>
        <h2>Top Issues</h2>
        {issues.slice(0, 10).map(issue => (
          <IssueCard
            key={issue.id}
            title={issue.title}
            count={issue.count}
            lastSeen={issue.lastSeen}
            link={issue.permalink}
          />
        ))}
      </div>

      {/* Link to Full Sentry Dashboard */}
      <a
        href="https://sentry.io/organizations/YOUR_ORG/issues/"
        target="_blank"
        className="btn-primary"
      >
        View Full Sentry Dashboard
      </a>
    </div>
  );
}
```

### What Sentry Tracks

**Error Tracking:**
- Unhandled JavaScript exceptions
- API route errors
- Server-side errors
- Database query failures
- Failed external API calls

**Performance Monitoring:**
- Page load times
- API response times
- Database query performance
- External API latency (Supabase, Stripe, Google Maps)

**User Context:**
- User ID
- Email
- Role (Worker, Employer, Admin)
- Subscription status
- Browser/device information

**Custom Events (Optional):**
- Certification verification actions
- User moderation actions
- Failed login attempts
- Suspicious activity

**Alerts:**
- Email notifications for critical errors
- Slack integration (optional)
- Configurable thresholds (e.g., alert if error rate > 5% of requests)

### Pricing

**Free Tier:**
- 5,000 errors/month
- 10,000 performance transactions/month
- 1 project
- 30-day data retention

**Paid Plans:** Start at $26/month if you exceed free tier limits.

**Expected Usage:** At 10-100 certifications/month and modest traffic, free tier should be sufficient for first 6-12 months.

---

## Implementation Plan

### Phase 1: Database Foundation (Day 1)

**Goal:** Set up all database schema changes and constants.

**Tasks:**

1. **Create Database Migration:**
   - Create `supabase/migrations/033_admin_dashboard_verification.sql`
   - Add all `ALTER TABLE` statements for existing tables
   - Add all `CREATE TABLE` statements for new tables
   - Add all indexes
   - Add all RLS policies
   - Run migration against database

2. **Update Constants:**
   - Add "Developer/Home Owner" to `EMPLOYER_TYPES` in `lib/constants.ts`
   - Verify existing employer types

3. **Set Admin Flag:**
   - Run SQL to set your user account to `is_admin = true`
   - Test admin access

4. **Update Existing Data:**
   - Set all existing certifications to `verification_status = 'pending'`
   - Set all contractors to `can_post_jobs = false` (will need re-verification)
   - Set all recruiters/developers to `can_post_jobs = true`

5. **Create Middleware:**
   - Update `lib/supabase/middleware.ts` to check `is_admin` flag for `/admin/*` routes
   - Return 404 for non-admin users

**Verification:**
- Database migration runs without errors
- Your user account can access `/admin/*` routes
- Regular users get 404 on admin routes
- All existing certifications show as "pending"

### Phase 2: User-Facing Verification Experience (Days 2-3)

**Goal:** Update UI to show verification status and add contractor license requirement to onboarding.

**Tasks:**

1. **Create Verification Badge Component:**
   - Create `components/common/verification-badge.tsx`
   - Props: `status` (pending, verified, rejected)
   - Shows icon + text with color coding

2. **Update Certification Display:**
   - Update profile pages to show `VerificationBadge` on each certification
   - Show rejection reason if rejected
   - Add "Re-upload" button for rejected certifications

3. **Update Certification Form:**
   - Modify `features/profiles/components/certification-form.tsx`
   - Ensure `verification_status` is set to 'pending' on submit
   - Show post-submission message about verification timeline

4. **Update Onboarding Flow:**
   - Modify `features/onboarding/components/onboarding-form.tsx`
   - Add employer type selection (Contractor, Recruiter, Developer/Home Owner)
   - For Contractor: show license upload section (REQUIRED)
   - License fields: type, number, state, expiration, photo
   - Cannot proceed without license upload

5. **Add Job Posting Restriction:**
   - Update job posting routes to check `can_post_jobs` flag
   - If false: disable "Post Job" button, show tooltip with explanation
   - Show banner on contractor dashboard if license pending

6. **Contractor Profile Display:**
   - Show "Contractor License" section on contractor profiles
   - Display verification badge
   - Show "Licensed & Verified" badge on verified contractor job posts

7. **Create Notification System:**
   - Email notification for verification approval
   - Email notification for verification rejection (with reason)
   - Toast notification when viewing profile (optional)

**Verification:**
- Workers can add certifications, see "Pending" badge
- Contractors must upload license during onboarding
- Contractors cannot post jobs until verified
- Verification badges display correctly
- Rejection reason is shown to users

### Phase 3: Admin Dashboard Core (Days 4-6)

**Goal:** Build admin dashboard with certification verification queue.

**Tasks:**

1. **Create Admin Layout:**
   - Create `app/admin/layout.tsx`
   - Admin sidebar navigation with all sections
   - Check `is_admin` flag, redirect if not admin
   - Admin-specific header/branding

2. **Create Overview Dashboard:**
   - Create `app/admin/dashboard/page.tsx`
   - Metric cards (users, jobs, pending certs, pro subs)
   - User growth chart
   - Revenue chart
   - Recent activity feed
   - Quick action buttons
   - System status indicators

3. **Create Certification Queue:**
   - Create `app/admin/certifications/page.tsx`
   - Tabs: Pending, Verified, Rejected, Flagged
   - Server action to fetch certifications by status
   - Queue display with user info, thumbnail, submission date

4. **Build Verification Review Panel:**
   - Create modal/slide-over component
   - Left side: Image viewer with zoom, download
   - Right side: User-entered details
   - Admin notes text area
   - Verification database quick links

5. **Create Verification Actions:**
   - Create `features/admin/actions/certification-actions.ts`
   - `approveCertification()` server action
   - `rejectCertification(reason)` server action
   - `flagCertification(notes)` server action
   - Update database, log to `admin_activity_log`
   - Send notifications to user

6. **Create Users Management:**
   - Create `app/admin/users/page.tsx`
   - Search and filter UI
   - User list table
   - User detail panel with full profile
   - Admin actions (suspend, ban, grant Pro, reset password)
   - Create `features/admin/actions/user-actions.ts` for moderation

7. **Create Admin Activity Log Viewer:**
   - Display in sidebar or dedicated page
   - Searchable, filterable log of all admin actions
   - Export to CSV functionality

**Verification:**
- Admin can access all admin routes
- Certification queue loads correctly
- Review panel displays image and details
- Approve/reject actions work
- Notifications sent to users
- Activity logged correctly
- User management functions work

### Phase 4: Analytics & Monitoring (Days 7-8)

**Goal:** Add analytics charts and Sentry monitoring integration.

**Tasks:**

1. **Set Up Sentry:**
   - Create Sentry account
   - Install Sentry SDK (`npm install @sentry/nextjs`)
   - Run Sentry wizard (`npx @sentry/wizard@latest -i nextjs`)
   - Configure DSN and auth token in env vars
   - Add user context to Sentry events
   - Deploy and verify errors are captured

2. **Create Analytics Dashboard:**
   - Create `app/admin/analytics/page.tsx`
   - Install chart library (Recharts or Chart.js)
   - Create server actions to fetch analytics data:
     - User growth over time
     - Role distribution
     - Engagement metrics (jobs, apps, messages)
     - Certification verification stats
   - Build charts using Recharts components

3. **Create Revenue Analytics:**
   - Fetch subscription data from Stripe API
   - Calculate MRR, ARR, conversion rate, churn
   - Display revenue charts
   - Active subscribers list

4. **Create Monitoring Dashboard:**
   - Create `app/admin/monitoring/page.tsx`
   - Create `features/admin/actions/sentry-actions.ts`
   - Fetch recent errors from Sentry API
   - Display error rate chart
   - Show top issues with links to Sentry
   - Display performance metrics
   - System health checks (Supabase, Stripe, Vercel status APIs)

5. **Create Moderation Queue:**
   - Create `app/admin/moderation/page.tsx`
   - Content reports queue (pending, reviewed, actioned)
   - Report review panel
   - Moderation actions (remove content, warn, suspend, ban)
   - Active suspensions/bans list
   - Create `features/admin/actions/moderation-actions.ts`

6. **Add Report Content UI (User-Facing):**
   - Add "Report" button to jobs, profiles
   - Report modal with reason and description
   - Submit report to `content_reports` table

**Verification:**
- Sentry captures errors correctly
- Analytics charts display real data
- Revenue metrics calculate correctly
- Monitoring dashboard shows Sentry data
- Moderation queue works
- Users can submit content reports

### Phase 5: Polish & Testing (Days 9-10)

**Goal:** Final polish, testing, and deployment.

**Tasks:**

1. **Create Settings Dashboard:**
   - Create `app/admin/settings/page.tsx`
   - Platform settings editor (maintenance mode, feature flags, etc.)
   - Admin user management (add/remove admins)
   - Settings are saved to `platform_settings` table

2. **Add Analytics Event Tracking (Optional):**
   - Track key user actions (page views, job views, applications)
   - Use `analytics_events` table or skip if relying on Vercel Analytics

3. **End-to-End Testing:**

   **Certification Verification Flow:**
   - Create test user (worker)
   - Submit certification with photo
   - Verify shows "Pending" badge
   - Review as admin, approve
   - Verify shows "Verified" badge
   - Submit another cert, reject with reason
   - Verify shows rejection reason, re-upload option

   **Contractor License Flow:**
   - Create test user (contractor)
   - Go through onboarding, upload license
   - Verify cannot post jobs
   - Verify dashboard shows pending banner
   - Review as admin, approve
   - Verify can now post jobs
   - Verify job shows "Licensed & Verified" badge

   **Admin Dashboard:**
   - Test all navigation links
   - Verify metrics display correctly
   - Test certification queue actions
   - Test user management actions
   - Test analytics charts load
   - Test monitoring integration
   - Test moderation queue

4. **UI Polish:**
   - Responsive design for admin dashboard (mobile-friendly tables)
   - Loading states for all async actions
   - Error states with retry options
   - Success toast notifications
   - Confirmation dialogs for destructive actions

5. **Documentation:**
   - Update `CLAUDE.md` with admin dashboard info
   - Create admin user guide (how to verify certifications)
   - Document common verification databases (OSHA, state licensing boards)
   - Update progress checklist

6. **Deployment:**
   - Deploy to production
   - Test in production environment
   - Set your production user to admin
   - Monitor Sentry for any deployment issues

**Verification:**
- All user flows work end-to-end
- Admin dashboard is fully functional
- Sentry is capturing errors
- Analytics display real data
- No breaking bugs
- Production deployment successful

---

## Testing Strategy

### Manual Testing Checklist

**User-Facing:**
- [ ] Worker can submit certification with photo
- [ ] Certification shows "Pending" badge after submission
- [ ] Worker receives notification when certification verified
- [ ] Worker receives notification with reason when certification rejected
- [ ] Rejected certification shows reason and "Re-upload" button
- [ ] Contractor onboarding requires license upload
- [ ] Contractor cannot post jobs until license verified
- [ ] Contractor dashboard shows pending banner
- [ ] Developer/Home Owner can post jobs immediately
- [ ] Verified certifications show green "Verified" badge
- [ ] Verified contractor jobs show "Licensed & Verified" badge

**Admin Dashboard:**
- [ ] Admin can access `/admin/dashboard`
- [ ] Non-admin users get 404 on admin routes
- [ ] Overview metrics display correctly
- [ ] User growth chart shows data
- [ ] Revenue chart shows subscription data
- [ ] Certification queue shows pending certifications
- [ ] Review panel displays image and details
- [ ] Approve action sets status to verified, sends notification
- [ ] Reject action shows reason modal, sends notification
- [ ] Flag action moves cert to "Flagged" tab
- [ ] All admin actions logged to activity log
- [ ] User search and filters work
- [ ] User detail panel shows complete info
- [ ] User moderation actions work (suspend, ban)
- [ ] Analytics charts display correct data
- [ ] Sentry integration shows recent errors
- [ ] Monitoring dashboard shows system health
- [ ] Moderation queue shows content reports
- [ ] Settings can be updated and saved

### Automated Testing (Optional)

**Unit Tests:**
- Server actions for certification verification
- Utility functions for data aggregation
- Middleware for admin route protection

**Integration Tests:**
- End-to-end certification workflow
- Contractor onboarding with license requirement
- Admin approval/rejection flow

**Consider using:** Vitest for unit tests, Playwright for E2E tests (if time allows).

---

## Security Considerations

**Admin Access Control:**
- Only users with `is_admin = true` can access admin routes
- Middleware checks on all `/admin/*` routes
- RLS policies prevent non-admins from querying admin tables
- Admin activity is fully logged for audit trail

**Certification Data:**
- Certification photos stored in Supabase Storage with RLS
- Only owner and admins can view certification photos
- Sensitive data (cert numbers) only visible to owner and admins
- Verification notes never exposed to users

**User Privacy:**
- User impersonation only for support/debugging, logged to activity log
- Personal data (email, phone) only visible to admins and profile owner
- Content reports are anonymous (reporter ID stored but not required)

**Data Retention:**
- Rejected certification photos retained for audit (configurable)
- Admin activity log retained indefinitely for compliance
- Deleted users: cascade delete or anonymize based on regulations

**Rate Limiting:**
- Consider adding rate limits on certification submissions (max 5/day per user)
- Rate limit on content report submissions to prevent spam

---

## Future Enhancements

**Short-Term (Post-Launch):**
- In-app notification system (replace email notifications)
- Admin dashboard mobile app (React Native)
- Bulk actions in certification queue (approve multiple at once)
- Custom verification database integrations (auto-lookup cert numbers)

**Medium-Term:**
- OCR integration (Google Vision API) to auto-extract certification data from photos
- Automated verification for common certs (OSHA lookup API)
- Push notifications for verification status changes
- Advanced analytics (cohort analysis, funnel optimization)

**Long-Term:**
- AI-powered fraud detection (flag suspicious certifications)
- Third-party verification service integration (Truework, Checkr)
- Public API for partners to verify certifications
- White-label admin dashboard for enterprise customers

---

## Cost Analysis

**Current Solution (Manual Verification):**
- **Cost:** $0 (your time only)
- **Time:** ~5-10 minutes per certification = 30-60 minutes/month
- **Scalability:** Sustainable up to ~200 certifications/month

**If Volume Grows:**
- **100-500/month:** Add OCR (Google Vision free tier covers 1000/month) = $0
- **500-1000/month:** Hire part-time admin or automate with AI = $500-1000/month
- **1000+/month:** Third-party verification service = $5-10 per cert

**Sentry Costs:**
- **Free tier:** 5000 errors/month (sufficient for 6-12 months)
- **Paid:** $26/month if exceeded (not expected in first year)

**Total Added Costs for First 6 Months:** $0 (assuming free tiers sufficient)

---

## Success Metrics

**Verification System:**
- Average verification turnaround time < 24 hours
- Verification approval rate > 85%
- User satisfaction with verification process (survey)
- Reduced fraud reports from employers

**Platform Trust:**
- % of workers with verified certifications (target: 70%+)
- % of contractors with verified licenses (target: 100%)
- Employer trust rating increase (survey)

**Admin Efficiency:**
- Time spent on moderation < 2 hours/week
- False positive content report rate < 10%
- Admin dashboard usage (daily active use)

**Business Impact:**
- Pro conversion rate increase (verified workers more likely to convert)
- Employer retention increase (trust in platform)
- Reduced support tickets related to fraud

---

## Appendix

### Common Verification Databases

**OSHA Certifications:**
- OSHA 10/30: No centralized lookup (verify via training provider or card validity)
- Contact training provider listed on certificate

**State Contractor Licenses:**
- California: [CSLB License Search](https://www2.cslb.ca.gov/OnlineServices/CheckLicenseII/LicenseDetail.aspx)
- Texas: [TDLR License Search](https://www.tdlr.texas.gov/LicenseSearch/)
- Florida: [MyFloridaLicense](https://www.myfloridalicense.com/intentions2.asp)
- (Add more states as needed)

**First Aid/CPR:**
- Red Cross: [Verification Service](https://www.redcross.org/take-a-class/verify-certificate)
- American Heart Association: Contact directly

**Trade-Specific:**
- Journeyman Electrician: State licensing board (varies by state)
- Plumbing License: State licensing board (varies by state)
- Welding Certifications: AWS (American Welding Society) lookup

### Admin Best Practices

**Verification Tips:**
- Check certification number matches format (OSHA cards have specific patterns)
- Verify expiration dates (many certs expire after 1-3 years)
- Cross-reference name on cert with user profile name
- Look for signs of photo editing (pixelation, inconsistent fonts)
- When in doubt, flag for later and research

**Rejection Reasons:**
- Always be specific and helpful
- Examples: "Photo is too blurry to read certification number. Please upload a clearer photo."
- Not: "Photo unclear" (not actionable)

**Moderation:**
- Review content reports within 24 hours
- Document reasoning in admin notes
- Be consistent with moderation actions
- When banning users, provide clear violation explanation

---

## Conclusion

This design provides a comprehensive admin dashboard and certification verification system that:

1. **Builds trust** through verified certifications and contractor licenses
2. **Protects the platform** from fraud and liability
3. **Provides visibility** into platform health and user behavior
4. **Scales sustainably** with manual verification at low volume
5. **Creates a foundation** for future automation and growth

The implementation is broken into 5 manageable phases over 10 days, with clear verification criteria at each step. The system is designed to work within free tier limits for the first 6-12 months while providing room to scale with paid tools as the platform grows.

**Next Steps:** Review this design, make any final adjustments, then proceed with implementation starting with Phase 1 (Database Foundation).
