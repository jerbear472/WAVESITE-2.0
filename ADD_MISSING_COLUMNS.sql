-- ADD ANY MISSING COLUMNS THAT MIGHT BE CAUSING THE ISSUE

-- 1. Check and add missing columns to trend_submissions
ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS approve_count INTEGER DEFAULT 0;

ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS reject_count INTEGER DEFAULT 0;

ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS validation_count INTEGER DEFAULT 0;

ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS validation_status TEXT;

-- 2. Check and add missing columns to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS earnings_pending DECIMAL(10,2) DEFAULT 0;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS total_earnings DECIMAL(10,2) DEFAULT 0;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS awaiting_verification DECIMAL(10,2) DEFAULT 0;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS earnings_approved DECIMAL(10,2) DEFAULT 0;

-- 3. Ensure trend_validations has all required columns
ALTER TABLE trend_validations
ADD COLUMN IF NOT EXISTS vote TEXT;

-- Add check constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'trend_validations_vote_check'
    ) THEN
        ALTER TABLE trend_validations 
        ADD CONSTRAINT trend_validations_vote_check 
        CHECK (vote IN ('verify', 'reject'));
    END IF;
END $$;

-- 4. Create a simple test function to verify everything works
CREATE OR REPLACE FUNCTION test_vote_system()
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_test_result JSON;
BEGIN
    -- Test 1: Check if we can read from trend_submissions
    IF NOT EXISTS (SELECT 1 FROM trend_submissions LIMIT 1) THEN
        RETURN json_build_object('error', 'No trends in database');
    END IF;
    
    -- Test 2: Check if user is authenticated
    IF auth.uid() IS NULL THEN
        RETURN json_build_object('error', 'No authenticated user');
    END IF;
    
    -- Test 3: Check if we can query trend_validations
    PERFORM COUNT(*) FROM trend_validations;
    
    -- Test 4: Check if profiles table is accessible
    PERFORM COUNT(*) FROM profiles WHERE id = auth.uid();
    
    RETURN json_build_object(
        'success', true,
        'message', 'All tables are accessible',
        'user_id', auth.uid()
    );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'error', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION test_vote_system TO authenticated;

-- Run the test
SELECT test_vote_system();

-- Show final status
SELECT 
    'Columns added/verified' as status,
    'Please try voting again' as action;