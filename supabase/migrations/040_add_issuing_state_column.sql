-- ============================================================================
-- Migration 040: Add issuing_state column for contractor licenses
-- ============================================================================
-- Purpose: Separate issuing authority (issued_by) from issuing state
--          - issued_by: e.g., "California Contractors State License Board"
--          - issuing_state: e.g., "California"
-- ============================================================================

-- Add issuing_state column
ALTER TABLE certifications
  ADD COLUMN IF NOT EXISTS issuing_state TEXT;

COMMENT ON COLUMN certifications.issuing_state IS
  'State/jurisdiction that issued the credential (e.g., California, Texas)';

-- Create index for filtering by state
CREATE INDEX IF NOT EXISTS idx_certifications_issuing_state
  ON certifications(issuing_state);
