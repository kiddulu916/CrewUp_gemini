-- Add JSONB column to store trade selections with their relationships
ALTER TABLE jobs
ADD COLUMN trade_selections JSONB DEFAULT '[]'::JSONB;

COMMENT ON COLUMN jobs.trade_selections IS 'Structured trade selections: [{"trade": "Carpenter", "subTrades": ["Rough Frame", "Finish"]}]';

-- Migrate existing data from trades/sub_trades arrays to structured format
-- This is a best-effort migration - we can't perfectly reconstruct the relationships
-- For existing jobs, we'll create one entry per trade with all sub_trades
UPDATE jobs
SET trade_selections = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'trade', t,
      'subTrades', COALESCE(sub_trades, ARRAY[]::TEXT[])
    )
  )
  FROM unnest(trades) AS t
)
WHERE trades IS NOT NULL AND array_length(trades, 1) > 0;

-- For jobs with no trades array but have the old single trade column
UPDATE jobs
SET trade_selections = jsonb_build_array(
  jsonb_build_object(
    'trade', trade,
    'subTrades', CASE
      WHEN sub_trade IS NOT NULL THEN jsonb_build_array(sub_trade)
      ELSE '[]'::jsonb
    END
  )
)
WHERE (trade_selections IS NULL OR trade_selections = '[]'::jsonb)
  AND trade IS NOT NULL;
