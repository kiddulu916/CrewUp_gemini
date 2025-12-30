-- Add missing certification fields
-- Migration 036
-- Created: 2025-12-28
-- Fixes contractor license upload error: missing expires_at, certification_number, issued_by, issue_date

-- ============================================================================
-- Add missing columns to certifications table
-- ============================================================================

-- Add certification_number (license number for contractors, cert number for workers)
ALTER TABLE certifications
  ADD COLUMN IF NOT EXISTS certification_number TEXT;

COMMENT ON COLUMN certifications.certification_number IS 'License or certification number (e.g., contractor license #123456)';

-- Add issued_by (issuing authority)
ALTER TABLE certifications
  ADD COLUMN IF NOT EXISTS issued_by TEXT;

COMMENT ON COLUMN certifications.issued_by IS 'Issuing authority (e.g., California Contractors State License Board, OSHA)';

-- Add issue_date (when the credential was issued)
ALTER TABLE certifications
  ADD COLUMN IF NOT EXISTS issue_date DATE;

COMMENT ON COLUMN certifications.issue_date IS 'Date the credential was issued';

-- Add expires_at (when the credential expires)
ALTER TABLE certifications
  ADD COLUMN IF NOT EXISTS expires_at DATE;

COMMENT ON COLUMN certifications.expires_at IS 'Expiration date of the credential (NULL if no expiration)';

-- Create index on expires_at for finding expiring credentials
CREATE INDEX IF NOT EXISTS idx_certifications_expires_at
  ON certifications(expires_at)
  WHERE expires_at IS NOT NULL;

-- ============================================================================
-- Notes
-- ============================================================================

-- These columns are expected by:
-- - features/onboarding/actions/onboarding-actions.ts (contractor license upload)
-- - features/profiles/actions/certification-actions.ts (addCertification function)
-- - features/profiles/components/certification-form.tsx (UI form)
-- - features/profiles/components/certification-item.tsx (display)
