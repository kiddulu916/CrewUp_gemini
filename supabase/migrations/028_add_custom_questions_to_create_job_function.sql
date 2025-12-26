-- ============================================================================
-- Migration 028: Add custom_questions parameter to create_job_with_coords
-- ============================================================================
-- Purpose: Fix bug where custom screening questions weren't saved when
--          job is created with coordinates
-- ============================================================================

-- Drop and recreate the function with the new parameter
CREATE OR REPLACE FUNCTION create_job_with_coords(
  p_employer_id UUID,
  p_title TEXT,
  p_trade TEXT,
  p_job_type TEXT,
  p_description TEXT,
  p_location TEXT,
  p_lng NUMERIC,
  p_lat NUMERIC,
  p_pay_rate TEXT,
  p_sub_trade TEXT DEFAULT NULL,
  p_pay_min NUMERIC DEFAULT NULL,
  p_pay_max NUMERIC DEFAULT NULL,
  p_required_certs TEXT[] DEFAULT NULL,
  p_time_length TEXT DEFAULT NULL,
  p_trades TEXT[] DEFAULT NULL,
  p_sub_trades TEXT[] DEFAULT NULL,
  p_trade_selections JSONB DEFAULT NULL,
  p_custom_questions JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_job_id UUID;
BEGIN
  INSERT INTO jobs (
    employer_id,
    title,
    trade,
    job_type,
    description,
    location,
    coords,
    pay_rate,
    sub_trade,
    pay_min,
    pay_max,
    required_certs,
    time_length,
    trades,
    sub_trades,
    trade_selections,
    custom_questions,
    status
  ) VALUES (
    p_employer_id,
    p_title,
    p_trade,
    p_job_type,
    p_description,
    p_location,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326),
    p_pay_rate,
    p_sub_trade,
    p_pay_min,
    p_pay_max,
    p_required_certs,
    p_time_length,
    p_trades,
    p_sub_trades,
    p_trade_selections,
    p_custom_questions,
    'active'
  )
  RETURNING id INTO v_job_id;

  RETURN v_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify the function was created
DO $$
BEGIN
  RAISE NOTICE '✓ Updated create_job_with_coords function to include custom_questions parameter';
END $$;
