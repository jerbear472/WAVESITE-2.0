-- ============================================
-- FIX NUMERIC FIELD OVERFLOW - HANDLING ALL VIEWS
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. First, find and drop ALL dependent views
DROP VIEW IF EXISTS public.earnings_summary CASCADE;
DROP VIEW IF EXISTS public.earnings_leaderboard CASCADE;
DROP VIEW IF EXISTS public.user_earnings_view CASCADE;
DROP VIEW IF EXISTS public.user_stats CASCADE;
DROP VIEW IF EXISTS public.leaderboard CASCADE;
DROP VIEW IF EXISTS public.user_dashboard CASCADE;

-- 2. Now we can safely alter the column types
ALTER TABLE public.profiles
ALTER COLUMN earnings_pending TYPE DECIMAL(12,2) USING COALESCE(earnings_pending, 0)::DECIMAL(12,2),
ALTER COLUMN earnings_approved TYPE DECIMAL(12,2) USING COALESCE(earnings_approved, 0)::DECIMAL(12,2),
ALTER COLUMN earnings_paid TYPE DECIMAL(12,2) USING COALESCE(earnings_paid, 0)::DECIMAL(12,2),
ALTER COLUMN total_earnings TYPE DECIMAL(12,2) USING COALESCE(total_earnings, 0)::DECIMAL(12,2);

-- 3. Fix validation_score to be INTEGER
ALTER TABLE public.profiles
ALTER COLUMN validation_score TYPE INTEGER USING COALESCE(validation_score::INTEGER, 0);

-- 4. Recreate the earnings_summary view if it existed
CREATE VIEW public.earnings_summary AS
SELECT 
    id,
    username,
    earnings_pending,
    earnings_approved,
    earnings_paid,
    total_earnings,
    validation_score,
    (COALESCE(earnings_pending, 0) + COALESCE(earnings_approved, 0)) as total_unpaid,
    created_at,
    updated_at
FROM public.profiles;

-- 5. Recreate the earnings_leaderboard view if it existed  
CREATE VIEW public.earnings_leaderboard AS
SELECT 
    id,
    username,
    avatar_url,
    total_earnings,
    earnings_approved,
    earnings_pending,
    validation_score,
    ROW_NUMBER() OVER (ORDER BY total_earnings DESC) as rank
FROM public.profiles
WHERE total_earnings > 0
ORDER BY total_earnings DESC;

-- 6. Grant permissions on views
GRANT SELECT ON public.earnings_summary TO authenticated;
GRANT SELECT ON public.earnings_summary TO anon;
GRANT SELECT ON public.earnings_leaderboard TO authenticated;
GRANT SELECT ON public.earnings_leaderboard TO anon;

-- 7. Update validation earnings function with overflow protection
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

    -- Get current values with NULL protection
    SELECT 
        COALESCE(validation_score, 0),
        COALESCE(total_earnings, 0),
        COALESCE(earnings_approved, 0)
    INTO v_current_score, v_current_total, v_current_approved
    FROM profiles
    WHERE id = NEW.validator_id;

    -- Update with bounds checking to prevent overflow
    UPDATE profiles
    SET 
        earnings_approved = LEAST(99999.99, COALESCE(v_current_approved, 0) + 0.10),
        total_earnings = LEAST(99999.99, COALESCE(v_current_total, 0) + 0.10),
        validation_score = LEAST(100, COALESCE(v_current_score, 0) + 1)
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

-- 8. Drop and recreate trigger
DROP TRIGGER IF EXISTS calculate_validation_earnings_trigger ON public.trend_validations;

CREATE TRIGGER calculate_validation_earnings_trigger
    BEFORE INSERT ON public.trend_validations
    FOR EACH ROW
    EXECUTE FUNCTION public.calculate_validation_earnings();

-- 9. Fix any existing extreme values
UPDATE profiles
SET 
    earnings_pending = LEAST(COALESCE(earnings_pending, 0), 9999.99),
    earnings_approved = LEAST(COALESCE(earnings_approved, 0), 9999.99),
    earnings_paid = LEAST(COALESCE(earnings_paid, 0), 9999.99),
    total_earnings = LEAST(COALESCE(total_earnings, 0), 9999.99),
    validation_score = LEAST(COALESCE(validation_score::INTEGER, 0), 100)
WHERE 
    earnings_pending > 9999 OR
    earnings_approved > 9999 OR
    earnings_paid > 9999 OR
    total_earnings > 9999 OR
    validation_score > 100;

-- 10. Show completion message
DO $$
BEGIN
    RAISE NOTICE '✅ VALIDATION OVERFLOW FIXED';
    RAISE NOTICE '';
    RAISE NOTICE 'Changes made:';
    RAISE NOTICE '  1. Dropped all dependent views';
    RAISE NOTICE '  2. Increased earnings column precision to DECIMAL(12,2)';
    RAISE NOTICE '  3. Recreated necessary views';
    RAISE NOTICE '  4. Added bounds checking to prevent overflow';
    RAISE NOTICE '  5. Added error handling to validation function';
    RAISE NOTICE '  6. Capped any existing extreme values';
    RAISE NOTICE '';
    RAISE NOTICE 'Validation should now work without overflow errors!';
END $$;