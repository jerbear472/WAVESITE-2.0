-- FIX ALL EARNINGS COLUMN INCONSISTENCIES
-- This ensures all columns match what the frontend expects

-- Step 1: Add all required earnings columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS earnings_pending DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS earnings_approved DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS earnings_paid DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_earnings DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_submissions INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS verified_submissions INTEGER DEFAULT 0;

-- Step 2: Migrate data from old column names if they exist
DO $$
BEGIN
    -- Check if old columns exist and migrate data
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'profiles' 
               AND column_name = 'pending_earnings') THEN
        UPDATE profiles 
        SET earnings_pending = COALESCE(pending_earnings, 0)
        WHERE earnings_pending = 0;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'profiles' 
               AND column_name = 'awaiting_verification') THEN
        UPDATE profiles 
        SET earnings_pending = earnings_pending + COALESCE(awaiting_verification, 0);
    END IF;
END $$;

-- Step 3: Add missing columns to trend_submissions
ALTER TABLE public.trend_submissions
ADD COLUMN IF NOT EXISTS approve_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reject_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS validation_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS validation_status TEXT;

-- Step 4: Ensure trend_validations has correct columns
ALTER TABLE public.trend_validations
ADD COLUMN IF NOT EXISTS trend_submission_id UUID REFERENCES trend_submissions(id),
ADD COLUMN IF NOT EXISTS vote TEXT CHECK (vote IN ('verify', 'reject'));

-- Step 5: Create trigger for automatic earnings on trend submission
CREATE OR REPLACE FUNCTION handle_new_trend_submission()
RETURNS TRIGGER AS $$
BEGIN
    -- Add $1.00 to spotter's pending earnings when they submit a trend
    UPDATE profiles
    SET 
        earnings_pending = COALESCE(earnings_pending, 0) + 1.00,
        total_earnings = COALESCE(total_earnings, 0) + 1.00,
        total_submissions = COALESCE(total_submissions, 0) + 1
    WHERE id = NEW.spotter_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS on_trend_submission_created ON trend_submissions;
CREATE TRIGGER on_trend_submission_created
    AFTER INSERT ON trend_submissions
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_trend_submission();

-- Step 6: Create trigger for validation earnings
CREATE OR REPLACE FUNCTION handle_new_validation()
RETURNS TRIGGER AS $$
BEGIN
    -- Add $0.01 DIRECTLY to validator's APPROVED earnings (no approval needed!)
    UPDATE profiles
    SET 
        earnings_approved = COALESCE(earnings_approved, 0) + 0.01,
        total_earnings = COALESCE(total_earnings, 0) + 0.01
    WHERE id = NEW.validator_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS on_validation_created ON trend_validations;
CREATE TRIGGER on_validation_created
    AFTER INSERT ON trend_validations
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_validation();

-- Step 7: Clean up old columns (commented out for safety - run manually after verification)
-- ALTER TABLE profiles DROP COLUMN IF EXISTS pending_earnings;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS awaiting_verification;

-- Step 8: Update any zero total_earnings from actual earnings
UPDATE profiles p
SET total_earnings = COALESCE(earnings_pending, 0) + 
                     COALESCE(earnings_approved, 0) + 
                     COALESCE(earnings_paid, 0)
WHERE total_earnings = 0 OR total_earnings IS NULL;

-- Verify the structure
SELECT 
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN ('earnings_pending', 'earnings_approved', 'earnings_paid', 'total_earnings', 'total_submissions', 'verified_submissions')
ORDER BY column_name;

SELECT 'Earnings columns fixed successfully!' as status;