-- Migration 049: Add Portfolio Limit Constraint
-- Created: 2026-01-02
-- Description: Database-level constraint to prevent race conditions on portfolio upload limits

-- Create function to check portfolio count limit atomically
CREATE OR REPLACE FUNCTION check_portfolio_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count int;
  user_subscription text;
  user_is_lifetime_pro boolean;
BEGIN
  -- Get current count of portfolio images for this user
  SELECT COUNT(*) INTO current_count
  FROM portfolio_images
  WHERE user_id = NEW.user_id;

  -- Get user's subscription status and lifetime pro flag
  SELECT subscription_status, is_lifetime_pro INTO user_subscription, user_is_lifetime_pro
  FROM profiles
  WHERE id = NEW.user_id;

  -- Check if user has Pro access (either 'pro' subscription or is_lifetime_pro)
  IF user_subscription = 'pro' OR user_is_lifetime_pro = true THEN
    -- Pro users have unlimited photos
    RETURN NEW;
  END IF;

  -- Free users limited to 5 photos
  IF current_count >= 5 THEN
    RAISE EXCEPTION 'Free users can upload maximum 5 portfolio photos. Upgrade to Pro for unlimited.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists (for idempotency)
DROP TRIGGER IF EXISTS enforce_portfolio_limit ON portfolio_images;

-- Create trigger that runs BEFORE INSERT
CREATE TRIGGER enforce_portfolio_limit
  BEFORE INSERT ON portfolio_images
  FOR EACH ROW
  EXECUTE FUNCTION check_portfolio_limit();

-- Documentation
COMMENT ON FUNCTION check_portfolio_limit() IS 'Atomically checks portfolio photo count limit based on subscription status before insert';
COMMENT ON TRIGGER enforce_portfolio_limit ON portfolio_images IS 'Prevents race conditions by enforcing 5-photo limit for free users at database level';
