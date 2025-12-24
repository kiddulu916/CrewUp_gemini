-- Convert trade and sub_trade to arrays to support multiple trades per job
-- This allows employers to post jobs requiring multiple types of tradesmen

-- First, create new array columns
ALTER TABLE jobs
ADD COLUMN trades TEXT[],
ADD COLUMN sub_trades TEXT[];

-- Migrate existing data from single trade/sub_trade to arrays
UPDATE jobs
SET trades = ARRAY[trade]
WHERE trade IS NOT NULL;

UPDATE jobs
SET sub_trades = CASE
  WHEN sub_trade IS NOT NULL THEN ARRAY[sub_trade]
  ELSE ARRAY[]::TEXT[]
END;

-- Make trades column NOT NULL (jobs must have at least one trade)
ALTER TABLE jobs
ALTER COLUMN trades SET NOT NULL;

-- Set default for sub_trades
ALTER TABLE jobs
ALTER COLUMN sub_trades SET DEFAULT ARRAY[]::TEXT[];

-- Add comments
COMMENT ON COLUMN jobs.trades IS 'Array of trade categories needed for this job (e.g., ["Carpenter", "Electrician"])';
COMMENT ON COLUMN jobs.sub_trades IS 'Array of specialty subcategories needed (optional)';

-- Note: Keep old columns for now for backward compatibility
-- They can be removed in a future migration after confirming everything works
COMMENT ON COLUMN jobs.trade IS 'DEPRECATED: Use trades array instead';
COMMENT ON COLUMN jobs.sub_trade IS 'DEPRECATED: Use sub_trades array instead';
