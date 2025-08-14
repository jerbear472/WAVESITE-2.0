-- =====================================================
-- MINIMAL EARNINGS FIX - Only Essential Functions
-- =====================================================

-- Drop old functions safely
DROP FUNCTION IF EXISTS calculate_trend_submission_earnings() CASCADE;
DROP FUNCTION IF EXISTS calculate_validation_earnings() CASCADE;
DROP FUNCTION IF EXISTS get_tier_multiplier(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_session_streak_multiplier(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_daily_streak_multiplier(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_user_earnings_summary(UUID) CASCADE;

-- Add earnings columns to user_profiles if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_profiles' AND table_schema = 'public') THEN
        ALTER TABLE user_profiles 
        ADD COLUMN IF NOT EXISTS pending_earnings DECIMAL(10,2) DEFAULT 0.00,
        ADD COLUMN IF NOT EXISTS approved_earnings DECIMAL(10,2) DEFAULT 0.00,
        ADD COLUMN IF NOT EXISTS session_streak INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS last_submission_at TIMESTAMP WITH TIME ZONE;
        
        RAISE NOTICE 'Added earnings columns to user_profiles';
    ELSE
        RAISE NOTICE 'user_profiles table not found';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error adding columns: %', SQLERRM;
END $$;

-- =====================================================
-- CORE FUNCTIONS (No table dependencies)
-- =====================================================

CREATE OR REPLACE FUNCTION get_tier_multiplier(p_tier TEXT)
RETURNS DECIMAL AS $$
BEGIN
    RETURN CASE p_tier
        WHEN 'master' THEN 3.0
        WHEN 'elite' THEN 2.0
        WHEN 'verified' THEN 1.5
        WHEN 'learning' THEN 1.0
        WHEN 'restricted' THEN 0.5
        ELSE 1.0
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION get_session_streak_multiplier(p_session_position INTEGER)
RETURNS DECIMAL AS $$
BEGIN
    RETURN CASE
        WHEN p_session_position >= 5 THEN 2.5
        WHEN p_session_position = 4 THEN 2.0
        WHEN p_session_position = 3 THEN 1.5
        WHEN p_session_position = 2 THEN 1.2
        ELSE 1.0
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION get_daily_streak_multiplier(p_daily_streak INTEGER)
RETURNS DECIMAL AS $$
BEGIN
    RETURN CASE
        WHEN p_daily_streak >= 30 THEN 2.5
        WHEN p_daily_streak >= 14 THEN 2.0
        WHEN p_daily_streak >= 7 THEN 1.5
        WHEN p_daily_streak >= 2 THEN 1.2
        ELSE 1.0
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- EARNINGS CALCULATION FUNCTION (App Level)
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_trend_earnings(
    p_user_id UUID,
    p_tier TEXT DEFAULT 'learning',
    p_session_position INTEGER DEFAULT 1,
    p_daily_streak INTEGER DEFAULT 0
) RETURNS TABLE (
    base_amount DECIMAL,
    tier_multiplier DECIMAL,
    session_multiplier DECIMAL,
    daily_multiplier DECIMAL,
    final_amount DECIMAL,
    description TEXT
) AS $$
DECLARE
    v_base_amount DECIMAL(10,2) := 0.25;
    v_tier_multiplier DECIMAL(3,2);
    v_session_multiplier DECIMAL(3,2);
    v_daily_multiplier DECIMAL(3,2);
    v_final_amount DECIMAL(10,2);
    v_description TEXT;
BEGIN
    -- Calculate multipliers
    v_tier_multiplier := get_tier_multiplier(p_tier);
    v_session_multiplier := get_session_streak_multiplier(p_session_position);
    v_daily_multiplier := get_daily_streak_multiplier(p_daily_streak);
    
    -- Calculate final amount
    v_final_amount := ROUND(v_base_amount * v_tier_multiplier * v_session_multiplier * v_daily_multiplier, 2);
    
    -- Build description
    v_description := format(
        'Trend #%s: $%s × %s(%sx) × session(%sx) × %s-day(%sx) = $%s',
        p_session_position,
        v_base_amount,
        p_tier,
        v_tier_multiplier,
        v_session_multiplier,
        p_daily_streak,
        v_daily_multiplier,
        v_final_amount
    );
    
    RETURN QUERY SELECT 
        v_base_amount,
        v_tier_multiplier,
        v_session_multiplier,
        v_daily_multiplier,
        v_final_amount,
        v_description;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VALIDATION EARNINGS FUNCTION (App Level) 
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_validation_earnings(
    p_user_id UUID,
    p_tier TEXT DEFAULT 'learning'
) RETURNS DECIMAL AS $$
DECLARE
    v_base_amount DECIMAL(10,2) := 0.02; -- FIXED: $0.02 per validation
    v_tier_multiplier DECIMAL(3,2);
    v_final_amount DECIMAL(10,2);
BEGIN
    v_tier_multiplier := get_tier_multiplier(p_tier);
    v_final_amount := ROUND(v_base_amount * v_tier_multiplier, 2);
    
    RETURN v_final_amount;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- MANUAL EARNINGS FUNCTIONS (For App to Call)
-- =====================================================

CREATE OR REPLACE FUNCTION add_pending_earnings(
    p_user_id UUID,
    p_amount DECIMAL,
    p_description TEXT DEFAULT 'Trend submission'
) RETURNS BOOLEAN AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    -- Check if user_profiles table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'user_profiles' AND table_schema = 'public'
    ) INTO v_exists;
    
    IF NOT v_exists THEN
        RAISE NOTICE 'user_profiles table does not exist';
        RETURN FALSE;
    END IF;
    
    -- Add to pending earnings
    UPDATE user_profiles
    SET 
        pending_earnings = COALESCE(pending_earnings, 0) + p_amount,
        last_active = NOW()
    WHERE user_id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION approve_pending_earnings(
    p_user_id UUID,
    p_amount DECIMAL
) RETURNS BOOLEAN AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    -- Check if user_profiles table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'user_profiles' AND table_schema = 'public'
    ) INTO v_exists;
    
    IF NOT v_exists THEN
        RETURN FALSE;
    END IF;
    
    -- Move from pending to approved
    UPDATE user_profiles
    SET 
        pending_earnings = GREATEST(0, COALESCE(pending_earnings, 0) - p_amount),
        approved_earnings = COALESCE(approved_earnings, 0) + p_amount,
        total_earned = COALESCE(total_earned, 0) + p_amount
    WHERE user_id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cancel_pending_earnings(
    p_user_id UUID,
    p_amount DECIMAL
) RETURNS BOOLEAN AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    -- Check if user_profiles table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'user_profiles' AND table_schema = 'public'
    ) INTO v_exists;
    
    IF NOT v_exists THEN
        RETURN FALSE;
    END IF;
    
    -- Remove from pending earnings
    UPDATE user_profiles
    SET pending_earnings = GREATEST(0, COALESCE(pending_earnings, 0) - p_amount)
    WHERE user_id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION get_tier_multiplier TO authenticated;
GRANT EXECUTE ON FUNCTION get_session_streak_multiplier TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_streak_multiplier TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_trend_earnings TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_validation_earnings TO authenticated;
GRANT EXECUTE ON FUNCTION add_pending_earnings TO authenticated;
GRANT EXECUTE ON FUNCTION approve_pending_earnings TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_pending_earnings TO authenticated;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Minimal earnings system installed!';
    RAISE NOTICE '💰 Functions available:';
    RAISE NOTICE '  - calculate_trend_earnings(user_id, tier, session_pos, daily_streak)';
    RAISE NOTICE '  - calculate_validation_earnings(user_id, tier) -> $0.02 base';
    RAISE NOTICE '  - add_pending_earnings(user_id, amount, description)';
    RAISE NOTICE '  - approve_pending_earnings(user_id, amount)';
    RAISE NOTICE '  - cancel_pending_earnings(user_id, amount)';
    RAISE NOTICE '🔧 No triggers - earnings managed at app level';
    RAISE NOTICE '📊 Check actual tables with CHECK_ACTUAL_TABLES.sql';
END $$;