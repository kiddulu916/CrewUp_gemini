-- Add subtrade_pay_rates column to jobs table
-- Migration 037
-- Created: 2025-12-28
-- Enables different pay rates for each sub-trade in multi-subtrade job postings

-- ============================================================================
-- Add subtrade_pay_rates column
-- ============================================================================

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS subtrade_pay_rates JSONB;

COMMENT ON COLUMN jobs.subtrade_pay_rates IS
  'Pay rates for each sub-trade when multiple sub-trades selected.
   Format: {"trade|subtrade": "rate_number"}
   Example: {"Electricians|Inside Wireman": "45", "Plumbers|Pipefitter": "50"}
   NULL if single pay rate (stored in pay_rate column)';

-- Create GIN index for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_jobs_subtrade_pay_rates
  ON jobs USING GIN(subtrade_pay_rates);

-- ============================================================================
-- Notes
-- ============================================================================

-- Backward compatibility:
-- - Existing jobs continue using pay_rate column
-- - New jobs with 2+ sub-trades use subtrade_pay_rates
-- - pay_rate column kept as formatted display string for all jobs
