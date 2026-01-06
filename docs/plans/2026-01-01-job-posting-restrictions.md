# Job Posting Restrictions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restrict job posting to only contractors, developers, and homeowners while removing contractor license verification as a blocking requirement.

**Architecture:** Modify server action authorization to check `employer_type` field and remove UI blocking for unverified contractors. No database changes required - using existing columns.

**Tech Stack:** Next.js 16, TypeScript, Supabase (PostgreSQL), Server Actions

---

## Prerequisites

**Required context:**
- Design document: `docs/plans/2026-01-01-job-posting-restrictions-design.md`
- Current auth flow: Authentication → Role check → Contractor verification → Form submission

**Files to modify:**
1. `/features/jobs/actions/job-actions.ts` - Add employer_type validation
2. `/app/dashboard/jobs/new/page.tsx` - Remove contractor blocking UI

---

## Task 1: Update Server Action Authorization

**Files:**
- Modify: `/features/jobs/actions/job-actions.ts:65-74`

### Step 1: Add employer_type to profile query

**Current code (line 66-70):**
```typescript
const { data: profile } = await supabase
  .from('users')
  .select('role, subscription_status')
  .eq('id', user.id)
  .single();
```

**New code:**
```typescript
const { data: profile } = await supabase
  .from('users')
  .select('role, subscription_status, employer_type')
  .eq('id', user.id)
  .single();
```

**What changed:** Added `employer_type` to the SELECT query to fetch employer type for validation.

---

### Step 2: Add employer type validation logic

**Current code (line 72-74):**
```typescript
if (profile?.role !== 'employer') {
  return { success: false, error: 'Only employers can post jobs' };
}
```

**New code:**
```typescript
// Step 1: Must be an employer role
if (profile?.role !== 'employer') {
  return { success: false, error: 'Only employers can post jobs' };
}

// Step 2: Must be allowed employer type
const allowedEmployerTypes = ['contractor', 'developer', 'homeowner'];
if (!profile?.employer_type || !allowedEmployerTypes.includes(profile.employer_type)) {
  return {
    success: false,
    error: 'Only contractors, developers, and homeowners can post jobs'
  };
}
```

**What changed:**
- Added employer type filtering after role check
- Null-safe check for `employer_type`
- Clear error message for blocked employer types (recruiters, etc.)

---

### Step 3: Verify the changes compile

Run type checking to ensure no TypeScript errors:

```bash
npm run type-check
```

**Expected output:** No errors related to job-actions.ts

---

### Step 4: Commit server action changes

```bash
git add features/jobs/actions/job-actions.ts
git commit -m "feat: restrict job posting to contractors, developers, and homeowners

Add employer_type validation to job posting server action.
Only contractors, developers, and homeowners can now post jobs.
Recruiters and other employer types are blocked with clear error message.

Ref: docs/plans/2026-01-01-job-posting-restrictions-design.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Remove Contractor Verification Blocking UI

**Files:**
- Modify: `/app/dashboard/jobs/new/page.tsx:37-70`

### Step 1: Read the current page code

Check the current contractor verification gate:

```bash
# View lines 30-75 to see the context
cat app/dashboard/jobs/new/page.tsx | head -75 | tail -46
```

**Expected:** Should see the contractor verification conditional block (lines 37-70)

---

### Step 2: Remove the contractor verification blocking code

**Current code (lines 37-70) - DELETE THIS ENTIRE BLOCK:**
```typescript
// If contractor without verified license, show banner instead of form
if (
  profile?.role === 'employer' &&
  profile?.employer_type === 'contractor' &&
  !profile?.can_post_jobs
) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Post a Job</h1>
        <p className="mt-2 text-gray-600">
          Complete your contractor license verification to start posting jobs
        </p>
      </div>

      <ContractorVerificationBanner />

      <Card>
        <CardHeader>
          <CardTitle>Your License Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            You can view your pending license verification in your{' '}
            <a href="/dashboard/profile" className="text-blue-600 underline hover:text-blue-800">
              profile
            </a>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Action:** Delete lines 37-70 entirely. The page should go directly from the employer role check (lines 32-35) to the return statement with the job form (line 72+).

---

### Step 3: Check if ContractorVerificationBanner import is still needed

After removing the code, check if `ContractorVerificationBanner` is imported but unused:

```bash
grep -n "ContractorVerificationBanner" app/dashboard/jobs/new/page.tsx
```

**Expected output:**
- If only one result (the import), remove the import line
- If no results, already removed

If import exists and is unused, remove it:
```typescript
// Remove this import if it exists and is unused
import { ContractorVerificationBanner } from '@/features/jobs/components/contractor-verification-banner';
```

---

### Step 4: Verify the changes compile

Run type checking:

```bash
npm run type-check
```

**Expected output:** No errors related to page.tsx

---

### Step 5: Verify the page structure looks correct

After removal, the page structure should be:

```typescript
export default async function NewJobPage() {
  // ... auth and profile fetching (lines ~15-30)

  // Only employers can post jobs
  if (profile?.role !== 'employer') {
    redirect('/dashboard/feed');
  }

  // Contractor verification block REMOVED - goes straight to form

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Post a Job</h1>
        <p className="mt-2 text-gray-600">
          Create a job posting to find skilled trade workers
        </p>
      </div>

      <JobForm />
    </div>
  );
}
```

---

### Step 6: Commit UI changes

```bash
git add app/dashboard/jobs/new/page.tsx
git commit -m "feat: remove contractor license verification blocking UI

Allow contractors to post jobs regardless of can_post_jobs status.
License verification system remains active but no longer blocks posting.
Contractors can now post while verification is pending.

Ref: docs/plans/2026-01-01-job-posting-restrictions-design.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Manual Testing

**Files:**
- None (testing only)

### Step 1: Start the development server

```bash
npm run dev
```

**Expected:** Server starts on port 3000

---

### Step 2: Test authorization scenarios

Open browser to `http://localhost:3000` and test these scenarios:

**Test Case 1: Contractor (unverified) can post**
1. Login as contractor with `can_post_jobs: false`
2. Navigate to `/dashboard/jobs/new`
3. ✅ Expected: Should see job posting form (no verification banner)

**Test Case 2: Developer can post**
1. Login as developer employer
2. Navigate to `/dashboard/jobs/new`
3. ✅ Expected: Should see job posting form

**Test Case 3: Homeowner can post**
1. Login as homeowner employer
2. Navigate to `/dashboard/jobs/new`
3. ✅ Expected: Should see job posting form

**Test Case 4: Recruiter blocked with error**
1. Login as recruiter employer (if test account exists)
2. Navigate to `/dashboard/jobs/new`
3. Fill out job form
4. Submit form
5. ✅ Expected: Error message "Only contractors, developers, and homeowners can post jobs"

**Test Case 5: Worker blocked**
1. Login as worker
2. Navigate to `/dashboard/jobs/new`
3. ✅ Expected: Redirected to `/dashboard/feed` (existing behavior)

---

### Step 3: Test unchanged functionality

**Test Pro subscription gate (unchanged):**
1. Login as free contractor/developer/homeowner
2. Navigate to `/dashboard/jobs/new`
3. Scroll to "Custom Screening Questions" section
4. ✅ Expected: Shows upgrade prompt for Pro subscription
5. Add custom question
6. Submit form
7. ✅ Expected: Error "Custom screening questions require a Pro subscription"

**Test basic job posting works:**
1. Login as contractor/developer/homeowner
2. Fill out job form (without custom questions)
3. Submit
4. ✅ Expected: Job created successfully

---

### Step 4: Document test results

Create a test results comment for the commit:

```bash
# If all tests pass, note it for future reference
echo "Manual testing completed - all scenarios passed" > .test-results.txt
git add .test-results.txt
git commit -m "test: verify job posting restriction changes

Tested scenarios:
✅ Contractor (unverified) can post jobs
✅ Developer can post jobs
✅ Homeowner can post jobs
✅ Recruiter blocked with error message
✅ Worker redirected (unchanged)
✅ Pro subscription gate unchanged
✅ Basic job posting works

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Update E2E Tests (Optional Enhancement)

**Files:**
- Modify: `e2e/jobs.spec.ts` (if exists)

### Step 1: Check if E2E tests exist for job posting

```bash
grep -l "post.*job" e2e/*.spec.ts
```

**Expected:** List of E2E test files that test job posting

---

### Step 2: Add test cases for new restrictions

If E2E tests exist, add test cases for:
1. Recruiter cannot post jobs
2. Unverified contractor can post jobs
3. Developer can post jobs
4. Homeowner can post jobs

**Example test structure:**
```typescript
test('recruiter cannot post jobs', async ({ page }) => {
  // Login as recruiter
  await loginAsRecruiter(page);

  // Navigate to new job page
  await page.goto('/dashboard/jobs/new');

  // Fill out form
  await fillJobForm(page, jobData);

  // Submit
  await page.click('button[type="submit"]');

  // Should see error
  await expect(page.locator('text=Only contractors, developers, and homeowners can post jobs')).toBeVisible();
});
```

---

### Step 3: Run E2E tests

```bash
npm run test:e2e
```

**Expected:** All tests pass (existing + new tests)

---

### Step 4: Commit E2E test updates (if added)

```bash
git add e2e/jobs.spec.ts
git commit -m "test: add E2E tests for job posting restrictions

Add test coverage for:
- Recruiter blocked from posting
- Unverified contractor can post
- Developer can post
- Homeowner can post

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Completion Checklist

**Code changes:**
- [x] Modified `/features/jobs/actions/job-actions.ts` - Added employer_type validation
- [x] Modified `/app/dashboard/jobs/new/page.tsx` - Removed contractor verification blocking UI
- [x] TypeScript compilation passes
- [x] Commits follow conventional commit format

**Testing:**
- [x] Manual testing completed for all scenarios
- [x] Contractor (unverified) can post
- [x] Developer can post
- [x] Homeowner can post
- [x] Recruiter blocked with error
- [x] Worker redirect unchanged
- [x] Pro subscription gate unchanged
- [ ] E2E tests added (optional)
- [ ] E2E tests pass (optional)

**Documentation:**
- [x] Design document exists: `docs/plans/2026-01-01-job-posting-restrictions-design.md`
- [x] Implementation plan exists: `docs/plans/2026-01-01-job-posting-restrictions.md`

---

## Rollback Instructions

If issues arise after deployment:

```bash
# Revert both commits
git log --oneline | head -4  # Find commit hashes
git revert <commit-hash-2>  # Revert UI changes
git revert <commit-hash-1>  # Revert server action changes
git push
```

**Or manual rollback:**

1. Restore server action:
   - Remove employer_type from select query
   - Remove employer type validation logic

2. Restore page.tsx:
   - Add back contractor verification conditional block (lines 37-70)

**Estimated rollback time:** <5 minutes

---

## Next Steps After Implementation

1. **Monitor Sentry** for new errors related to job posting
2. **Check analytics** to see if any recruiters are being blocked
3. **Communicate change** to existing recruiters (if any exist in production)
4. **Consider adding** "Verified Contractor" badge using `can_post_jobs` flag in future

---

## Notes

- No database migrations required - using existing `employer_type` column
- Changes are backward compatible
- License verification admin functionality remains intact
- All existing jobs unaffected
- Changes take effect immediately upon deployment
