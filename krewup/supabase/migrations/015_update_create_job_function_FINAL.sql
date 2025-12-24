-- Drop both existing versions of the function using their exact signatures

-- Version 1: 13 parameters (without p_time_length)
DROP FUNCTION IF EXISTS create_job_with_coords(
  p_employer_id uuid,
  p_title text,
  p_trade text,
  p_job_type text,
  p_description text,
  p_location text,
  p_lng double precision,
  p_lat double precision,
  p_pay_rate text,
  p_sub_trade text,
  p_pay_min numeric,
  p_pay_max numeric,
  p_required_certs text[]
);

-- Version 2: 14 parameters (with p_time_length)
DROP FUNCTION IF EXISTS create_job_with_coords(
  p_employer_id uuid,
  p_title text,
  p_trade text,
  p_job_type text,
  p_description text,
  p_location text,
  p_lng double precision,
  p_lat double precision,
  p_pay_rate text,
  p_sub_trade text,
  p_pay_min numeric,
  p_pay_max numeric,
  p_required_certs text[],
  p_time_length text
);

-- Create the new version with trades arrays support (16 parameters)
CREATE OR REPLACE FUNCTION create_job_with_coords(
  p_employer_id UUID,
  p_title TEXT,
  p_trade TEXT, -- Keep for backward compatibility
  p_job_type TEXT,
  p_description TEXT,
  p_location TEXT,
  p_lng DOUBLE PRECISION,
  p_lat DOUBLE PRECISION,
  p_pay_rate TEXT,
  p_sub_trade TEXT DEFAULT NULL, -- Keep for backward compatibility
  p_pay_min NUMERIC DEFAULT NULL,
  p_pay_max NUMERIC DEFAULT NULL,
  p_required_certs TEXT[] DEFAULT NULL,
  p_time_length TEXT DEFAULT NULL,
  p_trades TEXT[] DEFAULT NULL, -- New: support for multiple trades
  p_sub_trades TEXT[] DEFAULT NULL -- New: support for multiple sub-trades
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  new_job_id UUID;
  final_trades TEXT[];
  final_sub_trades TEXT[];
BEGIN
  -- Use p_trades if provided, otherwise fall back to p_trade for backward compatibility
  IF p_trades IS NOT NULL AND array_length(p_trades, 1) > 0 THEN
    final_trades := p_trades;
  ELSE
    final_trades := ARRAY[p_trade];
  END IF;

  -- Use p_sub_trades if provided, otherwise fall back to p_sub_trade for backward compatibility
  IF p_sub_trades IS NOT NULL AND array_length(p_sub_trades, 1) > 0 THEN
    final_sub_trades := p_sub_trades;
  ELSIF p_sub_trade IS NOT NULL THEN
    final_sub_trades := ARRAY[p_sub_trade];
  ELSE
    final_sub_trades := ARRAY[]::TEXT[];
  END IF;

  INSERT INTO jobs (
    employer_id,
    title,
    trade, -- Keep old column populated for backward compatibility
    sub_trade, -- Keep old column populated for backward compatibility
    trades, -- New array column
    sub_trades, -- New array column
    job_type,
    description,
    location,
    coords,
    pay_rate,
    pay_min,
    pay_max,
    required_certs,
    time_length,
    status
  )
  VALUES (
    p_employer_id,
    p_title,
    final_trades[1], -- Store first trade in old column
    CASE WHEN array_length(final_sub_trades, 1) > 0 THEN final_sub_trades[1] ELSE NULL END, -- Store first sub_trade in old column
    final_trades,
    final_sub_trades,
    p_job_type,
    p_description,
    p_location,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326),
    p_pay_rate,
    p_pay_min,
    p_pay_max,
    COALESCE(p_required_certs, ARRAY[]::TEXT[]),
    p_time_length,
    'active'
  )
  RETURNING id INTO new_job_id;

  RETURN new_job_id;
END;
$$;

COMMENT ON FUNCTION create_job_with_coords IS 'Creates a job with PostGIS coordinates. Supports both old (single trade) and new (multiple trades) formats.';
