-- Function to get nearby jobs using PostGIS
CREATE OR REPLACE FUNCTION get_nearby_jobs(
  user_lng DOUBLE PRECISION,
  user_lat DOUBLE PRECISION,
  radius_km DOUBLE PRECISION DEFAULT 25
)
RETURNS TABLE (
  id UUID,
  employer_id UUID,
  title TEXT,
  trade TEXT,
  sub_trade TEXT,
  job_type TEXT,
  description TEXT,
  location TEXT,
  pay_rate TEXT,
  pay_min NUMERIC,
  pay_max NUMERIC,
  required_certs TEXT[],
  status TEXT,
  view_count INTEGER,
  application_count INTEGER,
  created_at TIMESTAMPTZ,
  distance_km DOUBLE PRECISION
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    j.id,
    j.employer_id,
    j.title,
    j.trade,
    j.sub_trade,
    j.job_type,
    j.description,
    j.location,
    j.pay_rate,
    j.pay_min,
    j.pay_max,
    j.required_certs,
    j.status,
    j.view_count,
    j.application_count,
    j.created_at,
    ST_Distance(
      j.coords::geography,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) / 1000.0 AS distance_km
  FROM jobs j
  WHERE
    j.status = 'active'
    AND ST_DWithin(
      j.coords::geography,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      radius_km * 1000  -- Convert km to meters
    )
  ORDER BY distance_km ASC;
END;
$$;

-- Function to check if user can access Pro features
CREATE OR REPLACE FUNCTION can_access_pro_features(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  subscription_status TEXT;
BEGIN
  SELECT p.subscription_status INTO subscription_status
  FROM profiles p
  WHERE p.id = user_id;

  RETURN subscription_status = 'pro';
END;
$$;

-- Function to get unread message count for a user
CREATE OR REPLACE FUNCTION get_unread_message_count(user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  unread_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unread_count
  FROM messages m
  JOIN conversations c ON c.id = m.conversation_id
  WHERE
    m.read_at IS NULL
    AND m.sender_id != user_id
    AND (c.participant_1_id = user_id OR c.participant_2_id = user_id);

  RETURN unread_count;
END;
$$;

-- Function to mark all messages in a conversation as read
CREATE OR REPLACE FUNCTION mark_conversation_read(
  conversation_id UUID,
  user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE messages
  SET read_at = NOW()
  WHERE
    messages.conversation_id = mark_conversation_read.conversation_id
    AND sender_id != user_id
    AND read_at IS NULL;
END;
$$;

-- Function to update profile with coordinates using proper PostGIS format
CREATE OR REPLACE FUNCTION update_profile_coords(
  p_user_id UUID,
  p_name TEXT,
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
