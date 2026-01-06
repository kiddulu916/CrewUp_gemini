# Job Posting Restrictions Redesign

**Date:** 2026-01-01
**Status:** Approved
**Author:** Design Session

## Overview

Modify job posting authorization to restrict posting to only contractors, developers, and homeowners (blocking recruiters), while removing the contractor license verification requirement as a blocking gate.

## Current State

### Authorization Flow

1. **Authentication Check** - User must be logged in
2. **Role Check** - User must have `role: 'employer'`
3. **Contractor Verification Gate** - Contractors blocked if `can_post_jobs: false`
4. **Pro Subscription Gate** - Custom questions require `subscription_status: 'pro'`
5. **Form Validation** - Required fields must be filled

### Current Restrictions

| Restriction | Implementation | Blocks |
|------------|----------------|--------|
| Authentication | Page-level redirect | All unauthenticated users |
| Employer role only | Server action check | All worker accounts |
| Contractor verification | UI banner + backend | Unverified contractors |
| Pro for custom questions | Server action + UI gate | Free users from custom questions |
| Form validation | Client-side + server | Invalid submissions |

### Files Involved

- `/features/jobs/actions/job-actions.ts` - Server action with auth checks (lines 65-74)
- `/app/dashboard/jobs/new/page.tsx` - Page with contractor verification gate (lines 38-70)
- `/features/jobs/components/custom-questions-builder.tsx` - Pro subscription gate for custom questions

## Target State

### New Authorization Requirements

Only these employer types can post jobs:
- ✅ Contractors (verified OR unverified)
- ✅ Developers
- ✅ Homeowners
- ❌ Recruiters (blocked)
- ❌ Workers (blocked)

### What Changes

| Component | Change |
|-----------|--------|
| Server action auth | Add `employer_type` check to allow only contractor/developer/homeowner |
| Contractor gate | Remove blocking check for `can_post_jobs` flag |
| License verification system | Keep intact (admin UI, database fields) but don't enforce |

### What Stays the Same

- ✅ Authentication requirement (must be logged in)
- ✅ Employer role requirement (workers still blocked)
- ✅ Pro subscription for custom questions
- ✅ Form validation (all required fields)
- ✅ License verification admin functionality (just not enforced)

## Implementation Details

### Change 1: Update Server Action Authorization

**File:** `/features/jobs/actions/job-actions.ts`
**Lines:** 65-74

**Current Code:**
```typescript
const { data: profile } = await supabase
  .from('users')
  .select('role, subscription_status')
  .eq('id', user.id)
  .single();

if (profile?.role !== 'employer') {
  return { success: false, error: 'Only employers can post jobs' };
}
```

**New Code:**
```typescript
const { data: profile } = await supabase
  .from('users')
  .select('role, subscription_status, employer_type')  // Add employer_type
  .eq('id', user.id)
  .single();

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

**Rationale:**
- Adds explicit employer type filtering
- Null-safe check for `employer_type` field
- Clear error message for blocked employer types

### Change 2: Remove Contractor Verification Blocking UI

**File:** `/app/dashboard/jobs/new/page.tsx`
**Lines:** 38-70

**Action:** Remove the entire conditional block that shows `ContractorVerificationBanner`

**Current Code (to be removed):**
```typescript
if (
  profile?.role === 'employer' &&
  profile?.employer_type === 'contractor' &&
  !profile?.can_post_jobs
) {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <ContractorVerificationBanner />
    </div>
  );
}
```

**New Code:**
Simply remove this block - let contractors access the form regardless of `can_post_jobs` status.

**Rationale:**
- License verification no longer blocks posting
- Contractors can post while verification is pending
- Verification system stays active for trust/badges later

## Edge Cases & Validation

### Edge Case 1: Recruiter Attempts to Post
**Scenario:** User with `employer_type: 'recruiter'` tries to post a job
**Result:** Server action returns error: "Only contractors, developers, and homeowners can post jobs"
**Expected:** ✅ Blocked correctly

### Edge Case 2: Null/Undefined employer_type
**Scenario:** Profile has no `employer_type` set (data inconsistency)
**Result:** Blocked by null-safe check in server action
**Expected:** ✅ Fails safely

### Edge Case 3: Unverified Contractor
**Scenario:** Contractor with `can_post_jobs: false` posts a job
**Result:** Job created successfully
**Expected:** ✅ Allowed (as designed)

### Edge Case 4: Worker Account
**Scenario:** User with `role: 'worker'` tries to post
**Result:** Blocked at step 1 (role check)
**Expected:** ✅ Blocked correctly

## Testing Checklist

### Authorization Tests

- [ ] Contractor (verified) can post jobs
- [ ] Contractor (unverified) can post jobs
- [ ] Developer can post jobs
- [ ] Homeowner can post jobs
- [ ] Recruiter receives error when posting
- [ ] Worker receives error when posting
- [ ] Unauthenticated user redirected to login

### Unchanged Functionality

- [ ] Custom questions still require Pro subscription
- [ ] Form validation still enforces required fields
- [ ] Free users can post basic jobs (without custom questions)
- [ ] Admin can still verify contractor licenses (system intact)

### E2E Test Updates Required

**File:** `e2e/jobs.spec.ts`

Update test fixtures to include:
- Test accounts for developer and homeowner employer types
- Test case verifying recruiter cannot post
- Test case verifying unverified contractor can post

## Migration & Rollback

### Migration

**Database Changes:** None required (using existing `employer_type` column)

**Deployment Steps:**
1. Deploy code changes
2. No database migrations needed
3. Changes take effect immediately

**Impact:**
- Existing recruiters who could post will be blocked
- Unverified contractors who were blocked can now post
- No impact on existing job listings

### Rollback Plan

**If issues arise:**
1. Revert changes in `/features/jobs/actions/job-actions.ts` (remove employer_type check)
2. Restore contractor verification banner in `/app/dashboard/jobs/new/page.tsx`
3. Estimated rollback time: <5 minutes

**Rollback commit message:** "Revert: job posting restrictions redesign"

## Code Changes Summary

### Files Modified

1. ✏️ `/features/jobs/actions/job-actions.ts` (~8 lines changed)
   - Add `employer_type` to profile query
   - Add employer type validation logic

2. ✏️ `/app/dashboard/jobs/new/page.tsx` (~40 lines removed)
   - Remove contractor verification blocking UI

### Lines of Code
- **Added:** ~10 lines
- **Removed:** ~40 lines
- **Net change:** -30 lines

## Benefits

1. **Clearer Intent** - Explicitly defines who can post (no implicit assumptions)
2. **Reduced Friction** - Contractors can post while license verification is pending
3. **Maintained Controls** - Auth, validation, and Pro gates still enforced
4. **Future Ready** - License verification system intact for trust badges/ranking
5. **Recruiter Control** - Explicitly blocks recruiter job posting (if desired)

## Risks

### Low Risk
- **Recruiter Impact** - Existing recruiters will be blocked from posting
  - Mitigation: Check production data - are there any recruiter accounts posting jobs?
  - If yes: communicate change before deployment

### No Risk
- **Database compatibility** - Using existing columns
- **Existing jobs** - No impact on already-posted jobs
- **User data** - No data migration required

## Future Considerations

### License Verification Badge
- `can_post_jobs: true` could display "Verified Contractor" badge
- Provides trust signal without being a hard requirement
- Can be added later without code changes

### Analytics Tracking
- Track posting attempts by employer type
- Monitor if blocked recruiters try to post frequently
- Helps validate if restriction is working as intended

## Conclusion

This redesign simplifies the job posting authorization flow by:
- Adding explicit employer type filtering
- Removing contractor verification as a blocking requirement
- Keeping all other protections intact (auth, validation, Pro gates)

The changes are minimal (2 files, ~10 lines net change), backward compatible, and easily reversible if needed.
