-- =====================================================
-- SYSTEM 1 - UNIFIED EARNINGS STANDARD
-- Version: 1.0.0 FINAL
-- Date: 2025-01-16
-- 
-- This is the ONLY earnings configuration for WaveSight
-- All other systems have been deprecated and removed
-- =====================================================

-- Drop any old/conflicting functions
DROP FUNCTION IF EXISTS get_tier_multiplier CASCADE;
DROP FUNCTION IF EXISTS get_session_streak_multiplier CASCADE;
DROP FUNCTION IF EXISTS get_daily_streak_multiplier CASCADE;

-- =====================================================
-- SYSTEM 1 MULTIPLIER FUNCTIONS
-- =====================================================

-- TIER MULTIPLIERS (System 1 Standard)
CREATE OR REPLACE FUNCTION get_tier_multiplier(p_tier TEXT)
RETURNS DECIMAL AS $$
BEGIN
    RETURN CASE LOWER(COALESCE(p_tier, 'learning'))
        WHEN 'master' THEN 3.0      -- Top 1%
        WHEN 'elite' THEN 2.0        -- Top 5%  
        WHEN 'verified' THEN 1.5     -- Proven
        WHEN 'learning' THEN 1.0     -- Default
        WHEN 'restricted' THEN 0.5   -- Low quality
        ELSE 1.0
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- SESSION STREAK MULTIPLIERS (5-minute window)
CREATE OR REPLACE FUNCTION get_session_streak_multiplier(p_position INTEGER)
RETURNS DECIMAL AS $$
BEGIN
    RETURN CASE
        WHEN p_position >= 5 THEN 2.5  -- 5+ submissions
        WHEN p_position = 4 THEN 2.0   -- 4th submission
        WHEN p_position = 3 THEN 1.5   -- 3rd submission
        WHEN p_position = 2 THEN 1.2   -- 2nd submission
        ELSE 1.0                       -- 1st submission
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- DAILY STREAK MULTIPLIERS (consecutive days)
CREATE OR REPLACE FUNCTION get_daily_streak_multiplier(p_streak INTEGER)
RETURNS DECIMAL AS $$
BEGIN
    RETURN CASE
        WHEN p_streak >= 30 THEN 2.5  -- 30+ days
        WHEN p_streak >= 7 THEN 2.0   -- 7-29 days
        WHEN p_streak >= 3 THEN 1.5   -- 3-6 days
        WHEN p_streak >= 1 THEN 1.2   -- 1-2 days
        ELSE 1.0                      -- 0 days (no streak)
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- DOCUMENTATION
-- =====================================================

COMMENT ON FUNCTION get_tier_multiplier IS 'System 1 Tier Multipliers: Master(3x), Elite(2x), Verified(1.5x), Learning(1x), Restricted(0.5x)';
COMMENT ON FUNCTION get_session_streak_multiplier IS 'System 1 Session Multipliers: 1.0x → 1.2x → 1.5x → 2.0x → 2.5x (5-min window)';
COMMENT ON FUNCTION get_daily_streak_multiplier IS 'System 1 Daily Multipliers: 0 days=1.0x → 1-2 days=1.2x → 3-6 days=1.5x → 7-29 days=2.0x → 30+ days=2.5x';

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION get_tier_multiplier TO authenticated;
GRANT EXECUTE ON FUNCTION get_session_streak_multiplier TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_streak_multiplier TO authenticated;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
    v_test_result DECIMAL;
BEGIN
    -- Test tier multipliers
    v_test_result := get_tier_multiplier('master');
    ASSERT v_test_result = 3.0, 'Master tier should be 3.0x';
    
    v_test_result := get_tier_multiplier('elite');
    ASSERT v_test_result = 2.0, 'Elite tier should be 2.0x';
    
    v_test_result := get_tier_multiplier('verified');
    ASSERT v_test_result = 1.5, 'Verified tier should be 1.5x';
    
    v_test_result := get_tier_multiplier('learning');
    ASSERT v_test_result = 1.0, 'Learning tier should be 1.0x';
    
    v_test_result := get_tier_multiplier('restricted');
    ASSERT v_test_result = 0.5, 'Restricted tier should be 0.5x';
    
    -- Test session multipliers
    ASSERT get_session_streak_multiplier(1) = 1.0, 'Session 1 should be 1.0x';
    ASSERT get_session_streak_multiplier(2) = 1.2, 'Session 2 should be 1.2x';
    ASSERT get_session_streak_multiplier(3) = 1.5, 'Session 3 should be 1.5x';
    ASSERT get_session_streak_multiplier(4) = 2.0, 'Session 4 should be 2.0x';
    ASSERT get_session_streak_multiplier(5) = 2.5, 'Session 5+ should be 2.5x';
    
    -- Test daily multipliers
    ASSERT get_daily_streak_multiplier(0) = 1.0, 'Day 0 should be 1.0x';
    ASSERT get_daily_streak_multiplier(1) = 1.2, 'Day 1-2 should be 1.2x';
    ASSERT get_daily_streak_multiplier(3) = 1.5, 'Day 3-6 should be 1.5x';
    ASSERT get_daily_streak_multiplier(7) = 2.0, 'Day 7-29 should be 2.0x';
    ASSERT get_daily_streak_multiplier(30) = 2.5, 'Day 30+ should be 2.5x';
    
    RAISE NOTICE '✅ SYSTEM 1 MULTIPLIERS VERIFIED';
    RAISE NOTICE '';
    RAISE NOTICE '📊 ACTIVE CONFIGURATION:';
    RAISE NOTICE '  Base: $0.25 per trend';
    RAISE NOTICE '  Tiers: Master(3x), Elite(2x), Verified(1.5x), Learning(1x), Restricted(0.5x)';
    RAISE NOTICE '  Session: 1x → 1.2x → 1.5x → 2x → 2.5x';
    RAISE NOTICE '  Daily: 0d=1x → 1-2d=1.2x → 3-6d=1.5x → 7-29d=2x → 30+d=2.5x';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  All other multiplier systems have been removed.';
    RAISE NOTICE '    This is the ONLY active configuration.';
END $$;