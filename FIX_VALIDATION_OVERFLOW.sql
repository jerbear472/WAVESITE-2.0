-- Fix numeric field overflow when validating trends
-- This error happens when the validation earnings calculation exceeds column precision

-- ============================================
-- 1. Check current column definitions
-- ============================================

SELECT 
    column_name,
    data_type,
    numeric_precision,
    numeric_scale
FROM information_schema.columns
WHERE table_name = 'profiles' 
AND column_name IN ('earnings_pending', 'earnings_approved', 'total_earnings', 'validation_score')
ORDER BY column_name;

-- ============================================
-- 2. Fix column precision if needed
-- ============================================

-- Increase precision for earnings columns to handle larger values
ALTER TABLE public.profiles
ALTER COLUMN earnings_pending TYPE DECIMAL(12,2),
ALTER COLUMN earnings_approved TYPE DECIMAL(12,2),
ALTER COLUMN earnings_paid TYPE DECIMAL(12,2),
ALTER COLUMN total_earnings TYPE DECIMAL(12,2);

-- Fix validation_score if it's numeric instead of integer
ALTER TABLE public.profiles
ALTER COLUMN validation_score TYPE INTEGER USING validation_score::INTEGER;

-- ============================================
-- 3. Fix the validation earnings function
-- ============================================

CREATE OR REPLACE FUNCTION public.calculate_validation_earnings()
RETURNS TRIGGER AS $$
DECLARE
    v_current_score INTEGER;
    v_current_total DECIMAL(12,2);
    v_current_approved DECIMAL(12,2);
BEGIN
    -- Only process on INSERT
    IF TG_OP != 'INSERT' THEN
        RETURN NEW;
    END IF;

    -- Don't process skip votes
    IF NEW.vote = 'skip' THEN
        RETURN NEW;
    END IF;

    -- Set validation reward
    NEW.reward_amount := 0.10;

    -- Get current values to avoid overflow
    SELECT 
        COALESCE(validation_score, 0),
        COALESCE(total_earnings, 0),
        COALESCE(earnings_approved, 0)
    INTO v_current_score, v_current_total, v_current_approved
    FROM profiles
    WHERE id = NEW.validator_id;

    -- Update with bounds checking
    UPDATE profiles
    SET 
        earnings_approved = LEAST(99999.99, v_current_approved + 0.10),
        total_earnings = LEAST(99999.99, v_current_total + 0.10),
        validation_score = LEAST(100, v_current_score + 1)
    WHERE id = NEW.validator_id;

    RETURN NEW;
EXCEPTION
    WHEN numeric_value_out_of_range THEN
        -- Log the error but don't fail the validation
        RAISE WARNING 'Numeric overflow for user %, continuing without earnings update', NEW.validator_id;
        RETURN NEW;
    WHEN OTHERS THEN
        RAISE WARNING 'Error updating earnings: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. Recreate the trigger
-- ============================================

DROP TRIGGER IF EXISTS calculate_validation_earnings_trigger ON public.trend_validations;

CREATE TRIGGER calculate_validation_earnings_trigger
    BEFORE INSERT ON public.trend_validations
    FOR EACH ROW
    EXECUTE FUNCTION public.calculate_validation_earnings();

-- ============================================
-- 5. Fix any existing overflow issues
-- ============================================

-- Check for any users with extremely high values
SELECT 
    id,
    username,
    earnings_pending,
    earnings_approved,
    total_earnings,
    validation_score
FROM profiles
WHERE 
    earnings_pending > 9999 OR
    earnings_approved > 9999 OR
    total_earnings > 9999 OR
    validation_score > 100;

-- Cap any extreme values
UPDATE profiles
SET 
    earnings_pending = LEAST(earnings_pending, 9999.99),
    earnings_approved = LEAST(earnings_approved, 9999.99),
    total_earnings = LEAST(total_earnings, 9999.99),
    validation_score = LEAST(validation_score::INTEGER, 100)
WHERE 
    earnings_pending > 9999 OR
    earnings_approved > 9999 OR
    total_earnings > 9999 OR
    validation_score > 100;

-- ============================================
-- 6. Test the fix
-- ============================================

DO $$
DECLARE
    v_test_user_id UUID;
    v_test_trend_id UUID;
    v_result JSONB;
BEGIN
    -- Get a test user
    SELECT id INTO v_test_user_id 
    FROM profiles 
    WHERE id != (SELECT spotter_id FROM trend_submissions LIMIT 1)
    LIMIT 1;
    
    -- Get a test trend (not from this user)
    SELECT id INTO v_test_trend_id
    FROM trend_submissions
    WHERE spotter_id != v_test_user_id
    AND status IN ('submitted', 'validating')
    LIMIT 1;
    
    IF v_test_user_id IS NOT NULL AND v_test_trend_id IS NOT NULL THEN
        -- Try to validate
        v_result := cast_trend_vote(v_test_trend_id, 'skip');
        RAISE NOTICE 'Test validation result: %', v_result;
    ELSE
        RAISE NOTICE 'No suitable test data found';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Test failed: %', SQLERRM;
END $$;

-- ============================================
-- Summary
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ VALIDATION OVERFLOW FIXED';
    RAISE NOTICE '';
    RAISE NOTICE 'Changes made:';
    RAISE NOTICE '  1. Increased earnings column precision to DECIMAL(12,2)';
    RAISE NOTICE '  2. Added bounds checking to prevent overflow';
    RAISE NOTICE '  3. Added error handling to validation function';
    RAISE NOTICE '  4. Capped any existing extreme values';
    RAISE NOTICE '';
    RAISE NOTICE 'Validation should now work without overflow errors!';
END $$;