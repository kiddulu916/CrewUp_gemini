-- Function to update profile coordinates using proper PostGIS format
CREATE OR REPLACE FUNCTION update_profile_coords_only(
  p_user_id UUID,
  p_lng DOUBLE PRECISION,
  p_lat DOUBLE PRECISION
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE profiles
  SET coords = ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326),
      updated_at = NOW()
  WHERE id = p_user_id;
END;
$$;

COMMENT ON FUNCTION update_profile_coords_only IS 'Updates only the coords field of a profile with PostGIS geometry';
