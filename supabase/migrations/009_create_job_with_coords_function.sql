-- Function to create a job with coordinates using proper PostGIS format
CREATE OR REPLACE FUNCTION create_job_with_coords(
  p_employer_id UUID,
  p_title TEXT,
  p_trade TEXT,
  p_job_type TEXT,
  p_description TEXT,
  p_location TEXT,
  p_lng DOUBLE PRECISION,
  p_lat DOUBLE PRECISION,
  p_pay_rate TEXT,
  p_sub_trade TEXT DEFAULT NULL,
  p_pay_min NUMERIC DEFAULT NULL,
  p_pay_max NUMERIC DEFAULT NULL,
  p_required_certs TEXT[] DEFAULT NULL,
  p_time_length TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  new_job_id UUID;
BEGIN
  INSERT INTO jobs (
    employer_id,
    title,
    trade,
    sub_trade,
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
    p_trade,
    p_sub_trade,
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
