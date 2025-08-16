-- RESTORE EARNINGS SYSTEM
-- This script restores the earnings functionality that was working before

-- 1. Ensure user_profiles has the earnings columns
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS pending_earnings DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS approved_earnings DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_earned DECIMAL(10,2) DEFAULT 0.00;

-- 2. Create the simple add_pending_earnings function
CREATE OR REPLACE FUNCTION add_pending_earnings(
    p_user_id UUID,
    p_amount DECIMAL,
    p_description TEXT DEFAULT 'Trend submission'
) RETURNS BOOLEAN AS $$
BEGIN
    -- Update user_profiles directly
    UPDATE user_profiles
    SET 
        pending_earnings = COALESCE(pending_earnings, 0) + p_amount,
        total_earned = COALESCE(total_earned, 0) + p_amount,
        last_active = NOW()
    WHERE user_id = p_user_id;
    
    -- If no row was updated, create one
    IF NOT FOUND THEN
        INSERT INTO user_profiles (
            user_id, 
            pending_earnings,
            total_earned,
            performance_tier
        ) VALUES (
            p_user_id,
            p_amount,
            p_amount,
            'learning'
        );
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create a trigger that automatically adds earnings when a trend is submitted
CREATE OR REPLACE FUNCTION auto_add_submission_earnings()
RETURNS TRIGGER AS $$
DECLARE
    v_amount DECIMAL := 0.25; -- Base amount
    v_tier_multiplier DECIMAL := 1.0;
    v_user_tier TEXT;
BEGIN
    -- Get user's tier
    SELECT performance_tier INTO v_user_tier
    FROM user_profiles
    WHERE user_id = NEW.spotter_id;
    
    -- Calculate tier multiplier
    CASE v_user_tier
        WHEN 'master' THEN v_tier_multiplier := 3.0;
        WHEN 'elite' THEN v_tier_multiplier := 2.0;
        WHEN 'verified' THEN v_tier_multiplier := 1.5;
        WHEN 'restricted' THEN v_tier_multiplier := 0.5;
        ELSE v_tier_multiplier := 1.0; -- learning
    END CASE;
    
    -- Calculate final amount (simplified - just base * tier for now)
    v_amount := v_amount * v_tier_multiplier;
    
    -- Add to user's pending earnings
    UPDATE user_profiles
    SET 
        pending_earnings = COALESCE(pending_earnings, 0) + v_amount,
        total_earned = COALESCE(total_earned, 0) + v_amount,
        trends_spotted = COALESCE(trends_spotted, 0) + 1,
        last_active = NOW()
    WHERE user_id = NEW.spotter_id;
    
    -- If no row exists, create one
    IF NOT FOUND THEN
        INSERT INTO user_profiles (
            user_id, 
            pending_earnings,
            total_earned,
            trends_spotted,
            performance_tier
        ) VALUES (
            NEW.spotter_id,
            v_amount,
            v_amount,
            1,
            'learning'
        );
    END IF;
    
    -- Also create an earnings_ledger entry if the table exists
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'earnings_ledger' 
        AND table_schema = 'public'
    ) THEN
        INSERT INTO earnings_ledger (
            user_id,
            trend_id,
            amount,
            type,
            status,
            description
        ) VALUES (
            NEW.spotter_id,
            NEW.id,
            v_amount,
            'trend_submission',
            'pending',
            'Trend submission: ' || COALESCE(NEW.description, 'Untitled')
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_trend_submission_add_earnings ON trend_submissions;

-- 5. Create the trigger
CREATE TRIGGER on_trend_submission_add_earnings
AFTER INSERT ON trend_submissions
FOR EACH ROW
EXECUTE FUNCTION auto_add_submission_earnings();

-- 6. Grant necessary permissions
GRANT EXECUTE ON FUNCTION add_pending_earnings TO authenticated;
GRANT EXECUTE ON FUNCTION auto_add_submission_earnings TO authenticated;

-- 7. Fix any users with NULL earnings
UPDATE user_profiles
SET 
    pending_earnings = COALESCE(pending_earnings, 0),
    approved_earnings = COALESCE(approved_earnings, 0),
    total_earned = COALESCE(total_earned, 0)
WHERE pending_earnings IS NULL 
   OR approved_earnings IS NULL 
   OR total_earned IS NULL;

-- 8. Create a simple function to get user's current earnings
CREATE OR REPLACE FUNCTION get_user_earnings(p_user_id UUID)
RETURNS TABLE(
    pending DECIMAL,
    approved DECIMAL,
    total DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(pending_earnings, 0.00) as pending,
        COALESCE(approved_earnings, 0.00) as approved,
        COALESCE(total_earned, 0.00) as total
    FROM user_profiles
    WHERE user_id = p_user_id;
    
    -- If no row found, return zeros
    IF NOT FOUND THEN
        RETURN QUERY SELECT 0.00::DECIMAL, 0.00::DECIMAL, 0.00::DECIMAL;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_earnings TO authenticated;

-- Test output
DO $$
BEGIN
    RAISE NOTICE '✅ EARNINGS SYSTEM RESTORED';
    RAISE NOTICE '   - user_profiles table has earnings columns';
    RAISE NOTICE '   - add_pending_earnings function created';
    RAISE NOTICE '   - Auto-add trigger created for trend_submissions';
    RAISE NOTICE '   - get_user_earnings function created';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 The system will now:';
    RAISE NOTICE '   1. Automatically add $0.25 * tier_multiplier when trends are submitted';
    RAISE NOTICE '   2. Update pending_earnings in user_profiles';
    RAISE NOTICE '   3. Create earnings_ledger entries';
    RAISE NOTICE '';
    RAISE NOTICE '📝 To manually add earnings, use:';
    RAISE NOTICE '   SELECT add_pending_earnings(user_id, amount, description);';
END $$;