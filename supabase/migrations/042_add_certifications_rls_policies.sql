-- ============================================================================
-- Migration 042: Add RLS policies for certifications table
-- ============================================================================
-- Purpose: Allow admins to view all certifications and users to view their own
-- ============================================================================

-- Enable RLS if not already enabled
ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own certifications" ON certifications;
DROP POLICY IF EXISTS "Admins can view all certifications" ON certifications;
DROP POLICY IF EXISTS "Users can insert own certifications" ON certifications;
DROP POLICY IF EXISTS "Users can delete own certifications" ON certifications;
DROP POLICY IF EXISTS "Admins can update certifications for verification" ON certifications;

-- Policy 1: Users can view their own certifications
CREATE POLICY "Users can view own certifications"
ON certifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy 2: Admins can view ALL certifications
CREATE POLICY "Admins can view all certifications"
ON certifications FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Policy 3: Authenticated users can insert their own certifications
CREATE POLICY "Users can insert own certifications"
ON certifications FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy 4: Users can delete their own certifications
CREATE POLICY "Users can delete own certifications"
ON certifications FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Policy 5: Admins can update certifications (for verification)
CREATE POLICY "Admins can update certifications for verification"
ON certifications FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Add comments for documentation
COMMENT ON POLICY "Users can view own certifications" ON certifications IS
  'Users can view their own certification records';

COMMENT ON POLICY "Admins can view all certifications" ON certifications IS
  'Admin users can view all certifications for verification';

COMMENT ON POLICY "Admins can update certifications for verification" ON certifications IS
  'Admin users can update verification status, notes, and other fields';
