-- =====================================================
-- ADD EARNINGS TRIGGER FOR TREND_SUBMISSIONS TABLE
-- =====================================================
-- This ensures earnings are calculated when trends are
-- submitted to the trend_submissions table
-- =====================================================

-- First, ensure we have the necessary functions (they should exist from other migrations)
-- Just check if they exist, don't recreate

-- Drop any existing trigger on trend_submissions
DROP TRIGGER IF EXISTS calculate_trend_submission_earnings_trigger ON trend_submissions;
DROP TRIGGER IF EXISTS calculate_trend_earnings_trigger ON trend_submissions;

-- Create the trigger for trend_submissions table
CREATE TRIGGER calculate_trend_submission_earnings_trigger
    BEFORE INSERT ON trend_submissions
    FOR EACH ROW
    EXECUTE FUNCTION calculate_trend_submission_earnings();

-- Also ensure the columns exist on trend_submissions for storing multipliers
ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS session_position INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS session_multiplier DECIMAL(3,2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS daily_multiplier DECIMAL(3,2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS tier_multiplier DECIMAL(3,2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS earnings DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS earnings_status TEXT DEFAULT 'pending';

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON trend_submissions TO authenticated;
GRANT SELECT ON trend_submissions TO anon;

-- Notify that migration is complete
DO $$
BEGIN
    RAISE NOTICE '✅ Earnings trigger added to trend_submissions table';
    RAISE NOTICE '📊 Multipliers will be calculated automatically on insert';
    RAISE NOTICE '💰 Base: $0.25 × tier × session × daily streak';
END $$;