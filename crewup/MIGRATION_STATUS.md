# Migration Status - Task 1: Create Application Drafts Table

## Status: MIGRATION FILE CREATED & COMMITTED ✓

The migration file `018_create_application_drafts.sql` has been successfully created and committed to git.

**Commit:** `201fe205de92576471be490f8a5969228710c5c8`
**Message:** `feat: create application_drafts table with RLS policies`

---

## Issue: Docker Not Available

The standard `npx supabase db reset` command requires Docker to be running, but Docker is not installed on this system.

## Solution: Manual Migration Application Required

Since this project uses a **remote Supabase instance** (not local Docker), the migration needs to be applied manually via the Supabase dashboard.

---

## How to Apply the Migration

### Option 1: Supabase SQL Editor (RECOMMENDED)

1. Go to: https://supabase.com/dashboard/project/vfjcpxaplapnuwtzvord/sql/new
2. Copy the SQL from `crewup/supabase/migrations/018_create_application_drafts.sql`
3. Paste into the SQL editor
4. Click "Run" to execute

### Option 2: Helper Script

Run the helper script to display the SQL:

```bash
cd crewup
./scripts/apply-via-management-api.sh supabase/migrations/018_create_application_drafts.sql
```

Then copy the displayed SQL and paste it into the Supabase SQL Editor.

### Option 3: psql (If you have database password)

```bash
psql "postgresql://postgres:[PASSWORD]@db.vfjcpxaplapnuwtzvord.supabase.co:5432/postgres" \
  -f crewup/supabase/migrations/018_create_application_drafts.sql
```

---

## Migration SQL Content

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

---

## Verification Steps (After Applying Migration)

Once the migration has been applied via the Supabase dashboard, verify it worked:

### 1. Check Table Exists

Run this query in the Supabase SQL Editor:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'application_drafts';
```

Expected: Returns one row with `application_drafts`

### 2. Check Table Structure

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'application_drafts'
ORDER BY ordinal_position;
```

Expected: Returns 10 columns (id, job_id, worker_id, form_data, resume_url, cover_letter_url, resume_extracted_text, last_saved_at, expires_at, created_at)

### 3. Check Indexes

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'application_drafts';
```

Expected: Returns 4 indexes (primary key + 3 performance indexes)

### 4. Check RLS Policies

```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'application_drafts';
```

Expected: Returns 4 RLS policies (SELECT, INSERT, UPDATE, DELETE)

### 5. Test Insert (Optional)

```sql
-- This should succeed if you're authenticated
INSERT INTO application_drafts (job_id, worker_id, form_data)
VALUES (
  (SELECT id FROM jobs LIMIT 1),
  auth.uid(),
  '{"test": true}'::jsonb
);

-- Clean up test
DELETE FROM application_drafts WHERE form_data->>'test' = 'true';
```

---

## Next Steps

After successfully applying and verifying the migration:

1. ✓ Mark Task 1 as complete in the implementation plan
2. Proceed to Task 2: Update Job Applications Table
3. Continue with subsequent tasks in the plan

---

## Files Changed

- **Created:** `crewup/supabase/migrations/018_create_application_drafts.sql`
- **Created:** `crewup/scripts/apply-via-management-api.sh`
- **Created:** `crewup/scripts/run-migration.mjs`
- **Created:** `crewup/scripts/apply-migration.js`
- **Committed:** Migration file with message "feat: create application_drafts table with RLS policies"

---

**Last Updated:** 2025-12-23
