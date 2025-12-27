# Phase 2: User-Facing Verification Experience - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build user-facing verification badge displays, contractor license upload requirement in onboarding, and job posting restrictions.

**Duration:** Days 2-3 (~12-16 hours)

**Architecture:** Reusable VerificationBadge component, update profile/certification displays, modify onboarding flow for contractor license requirement, restrict job posting for unverified contractors.

**Tech Stack:** Next.js 15, React, TypeScript, TailwindCSS, Supabase

**Prerequisites:** Phase 1 complete (database schema, middleware, admin access set up)

---

## Task 2.1: Create Verification Badge Component

**Files:**
- Create: `components/common/verification-badge.tsx`
- Modify: `components/common/index.ts`

**Step 1: Create VerificationBadge component**

Create `components/common/verification-badge.tsx`:

```typescript
'use client';

import React from 'react';

export type VerificationStatus = 'pending' | 'verified' | 'rejected';

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

In `components/common/index.ts`, add export:

```typescript
export { VerificationBadge } from './verification-badge';
export type { VerificationStatus } from './verification-badge';
```

**Step 3: Test badge rendering**

Run: `npm run dev`

Create temporary test in any page to verify colors and sizes work correctly.

**Step 4: Commit badge component**

```bash
git add components/common/verification-badge.tsx components/common/index.ts
git commit -m "feat(components): add VerificationBadge component

- Three status states: pending, verified, rejected
- Color-coded with icons (yellow, green, red)
- Three sizes: sm, md, lg
- Reusable across all certification displays
- Exported type for TypeScript safety"
```

---

## Task 2.2: Display Verification Badges on Profile Page

**Files:**
- Modify: `app/dashboard/profile/page.tsx`

**Step 1: Read current profile page**

Read: `app/dashboard/profile/page.tsx` (full file)

**Step 2: Import VerificationBadge**

Add to imports at top of file:

```typescript
import { VerificationBadge } from '@/components/common';
```

**Step 3: Add badge to certification display**

Find where certifications are rendered (likely in a `.map()` function). Update to include badge:

```typescript
{certifications.map((cert) => (
  <div key={cert.id} className="border rounded-lg p-4">
    {/* Certification header with verification badge */}
    <div className="flex items-start justify-between mb-2">
      <div className="flex-1">
        <h3 className="font-semibold text-lg">{cert.certification_type}</h3>
        <p className="text-sm text-gray-600">
          {cert.certification_number} • Issued by {cert.issued_by}
        </p>
      </div>
      <VerificationBadge
        status={cert.verification_status as 'pending' | 'verified' | 'rejected'}
        size="sm"
      />
    </div>

    {/* Show rejection reason if rejected */}
    {cert.verification_status === 'rejected' && cert.rejection_reason && (
      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm font-medium text-red-900 mb-1">
          Rejection Reason:
        </p>
        <p className="text-sm text-red-800">
          {cert.rejection_reason}
        </p>
        <button
          onClick={() => {
            // TODO: Implement re-upload functionality
            router.push('/dashboard/profile/certifications/new');
          }}
          className="mt-2 text-sm text-red-700 underline hover:text-red-900"
        >
          Upload Corrected Certification
        </button>
      </div>
    )}

    {/* Existing certification details... */}
  </div>
))}
```

**Step 4: Test profile page**

Run: `npm run dev`

1. Navigate to `/dashboard/profile`
2. Verify certifications show badges
3. If you have pending certs → yellow badge
4. Test with rejected cert → shows rejection reason

**Step 5: Commit profile page update**

```bash
git add app/dashboard/profile/page.tsx
git commit -m "feat(profile): display verification badges on certifications

- Show VerificationBadge on each certification
- Display rejection reason for rejected certifications
- Add re-upload link for rejected certs
- Color-coded status at a glance"
```

---

## Task 2.3: Update Certification Form Success Message

**Files:**
- Modify: `features/profiles/components/certification-form.tsx`

**Step 1: Read certification form**

Read: `features/profiles/components/certification-form.tsx` (lines around the success toast)

**Step 2: Update success message**

Find the success toast after form submission and update the message:

```typescript
// Find this line (around line 140-145):
toast.success(`${credentialLabel} added successfully!`);

// Replace with:
toast.success(
  `${credentialLabel} submitted for verification! You'll be notified when it's reviewed (usually within 24-48 hours).`
);
```

**Step 3: Add info text above submit button**

Add informational text before the submit button:

```typescript
{/* Add before submit button section */}
<div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
  <p className="text-sm text-blue-800">
    <strong>📋 Verification Process:</strong> All certifications are reviewed by our team
    within 24-48 hours. You'll receive an email notification once your certification is verified.
  </p>
</div>

{/* Existing submit buttons */}
```

**Step 4: Test form submission**

Run: `npm run dev`

1. Add a certification
2. Verify success message mentions verification
3. Check database: `verification_status` should be 'pending'

**Step 5: Commit form update**

```bash
git add features/profiles/components/certification-form.tsx
git commit -m "feat(certification-form): improve verification messaging

- Update success message to mention verification review
- Add verification process info box above submit
- Set user expectations for 24-48 hour turnaround
- Clarify that email notification will be sent"
```

---

## Task 2.4: Add Contractor License Upload to Onboarding

**Files:**
- Modify: `features/onboarding/components/onboarding-form.tsx`
- Modify: `features/onboarding/actions/onboarding-actions.ts`

**Step 1: Read onboarding form**

Read: `features/onboarding/components/onboarding-form.tsx` (full file, ~540 lines)

**Step 2: Add license state variables**

Add state for license upload in the component (after existing state declarations):

```typescript
// Add after existing useState declarations
const [licenseFile, setLicenseFile] = useState<File | null>(null);
const [licensePreview, setLicensePreview] = useState<string | null>(null);
const [isUploadingLicense, setIsUploadingLicense] = useState(false);
const [licenseData, setLicenseData] = useState({
  license_type: '',
  license_number: '',
  issuing_state: '',
  expires_at: '',
});
```

**Step 3: Add license upload UI for contractors**

In Step 3 (after employer type selection), add conditional license section:

```typescript
{/* Add after employer type select, inside Step 3 */}
{formData.employer_type === 'contractor' && (
  <div className="mt-6 p-4 border-2 border-blue-300 bg-blue-50 rounded-lg">
    <h3 className="font-semibold text-blue-900 mb-1">
      🔒 Contractor License Required
    </h3>
    <p className="text-sm text-blue-800 mb-4">
      To ensure platform trust and safety, you must upload your contractor license.
      You won't be able to post jobs until your license is verified (usually within 24-48 hours).
    </p>

    <div className="space-y-4 bg-white p-4 rounded-lg">
      <Input
        label="License Type"
        type="text"
        placeholder="e.g., General Contractor License"
        value={licenseData.license_type}
        onChange={(e) =>
          setLicenseData({ ...licenseData, license_type: e.target.value })
        }
        required
        helperText="Your contractor license classification"
      />

      <Input
        label="License Number"
        type="text"
        placeholder="e.g., 123456"
        value={licenseData.license_number}
        onChange={(e) =>
          setLicenseData({ ...licenseData, license_number: e.target.value })
        }
        required
        helperText="Your state-issued license number"
      />

      <Input
        label="Issuing State/Authority"
        type="text"
        placeholder="e.g., California"
        value={licenseData.issuing_state}
        onChange={(e) =>
          setLicenseData({ ...licenseData, issuing_state: e.target.value })
        }
        required
        helperText="State that issued your license"
      />

      <Input
        label="Expiration Date"
        type="date"
        value={licenseData.expires_at}
        onChange={(e) =>
          setLicenseData({ ...licenseData, expires_at: e.target.value })
        }
        required
        helperText="When your license expires"
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          License Photo <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-gray-600 mb-3">
          Upload a clear photo of your contractor license (JPEG, PNG, WebP, or PDF - Max 5MB)
        </p>

        {!licensePreview ? (
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <svg
                className="w-8 h-8 mb-2 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="mb-1 text-sm text-gray-500">
                <span className="font-semibold">Click to upload</span> or drag and drop
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
          <div className="space-y-3">
            {licenseFile?.type === 'application/pdf' ? (
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <svg className="w-10 h-10 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{licenseFile.name}</p>
                  <p className="text-xs text-gray-500">
                    {(licenseFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            ) : (
              <img
                src={licensePreview}
                alt="License preview"
                className="w-full max-h-64 object-contain rounded-lg border border-gray-200"
              />
            )}
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
)}
```

**Step 4: Update submit button condition**

Update the submit button's disabled condition to require license fields for contractors:

```typescript
<Button
  onClick={handleSubmit}
  disabled={
    isLoading ||
    (formData.role === 'worker'
      ? !formData.trade
      : !formData.employer_type ||
        !formData.company_name ||
        !formData.trade ||
        (formData.employer_type === 'contractor' &&
          (!licenseData.license_type ||
            !licenseData.license_number ||
            !licenseData.issuing_state ||
            !licenseData.expires_at ||
            !licenseFile)))
  }
  isLoading={isLoading}
  className="flex-1"
>
  Complete Setup
</Button>
```

**Step 5: Update handleSubmit to upload license**

Modify the submit handler to upload contractor license:

```typescript
async function handleSubmit() {
  setError('');
  setIsLoading(true);

  try {
    // If contractor, upload license first
    let licensePhotoUrl = null;
    if (formData.employer_type === 'contractor' && licenseFile) {
      setIsUploadingLicense(true);

      // Use existing uploadCertificationPhoto action
      const uploadResult = await uploadCertificationPhoto(licenseFile);
      setIsUploadingLicense(false);

      if (!uploadResult.success) {
        const errorMsg = uploadResult.error || 'Failed to upload license photo';
        setError(errorMsg);
        setIsLoading(false);
        return;
      }

      licensePhotoUrl = uploadResult.data.url;
    }

    // Complete onboarding with license data
    const result = await completeOnboarding({
      ...formData,
      licenseData:
        formData.employer_type === 'contractor' && licensePhotoUrl
          ? {
              ...licenseData,
              photo_url: licensePhotoUrl,
            }
          : undefined,
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

**Step 6: Update onboarding action to save license**

Modify `features/onboarding/actions/onboarding-actions.ts`:

```typescript
import { addCertification } from '@/features/profiles/actions/certification-actions';

export type OnboardingData = {
  // ... existing fields ...
  licenseData?: {
    license_type: string;
    license_number: string;
    issuing_state: string;
    expires_at: string;
    photo_url: string;
  };
};

export async function completeOnboarding(data: OnboardingData) {
  // ... existing profile update code ...

  // If contractor, create license certification and set can_post_jobs to false
  if (data.employer_type === 'contractor' && data.licenseData) {
    // Save license as certification
    await addCertification({
      credential_category: 'license',
      certification_type: data.licenseData.license_type,
      certification_number: data.licenseData.license_number,
      issued_by: data.licenseData.issuing_state,
      expires_at: data.licenseData.expires_at,
      photo_url: data.licenseData.photo_url,
    });

    // Set can_post_jobs to false until license verified
    await supabase
      .from('profiles')
      .update({ can_post_jobs: false })
      .eq('user_id', user.id);
  }

  return { success: true };
}
```

**Step 7: Test contractor onboarding**

Run: `npm run dev`

1. Sign up as new user
2. Select "Employer" → "Contractor"
3. Verify license section appears and is required
4. Fill out all license fields and upload photo
5. Complete onboarding
6. Check database:
   - License saved in certifications table with `credential_category = 'license'` and `verification_status = 'pending'`
   - Profile has `can_post_jobs = false`

**Step 8: Commit onboarding changes**

```bash
git add features/onboarding/components/onboarding-form.tsx features/onboarding/actions/onboarding-actions.ts
git commit -m "feat(onboarding): require contractor license upload

- Add license upload section for contractors in Step 3
- Fields: type, number, issuing state, expiration, photo
- License photo required before completing onboarding
- Save license as certification with category='license'
- Set can_post_jobs=false for contractors until verified
- Recruiters and developers skip license requirement
- Upload validation: max 5MB, image or PDF only"
```

---

## Task 2.5: Add Job Posting Restriction Banner

**Files:**
- Create: `components/common/contractor-verification-banner.tsx`
- Modify: `app/dashboard/jobs/new/page.tsx`

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
            <span className="text-4xl">⏳</span>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-yellow-900 mb-3">
              Contractor License Pending Verification
            </h3>
            <div className="space-y-2 text-sm text-yellow-800">
              <p>
                <strong>Your contractor license is currently being reviewed by our team.</strong>
              </p>
              <p>
                You'll be able to post jobs once your license is verified, which usually takes
                <strong> 24-48 hours</strong>.
              </p>
              <p>
                We'll send you an email notification as soon as verification is complete.
                Thank you for your patience!
              </p>
            </div>

            <div className="mt-4 pt-4 border-t border-yellow-300">
              <p className="text-xs text-yellow-700">
                <strong>Need help?</strong> Contact support if you haven't heard back within 48 hours.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Export from common index**

In `components/common/index.ts`:

```typescript
export { ContractorVerificationBanner } from './contractor-verification-banner';
```

**Step 3: Update job posting page**

Read: `app/dashboard/jobs/new/page.tsx` (full file)

Then modify to check `can_post_jobs` flag:

```typescript
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { ContractorVerificationBanner } from '@/components/common';

export default async function NewJobPage() {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
  if (
    profile?.role === 'employer' &&
    profile?.employer_type === 'contractor' &&
    !profile?.can_post_jobs
  ) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Post a Job</h1>
          <p className="text-gray-600 mt-2">
            Complete your contractor license verification to start posting jobs
          </p>
        </div>

        <ContractorVerificationBanner />

        {/* Optional: Show their pending license */}
        <Card>
          <CardHeader>
            <CardTitle>Your License Status</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              You can view your pending license verification in your{' '}
              <a href="/dashboard/profile" className="text-blue-600 underline">
                profile
              </a>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Rest of job posting form for verified contractors/recruiters/developers...
  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* ... existing job form ... */}
    </div>
  );
}
```

**Step 4: Test job posting restriction**

Run: `npm run dev`

1. Log in as contractor with unverified license (`can_post_jobs = false`)
2. Navigate to `/dashboard/jobs/new`
3. Verify banner is shown instead of job form
4. Cannot access job posting
5. Log in as verified contractor or recruiter
6. Verify can access job posting form

**Step 5: Commit job posting restriction**

```bash
git add components/common/contractor-verification-banner.tsx components/common/index.ts app/dashboard/jobs/new/page.tsx
git commit -m "feat(jobs): restrict job posting for unverified contractors

- Check can_post_jobs flag on job posting page
- Show ContractorVerificationBanner for unverified contractors
- Block job form until license verified
- Display expected 24-48 hour verification timeline
- Provide link to view license status in profile
- Recruiters and developers can post immediately"
```

---

## Phase 2 Verification Checklist

Before proceeding to Phase 3, verify all tasks complete:

- [ ] VerificationBadge component created with 3 states
- [ ] Badge exported from common index with TypeScript types
- [ ] Badges display on profile page certifications
- [ ] Rejection reason shown for rejected certs
- [ ] Re-upload link available for rejected certs
- [ ] Certification form success message updated
- [ ] Verification info box added to certification form
- [ ] Contractor onboarding shows license upload section
- [ ] License fields are required for contractors
- [ ] License photo upload works (validates type/size)
- [ ] Recruiter/developer onboarding skips license
- [ ] License saved as certification with category='license'
- [ ] Contractors get can_post_jobs=false after onboarding
- [ ] ContractorVerificationBanner component created
- [ ] Job posting page checks can_post_jobs flag
- [ ] Unverified contractors see banner instead of form
- [ ] Verified users can access job posting form
- [ ] All commits pushed to git
- [ ] TypeScript builds without errors

---

## Success Criteria

**User Experience:** Workers and contractors see verification badges, understand status at a glance
**Contractor Flow:** Must upload license during onboarding, blocked from posting until verified
**Job Posting:** Contractors see friendly banner explaining verification requirement
**Visual Feedback:** Color-coded badges (yellow pending, green verified, red rejected)
**Error Handling:** Rejection reasons displayed, re-upload options available

**Ready for Phase 3:** Admin dashboard can now be built to review and verify these certifications.
