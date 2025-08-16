-- FINAL EARNINGS FIX - Run this in Supabase SQL Editor
-- This ensures the earnings system works properly

-- 1. Ensure user_profiles table has all earnings columns
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS pending_earnings DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS approved_earnings DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_earned DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS performance_tier TEXT DEFAULT 'learning',
ADD COLUMN IF NOT EXISTS current_streak INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS session_streak INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS trends_spotted INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_active TIMESTAMPTZ DEFAULT NOW();

-- 2. Create or replace the add_pending_earnings function
CREATE OR REPLACE FUNCTION add_pending_earnings(
    p_user_id UUID,
    p_amount DECIMAL,
    p_description TEXT DEFAULT 'Trend submission'
) RETURNS BOOLEAN AS $$
BEGIN
    -- Update user_profiles using 'id' column (the actual primary key)
    UPDATE user_profiles
    SET 
        pending_earnings = COALESCE(pending_earnings, 0) + p_amount,
        total_earned = COALESCE(total_earned, 0) + p_amount,
        last_active = NOW()
    WHERE id = p_user_id;  -- Using 'id' not 'user_id'
    
    -- If no row was updated, create one
    IF NOT FOUND THEN
        INSERT INTO user_profiles (
            id,  -- Using 'id' not 'user_id'
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

-- 3. Grant permission
GRANT EXECUTE ON FUNCTION add_pending_earnings TO authenticated;

-- 4. Create trigger to auto-add earnings on trend submission
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
    WHERE id = NEW.spotter_id;  -- Using 'id' not 'user_id'
    
    -- Calculate tier multiplier
    CASE v_user_tier
        WHEN 'master' THEN v_tier_multiplier := 3.0;
        WHEN 'elite' THEN v_tier_multiplier := 2.0;
        WHEN 'verified' THEN v_tier_multiplier := 1.5;
        WHEN 'restricted' THEN v_tier_multiplier := 0.5;
        ELSE v_tier_multiplier := 1.0; -- learning
    END CASE;
    
    -- Calculate final amount
    v_amount := v_amount * v_tier_multiplier;
    
    -- Add to user's pending earnings
    UPDATE user_profiles
    SET 
        pending_earnings = COALESCE(pending_earnings, 0) + v_amount,
        total_earned = COALESCE(total_earned, 0) + v_amount,
        trends_spotted = COALESCE(trends_spotted, 0) + 1,
        last_active = NOW()
    WHERE id = NEW.spotter_id;  -- Using 'id' not 'user_id'
    
    -- If no row exists, create one
    IF NOT FOUND THEN
        INSERT INTO user_profiles (
            id,  -- Using 'id' not 'user_id'
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

-- 5. Drop and recreate the trigger
DROP TRIGGER IF EXISTS on_trend_submission_add_earnings ON trend_submissions;

CREATE TRIGGER on_trend_submission_add_earnings
AFTER INSERT ON trend_submissions
FOR EACH ROW
EXECUTE FUNCTION auto_add_submission_earnings();

-- 6. Recalculate all pending earnings from earnings_ledger for accuracy
UPDATE user_profiles up
SET pending_earnings = (
    SELECT COALESCE(SUM(amount), 0)
    FROM earnings_ledger
    WHERE user_id = up.id  -- Using 'id' not 'user_id'
    AND status IN ('pending', 'awaiting_validation')
);

-- 7. Test - Check if any users have earnings
SELECT 
    COUNT(*) as users_with_earnings,
    SUM(pending_earnings) as total_pending,
    SUM(total_earned) as total_earned
FROM user_profiles
WHERE pending_earnings > 0 OR total_earned > 0;

-- Success message
DO $$
DECLARE
    v_count INTEGER;
    v_total DECIMAL;
BEGIN
    SELECT COUNT(*), SUM(pending_earnings) 
    INTO v_count, v_total
    FROM user_profiles 
    WHERE pending_earnings > 0;
    
    RAISE NOTICE '✅ EARNINGS SYSTEM FIXED!';
    RAISE NOTICE '   - user_profiles table has earnings columns';
    RAISE NOTICE '   - add_pending_earnings function created';
    RAISE NOTICE '   - Auto-add trigger created for trend_submissions';
    RAISE NOTICE '   - % users have pending earnings totaling $%', v_count, COALESCE(v_total, 0);
    RAISE NOTICE '';
    RAISE NOTICE '🎯 The system will now:';
    RAISE NOTICE '   1. Automatically add earnings when trends are submitted';
    RAISE NOTICE '   2. The app reads from user_profiles table';
    RAISE NOTICE '   3. All queries use id column (not user_id)';
END $$;