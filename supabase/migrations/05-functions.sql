-- 1. Handle New User (Refactored for Split Tables)
-- This triggers on auth.users creation and inserts into 'users' AND the specific role table
CREATE OR REPLACE FUNCTION "public"."handle_new_user"() 
RETURNS "trigger" LANGUAGE "plpgsql" SECURITY DEFINER AS $$
DECLARE
  v_role text := 'worker'; -- Default role
  v_first_name text;
  v_last_name text;
BEGIN
  -- Extract metadata
  v_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', 'New');
  v_last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', 'User');
  
  IF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
    v_role := NEW.raw_user_meta_data->>'role';
  END IF;

  -- 1. Insert into base Users table
  INSERT INTO public.users (
    id, email, first_name, last_name, role, location, created_at, updated_at
  ) VALUES (
    NEW.id, NEW.email, v_first_name, v_last_name, v_role, 'Update Location', NOW(), NOW()
  );

  -- 2. Insert into specific role table
  IF v_role = 'worker' THEN
    INSERT INTO public.workers (user_id, trade) 
    VALUES (NEW.id, 'General Laborer'); -- Default trade
  ELSIF v_role = 'employer' THEN
    -- Check employer type if provided, default to contractor
    IF (NEW.raw_user_meta_data->>'employer_type') = 'contractor' THEN
        INSERT INTO public.contractors (user_id) VALUES (NEW.id);
    ELSIF (NEW.raw_user_meta_data->>'employer_type') = 'homeowner' THEN
        INSERT INTO public.home_owners (user_id) VALUES (NEW.id);
    ELSIF (NEW.raw_user_meta_data->>'employer_type') = 'developer' THEN
        INSERT INTO public.developers (user_id) VALUES (NEW.id);
    ELSIF (NEW.raw_user_meta_data->>'employer_type') = 'recruiter' THEN
        INSERT INTO public.recruiters (user_id) VALUES (NEW.id);
    ELSE
        -- Default fallback
        INSERT INTO public.contractors (user_id) VALUES (NEW.id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Calculate Experience (Refactored to join workers table)
CREATE OR REPLACE FUNCTION "public"."calculate_total_experience"("p_user_id" "uuid") 
RETURNS integer LANGUAGE "plpgsql" STABLE AS $$
DECLARE
  total_months INTEGER;
BEGIN
  SELECT COALESCE(SUM(
    EXTRACT(YEAR FROM AGE(COALESCE(end_date, NOW()::DATE), start_date))::INTEGER * 12 +
    EXTRACT(MONTH FROM AGE(COALESCE(end_date, NOW()::DATE), start_date))::INTEGER
  ), 0)
  INTO total_months
  FROM experiences
  WHERE user_id = p_user_id;

  RETURN total_months / 12; -- Return years
END;
$$;

-- 3. Get Workers By Experience (Refactored)
CREATE OR REPLACE FUNCTION "public"."get_workers_by_experience"("p_min_years" integer, "p_trade_filter" "text" DEFAULT NULL) 
RETURNS TABLE(
    id uuid, 
    first_name text, 
    last_name text, 
    trade text, 
    location text, 
    geo_coords geography, 
    years_exp integer
) LANGUAGE "plpgsql" STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id, 
    u.first_name, 
    u.last_name, 
    w.trade, 
    u.location, 
    u.geo_coords,
    w.years_of_experience
  FROM users u
  JOIN workers w ON u.id = w.user_id
  WHERE u.role = 'worker'
  AND w.years_of_experience >= p_min_years
  AND (p_trade_filter IS NULL OR w.trade = p_trade_filter);
END;
$$;

-- 4. Create Job With Coordinates (Refactored for new Jobs table)
CREATE OR REPLACE FUNCTION "public"."create_job_with_coords"(
    "p_employer_id" "uuid",
    "p_title" "text",
    "p_description" "text",
    "p_location" "text",
    "p_lng" double precision,
    "p_lat" double precision,
    "p_trades" "text"[],
    "p_sub_trades" "text"[],
    "p_job_type" "text",
    "p_pay_rate" "text",
    "p_pay_min" numeric,
    "p_pay_max" numeric,
    "p_required_certs" "text"[],
    "p_status" "text" DEFAULT 'active'
) RETURNS "uuid" LANGUAGE "plpgsql" SECURITY DEFINER AS $$
DECLARE
  v_job_id UUID;
BEGIN
  INSERT INTO jobs (
    employer_id, title, description, location, coords, trades, sub_trades, job_type, pay_rate, pay_min, pay_max, required_certs, status
  ) VALUES (
    p_employer_id,
    p_title,
    p_description,
    p_location,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326),
    p_trades,
    p_sub_trades,
    p_job_type,
    p_pay_rate,
    p_pay_min,
    p_pay_max,
    p_required_certs,
    p_status
  )
  RETURNING id INTO v_job_id;

  RETURN v_job_id;
END;
$$;