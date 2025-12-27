# Admin Dashboard & Certification Verification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a comprehensive admin dashboard with manual certification/license verification system for KrewUp platform.

**Architecture:** Role-based admin access (is_admin flag) protects /admin/* routes. Manual verification workflow with image review panel. Sentry integration for monitoring. 8 new database tables for admin functionality, verification tracking, and audit logging.

**Tech Stack:** Next.js 15, TypeScript, Supabase (PostgreSQL + PostGIS), Sentry, Recharts (for analytics), TailwindCSS

---

## Phase 1: Database Foundation

### Task 1.1: Create Database Migration File

**Files:**
- Create: `supabase/migrations/033_admin_dashboard_verification.sql`

**Step 1: Create migration file**

Create `supabase/migrations/033_admin_dashboard_verification.sql`:

```sql
-- Admin Dashboard & Certification Verification System
-- Migration 033
-- Created: 2025-12-27

-- ============================================================================
-- 1. Add admin and job posting flags to profiles
-- ============================================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS can_post_jobs BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN profiles.is_admin IS 'Grants access to /admin/* routes';
COMMENT ON COLUMN profiles.can_post_jobs IS 'Controls job posting ability (false for unverified contractors)';

-- ============================================================================
-- 2. Add verification fields to certifications table
-- ============================================================================

ALTER TABLE certifications
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS verification_notes TEXT;

COMMENT ON COLUMN certifications.verification_status IS 'Current verification state';
COMMENT ON COLUMN certifications.verified_at IS 'Timestamp when verification completed';
COMMENT ON COLUMN certifications.verified_by IS 'Admin user who verified (for audit trail)';
COMMENT ON COLUMN certifications.rejection_reason IS 'Displayed to user if rejected';
COMMENT ON COLUMN certifications.verification_notes IS 'Internal admin notes (not shown to user)';

CREATE INDEX IF NOT EXISTS idx_certifications_verification_status
  ON certifications(verification_status);
CREATE INDEX IF NOT EXISTS idx_certifications_verified_by
  ON certifications(verified_by);

-- ============================================================================
-- 3. Create admin activity log table
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE admin_activity_log IS 'Audit trail of all admin actions';
COMMENT ON COLUMN admin_activity_log.action IS 'Action type: verified_cert, rejected_cert, banned_user, etc.';
COMMENT ON COLUMN admin_activity_log.target_type IS 'Target type: certification, user, job, application, etc.';
COMMENT ON COLUMN admin_activity_log.details IS 'Flexible JSONB field for action-specific data';

CREATE INDEX IF NOT EXISTS idx_admin_activity_admin
  ON admin_activity_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_date
  ON admin_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_activity_target
  ON admin_activity_log(target_type, target_id);

-- ============================================================================
-- 4. Create platform settings table
-- ============================================================================

CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL
);

COMMENT ON TABLE platform_settings IS 'Platform-wide configuration settings';

-- Seed with default settings
INSERT INTO platform_settings (key, value, description) VALUES
  ('maintenance_mode', 'false', 'Site-wide maintenance mode'),
  ('verification_turnaround_hours', '48', 'Expected cert verification time'),
  ('allow_signups', 'true', 'Allow new user registrations'),
  ('require_email_verification', 'true', 'Require email verification on signup')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- 5. Create content reports table
-- ============================================================================

CREATE TABLE IF NOT EXISTS content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  reported_content_type TEXT NOT NULL,
  reported_content_id UUID NOT NULL,
  reported_user_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  reviewed_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  action_taken TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE content_reports IS 'User-submitted content reports for moderation';
COMMENT ON COLUMN content_reports.reported_content_type IS 'Type: job, profile, message';
COMMENT ON COLUMN content_reports.reason IS 'Reason: spam, inappropriate, fraud, harassment, other';
COMMENT ON COLUMN content_reports.action_taken IS 'Action: content_removed, user_warned, user_banned, no_action';

CREATE INDEX IF NOT EXISTS idx_content_reports_status
  ON content_reports(status);
CREATE INDEX IF NOT EXISTS idx_content_reports_reporter
  ON content_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_reported_user
  ON content_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_date
  ON content_reports(created_at DESC);

-- ============================================================================
-- 6. Create user moderation actions table
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  reason TEXT NOT NULL,
  duration_days INTEGER,
  expires_at TIMESTAMPTZ,
  actioned_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE user_moderation_actions IS 'User moderation history (warnings, suspensions, bans)';
COMMENT ON COLUMN user_moderation_actions.action_type IS 'Type: warning, suspension, ban, unbanned';
COMMENT ON COLUMN user_moderation_actions.duration_days IS 'For temporary suspensions (NULL = permanent ban)';

CREATE INDEX IF NOT EXISTS idx_user_moderation_user
  ON user_moderation_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_moderation_active
  ON user_moderation_actions(expires_at)
  WHERE expires_at IS NOT NULL AND expires_at > NOW();

-- ============================================================================
-- 7. Create analytics events table (optional)
-- ============================================================================

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  session_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE analytics_events IS 'Custom analytics event tracking';
COMMENT ON COLUMN analytics_events.event_type IS 'Event: page_view, job_view, application_submitted, etc.';
COMMENT ON COLUMN analytics_events.metadata IS 'Flexible event data: {job_id, route, etc.}';

CREATE INDEX IF NOT EXISTS idx_analytics_events_type
  ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_date
  ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user
  ON analytics_events(user_id);

-- ============================================================================
-- 8. Row Level Security (RLS) Policies
-- ============================================================================

-- Admin Activity Log
ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view activity log"
  ON admin_activity_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can log activity"
  ON admin_activity_log FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Platform Settings
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view settings"
  ON platform_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update settings"
  ON platform_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Content Reports
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can submit reports"
  ON content_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view own reports"
  ON content_reports FOR SELECT
  USING (auth.uid() = reporter_id);

CREATE POLICY "Admins can view all reports"
  ON content_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update reports"
  ON content_reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- User Moderation Actions
ALTER TABLE user_moderation_actions ENABLE ROW LEVEL SECURITY;

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

-- Analytics Events
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert events"
  ON analytics_events FOR INSERT
  WITH CHECK (true);

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

**Step 2: Verify migration file created**

Run: `ls -lh supabase/migrations/033_admin_dashboard_verification.sql`

Expected: File exists with ~250+ lines

**Step 3: Apply migration to database**

Run: `npx supabase db push`

Expected: Migration applied successfully, all tables created

**Step 4: Verify tables created**

Check Supabase dashboard → Database → Tables for:
- admin_activity_log
- platform_settings
- content_reports
- user_moderation_actions
- analytics_events

**Step 5: Commit migration**

```bash
git add supabase/migrations/033_admin_dashboard_verification.sql
git commit -m "feat(db): add admin dashboard and verification tables

- Add is_admin and can_post_jobs flags to profiles
- Add verification fields to certifications table
- Create admin_activity_log for audit trail
- Create platform_settings for configuration
- Create content_reports for moderation
- Create user_moderation_actions for user management
- Create analytics_events for custom tracking
- Add RLS policies for all new tables
- Add indexes for performance"
```

---

### Task 1.2: Update Constants for New Employer Type

**Files:**
- Modify: `lib/constants.ts`

**Step 1: Add Developer/Home Owner to employer types**

In `lib/constants.ts`, find `EMPLOYER_TYPES` and update:

```typescript
export const EMPLOYER_TYPES = ['contractor', 'recruiter', 'developer'] as const;

export type EmployerType = (typeof EMPLOYER_TYPES)[number];

// Human-readable labels for employer types
export const EMPLOYER_TYPE_LABELS: Record<EmployerType, string> = {
  contractor: 'Contractor',
  recruiter: 'Recruiter',
  developer: 'Developer/Home Owner',
};
```

**Step 2: Verify constants updated**

Run: `grep -n "EMPLOYER_TYPES\|EMPLOYER_TYPE_LABELS" lib/constants.ts`

Expected: Shows updated array with 3 types and labels object

**Step 3: Commit constants update**

```bash
git add lib/constants.ts
git commit -m "feat(constants): add Developer/Home Owner employer type

- Add 'developer' to EMPLOYER_TYPES
- Add EMPLOYER_TYPE_LABELS for human-readable display
- Supports homeowners and property developers hiring workers"
```

---

### Task 1.3: Set Your Account to Admin

**Files:**
- Manual: Supabase SQL Editor

**Step 1: Get your user ID**

In Supabase Dashboard → Authentication → Users, copy your user UUID.

**Step 2: Run SQL to set admin flag**

In Supabase Dashboard → SQL Editor, run:

```sql
-- Replace YOUR_USER_ID with your actual user UUID
UPDATE profiles
SET is_admin = true
WHERE user_id = 'YOUR_USER_ID';

-- Verify it worked
SELECT user_id, name, email, is_admin
FROM profiles
WHERE user_id = 'YOUR_USER_ID';
```

Expected: Returns your profile with `is_admin = true`

**Step 3: Document admin setup**

Create: `docs/admin-setup.md`

```markdown
# Admin Setup

## Setting Admin Access

To grant admin access to a user:

1. Get user ID from Supabase Dashboard → Authentication → Users
2. Run SQL in Supabase SQL Editor:

\`\`\`sql
UPDATE profiles
SET is_admin = true
WHERE user_id = 'USER_UUID_HERE';
\`\`\`

3. Verify:
\`\`\`sql
SELECT name, email, is_admin FROM profiles WHERE user_id = 'USER_UUID_HERE';
\`\`\`

## Current Admins

- [Your Name] (your@email.com) - Owner

## Admin Routes

All routes under `/admin/*` require `is_admin = true`.
```

**Step 4: Commit admin documentation**

```bash
git add docs/admin-setup.md
git commit -m "docs: add admin setup instructions

- Document how to grant admin access
- List current admin users
- Explain admin route protection"
```

---

### Task 1.4: Update Existing Certifications to Pending

**Files:**
- Manual: Supabase SQL Editor

**Step 1: Set all existing certifications to pending**

In Supabase SQL Editor:

```sql
-- Update all existing certifications to pending status
UPDATE certifications
SET verification_status = 'pending'
WHERE verification_status IS NULL;

-- Verify count
SELECT verification_status, COUNT(*)
FROM certifications
GROUP BY verification_status;
```

Expected: All certifications now have `verification_status = 'pending'`

**Step 2: Set contractor can_post_jobs flags**

```sql
-- Set contractors to cannot post jobs (need verification)
UPDATE profiles
SET can_post_jobs = false
WHERE role = 'employer'
  AND employer_type = 'contractor';

-- Set recruiters and developers to can post jobs
UPDATE profiles
SET can_post_jobs = true
WHERE role = 'employer'
  AND employer_type IN ('recruiter', 'developer');

-- Verify counts
SELECT employer_type, can_post_jobs, COUNT(*)
FROM profiles
WHERE role = 'employer'
GROUP BY employer_type, can_post_jobs;
```

Expected: Contractors have `can_post_jobs = false`, others `true`

---

### Task 1.5: Create Admin Middleware

**Files:**
- Modify: `lib/supabase/middleware.ts`

**Step 1: Read current middleware**

First, read the current middleware to understand its structure:

Read: `lib/supabase/middleware.ts`

**Step 2: Add admin route protection**

After reading, add admin check logic. The middleware should check if user has `is_admin = true` for `/admin/*` routes.

Add this function before the main middleware export:

```typescript
async function checkAdminAccess(supabase: any, path: string) {
  // Only check admin routes
  if (!path.startsWith('/admin')) {
    return true;
  }

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('user_id', user.id)
    .single();

  return profile?.is_admin === true;
}
```

**Step 3: Use admin check in middleware**

In the main middleware function, add:

```typescript
// Check admin access for /admin/* routes
const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');
if (isAdminRoute) {
  const hasAdminAccess = await checkAdminAccess(supabase, request.nextUrl.pathname);

  if (!hasAdminAccess) {
    // Return 404 to hide admin routes from non-admins
    return NextResponse.rewrite(new URL('/404', request.url));
  }
}
```

**Step 4: Test middleware locally**

Run: `npm run dev`

Navigate to: `http://localhost:3000/admin/dashboard`

Expected: If you're admin → loads (may 404 until we build pages), if not admin → 404

**Step 5: Commit middleware**

```bash
git add lib/supabase/middleware.ts
git commit -m "feat(middleware): add admin route protection

- Check is_admin flag for /admin/* routes
- Return 404 for non-admin users (hide admin routes)
- Query profiles table for admin status"
```

---

## Phase 2: User-Facing Verification Experience

### Task 2.1: Create Verification Badge Component

**Files:**
- Create: `components/common/verification-badge.tsx`

**Step 1: Create badge component**

Create `components/common/verification-badge.tsx`:

```typescript
'use client';

import React from 'react';

type VerificationStatus = 'pending' | 'verified' | 'rejected';

type Props = {
  status: VerificationStatus;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
};

export function VerificationBadge({ status, className = '', size = 'md' }: Props) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const statusConfig = {
    pending: {
      icon: '⏳',
      text: 'Pending Verification',
      className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    },
    verified: {
      icon: '✓',
      text: 'Verified',
      className: 'bg-green-100 text-green-800 border-green-300',
    },
    rejected: {
      icon: '✗',
      text: 'Rejected',
      className: 'bg-red-100 text-red-800 border-red-300',
    },
  };

  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${config.className} ${sizeClasses[size]} ${className}`}
    >
      <span className="text-base leading-none">{config.icon}</span>
      <span>{config.text}</span>
    </span>
  );
}
```

**Step 2: Export from common index**

In `components/common/index.ts`, add:

```typescript
export { VerificationBadge } from './verification-badge';
```

**Step 3: Test badge component**

Create a test page to verify badge displays correctly:

Create `app/test-badge/page.tsx`:

```typescript
import { VerificationBadge } from '@/components/common';

export default function TestBadgePage() {
  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Verification Badge Test</h1>

      <div className="space-y-2">
        <h2 className="font-semibold">Small</h2>
        <div className="flex gap-2">
          <VerificationBadge status="pending" size="sm" />
          <VerificationBadge status="verified" size="sm" />
          <VerificationBadge status="rejected" size="sm" />
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="font-semibold">Medium</h2>
        <div className="flex gap-2">
          <VerificationBadge status="pending" size="md" />
          <VerificationBadge status="verified" size="md" />
          <VerificationBadge status="rejected" size="md" />
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="font-semibold">Large</h2>
        <div className="flex gap-2">
          <VerificationBadge status="pending" size="lg" />
          <VerificationBadge status="verified" size="lg" />
          <VerificationBadge status="rejected" size="lg" />
        </div>
      </div>
    </div>
  );
}
```

**Step 4: View test page**

Run: `npm run dev`

Navigate to: `http://localhost:3000/test-badge`

Expected: See all 3 badge variants in 3 sizes with correct colors and icons

**Step 5: Delete test page and commit**

```bash
rm -rf app/test-badge
git add components/common/verification-badge.tsx components/common/index.ts
git commit -m "feat(components): add VerificationBadge component

- Displays pending, verified, rejected states
- Three sizes: sm, md, lg
- Color-coded with icons
- Reusable across certification displays"
```

---

### Task 2.2: Update Profile Page to Show Verification Badges

**Files:**
- Modify: `app/dashboard/profile/page.tsx`

**Step 1: Read current profile page**

Read: `app/dashboard/profile/page.tsx`

**Step 2: Import VerificationBadge**

Add to imports:

```typescript
import { VerificationBadge } from '@/components/common';
```

**Step 3: Add badge to certification display**

Find where certifications are displayed (likely in a map), and add the badge:

```typescript
{certifications.map((cert) => (
  <div key={cert.id} className="...">
    {/* Existing certification display */}
    <div className="flex items-center justify-between">
      <h3>{cert.certification_type}</h3>
      <VerificationBadge status={cert.verification_status as 'pending' | 'verified' | 'rejected'} size="sm" />
    </div>

    {/* Show rejection reason if rejected */}
    {cert.verification_status === 'rejected' && cert.rejection_reason && (
      <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-800">
          <strong>Rejection Reason:</strong> {cert.rejection_reason}
        </p>
      </div>
    )}

    {/* Rest of certification display */}
  </div>
))}
```

**Step 4: Test profile page**

Run: `npm run dev`

Navigate to: `http://localhost:3000/dashboard/profile`

Expected: Certifications show verification badges

**Step 5: Commit profile page update**

```bash
git add app/dashboard/profile/page.tsx
git commit -m "feat(profile): display certification verification badges

- Show verification status badge on each certification
- Display rejection reason for rejected certifications
- Use VerificationBadge component"
```

---

### Task 2.3: Update Certification Form Success Message

**Files:**
- Modify: `features/profiles/components/certification-form.tsx`

**Step 1: Update success toast message**

In `certification-form.tsx`, find the success toast after certification submission and update:

```typescript
toast.success(
  `${credentialLabel} submitted for verification! You'll be notified when it's reviewed (usually within 24-48 hours).`
);
```

**Step 2: Verify verification_status is set to pending**

Ensure the `addCertification` call doesn't override the default `pending` status. The database default should handle this, but verify in the server action.

**Step 3: Test certification submission**

Run: `npm run dev`

1. Go to profile
2. Add certification
3. Verify success message mentions verification
4. Check database: certification has `verification_status = 'pending'`

**Step 4: Commit form update**

```bash
git add features/profiles/components/certification-form.tsx
git commit -m "feat(certification-form): update success message for verification

- Inform users about verification review process
- Mention 24-48 hour turnaround time
- Certification defaults to pending status"
```

---

### Task 2.4: Update Onboarding for Contractor License Requirement

**Files:**
- Modify: `features/onboarding/components/onboarding-form.tsx`
- Modify: `features/onboarding/actions/onboarding-actions.ts`

**Step 1: Read onboarding form**

Read: `features/onboarding/components/onboarding-form.tsx` (full file)

**Step 2: Add license upload state for contractors**

In the onboarding form component, add state for license upload:

```typescript
const [licenseFile, setLicenseFile] = useState<File | null>(null);
const [licensePreview, setLicensePreview] = useState<string | null>(null);
const [licenseData, setLicenseData] = useState({
  license_type: '',
  license_number: '',
  issuing_state: '',
  expires_at: '',
});
```

**Step 3: Update Step 3 to show license upload for contractors**

In Step 3 (role selection), when `employer_type === 'contractor'`, show license upload section:

```typescript
{formData.employer_type === 'contractor' && (
  <>
    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <h3 className="font-semibold text-blue-900 mb-2">
        Contractor License Required
      </h3>
      <p className="text-sm text-blue-800 mb-4">
        You must upload your contractor license to post jobs on KrewUp.
      </p>

      <div className="space-y-4">
        <Input
          label="License Type"
          type="text"
          placeholder="e.g., General Contractor License"
          value={licenseData.license_type}
          onChange={(e) => setLicenseData({ ...licenseData, license_type: e.target.value })}
          required
        />

        <Input
          label="License Number"
          type="text"
          placeholder="e.g., 123456"
          value={licenseData.license_number}
          onChange={(e) => setLicenseData({ ...licenseData, license_number: e.target.value })}
          required
        />

        <Input
          label="Issuing State/Authority"
          type="text"
          placeholder="e.g., California"
          value={licenseData.issuing_state}
          onChange={(e) => setLicenseData({ ...licenseData, issuing_state: e.target.value })}
          required
        />

        <Input
          label="Expiration Date"
          type="date"
          value={licenseData.expires_at}
          onChange={(e) => setLicenseData({ ...licenseData, expires_at: e.target.value })}
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            License Photo <span className="text-red-500">*</span>
          </label>
          {!licensePreview ? (
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <p className="mb-2 text-sm text-gray-500">
                  <span className="font-semibold">Click to upload</span>
                </p>
                <p className="text-xs text-gray-500">Image or PDF (MAX. 5MB)</p>
              </div>
              <input
                type="file"
                className="hidden"
                accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setLicenseFile(file);
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setLicensePreview(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                required
              />
            </label>
          ) : (
            <div className="space-y-2">
              <img src={licensePreview} alt="License preview" className="w-full max-h-64 object-contain rounded-lg border" />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setLicenseFile(null);
                  setLicensePreview(null);
                }}
                className="w-full"
              >
                Remove Photo
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Update submit button condition */}
    <Button
      onClick={handleSubmit}
      disabled={
        isLoading ||
        !formData.employer_type ||
        !formData.company_name ||
        !formData.trade ||
        !licenseData.license_type ||
        !licenseData.license_number ||
        !licenseData.issuing_state ||
        !licenseData.expires_at ||
        !licenseFile
      }
      isLoading={isLoading}
      className="flex-1"
    >
      Complete Setup
    </Button>
  </>
)}
```

**Step 4: Update handleSubmit to upload license**

Modify the submit handler to upload license for contractors:

```typescript
async function handleSubmit() {
  setError('');
  setIsLoading(true);

  try {
    // If contractor, upload license first
    let licensePhotoUrl = null;
    if (formData.employer_type === 'contractor' && licenseFile) {
      const uploadResult = await uploadCertificationPhoto(licenseFile);

      if (!uploadResult.success) {
        setError(uploadResult.error || 'Failed to upload license');
        setIsLoading(false);
        return;
      }

      licensePhotoUrl = uploadResult.data.url;
    }

    // Complete onboarding with license data
    const result = await completeOnboarding({
      ...formData,
      licenseData: formData.employer_type === 'contractor' ? {
        ...licenseData,
        photo_url: licensePhotoUrl,
      } : undefined,
    });

    if (!result.success) {
      setError(result.error || 'Failed to complete onboarding');
      setIsLoading(false);
      return;
    }

    // Success! Redirect to dashboard
    window.location.href = '/dashboard/feed';
  } catch (err: any) {
    setError(err.message || 'An unexpected error occurred');
    setIsLoading(false);
  }
}
```

**Step 5: Update onboarding action to save license**

In `features/onboarding/actions/onboarding-actions.ts`, update to handle license:

```typescript
export async function completeOnboarding(data: OnboardingData & {
  licenseData?: {
    license_type: string;
    license_number: string;
    issuing_state: string;
    expires_at: string;
    photo_url: string;
  }
}) {
  // ... existing profile update code ...

  // If contractor, create license certification
  if (data.employer_type === 'contractor' && data.licenseData) {
    await addCertification({
      credential_category: 'license',
      certification_type: data.licenseData.license_type,
      certification_number: data.licenseData.license_number,
      issued_by: data.licenseData.issuing_state,
      expires_at: data.licenseData.expires_at,
      photo_url: data.licenseData.photo_url,
    });

    // Set can_post_jobs to false until verified
    await supabase
      .from('profiles')
      .update({ can_post_jobs: false })
      .eq('user_id', user.id);
  }

  return { success: true };
}
```

**Step 6: Test contractor onboarding**

Run: `npm run dev`

1. Sign up as new user
2. Select "Employer" → "Contractor"
3. Verify license upload section appears (required)
4. Upload license photo
5. Complete onboarding
6. Verify license is in certifications table with `verification_status = 'pending'`
7. Verify profile has `can_post_jobs = false`

**Step 7: Commit onboarding updates**

```bash
git add features/onboarding/components/onboarding-form.tsx features/onboarding/actions/onboarding-actions.ts
git commit -m "feat(onboarding): require contractor license upload

- Contractors must upload license during onboarding
- License fields: type, number, state, expiration, photo
- License saved as certification with category='license'
- Profile.can_post_jobs set to false until verified
- Recruiters and developers skip license requirement"
```

---

### Task 2.5: Add Job Posting Restriction for Unverified Contractors

**Files:**
- Modify: `app/dashboard/jobs/new/page.tsx`
- Create: `components/common/contractor-verification-banner.tsx`

**Step 1: Create verification banner component**

Create `components/common/contractor-verification-banner.tsx`:

```typescript
'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui';

export function ContractorVerificationBanner() {
  return (
    <Card className="border-yellow-300 bg-yellow-50">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <span className="text-3xl">⏳</span>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-yellow-900 mb-2">
              Contractor License Pending Verification
            </h3>
            <p className="text-sm text-yellow-800 mb-3">
              Your contractor license is currently being reviewed. You'll be able to post jobs
              once your license is verified by our team (usually within 24-48 hours).
            </p>
            <p className="text-sm text-yellow-800">
              You'll receive an email notification when verification is complete.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Update job posting page to check can_post_jobs**

In `app/dashboard/jobs/new/page.tsx`, add check at the top:

```typescript
import { ContractorVerificationBanner } from '@/components/common/contractor-verification-banner';

export default async function NewJobPage() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check if user can post jobs
  const { data: profile } = await supabase
    .from('profiles')
    .select('can_post_jobs, employer_type, role')
    .eq('user_id', user.id)
    .single();

  // If contractor without verified license, show banner instead of form
  if (profile?.role === 'employer' && profile?.employer_type === 'contractor' && !profile?.can_post_jobs) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Post a Job</h1>
        <ContractorVerificationBanner />
      </div>
    );
  }

  // Rest of job posting form...
  return (
    // ... existing job form ...
  );
}
```

**Step 3: Test job posting restriction**

Run: `npm run dev`

1. Log in as contractor with unverified license
2. Navigate to /dashboard/jobs/new
3. Verify banner is shown instead of job form
4. Cannot post jobs

**Step 4: Commit job posting restriction**

```bash
git add app/dashboard/jobs/new/page.tsx components/common/contractor-verification-banner.tsx
git commit -m "feat(jobs): restrict job posting for unverified contractors

- Check can_post_jobs flag on job posting page
- Show verification pending banner for contractors
- Block job form until license verified
- Display expected verification timeline"
```

---

## Phase 3: Admin Dashboard Core

### Task 3.1: Create Admin Layout

**Files:**
- Create: `app/admin/layout.tsx`
- Create: `components/admin/admin-sidebar.tsx`

**Step 1: Create admin sidebar component**

Create `components/admin/admin-sidebar.tsx`:

```typescript
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navigation = [
  { name: 'Overview', href: '/admin/dashboard', icon: '📊' },
  { name: 'Certifications', href: '/admin/certifications', icon: '✓' },
  { name: 'Users', href: '/admin/users', icon: '👥' },
  { name: 'Analytics', href: '/admin/analytics', icon: '📈' },
  { name: 'Monitoring', href: '/admin/monitoring', icon: '🔍' },
  { name: 'Moderation', href: '/admin/moderation', icon: '🛡️' },
  { name: 'Settings', href: '/admin/settings', icon: '⚙️' },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen">
      <div className="p-6">
        <h1 className="text-2xl font-bold">KrewUp Admin</h1>
      </div>

      <nav className="px-3 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="absolute bottom-0 w-64 p-4 border-t border-gray-800">
        <Link
          href="/dashboard/feed"
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white"
        >
          <span>←</span>
          <span>Back to Main App</span>
        </Link>
      </div>
    </aside>
  );
}
```

**Step 2: Create admin layout**

Create `app/admin/layout.tsx`:

```typescript
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { AdminSidebar } from '@/components/admin/admin-sidebar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_admin) {
    redirect('/404');
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 bg-gray-50">
        <div className="max-w-7xl mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
```

**Step 3: Test admin layout**

Run: `npm run dev`

Navigate to: `http://localhost:3000/admin/dashboard` (will 404 until we create page)

Expected: If admin → see sidebar, if not admin → redirect to 404

**Step 4: Commit admin layout**

```bash
git add app/admin/layout.tsx components/admin/admin-sidebar.tsx
git commit -m "feat(admin): create admin layout with sidebar navigation

- Admin layout with sidebar for all admin routes
- Navigation to 7 admin sections
- Check is_admin flag, redirect non-admins
- Link back to main app
- Dark theme sidebar UI"
```

---

### Task 3.2: Create Admin Overview Dashboard

**Files:**
- Create: `app/admin/dashboard/page.tsx`
- Create: `components/admin/metric-card.tsx`

**Step 1: Create metric card component**

Create `components/admin/metric-card.tsx`:

```typescript
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';

type Props = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
};

export function MetricCard({ title, value, subtitle, icon, trend }: Props) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          {title}
        </CardTitle>
        {icon && <div className="text-2xl">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        )}
        {trend && (
          <p className={`text-sm mt-2 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}% vs last month
          </p>
        )}
      </CardContent>
    </Card>
  );
}
```

**Step 2: Create overview dashboard page**

Create `app/admin/dashboard/page.tsx`:

```typescript
import { createServerClient } from '@/lib/supabase/server';
import { MetricCard } from '@/components/admin/metric-card';

export default async function AdminDashboardPage() {
  const supabase = createServerClient();

  // Fetch metrics
  const [
    { count: totalUsers },
    { count: activeJobs },
    { count: pendingCerts },
    { count: proSubs },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('certifications').select('*', { count: 'exact', head: true }).eq('verification_status', 'pending'),
    supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Platform overview and key metrics
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Users"
          value={totalUsers || 0}
          icon="👥"
        />
        <MetricCard
          title="Active Jobs"
          value={activeJobs || 0}
          icon="💼"
        />
        <MetricCard
          title="Pending Certifications"
          value={pendingCerts || 0}
          subtitle="Awaiting review"
          icon="⏳"
        />
        <MetricCard
          title="Pro Subscribers"
          value={proSubs || 0}
          icon="⭐"
        />
      </div>

      {/* Recent Activity Placeholder */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <p className="text-gray-500">Activity feed coming in Phase 4</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <a
          href="/admin/certifications"
          className="p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all"
        >
          <h3 className="font-semibold text-lg mb-2">Review Certifications</h3>
          <p className="text-gray-600 text-sm">
            {pendingCerts || 0} certifications pending verification
          </p>
        </a>

        <a
          href="/admin/users"
          className="p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all"
        >
          <h3 className="font-semibold text-lg mb-2">Manage Users</h3>
          <p className="text-gray-600 text-sm">
            Search, view, and moderate user accounts
          </p>
        </a>

        <a
          href="/admin/monitoring"
          className="p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all"
        >
          <h3 className="font-semibold text-lg mb-2">View Errors</h3>
          <p className="text-gray-600 text-sm">
            Monitor platform health and errors
          </p>
        </a>
      </div>
    </div>
  );
}
```

**Step 3: Test overview dashboard**

Run: `npm run dev`

Navigate to: `http://localhost:3000/admin/dashboard`

Expected: See metrics cards, recent activity placeholder, quick actions

**Step 4: Commit overview dashboard**

```bash
git add app/admin/dashboard/page.tsx components/admin/metric-card.tsx
git commit -m "feat(admin): create overview dashboard

- Display key metrics: users, jobs, pending certs, pro subs
- MetricCard component with optional trends
- Quick action links to other admin sections
- Fetch real data from Supabase"
```

---

Due to length constraints, I'll continue the plan in the next response. This implementation plan is comprehensive and follows the writing-plans skill format with:

- Exact file paths
- Complete code samples
- Step-by-step verification
- Commit messages
- Bite-sized tasks

Would you like me to:
1. Continue with the remaining tasks (Certification Queue, User Management, etc.)?
2. Save this partial plan and continue in a new file?
3. Consolidate into a shorter version?