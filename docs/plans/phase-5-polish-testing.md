# Phase 5: Polish & Testing - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** End-to-end testing of all flows, UI polish, documentation, and production deployment.

**Duration:** Days 9-10 (~12-16 hours)

**Architecture:** Comprehensive testing checklist, UI improvements (loading states, confirmations), documentation updates, production deployment verification.

**Tech Stack:** Next.js 15, Supabase, Vercel

**Prerequisites:** Phase 1-4 complete (full system functional)

---

## Task 5.1: End-to-End Testing - Worker Certification Flow

**Test Scenario 1: Worker Adds Certification**

1. Create test worker account or log in as existing worker
2. Navigate to `/dashboard/profile` → Add Certification
3. Fill out certification form:
   - Type: "OSHA 30"
   - Number: "TEST123456"
   - Issuing org: "OSHA Training Institute"
   - Issue date: Recent date
   - Upload photo: Any valid image
4. Submit form
5. **Verify:**
   - Success toast mentions verification review
   - Redirected to profile page
   - Certification shows yellow "Pending Verification" badge
   - Database: `verification_status = 'pending'`

**Test Scenario 2: Admin Approves Certification**

1. Log in as admin account
2. Navigate to `/admin/certifications`
3. Find test certification in Pending tab
4. Click "Review"
5. **Verify review panel shows:**
   - Full-size certification image
   - All certification details (type, number, issuer)
   - Admin notes field
6. Click "Approve"
7. **Verify:**
   - Certification moves to Verified tab
   - Database: `verification_status = 'verified'`, `verified_at` set, `verified_by` = admin ID
   - Admin activity logged
8. Log out, log back in as worker
9. **Verify:**
   - Certification shows green "Verified" badge
   - (Bonus: email notification sent - check if configured)

**Test Scenario 3: Admin Rejects Certification**

1. Worker adds another certification (same process as scenario 1)
2. Admin reviews in queue
3. Click "Reject" → Enter reason: "Photo is too blurry. Please upload clearer image."
4. Submit rejection
5. **Verify:**
   - Certification moves to Rejected tab
   - Database: `verification_status = 'rejected'`, `rejection_reason` saved
   - Admin activity logged
6. Log in as worker
7. **Verify:**
   - Certification shows red "Rejected" badge
   - Rejection reason displayed
   - "Upload Corrected Certification" link available

**Checklist:**
- [ ] Worker can add certification
- [ ] Pending badge displays correctly
- [ ] Admin sees certification in queue
- [ ] Review panel displays image and details
- [ ] Approve action works
- [ ] Verified badge displays
- [ ] Reject action requires reason
- [ ] Rejection reason saved and displayed
- [ ] Rejected badge displays
- [ ] All actions logged to admin_activity_log

---

## Task 5.2: End-to-End Testing - Contractor License Flow

**Test Scenario 1: Contractor Onboarding with License**

1. Sign up as new user (new email)
2. Onboarding Step 1: Enter name, phone, email
3. Onboarding Step 2: Select "Employer" role
4. Onboarding Step 3: Select "Contractor" employer type
5. **Verify:**
   - License upload section appears
   - License fields are required (form won't submit without them)
6. Fill out license information:
   - Type: "General Contractor License"
   - Number: "GC123456"
   - State: "California"
   - Expiration: Future date
   - Upload license photo
7. Complete onboarding
8. **Verify:**
   - Redirected to dashboard
   - Yellow banner shows: "License pending verification"
   - Database: Profile has `can_post_jobs = false`
   - Database: License saved in certifications with `credential_category = 'license'`, `verification_status = 'pending'`

**Test Scenario 2: Contractor Cannot Post Jobs**

1. As unverified contractor, navigate to `/dashboard/jobs/new`
2. **Verify:**
   - ContractorVerificationBanner displays instead of job form
   - Banner explains verification pending
   - Link to view license status in profile

**Test Scenario 3: Admin Verifies License**

1. Log in as admin
2. Navigate to `/admin/certifications`
3. Find contractor license in Pending tab
4. Review and approve license
5. **Verify:**
   - Database: `can_post_jobs = true` for contractor profile
   - Admin activity logged

**Test Scenario 4: Contractor Can Now Post Jobs**

1. Log out, log back in as contractor
2. Navigate to `/dashboard/jobs/new`
3. **Verify:**
   - Job posting form loads (no banner)
   - Can create job successfully
4. View posted job
5. **Verify:**
   - "Licensed & Verified" badge shows on job (optional feature)

**Checklist:**
- [ ] Contractor onboarding requires license upload
- [ ] Cannot complete onboarding without license
- [ ] License saved with correct category
- [ ] can_post_jobs set to false initially
- [ ] Contractor sees verification banner on job posting
- [ ] Cannot access job form until verified
- [ ] Admin can verify contractor license
- [ ] License verification sets can_post_jobs to true
- [ ] Contractor can post jobs after verification
- [ ] All flows work end-to-end

---

## Task 5.3: End-to-End Testing - Admin Dashboard

**Test All Admin Sections:**

1. **Overview Dashboard:**
   - [ ] All metric cards display correct counts
   - [ ] Pending certifications count is accurate
   - [ ] Click pending certs → navigates to certifications page
   - [ ] Quick action links work

2. **Certifications Queue:**
   - [ ] All tabs load (Pending, Verified, Rejected, Flagged)
   - [ ] Image viewer displays photos correctly
   - [ ] Zoom and download work
   - [ ] PDF viewer works for PDF uploads
   - [ ] Approve/reject/flag actions functional
   - [ ] Admin notes save correctly

3. **Users Management:**
   - [ ] Search finds users by name/email
   - [ ] Filter by role works
   - [ ] User detail panel shows complete info
   - [ ] Moderation actions (suspend, ban) work
   - [ ] Grant Pro subscription works

4. **Analytics:**
   - [ ] User growth chart displays
   - [ ] Engagement metrics show correct counts
   - [ ] Charts are interactive

5. **Monitoring:**
   - [ ] Sentry errors display (if any exist)
   - [ ] Error rate chart shows data
   - [ ] Links to Sentry work

6. **Moderation:**
   - [ ] Content reports queue loads
   - [ ] Review panel functional
   - [ ] Remove/warn/suspend actions work

7. **Settings:**
   - [ ] Platform settings editable
   - [ ] Admin management works
   - [ ] Changes save to database

---

## Task 5.4: UI Polish

**Add Loading States:**

Update all async operations to show loading spinners:

```typescript
// Example: Certification approval
const [isApproving, setIsApproving] = useState(false);

async function handleApprove() {
  setIsApproving(true);
  await approveCertification(certId);
  setIsApproving(false);
}

<Button isLoading={isApproving} onClick={handleApprove}>
  Approve
</Button>
```

Apply to:
- [ ] Certification approval/rejection
- [ ] User moderation actions
- [ ] Settings updates
- [ ] Form submissions

**Add Confirmation Dialogs:**

Create reusable `ConfirmDialog` component for destructive actions:

```typescript
// components/common/confirm-dialog.tsx
import { useState } from 'react';
import { Button } from '@/components/ui';

export function useConfirmDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [resolvePromise, setResolvePromise] = useState<(value: boolean) => void>();

  const confirm = () => new Promise<boolean>((resolve) => {
    setIsOpen(true);
    setResolvePromise(() => resolve);
  });

  const handleConfirm = () => {
    resolvePromise?.(true);
    setIsOpen(false);
  };

  const handleCancel = () => {
    resolvePromise?.(false);
    setIsOpen(false);
  };

  const ConfirmDialog = ({ title, message }: { title: string; message: string }) => (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-semibold mb-2">{title}</h3>
            <p className="text-gray-600 mb-4">{message}</p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={handleCancel}>Cancel</Button>
              <Button variant="primary" onClick={handleConfirm}>Confirm</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return { confirm, ConfirmDialog };
}
```

Apply to:
- [ ] User ban/suspend
- [ ] Certification rejection
- [ ] Content removal
- [ ] Admin access revocation

**Add Success Toasts:**

Ensure all actions show success feedback:
- [ ] Certification approved → "Certification verified successfully"
- [ ] User suspended → "User suspended for X days"
- [ ] Settings saved → "Settings updated"

**Commit:**
```bash
git add .
git commit -m "polish(ui): add loading states and confirmations

- Loading spinners for all async actions
- Confirmation dialogs for destructive operations
- Success toasts for user feedback
- Improved error messaging"
```

---

## Task 5.5: Documentation

**Update CLAUDE.md:**

Add admin dashboard section:

```markdown
## Admin Dashboard

### Accessing Admin Routes

Admin users (with `is_admin = true` in profiles table) can access `/admin/*` routes.

**Admin Sections:**
- Overview: Platform metrics and quick actions
- Certifications: Verify worker certifications and contractor licenses
- Users: Search, view, and moderate user accounts
- Analytics: User growth, engagement metrics, charts
- Monitoring: Sentry error tracking and system health
- Moderation: Review content reports, manage moderation actions
- Settings: Platform configuration and admin user management

### Granting Admin Access

See `docs/admin-setup.md` for instructions on granting admin privileges.
```

**Create Admin User Guide:**

Create `docs/admin-user-guide.md`:

```markdown
# Admin User Guide

## Verifying Certifications

### Review Process

1. Navigate to Admin → Certifications
2. Click on pending certification
3. Review uploaded image:
   - Check photo quality (readable text)
   - Verify certification number matches
   - Check expiration date (if applicable)
   - Cross-reference name on cert with user profile
4. Click "Approve" or "Reject"

### Verification Resources

**OSHA Certifications:**
- No centralized lookup - verify via training provider
- Check card format and issuer legitimacy

**State Contractor Licenses:**
- California: [CSLB Lookup](https://www2.cslb.ca.gov/OnlineServices/CheckLicenseII/LicenseDetail.aspx)
- Texas: [TDLR Search](https://www.tdlr.texas.gov/LicenseSearch/)
- Florida: [MyFloridaLicense](https://www.myfloridalicense.com/intentions2.asp)

### Best Practices

- Respond within 24 hours when possible
- Provide specific rejection reasons
- Add admin notes for context
- Flag suspicious certs for additional research

## User Moderation

### Suspension vs Ban

**Suspension:** Temporary restriction (set duration)
**Ban:** Permanent account deactivation

### When to Take Action

- Multiple content reports against user
- Verified policy violations
- Fraudulent certifications
- Spam or inappropriate behavior

Always document reasoning in moderation action.
```

**Update Progress Checklist:**

Mark Phase 1-5 as complete in `docs/plans/progress-checklist.md`.

**Commit:**
```bash
git add CLAUDE.md docs/admin-setup.md docs/admin-user-guide.md docs/plans/progress-checklist.md
git commit -m "docs: add comprehensive admin dashboard documentation

- Update CLAUDE.md with admin routes
- Create admin user guide with verification process
- Document verification resources and best practices
- Update progress checklist"
```

---

## Task 5.6: Production Deployment

**Step 1: Final Build Test**

Run: `npm run build`

Expected: Build succeeds with no errors

**Step 2: Environment Variables Check**

Verify all required env vars in Vercel:
- [ ] NEXT_PUBLIC_SUPABASE_URL
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY
- [ ] SUPABASE_SERVICE_ROLE_KEY
- [ ] NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
- [ ] NEXT_PUBLIC_SENTRY_DSN
- [ ] SENTRY_AUTH_TOKEN
- [ ] STRIPE_SECRET_KEY
- [ ] STRIPE_WEBHOOK_SECRET

**Step 3: Push to Production**

```bash
git push origin main
```

Vercel auto-deploys.

**Step 4: Production Verification**

1. Visit production URL
2. Test worker certification flow
3. Test contractor onboarding
4. Test admin login
5. Verify admin dashboard loads
6. Test certification approval
7. Check Sentry for any errors

**Step 5: Set Production Admin**

1. Open Supabase production dashboard
2. SQL Editor:
```sql
UPDATE profiles
SET is_admin = true
WHERE user_id = 'YOUR_PRODUCTION_USER_ID';
```

**Step 6: Monitor First 24 Hours**

- Check Sentry for errors
- Monitor user signups
- Watch certification submissions
- Review admin activity log

**Commit:**
```bash
git commit --allow-empty -m "chore: phase 5 complete - production deployed

All testing complete. Admin dashboard fully functional in production."
```

---

## Phase 5 Final Checklist

### Testing Complete:
- [ ] Worker certification flow works end-to-end
- [ ] Admin can approve/reject certifications
- [ ] Contractor onboarding requires license
- [ ] License verification enables job posting
- [ ] All admin sections functional
- [ ] Mobile responsive (test on phone)
- [ ] Cross-browser tested (Chrome, Firefox, Safari)

### Polish Complete:
- [ ] Loading states on all async actions
- [ ] Confirmation dialogs for destructive operations
- [ ] Success toasts for user feedback
- [ ] Error boundaries implemented
- [ ] No console errors in production

### Documentation Complete:
- [ ] CLAUDE.md updated
- [ ] Admin setup guide created
- [ ] Admin user guide created
- [ ] Progress checklist updated

### Deployment Complete:
- [ ] Production build successful
- [ ] All env vars configured in Vercel
- [ ] Deployed to production
- [ ] Production admin access granted
- [ ] Sentry monitoring active
- [ ] No critical errors in first 24 hours

---

## Success Criteria

**All 5 phases complete:** Database → User Experience → Admin Dashboard → Analytics/Monitoring → Polish/Testing

**System functional:** Users submit certs → Admin reviews → Verification badges update → Contractors can post after license verification

**Production ready:** Deployed, monitored, documented, tested

**Ready for:** Beta users, real certification reviews, platform growth

---

## Post-Phase 5: Next Steps

1. Monitor certification volume
2. Gather admin feedback on verification workflow
3. Track average verification turnaround time
4. Consider OCR integration if volume > 100/month
5. Expand verification database links
6. Add email notifications for verification status changes
7. Build analytics for verification approval rates
8. Implement user-facing notification system (in-app)

**Congratulations! Admin Dashboard & Certification Verification System Complete.**
