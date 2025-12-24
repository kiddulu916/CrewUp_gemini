# Manual Storage Bucket Setup

Since the SQL migration for creating storage buckets is failing due to permissions, follow these steps to create the buckets manually via the Supabase Dashboard.

---

## Step 1: Create `application-drafts` Bucket

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: **vfjcpxaplapnuwtzvord**
3. Navigate to **Storage** in the left sidebar
4. Click **New bucket** button (top right)
5. Fill in the form:
   - **Name:** `application-drafts`
   - **Public bucket:** ❌ **OFF** (keep it private)
   - **File size limit:** `10` MB
   - **Allowed MIME types:** Click "Add MIME type" and add these three:
     - `application/pdf`
     - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
     - `text/plain`
6. Click **Create bucket**

---

## Step 2: Create `applications` Bucket

1. Still in **Storage**, click **New bucket** again
2. Fill in the form:
   - **Name:** `applications`
   - **Public bucket:** ❌ **OFF** (keep it private)
   - **File size limit:** `10` MB
   - **Allowed MIME types:** Click "Add MIME type" and add these three:
     - `application/pdf`
     - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
     - `text/plain`
3. Click **Create bucket**

---

## Step 3: Create Policies for `application-drafts`

1. In **Storage**, click on the `application-drafts` bucket
2. Click the **Policies** tab
3. Click **New Policy**
4. For each policy below, click **For full customization** and paste the SQL:

### Policy 1: Users upload to own draft folder

```sql
CREATE POLICY "Users upload to own draft folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'application-drafts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

Click **Review** → **Save policy**

### Policy 2: Users view own draft files

```sql
CREATE POLICY "Users view own draft files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'application-drafts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

Click **Review** → **Save policy**

### Policy 3: Users update own draft files

```sql
CREATE POLICY "Users update own draft files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'application-drafts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

Click **Review** → **Save policy**

### Policy 4: Users delete own draft files

```sql
CREATE POLICY "Users delete own draft files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'application-drafts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

Click **Review** → **Save policy**

---

## Step 4: Create Policies for `applications`

1. Go back to **Storage** and click on the `applications` bucket
2. Click the **Policies** tab
3. Click **New Policy**
4. For each policy below, click **For full customization** and paste the SQL:

### Policy 1: System uploads application files

```sql
CREATE POLICY "System uploads application files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'applications'
);
```

Click **Review** → **Save policy**

### Policy 2: Worker or employer views application files

```sql
CREATE POLICY "Worker or employer views application files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'applications'
  AND (
    -- Worker who submitted the application
    auth.uid() IN (
      SELECT worker_id FROM job_applications
      WHERE id::text = (storage.foldername(name))[1]
    )
    OR
    -- Employer who owns the job
    auth.uid() IN (
      SELECT j.employer_id
      FROM job_applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE a.id::text = (storage.foldername(name))[1]
    )
  )
);
```

Click **Review** → **Save policy**

### Policy 3: System updates application files

```sql
CREATE POLICY "System updates application files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'applications'
);
```

Click **Review** → **Save policy**

### Policy 4: System deletes application files

```sql
CREATE POLICY "System deletes application files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'applications'
);
```

Click **Review** → **Save policy**

---

## Step 5: Verify Setup

### Check Buckets

In **Storage**, you should now see two buckets:
- ✅ `application-drafts` (Private, 10MB limit)
- ✅ `applications` (Private, 10MB limit)

### Check Policies

Click on each bucket → **Policies** tab:
- ✅ `application-drafts`: Should have 4 policies
- ✅ `applications`: Should have 4 policies

---

## What These Buckets Are For

**`application-drafts`:**
- Stores temporary files while workers fill out applications
- Files organized by user: `{userId}/{jobId}/resume.pdf`
- Auto-cleaned when application is submitted or abandoned
- Users can only access their own files

**`applications`:**
- Stores final application files after submission
- Files organized by application: `{applicationId}/resume.pdf`
- Permanent storage (until GDPR deletion)
- Workers see their own files, employers see files for their jobs

---

## Troubleshooting

**If policy creation fails:**
- Make sure you're using the **"For full customization"** option, not the templates
- Verify the bucket name matches exactly (case-sensitive)
- Check that you're logged in as the project owner

**If you see permission errors:**
- Verify RLS is enabled on `storage.objects` (it should be by default)
- Make sure the `job_applications` and `jobs` tables exist (run migrations 018-020 first)

---

## Summary Checklist

- [ ] Created `application-drafts` bucket with 10MB limit and MIME types
- [ ] Created `applications` bucket with 10MB limit and MIME types
- [ ] Added 4 policies to `application-drafts` bucket
- [ ] Added 4 policies to `applications` bucket
- [ ] Verified both buckets show in Storage dashboard
- [ ] Verified all 8 policies are active

Once complete, your storage system is ready for the job application feature! 🎉
