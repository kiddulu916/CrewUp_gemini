-- ============================================================================
-- Migration 039: Fix issuer column mismatch
-- ============================================================================
-- Purpose: The database has a column "issuer" with NOT NULL constraint,
--          but the code expects "issued_by". This migration fixes the mismatch.
-- ============================================================================

-- Check if 'issuer' column exists and rename it to 'issued_by'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'certifications'
    AND column_name = 'issuer'
  ) THEN
    -- If issuer exists, make it nullable first (in case there are NULL values)
    ALTER TABLE certifications ALTER COLUMN issuer DROP NOT NULL;

    -- If issued_by doesn't exist, rename issuer to issued_by
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'certifications'
      AND column_name = 'issued_by'
    ) THEN
      ALTER TABLE certifications RENAME COLUMN issuer TO issued_by;
      RAISE NOTICE '✓ Renamed issuer column to issued_by';
    ELSE
      -- If both exist, copy data from issuer to issued_by and drop issuer
      UPDATE certifications SET issued_by = issuer WHERE issued_by IS NULL;
      ALTER TABLE certifications DROP COLUMN issuer;
      RAISE NOTICE '✓ Merged issuer into issued_by and dropped issuer column';
    END IF;
  ELSE
    RAISE NOTICE '✓ No issuer column found, issued_by already exists';
  END IF;
END $$;

-- Ensure issued_by column exists (created by migration 036)
ALTER TABLE certifications
  ADD COLUMN IF NOT EXISTS issued_by TEXT;

COMMENT ON COLUMN certifications.issued_by IS
  'Issuing authority (e.g., California Contractors State License Board, OSHA)';
