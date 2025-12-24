-- Update the update_profile_coords function to include phone and email parameters
-- Run this in Supabase SQL Editor

DROP FUNCTION IF EXISTS update_profile_coords(UUID, TEXT, TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION update_profile_coords(
  p_user_id UUID,
  p_name TEXT,
  p_phone TEXT,
  p_email TEXT,
  p_role TEXT,
  p_trade TEXT,
  p_location TEXT,
  p_lng DOUBLE PRECISION,
  p_lat DOUBLE PRECISION,
  p_bio TEXT,
  p_sub_trade TEXT DEFAULT NULL,
  p_employer_type TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE profiles
  SET
    name = p_name,
    phone = p_phone,
    email = p_email,
    role = p_role,
    trade = p_trade,
    sub_trade = p_sub_trade,
    location = p_location,
    coords = ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326),
    bio = p_bio,
    employer_type = p_employer_type,
    updated_at = NOW()
  WHERE id = p_user_id;
END;
$$;
