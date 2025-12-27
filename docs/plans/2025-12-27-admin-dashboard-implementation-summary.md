# Admin Dashboard & Certification Verification - Implementation Summary

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan.

**Goal:** Build admin dashboard with certification verification in 5 phases over 10 days.

**Key Deliverables:**
1. Database schema with verification tracking
2. User-facing verification badges and contractor license requirement
3. Admin dashboard with certification queue
4. Analytics and monitoring integration
5. Complete testing and deployment

---

## Phase 1: Database Foundation (Day 1)

### Critical Tasks:

**1.1: Database Migration**
- File: `supabase/migrations/033_admin_dashboard_verification.sql`
- Add: `is_admin`, `can_post_jobs` to profiles
- Add: verification fields to certifications (status, verified_at, verified_by, rejection_reason, notes)
- Create: 5 new tables (admin_activity_log, platform_settings, content_reports, user_moderation_actions, analytics_events)
- Add: RLS policies for all tables
- Run: `npx supabase db push`
- Commit: "feat(db): add admin dashboard and verification tables"

**1.2: Update Constants**
- File: `lib/constants.ts`
- Add: 'developer' to EMPLOYER_TYPES
- Add: EMPLOYER_TYPE_LABELS mapping
- Commit: "feat(constants): add Developer/Home Owner employer type"

**1.3: Set Admin Access**
- Run SQL: `UPDATE profiles SET is_admin = true WHERE user_id = 'YOUR_ID';`
- Create: `docs/admin-setup.md` with instructions
- Commit: "docs: add admin setup instructions"

**1.4: Update Existing Data**
- Set existing certifications to `verification_status = 'pending'`
- Set contractors to `can_post_jobs = false`
- Set recruiters/developers to `can_post_jobs = true`

**1.5: Admin Middleware**
- File: `lib/supabase/middleware.ts`
- Add: `checkAdminAccess()` function
- Check `is_admin` for `/admin/*` routes, return 404 if false
- Commit: "feat(middleware): add admin route protection"

---

## Phase 2: User-Facing Verification (Days 2-3)

### Critical Tasks:

**2.1: Verification Badge Component**
- File: `components/common/verification-badge.tsx`
- Create badge with 3 states: pending (yellow), verified (green), rejected (red)
- Export from `components/common/index.ts`
- Commit: "feat(components): add VerificationBadge component"

**2.2: Display Badges on Profile**
- File: `app/dashboard/profile/page.tsx`
- Add `VerificationBadge` to certification display
- Show rejection reason for rejected certs
- Commit: "feat(profile): display certification verification badges"

**2.3: Update Certification Form**
- File: `features/profiles/components/certification-form.tsx`
- Update success message to mention 24-48hr verification
- Ensure `verification_status` defaults to 'pending'
- Commit: "feat(certification-form): update success message for verification"

**2.4: Contractor License in Onboarding**
- File: `features/onboarding/components/onboarding-form.tsx`
- Add license upload section for contractors (REQUIRED)
- Fields: type, number, state, expiration, photo
- File: `features/onboarding/actions/onboarding-actions.ts`
- Save license as certification with `credential_category = 'license'`
- Set `can_post_jobs = false` for contractors
- Commit: "feat(onboarding): require contractor license upload"

**2.5: Job Posting Restriction**
- File: `app/dashboard/jobs/new/page.tsx`
- Check `can_post_jobs` flag
- File: `components/common/contractor-verification-banner.tsx`
- Show banner if contractor not verified
- Commit: "feat(jobs): restrict posting for unverified contractors"

---

## Phase 3: Admin Dashboard Core (Days 4-6)

### Critical Tasks:

**3.1: Admin Layout & Sidebar**
- File: `app/admin/layout.tsx` - Check is_admin, render sidebar
- File: `components/admin/admin-sidebar.tsx` - Navigation to 7 sections
- Commit: "feat(admin): create admin layout with sidebar navigation"

**3.2: Overview Dashboard**
- File: `app/admin/dashboard/page.tsx`
- File: `components/admin/metric-card.tsx`
- Display: total users, active jobs, pending certs, pro subs
- Commit: "feat(admin): create overview dashboard"

**3.3: Certification Queue & Review Panel**
- File: `app/admin/certifications/page.tsx`
- Tabs: Pending, Verified, Rejected, Flagged
- File: `components/admin/certification-review-panel.tsx`
- Left: Image viewer with zoom
- Right: Certification details, admin notes
- File: `features/admin/actions/certification-actions.ts`
- Actions: `approveCertification()`, `rejectCertification()`, `flagCertification()`
- Log to admin_activity_log
- Update `can_post_jobs` for contractor licenses
- Commit: "feat(admin): create certification verification queue"

**3.4: User Management**
- File: `app/admin/users/page.tsx`
- Search/filter users
- File: `components/admin/user-detail-panel.tsx`
- Display full profile, activity, subscription
- File: `features/admin/actions/user-actions.ts`
- Actions: suspend, ban, grant Pro, impersonate
- Commit: "feat(admin): create user management dashboard"

---

## Phase 4: Analytics & Monitoring (Days 7-8)

### Critical Tasks:

**4.1: Sentry Setup**
- Run: `npm install @sentry/nextjs`
- Run: `npx @sentry/wizard@latest -i nextjs`
- Add: DSN to `.env.local`
- Configure user context in Sentry config
- Commit: "feat(monitoring): integrate Sentry for error tracking"

**4.2: Analytics Dashboard**
- Run: `npm install recharts`
- File: `app/admin/analytics/page.tsx`
- File: `features/admin/actions/analytics-actions.ts`
- Charts: user growth, engagement, revenue
- Metrics: signups, job posts, applications, messages
- Commit: "feat(admin): create analytics dashboard with charts"

**4.3: Monitoring Dashboard**
- File: `app/admin/monitoring/page.tsx`
- File: `features/admin/actions/sentry-actions.ts`
- Fetch recent errors from Sentry API
- Display: error rate chart, top issues, performance metrics
- System health checks (Supabase, Stripe, Vercel)
- Commit: "feat(admin): create monitoring dashboard"

**4.4: Moderation Queue**
- File: `app/admin/moderation/page.tsx`
- File: `features/admin/actions/moderation-actions.ts`
- Content reports queue with review panel
- Actions: remove content, warn, suspend, ban user
- Commit: "feat(admin): create moderation dashboard"

**4.5: Settings Dashboard**
- File: `app/admin/settings/page.tsx`
- Edit platform_settings (maintenance mode, feature flags)
- Manage admin users (add/remove admins)
- Commit: "feat(admin): create settings dashboard"

---

## Phase 5: Polish & Testing (Days 9-10)

### Critical Tasks:

**5.1: End-to-End Testing**

**Worker Certification Flow:**
1. Create test worker account
2. Add certification with photo
3. Verify shows "Pending" badge
4. Log in as admin → review → approve
5. Verify shows "Verified" badge
6. Add another cert → reject with reason
7. Verify shows rejection reason

**Contractor License Flow:**
1. Create test contractor account
2. Upload license during onboarding
3. Verify `can_post_jobs = false`
4. Verify cannot access job posting
5. Log in as admin → verify license
6. Verify `can_post_jobs = true`
7. Verify can post jobs

**Admin Dashboard:**
1. Test all navigation links
2. Verify metrics display correctly
3. Test certification queue actions
4. Test user management actions
5. Test analytics charts
6. Test monitoring integration

**5.2: UI Polish**
- Add loading states to all async actions
- Add error boundaries
- Add success/error toasts
- Add confirmation dialogs for destructive actions
- Mobile responsiveness for admin dashboard
- Commit: "polish(admin): improve UX with loading states and confirmations"

**5.3: Documentation**
- Update `CLAUDE.md` with admin dashboard info
- Create `docs/admin-user-guide.md`
- List common verification databases (OSHA, state boards)
- Update `docs/plans/progress-checklist.md`
- Commit: "docs: add admin dashboard documentation"

**5.4: Deployment**
- Push to production: `git push origin main`
- Verify Vercel deployment successful
- Set production user to admin in Supabase
- Test admin access in production
- Monitor Sentry for deployment issues
- Commit: "chore: deploy admin dashboard to production"

---

## Key Files Reference

### New Files Created:
```
supabase/migrations/033_admin_dashboard_verification.sql
components/common/verification-badge.tsx
components/common/contractor-verification-banner.tsx
components/admin/admin-sidebar.tsx
components/admin/metric-card.tsx
components/admin/certification-review-panel.tsx
components/admin/user-detail-panel.tsx
app/admin/layout.tsx
app/admin/dashboard/page.tsx
app/admin/certifications/page.tsx
app/admin/users/page.tsx
app/admin/analytics/page.tsx
app/admin/monitoring/page.tsx
app/admin/moderation/page.tsx
app/admin/settings/page.tsx
features/admin/actions/certification-actions.ts
features/admin/actions/user-actions.ts
features/admin/actions/analytics-actions.ts
features/admin/actions/sentry-actions.ts
features/admin/actions/moderation-actions.ts
docs/admin-setup.md
docs/admin-user-guide.md
```

### Modified Files:
```
lib/constants.ts
lib/supabase/middleware.ts
features/onboarding/components/onboarding-form.tsx
features/onboarding/actions/onboarding-actions.ts
features/profiles/components/certification-form.tsx
app/dashboard/profile/page.tsx
app/dashboard/jobs/new/page.tsx
```

---

## Testing Checklist

- [ ] Migration applied successfully
- [ ] Admin middleware blocks non-admins
- [ ] Verification badges display correctly
- [ ] Contractor license required during onboarding
- [ ] Contractors cannot post until verified
- [ ] Admin can approve certifications
- [ ] Admin can reject with reason
- [ ] Rejection reason shown to user
- [ ] License verification enables job posting
- [ ] User management actions work
- [ ] Analytics charts display data
- [ ] Sentry captures errors
- [ ] All admin routes accessible
- [ ] Mobile responsive

---

## Success Criteria

**Phase 1:** Database schema complete, admin access granted, middleware protecting routes
**Phase 2:** Users see verification badges, contractors blocked from posting, license upload in onboarding
**Phase 3:** Admin can review and verify certifications, manage users
**Phase 4:** Analytics and monitoring dashboards functional, Sentry integrated
**Phase 5:** All tests passing, documentation complete, deployed to production

---

## Execution Options

This plan can be executed using:
1. **superpowers:subagent-driven-development** - Dispatch subagent per task in current session
2. **superpowers:executing-plans** - Open new session for batch execution with review checkpoints

Choose based on preference for iteration speed vs. batch processing.
