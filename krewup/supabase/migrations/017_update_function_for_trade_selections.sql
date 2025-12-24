-- Drop the existing function (we know there's only one version now)
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
  p_time_length text,
  p_trades text[],
  p_sub_trades text[]
);

-- Create new version with trade_selections JSONB parameter
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
  p_trades TEXT[] DEFAULT NULL, -- Keep for backward compatibility
  p_sub_trades TEXT[] DEFAULT NULL, -- Keep for backward compatibility
  p_trade_selections JSONB DEFAULT NULL -- New: structured trade selections
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  new_job_id UUID;
  final_trades TEXT[];
  final_sub_trades TEXT[];
  final_trade_selections JSONB;
BEGIN
  -- Use p_trade_selections if provided, otherwise build from arrays for backward compatibility
  IF p_trade_selections IS NOT NULL THEN
    final_trade_selections := p_trade_selections;
    -- Extract first trade for backward compatibility column
    final_trades := ARRAY[(p_trade_selections->0->>'trade')];
  ELSIF p_trades IS NOT NULL AND array_length(p_trades, 1) > 0 THEN
    -- Build from arrays (backward compatibility)
    final_trades := p_trades;
    final_trade_selections := jsonb_build_array(
      jsonb_build_object(
        'trade', p_trades[1],
        'subTrades', COALESCE(p_sub_trades, ARRAY[]::TEXT[])
      )
    );
  ELSE
    -- Build from single values (backward compatibility)
    final_trades := ARRAY[p_trade];
    final_trade_selections := jsonb_build_array(
      jsonb_build_object(
        'trade', p_trade,
        'subTrades', CASE
          WHEN p_sub_trade IS NOT NULL THEN jsonb_build_array(p_sub_trade)
          ELSE '[]'::jsonb
        END
      )
    );
  END IF;

  -- Extract all trades for trades array column
  IF p_trade_selections IS NOT NULL THEN
    SELECT array_agg(elem->>'trade')
    INTO final_trades
    FROM jsonb_array_elements(p_trade_selections) elem;
  END IF;

  -- Extract all sub_trades for sub_trades array column
  IF p_trade_selections IS NOT NULL THEN
    SELECT array_agg(sub_elem)
    INTO final_sub_trades
    FROM jsonb_array_elements(p_trade_selections) trade_elem,
         jsonb_array_elements_text(trade_elem->'subTrades') sub_elem;
  ELSIF p_sub_trades IS NOT NULL THEN
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
    trades, -- Array column
    sub_trades, -- Array column
    trade_selections, -- New JSONB column with structure
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
    CASE WHEN array_length(final_sub_trades, 1) > 0 THEN final_sub_trades[1] ELSE NULL END,
    final_trades,
    final_sub_trades,
    final_trade_selections,
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

COMMENT ON FUNCTION create_job_with_coords IS 'Creates a job with PostGIS coordinates. Supports structured trade_selections (JSONB) with backward compatibility for arrays.';
