-- Create function to safely increment earnings_pending
CREATE OR REPLACE FUNCTION increment_earnings_pending(x DECIMAL)
RETURNS DECIMAL
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN COALESCE(earnings_pending, 0) + x;
END;
$$;

-- Make sure the profiles table has all necessary columns
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS earnings_pending DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS earnings_approved DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS earnings_paid DECIMAL(10,2) DEFAULT 0;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_earnings_ledger_user_id ON earnings_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_earnings_ledger_trend_id ON earnings_ledger(trend_id);
CREATE INDEX IF NOT EXISTS idx_earnings_ledger_status ON earnings_ledger(status);

-- Grant permissions
GRANT EXECUTE ON FUNCTION increment_earnings_pending(DECIMAL) TO authenticated;