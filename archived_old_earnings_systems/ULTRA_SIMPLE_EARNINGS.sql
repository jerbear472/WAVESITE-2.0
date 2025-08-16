-- =====================================================
-- ULTRA SIMPLE EARNINGS - NO COLUMN DEPENDENCIES
-- =====================================================

-- Create earnings ledger table
CREATE TABLE IF NOT EXISTS earnings_ledger (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    amount DECIMAL(10,2) DEFAULT 0.25,
    type TEXT DEFAULT 'trend_submission',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user profiles table  
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id UUID PRIMARY KEY,
    pending_earnings DECIMAL(10,2) DEFAULT 0.00,
    total_earned DECIMAL(10,2) DEFAULT 0.00
);

-- Add earnings column safely
DO $$
BEGIN
    BEGIN
        ALTER TABLE trend_submissions ADD COLUMN earnings DECIMAL(10,2) DEFAULT 0.25;
    EXCEPTION WHEN duplicate_column THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE trend_submissions ADD COLUMN evidence JSONB;
    EXCEPTION WHEN duplicate_column THEN
        NULL;
    END;
END $$;

-- Simple trigger function
CREATE OR REPLACE FUNCTION add_earnings()
RETURNS TRIGGER AS $$
BEGIN
    -- Add to earnings ledger
    INSERT INTO earnings_ledger (user_id, amount)
    VALUES (NEW.spotter_id, 0.25);
    
    -- Update user profile
    INSERT INTO user_profiles (user_id, pending_earnings, total_earned)
    VALUES (NEW.spotter_id, 0.25, 0.25)
    ON CONFLICT (user_id) DO UPDATE
    SET 
        pending_earnings = user_profiles.pending_earnings + 0.25,
        total_earned = user_profiles.total_earned + 0.25;
    
    -- Set earnings on trend
    NEW.earnings := 0.25;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS add_earnings_trigger ON trend_submissions;
CREATE TRIGGER add_earnings_trigger
    BEFORE INSERT ON trend_submissions
    FOR EACH ROW
    EXECUTE FUNCTION add_earnings();

-- Grant permissions
GRANT ALL ON earnings_ledger TO authenticated;
GRANT ALL ON user_profiles TO authenticated;

-- Done
SELECT 'Earnings system installed' as status;