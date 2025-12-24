# Comprehensive Job Applications Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an 8-step job application wizard with resume uploads, auto-population, auto-save drafts, and Pro-gated employer review features.

**Architecture:** Multi-step form wizard with React Hook Form, Supabase Storage for file uploads, server actions for resume parsing, and real-time subscriptions for notifications. Pro features use subscription status checks from existing profiles table.

**Tech Stack:** Next.js 15, TypeScript, React Hook Form, Zod validation, Supabase (PostgreSQL + Storage), pdf-parse, mammoth (DOCX parser), TanStack Query

---

## Phase 1: Database Foundation

### Task 1: Create Application Drafts Table

**Files:**
- Create: `crewup/supabase/migrations/018_create_application_drafts.sql`

**Step 1: Write migration for application_drafts table**

```sql
-- Create application_drafts table
CREATE TABLE application_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  form_data JSONB NOT NULL DEFAULT '{}',
  resume_url TEXT,
  cover_letter_url TEXT,
  resume_extracted_text TEXT,
  last_saved_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(job_id, worker_id)
);

-- Create indexes for performance
CREATE INDEX idx_application_drafts_worker ON application_drafts(worker_id);
CREATE INDEX idx_application_drafts_job ON application_drafts(job_id);
CREATE INDEX idx_application_drafts_expires ON application_drafts(expires_at);

-- Enable RLS
ALTER TABLE application_drafts ENABLE ROW LEVEL SECURITY;

-- Workers can only see/manage their own drafts
CREATE POLICY "Workers can view own drafts"
  ON application_drafts FOR SELECT
  USING (auth.uid() = worker_id);

CREATE POLICY "Workers can create own drafts"
  ON application_drafts FOR INSERT
  WITH CHECK (auth.uid() = worker_id);

CREATE POLICY "Workers can update own drafts"
  ON application_drafts FOR UPDATE
  USING (auth.uid() = worker_id);

CREATE POLICY "Workers can delete own drafts"
  ON application_drafts FOR DELETE
  USING (auth.uid() = worker_id);
```

**Step 2: Apply migration**

Run: `cd crewup && npx supabase db reset`
Expected: Migration applies successfully, table created

**Step 3: Verify table exists**

Check Supabase dashboard or run:
```bash
npx supabase db dump --data-only -t application_drafts
```
Expected: Table schema shown

**Step 4: Commit**

```bash
git add supabase/migrations/018_create_application_drafts.sql
git commit -m "feat: create application_drafts table with RLS policies"
```

---

### Task 2: Update Job Applications Table

**Files:**
- Create: `crewup/supabase/migrations/019_update_job_applications.sql`

**Step 1: Write migration to add new columns**

```sql
-- Add new columns to job_applications table
ALTER TABLE job_applications
  ADD COLUMN form_data JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN resume_url TEXT,
  ADD COLUMN cover_letter_url TEXT,
  ADD COLUMN resume_extracted_text TEXT;

-- Migrate existing cover_message to form_data
UPDATE job_applications
SET form_data = jsonb_build_object('coverLetterText', cover_message)
WHERE cover_message IS NOT NULL AND cover_message != '';

-- Add indexes for performance
CREATE INDEX idx_job_applications_job_status ON job_applications(job_id, status);
CREATE INDEX idx_job_applications_worker_created ON job_applications(worker_id, created_at DESC);

-- Add new status value 'withdrawn' to check constraint
ALTER TABLE job_applications DROP CONSTRAINT IF EXISTS job_applications_status_check;
ALTER TABLE job_applications ADD CONSTRAINT job_applications_status_check
  CHECK (status IN ('pending', 'viewed', 'contacted', 'rejected', 'hired', 'withdrawn'));
```

**Step 2: Apply migration**

Run: `cd crewup && npx supabase db reset`
Expected: Migration applies, columns added

**Step 3: Verify columns exist**

Check table schema in Supabase dashboard
Expected: form_data, resume_url, cover_letter_url, resume_extracted_text columns present

**Step 4: Commit**

```bash
git add supabase/migrations/019_update_job_applications.sql
git commit -m "feat: add form_data and file fields to job_applications table"
```

---

### Task 3: Create Notification Preferences Table

**Files:**
- Create: `crewup/supabase/migrations/020_create_notification_preferences.sql`

**Step 1: Write migration for notification_preferences table**

```sql
-- Create notification_preferences table
CREATE TABLE notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  application_status_changes BOOLEAN DEFAULT TRUE,
  new_applications BOOLEAN DEFAULT TRUE,
  email_notifications BOOLEAN DEFAULT TRUE,
  email_digest TEXT DEFAULT 'immediate' CHECK (email_digest IN ('immediate', 'daily', 'weekly', 'never')),
  desktop_notifications BOOLEAN DEFAULT TRUE,
  notification_sound BOOLEAN DEFAULT FALSE,
  push_notifications BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own preferences
CREATE POLICY "Users manage own notification preferences"
  ON notification_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create function to auto-create preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create preferences on profile creation
CREATE TRIGGER on_profile_created_create_notification_preferences
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();
```

**Step 2: Apply migration**

Run: `cd crewup && npx supabase db reset`
Expected: Migration applies, table and trigger created

**Step 3: Test trigger by creating a test profile**

Manually create a profile in Supabase dashboard
Expected: notification_preferences row auto-created

**Step 4: Commit**

```bash
git add supabase/migrations/020_create_notification_preferences.sql
git commit -m "feat: create notification_preferences table with auto-creation trigger"
```

---

### Task 4: Create Supabase Storage Buckets

**Files:**
- Create: `crewup/supabase/migrations/021_create_storage_buckets.sql`

**Step 1: Write migration for storage buckets**

```sql
-- Create application-drafts bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('application-drafts', 'application-drafts', false)
ON CONFLICT (id) DO NOTHING;

-- Create applications bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('applications', 'applications', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for application-drafts bucket
-- Users can upload to their own folder only
CREATE POLICY "Users upload to own draft folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'application-drafts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can view their own draft files
CREATE POLICY "Users view own draft files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'application-drafts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can update their own draft files
CREATE POLICY "Users update own draft files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'application-drafts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own draft files
CREATE POLICY "Users delete own draft files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'application-drafts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage policies for applications bucket
-- System can upload (via service role)
CREATE POLICY "System uploads application files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'applications'
  );

-- Worker or employer can view application files
CREATE POLICY "Worker or employer views application files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'applications'
    AND (
      -- Worker who submitted
      auth.uid() IN (
        SELECT worker_id FROM job_applications
        WHERE id::text = (storage.foldername(name))[1]
      )
      OR
      -- Employer of the job
      auth.uid() IN (
        SELECT j.employer_id FROM job_applications a
        JOIN jobs j ON a.job_id = j.id
        WHERE a.id::text = (storage.foldername(name))[1]
      )
    )
  );
```

**Step 2: Apply migration**

Run: `cd crewup && npx supabase db reset`
Expected: Buckets created with policies

**Step 3: Verify buckets in Supabase dashboard**

Navigate to Storage section
Expected: application-drafts and applications buckets exist

**Step 4: Commit**

```bash
git add supabase/migrations/021_create_storage_buckets.sql
git commit -m "feat: create storage buckets for application drafts and submissions"
```

---

## Phase 2: TypeScript Types and Schemas

### Task 5: Create Application Type Definitions

**Files:**
- Create: `crewup/features/applications/types/application.types.ts`

**Step 1: Write TypeScript interfaces**

```typescript
export interface ApplicationFormData {
  // Step 1: Documents (URLs stored separately)
  coverLetterText?: string;

  // Step 2: Personal Information
  fullName: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };

  // Step 3: Contact & Availability
  phoneNumber: string;
  availableStartDate: string; // ISO date

  // Step 4: Work Authorization
  authorizedToWork: boolean;
  hasDriversLicense: boolean;
  licenseClass?: 'A' | 'B' | 'C';
  hasReliableTransportation: boolean;

  // Step 5: Work History
  workHistory: WorkHistoryEntry[];

  // Step 6: Education
  education: EducationEntry[];

  // Step 7: Skills & Certifications
  yearsOfExperience: number;
  tradeSkills: string[];
  certifications: CertificationEntry[];

  // Step 8: References & Final
  references: ReferenceEntry[];
  whyInterested: string;
  salaryExpectations: string;
  howHeardAboutJob: string;
  emergencyContact: EmergencyContactEntry;
  consents: ConsentEntry;
}

export interface WorkHistoryEntry {
  id: string;
  companyName: string;
  jobTitle: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  responsibilities: string;
  reasonForLeaving?: string;
}

export interface EducationEntry {
  id: string;
  institutionName: string;
  degreeType: string;
  fieldOfStudy: string;
  graduationYear: number;
  isCurrentlyEnrolled: boolean;
}

export interface CertificationEntry {
  id: string;
  name: string;
  issuingOrganization: string;
  expirationDate?: string;
}

export interface ReferenceEntry {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  relationship: string;
}

export interface EmergencyContactEntry {
  name: string;
  relationship: string;
  phone: string;
}

export interface ConsentEntry {
  physicalRequirements: boolean;
  backgroundCheck: boolean;
  drugTest: boolean;
}

export interface ApplicationDraft {
  id: string;
  job_id: string;
  worker_id: string;
  form_data: Partial<ApplicationFormData>;
  resume_url?: string;
  cover_letter_url?: string;
  resume_extracted_text?: string;
  last_saved_at: string;
  expires_at: string;
  created_at: string;
}

export interface JobApplication {
  id: string;
  job_id: string;
  worker_id: string;
  status: 'pending' | 'viewed' | 'contacted' | 'rejected' | 'hired' | 'withdrawn';
  form_data: ApplicationFormData;
  resume_url?: string;
  cover_letter_url?: string;
  resume_extracted_text?: string;
  contact_shared: boolean;
  created_at: string;
}

export interface NotificationPreferences {
  user_id: string;
  application_status_changes: boolean;
  new_applications: boolean;
  email_notifications: boolean;
  email_digest: 'immediate' | 'daily' | 'weekly' | 'never';
  desktop_notifications: boolean;
  notification_sound: boolean;
  push_notifications: boolean;
  created_at: string;
  updated_at: string;
}
```

**Step 2: Commit**

```bash
git add features/applications/types/application.types.ts
git commit -m "feat: add TypeScript types for application system"
```

---

### Task 6: Create Zod Validation Schemas

**Files:**
- Create: `crewup/features/applications/utils/validation.ts`

**Step 1: Write Zod schemas for each step**

```typescript
import { z } from 'zod';

// Step 1: Documents (optional)
export const step1Schema = z.object({
  resumeFile: z.instanceof(File).optional(),
  coverLetterFile: z.instanceof(File).optional(),
  coverLetterText: z.string().optional(),
});

// Step 2: Personal Information
export const step2Schema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  address: z.object({
    street: z.string().min(1, 'Street address is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(2, 'State is required').max(2),
    zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code'),
  }),
});

// Step 3: Contact & Availability
export const step3Schema = z.object({
  phoneNumber: z.string().regex(/^\(\d{3}\) \d{3}-\d{4}$/, 'Phone must be (XXX) XXX-XXXX format'),
  availableStartDate: z.string().min(1, 'Start date is required'),
});

// Step 4: Work Authorization
export const step4Schema = z.object({
  authorizedToWork: z.boolean(),
  hasDriversLicense: z.boolean(),
  licenseClass: z.enum(['A', 'B', 'C']).optional(),
  hasReliableTransportation: z.boolean(),
});

// Step 5: Work History
export const workHistoryEntrySchema = z.object({
  id: z.string(),
  companyName: z.string().min(1, 'Company name is required'),
  jobTitle: z.string().min(1, 'Job title is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  isCurrent: z.boolean(),
  responsibilities: z.string().min(1, 'Responsibilities are required'),
  reasonForLeaving: z.string().optional(),
});

export const step5Schema = z.object({
  workHistory: z.array(workHistoryEntrySchema).min(1, 'At least one work entry required'),
});

// Step 6: Education
export const educationEntrySchema = z.object({
  id: z.string(),
  institutionName: z.string().min(1, 'Institution name is required'),
  degreeType: z.string().min(1, 'Degree type is required'),
  fieldOfStudy: z.string().min(1, 'Field of study is required'),
  graduationYear: z.number().min(1950).max(new Date().getFullYear() + 10),
  isCurrentlyEnrolled: z.boolean(),
});

export const step6Schema = z.object({
  education: z.array(educationEntrySchema).min(1, 'At least one education entry required'),
});

// Step 7: Skills & Certifications
export const certificationEntrySchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Certification name is required'),
  issuingOrganization: z.string().min(1, 'Issuing organization is required'),
  expirationDate: z.string().optional(),
});

export const step7Schema = z.object({
  yearsOfExperience: z.number().min(0).max(50),
  tradeSkills: z.array(z.string()).min(3, 'Select at least 3 skills'),
  certifications: z.array(certificationEntrySchema),
});

// Step 8: References & Final
export const referenceEntrySchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Reference name is required'),
  company: z.string().min(1, 'Company is required'),
  phone: z.string().regex(/^\(\d{3}\) \d{3}-\d{4}$/, 'Phone must be (XXX) XXX-XXXX format'),
  email: z.string().email('Invalid email address'),
  relationship: z.string().min(1, 'Relationship is required'),
});

export const step8Schema = z.object({
  references: z.array(referenceEntrySchema).min(2, 'At least 2 references required'),
  whyInterested: z.string().min(50, 'Please write at least 50 characters'),
  salaryExpectations: z.string().min(1, 'Salary expectations required'),
  howHeardAboutJob: z.string().min(1, 'Please select how you heard about this job'),
  emergencyContact: z.object({
    name: z.string().min(1, 'Emergency contact name required'),
    relationship: z.string().min(1, 'Relationship required'),
    phone: z.string().regex(/^\(\d{3}\) \d{3}-\d{4}$/, 'Phone must be (XXX) XXX-XXXX format'),
  }),
  consents: z.object({
    physicalRequirements: z.literal(true, { errorMap: () => ({ message: 'You must acknowledge physical requirements' }) }),
    backgroundCheck: z.literal(true, { errorMap: () => ({ message: 'You must consent to background check' }) }),
    drugTest: z.literal(true, { errorMap: () => ({ message: 'You must consent to drug test' }) }),
  }),
});

// Combined schema for full form
export const fullApplicationSchema = z.object({
  ...step1Schema.shape,
  ...step2Schema.shape,
  ...step3Schema.shape,
  ...step4Schema.shape,
  ...step5Schema.shape,
  ...step6Schema.shape,
  ...step7Schema.shape,
  ...step8Schema.shape,
});

export type FullApplicationSchema = z.infer<typeof fullApplicationSchema>;
```

**Step 2: Commit**

```bash
git add features/applications/utils/validation.ts
git commit -m "feat: add Zod validation schemas for application wizard"
```

---

## Phase 3: Resume Parser

### Task 7: Create Resume Parser Utilities

**Files:**
- Create: `crewup/lib/resume-parser/pdf-parser.ts`
- Create: `crewup/lib/resume-parser/docx-parser.ts`
- Create: `crewup/lib/resume-parser/text-extractor.ts`

**Step 1: Install dependencies**

Run: `cd crewup && npm install pdf-parse mammoth`
Expected: Packages installed

**Step 2: Write PDF parser**

File: `crewup/lib/resume-parser/pdf-parser.ts`

```typescript
import pdf from 'pdf-parse';

export async function extractTextFromPDF(buffer: ArrayBuffer): Promise<string> {
  try {
    const data = await pdf(Buffer.from(buffer));
    return data.text;
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error('Failed to extract text from PDF');
  }
}
```

**Step 3: Write DOCX parser**

File: `crewup/lib/resume-parser/docx-parser.ts`

```typescript
import mammoth from 'mammoth';

export async function extractTextFromDOCX(buffer: ArrayBuffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
    return result.value;
  } catch (error) {
    console.error('DOCX parsing error:', error);
    throw new Error('Failed to extract text from DOCX');
  }
}
```

**Step 4: Write unified text extractor**

File: `crewup/lib/resume-parser/text-extractor.ts`

```typescript
import { extractTextFromPDF } from './pdf-parser';
import { extractTextFromDOCX } from './docx-parser';

export async function extractTextFromFile(
  file: File
): Promise<string> {
  const buffer = await file.arrayBuffer();

  if (file.type === 'application/pdf') {
    return extractTextFromPDF(buffer);
  } else if (
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return extractTextFromDOCX(buffer);
  } else if (file.type === 'text/plain') {
    const text = new TextDecoder().decode(buffer);
    return text;
  }

  throw new Error('Unsupported file type. Please upload PDF, DOCX, or TXT.');
}

// Simple pattern-based field extraction (non-AI)
export function extractBasicFields(text: string): {
  name?: string;
  email?: string;
  phone?: string;
} {
  // Extract email
  const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
  const email = emailMatch ? emailMatch[0] : undefined;

  // Extract phone (various formats)
  const phoneMatch = text.match(/(\+?\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
  const phone = phoneMatch ? phoneMatch[0] : undefined;

  // Extract name (first 2-3 lines with proper capitalization)
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  const name = lines[0]?.trim();

  return {
    name: name && name.length > 2 && name.length < 100 ? name : undefined,
    email,
    phone,
  };
}
```

**Step 5: Test manually**

Create a test resume PDF and test extraction
Expected: Text extracted successfully

**Step 6: Commit**

```bash
git add lib/resume-parser/
git commit -m "feat: add resume text extraction for PDF, DOCX, and TXT"
```

---

## Phase 4: Draft Management Actions

### Task 8: Create Draft Server Actions

**Files:**
- Create: `crewup/features/applications/actions/draft-actions.ts`

**Step 1: Write draft save action**

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import type { ApplicationFormData, ApplicationDraft } from '../types/application.types';

type SaveDraftResult = {
  success: boolean;
  error?: string;
  draft?: ApplicationDraft;
};

export async function saveDraft(
  jobId: string,
  formData: Partial<ApplicationFormData>,
  resumeUrl?: string,
  coverLetterUrl?: string,
  resumeExtractedText?: string
): Promise<SaveDraftResult> {
  try {
    const supabase = await createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const draftData = {
      job_id: jobId,
      worker_id: user.id,
      form_data: formData,
      resume_url: resumeUrl || null,
      cover_letter_url: coverLetterUrl || null,
      resume_extracted_text: resumeExtractedText || null,
      last_saved_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    };

    const { data, error } = await supabase
      .from('application_drafts')
      .upsert(draftData, { onConflict: 'job_id,worker_id' })
      .select()
      .single();

    if (error) {
      console.error('Error saving draft:', error);
      return { success: false, error: 'Failed to save draft' };
    }

    return { success: true, draft: data };
  } catch (error) {
    console.error('Error in saveDraft:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function loadDraft(jobId: string): Promise<SaveDraftResult> {
  try {
    const supabase = await createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('application_drafts')
      .select('*')
      .eq('job_id', jobId)
      .eq('worker_id', user.id)
      .single();

    if (error) {
      // No draft found is not an error
      if (error.code === 'PGRST116') {
        return { success: true, draft: undefined };
      }
      console.error('Error loading draft:', error);
      return { success: false, error: 'Failed to load draft' };
    }

    // Check if draft expired
    if (new Date(data.expires_at) < new Date()) {
      return { success: true, draft: undefined };
    }

    return { success: true, draft: data };
  } catch (error) {
    console.error('Error in loadDraft:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function deleteDraft(jobId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase
      .from('application_drafts')
      .delete()
      .eq('job_id', jobId)
      .eq('worker_id', user.id);

    if (error) {
      console.error('Error deleting draft:', error);
      return { success: false, error: 'Failed to delete draft' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in deleteDraft:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
```

**Step 2: Commit**

```bash
git add features/applications/actions/draft-actions.ts
git commit -m "feat: add server actions for draft management"
```

---

### Task 9: Create File Upload Actions

**Files:**
- Create: `crewup/features/applications/actions/file-upload-actions.ts`

**Step 1: Write file upload server action**

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { extractTextFromFile } from '@/lib/resume-parser/text-extractor';

type UploadResult = {
  success: boolean;
  error?: string;
  url?: string;
  extractedText?: string;
};

export async function uploadResumeToDraft(
  jobId: string,
  file: File
): Promise<UploadResult> {
  try {
    const supabase = await createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Validate file
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return { success: false, error: 'File size must be under 5MB' };
    }

    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: 'Please upload PDF, DOCX, or TXT files only' };
    }

    // Extract file extension
    const ext = file.name.split('.').pop() || 'pdf';

    // Upload to storage
    const filePath = `${user.id}/${jobId}/resume.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('application-drafts')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return { success: false, error: 'Failed to upload file' };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('application-drafts')
      .getPublicUrl(filePath);

    // Extract text
    let extractedText: string | undefined;
    try {
      extractedText = await extractTextFromFile(file);
    } catch (error) {
      console.error('Text extraction error:', error);
      // Non-fatal - file uploaded successfully
    }

    return {
      success: true,
      url: publicUrl,
      extractedText,
    };
  } catch (error) {
    console.error('Error in uploadResumeToDraft:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function uploadCoverLetterToDraft(
  jobId: string,
  file: File
): Promise<UploadResult> {
  try {
    const supabase = await createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Validate file
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return { success: false, error: 'File size must be under 5MB' };
    }

    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: 'Please upload PDF, DOCX, or TXT files only' };
    }

    // Extract file extension
    const ext = file.name.split('.').pop() || 'pdf';

    // Upload to storage
    const filePath = `${user.id}/${jobId}/cover-letter.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('application-drafts')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return { success: false, error: 'Failed to upload file' };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('application-drafts')
      .getPublicUrl(filePath);

    return { success: true, url: publicUrl };
  } catch (error) {
    console.error('Error in uploadCoverLetterToDraft:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function moveFileToApplication(
  sourcePath: string,
  applicationId: string,
  fileName: string
): Promise<{ success: boolean; error?: string; url?: string }> {
  try {
    const supabase = await createClient(await cookies());

    // Download from draft storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('application-drafts')
      .download(sourcePath);

    if (downloadError) {
      console.error('Download error:', downloadError);
      return { success: false, error: 'Failed to move file' };
    }

    // Upload to applications storage
    const destPath = `${applicationId}/${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from('applications')
      .upload(destPath, fileData, { upsert: true });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return { success: false, error: 'Failed to move file' };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('applications')
      .getPublicUrl(destPath);

    // Delete from draft storage
    await supabase.storage
      .from('application-drafts')
      .remove([sourcePath]);

    return { success: true, url: publicUrl };
  } catch (error) {
    console.error('Error in moveFileToApplication:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
```

**Step 2: Commit**

```bash
git add features/applications/actions/file-upload-actions.ts
git commit -m "feat: add file upload and move actions for application files"
```

---

## Phase 5: Application Wizard Components

### Task 10: Create Wizard Container Component

**Files:**
- Create: `crewup/features/applications/components/application-wizard/wizard-container.tsx`
- Create: `crewup/features/applications/hooks/use-application-wizard.ts`

**Step 1: Write wizard hook for state management**

File: `crewup/features/applications/hooks/use-application-wizard.ts`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ApplicationFormData } from '../types/application.types';
import { fullApplicationSchema } from '../utils/validation';
import { loadDraft, saveDraft } from '../actions/draft-actions';
import { useToast } from '@/components/providers/toast-provider';

export function useApplicationWizard(jobId: string) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [resumeUrl, setResumeUrl] = useState<string>();
  const [coverLetterUrl, setCoverLetterUrl] = useState<string>();
  const [extractedText, setExtractedText] = useState<string>();
  const toast = useToast();

  const form = useForm<Partial<ApplicationFormData>>({
    resolver: zodResolver(fullApplicationSchema),
    mode: 'onChange',
  });

  // Load draft on mount
  useEffect(() => {
    async function loadExistingDraft() {
      const result = await loadDraft(jobId);
      if (result.success && result.draft) {
        // Populate form with draft data
        form.reset(result.draft.form_data);
        setResumeUrl(result.draft.resume_url || undefined);
        setCoverLetterUrl(result.draft.cover_letter_url || undefined);
        setExtractedText(result.draft.resume_extracted_text || undefined);
        setLastSaved(new Date(result.draft.last_saved_at));
      }
      setIsLoading(false);
    }
    loadExistingDraft();
  }, [jobId]);

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      if (form.formState.isDirty) {
        await handleAutoSave();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [form.formState.isDirty]);

  async function handleAutoSave() {
    setIsSaving(true);
    const formData = form.getValues();
    const result = await saveDraft(
      jobId,
      formData,
      resumeUrl,
      coverLetterUrl,
      extractedText
    );

    if (result.success) {
      setLastSaved(new Date());
      form.reset(formData, { keepValues: true }); // Mark as not dirty
    } else {
      toast.error('Failed to auto-save draft');
    }
    setIsSaving(false);
  }

  async function nextStep() {
    // Validate current step before proceeding
    await handleAutoSave();
    if (currentStep < 8) {
      setCurrentStep(currentStep + 1);
    }
  }

  async function prevStep() {
    await handleAutoSave();
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  }

  function goToStep(step: number) {
    setCurrentStep(step);
  }

  return {
    currentStep,
    form,
    isLoading,
    isSaving,
    lastSaved,
    resumeUrl,
    setResumeUrl,
    coverLetterUrl,
    setCoverLetterUrl,
    extractedText,
    setExtractedText,
    nextStep,
    prevStep,
    goToStep,
    handleAutoSave,
  };
}
```

**Step 2: Write wizard container component**

File: `crewup/features/applications/components/application-wizard/wizard-container.tsx`

```typescript
'use client';

import { useApplicationWizard } from '../../hooks/use-application-wizard';
import { ProgressIndicator } from './progress-indicator';
import { AutoSaveIndicator } from './auto-save-indicator';
import { Button } from '@/components/ui';

type Props = {
  jobId: string;
  jobTitle: string;
};

export function ApplicationWizardContainer({ jobId, jobTitle }: Props) {
  const {
    currentStep,
    form,
    isLoading,
    isSaving,
    lastSaved,
    nextStep,
    prevStep,
  } = useApplicationWizard(jobId);

  if (isLoading) {
    return <div>Loading draft...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Apply for {jobTitle}</h1>
          <ProgressIndicator currentStep={currentStep} totalSteps={8} />
          <AutoSaveIndicator isSaving={isSaving} lastSaved={lastSaved} />
        </div>
      </div>

      {/* Step Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          {/* Render current step component */}
          {currentStep === 1 && <div>Step 1: Documents</div>}
          {currentStep === 2 && <div>Step 2: Personal Info</div>}
          {currentStep === 3 && <div>Step 3: Contact</div>}
          {currentStep === 4 && <div>Step 4: Work Auth</div>}
          {currentStep === 5 && <div>Step 5: Work History</div>}
          {currentStep === 6 && <div>Step 6: Education</div>}
          {currentStep === 7 && <div>Step 7: Skills & Certs</div>}
          {currentStep === 8 && <div>Step 8: References & Review</div>}
        </div>
      </div>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
        <div className="max-w-4xl mx-auto flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
          >
            Back
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={nextStep}
            disabled={currentStep === 8}
          >
            {currentStep === 8 ? 'Review' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add features/applications/components/application-wizard/wizard-container.tsx
git add features/applications/hooks/use-application-wizard.ts
git commit -m "feat: add wizard container and state management hook"
```

---

## Phase 6: Implementation Strategy Summary

Due to the extensive nature of this implementation (8 wizard steps, employer dashboard, notifications, etc.), the plan is organized into phases:

**Phases 1-4 (COMPLETE ABOVE):**
- ✅ Database migrations (tables, indexes, RLS, storage)
- ✅ TypeScript types and Zod schemas
- ✅ Resume parser utilities
- ✅ Draft management and file upload actions
- ✅ Wizard container scaffolding

**Phases 5-8 (TO IMPLEMENT):**

### Phase 5: Complete 8 Wizard Steps
- Task 11-18: Build each step component (Step1Documents through Step8Review)
- Each step includes: UI component, form validation, auto-population logic

### Phase 6: Application Submission
- Task 19: Submit application action (move draft → application)
- Task 20: Worker applications list page
- Task 21: Application details modal
- Task 22: Withdraw application functionality

### Phase 7: Employer Dashboard
- Task 23: Applicant list with tabs (All/Pending/Viewed/etc)
- Task 24: Applicant card component
- Task 25: Application details modal for employers
- Task 26: Status update functionality
- Task 27: Pro-gated filters panel
- Task 28: Pro-gated sorting and match score
- Task 29: Pro-gated bulk actions

### Phase 8: Notifications & Settings
- Task 30: Notification preferences UI
- Task 31: In-app notification system
- Task 32: Email notification service
- Task 33: Real-time status subscriptions

### Testing Strategy

Each task should follow TDD where possible:
1. Write failing test for component/function
2. Implement minimal code to pass
3. Refactor if needed
4. Commit

For UI components, manual testing is acceptable given the visual nature.

---

## Next Steps

This plan provides the foundation (database, types, core utilities). To continue implementation:

1. **Use @superpowers:executing-plans** to implement remaining phases task-by-task
2. **Use @superpowers:test-driven-development** for each new function/component
3. **Use @superpowers:verification-before-completion** before marking any phase complete

Each phase should be completed and verified before moving to the next.

---

## Verification Checklist

After completing all phases:

- [ ] All 8 wizard steps render and validate correctly
- [ ] Draft auto-saves every 30 seconds
- [ ] Resume upload extracts text successfully
- [ ] Application submits and moves files to permanent storage
- [ ] Worker can view/withdraw applications
- [ ] Employer can view applications in tabbed dashboard
- [ ] Pro features show upgrade prompts for free users
- [ ] Notifications sent on status changes
- [ ] Settings page allows preference management
- [ ] All database migrations applied successfully
- [ ] RLS policies prevent unauthorized access
- [ ] File uploads restricted by size and type
- [ ] Mobile responsive on all screens

---

**Plan saved to:** `docs/plans/2025-12-23-comprehensive-job-applications-implementation.md`
