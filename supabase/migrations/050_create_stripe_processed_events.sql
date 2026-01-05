-- Migration 050: Create Stripe Processed Events Table
-- Created: 2026-01-04
-- Description: Table for persistent idempotency in Stripe webhook processing

CREATE TABLE IF NOT EXISTS stripe_processed_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE stripe_processed_events ENABLE ROW LEVEL SECURITY;

-- Deny all access to regular users
DROP POLICY IF EXISTS "Deny all access to regular users" ON stripe_processed_events;
CREATE POLICY "Deny all access to regular users" ON stripe_processed_events
  FOR ALL
  TO public
  USING (false);

-- Documentation
COMMENT ON TABLE stripe_processed_events IS 'Stores Stripe event IDs that have already been processed to ensure idempotency.';
