# Supabase Storage Setup Guide

This guide walks you through configuring Supabase Storage for certification photo uploads.

---

## Overview

The certification photo upload feature allows workers to upload images or PDFs of their certifications. Files are stored in Supabase Storage and referenced in the `certifications` table.

**What you'll set up:**
1. Create a storage bucket for certification photos
2. Configure Row Level Security (RLS) policies for the bucket
3. Verify database columns exist for storing photo data

---

## Step 1: Create the Storage Bucket

### 1.1 Navigate to Storage

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your CrewUp project
3. Click **Storage** in the left sidebar
4. Click **New bucket** button

### 1.2 Configure the Bucket

Fill in the bucket creation form:

- **Name**: `certification-photos`
- **Public bucket**: ❌ **UNCHECK THIS** (keep it private)
  - Photos should only be accessible to authenticated users
  - RLS policies will control who can access what
- **File size limit**: `5242880` (5 MB in bytes)
- **Allowed MIME types**: Leave blank or specify:
  ```
  image/jpeg
  image/png
  image/webp
  application/pdf
  ```

Click **Create bucket**

---

## Step 2: Set Up Storage Policies

After creating the bucket, you need to add policies to control access.

### 2.1 Navigate to Policies

1. Click on the **certification-photos** bucket you just created
2. Click the **Policies** tab at the top
3. You should see "No policies yet" - click **New policy**

### 2.2 Policy 1: Allow Users to Upload Their Own Certifications

Click **Create a policy from scratch** and fill in:

- **Policy name**: `Users can upload their own certification photos`
- **Allowed operation**: `INSERT`
- **Target roles**: `authenticated`
- **WITH CHECK expression**:
  ```sql
  (auth.uid())::text = (storage.foldername(name))[1]
  ```

**What this does**: Users can only upload files to folders that match their user ID. Files are stored as `{userId}/{filename}`, so this ensures users can only upload to their own folder.

Click **Review** → **Save policy**

### 2.3 Policy 2: Allow Users to View Their Own Certifications

Click **New policy** → **Create a policy from scratch**:

- **Policy name**: `Users can view their own certification photos`
- **Allowed operation**: `SELECT`
- **Target roles**: `authenticated`
- **USING expression**:
  ```sql
  (auth.uid())::text = (storage.foldername(name))[1]
  ```

**What this does**: Users can only view files in their own folder.

Click **Review** → **Save policy**

### 2.4 Policy 3: Allow Users to Delete Their Own Certifications

Click **New policy** → **Create a policy from scratch**:

- **Policy name**: `Users can delete their own certification photos`
- **Allowed operation**: `DELETE`
- **Target roles**: `authenticated`
- **USING expression**:
  ```sql
  (auth.uid())::text = (storage.foldername(name))[1]
  ```

**What this does**: Users can delete files from their own folder.

Click **Review** → **Save policy**

### 2.5 Policy 4: Allow Employers to View Worker Certifications

Click **New policy** → **Create a policy from scratch**:

- **Policy name**: `Employers can view all certification photos`
- **Allowed operation**: `SELECT`
- **Target roles**: `authenticated`
- **USING expression**:
  ```sql
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'Employer'
  )
  ```

**What this does**: Users with role 'Employer' can view all certification photos (needed for verifying worker certifications).

Click **Review** → **Save policy**

---

## Step 3: Verify Database Columns

The certification upload feature requires two columns in the `certifications` table. Let's verify they exist.

### 3.1 Check Current Schema

1. In Supabase Dashboard, click **Table Editor** in the left sidebar
2. Select the `certifications` table
3. Look for these columns:
   - `certification_number` (text, nullable)
   - `photo_url` (text, nullable)

### 3.2 Add Missing Columns (if needed)

If either column is missing, add them:

#### Option A: Using the Table Editor (Visual)

1. In the `certifications` table view, click **+ New Column**
2. For certification number:
   - **Name**: `certification_number`
   - **Type**: `text`
   - **Default value**: Leave blank
   - **Is Nullable**: ✓ Check
   - **Is Unique**: ☐ Uncheck
3. Click **Save**
4. Repeat for photo URL:
   - **Name**: `photo_url`
   - **Type**: `text`
   - **Default value**: Leave blank
   - **Is Nullable**: ✓ Check
   - **Is Unique**: ☐ Uncheck
5. Click **Save**

#### Option B: Using SQL Editor (Recommended)

1. Click **SQL Editor** in the left sidebar
2. Click **New query**
3. Paste this SQL:

```sql
-- Add certification_number column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'certifications'
    AND column_name = 'certification_number'
  ) THEN
    ALTER TABLE public.certifications
    ADD COLUMN certification_number TEXT;
  END IF;
END $$;

-- Add photo_url column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'certifications'
    AND column_name = 'photo_url'
  ) THEN
    ALTER TABLE public.certifications
    ADD COLUMN photo_url TEXT;
  END IF;
END $$;

-- Verify columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'certifications'
  AND column_name IN ('certification_number', 'photo_url');
```

4. Click **Run** (or press Ctrl+Enter)
5. You should see output confirming both columns exist

---

## Step 4: Verify the Configuration

Let's test that everything is set up correctly.

### 4.1 Test Bucket Access

1. Go to **Storage** → **certification-photos** bucket
2. Click **Upload file**
3. Try uploading a test image
4. If you can upload successfully, the bucket is working!
5. Delete the test file

### 4.2 Test in the Application

1. Run your app locally or use the production URL: https://get-crewup.vercel.app
2. Sign up or log in as a worker
3. Go to Profile → Certifications
4. Try adding a new certification with a photo
5. Upload should succeed and show a preview
6. The certification should save with the photo URL

### 4.3 Verify File Storage Structure

After uploading a certification photo:

1. Go to Supabase Dashboard → Storage → certification-photos
2. You should see a folder named with your user ID
3. Inside that folder, you should see the uploaded file with a timestamp filename
4. Example structure: `e8f3a71d-5c42-4f6e-a2db-9f3c4a7b6e1d/1735678900123.jpg`

---

## Troubleshooting

### "Row Level Security policy violation" error

**Cause**: The RLS policies aren't set up correctly.

**Fix**: Double-check that all 4 policies are created with the exact SQL expressions above.

### "Bucket not found" error

**Cause**: The bucket name doesn't match what's in the code.

**Fix**: Verify the bucket is named exactly `certification-photos` (with a hyphen, not underscore).

### "File too large" error

**Cause**: File exceeds the 5 MB limit.

**Fix**: In the bucket settings, increase the file size limit if needed, or add client-side validation to compress large images.

### Photos not displaying

**Cause**: The bucket might be private and the URL isn't generating correctly.

**Fix**:
1. Verify the bucket is **private** (not public)
2. In your code, use `supabase.storage.from('certification-photos').getPublicUrl()` to generate signed URLs
3. For private buckets, you may need to use `createSignedUrl()` with an expiry time

### Users can see other users' photos

**Cause**: RLS policies are too permissive.

**Fix**: Verify the USING expressions in policies 1-3 use the correct folder check:
```sql
(auth.uid())::text = (storage.foldername(name))[1]
```

---

## Summary

After completing these steps, you should have:

- ✅ A private `certification-photos` storage bucket
- ✅ 4 RLS policies controlling upload, view, and delete access
- ✅ `certification_number` and `photo_url` columns in the certifications table
- ✅ Working photo uploads in your application

---

## Next Steps

With storage configured, you can now:

1. Test the full certification workflow in production
2. Have beta users test uploading their certifications
3. Consider adding image compression for better performance
4. Add certification verification workflow for employers

---

**Need help?** Check the Supabase Storage documentation:
- https://supabase.com/docs/guides/storage
- https://supabase.com/docs/guides/storage/security/access-control
