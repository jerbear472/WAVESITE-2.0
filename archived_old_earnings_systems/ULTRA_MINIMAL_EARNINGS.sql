-- =====================================================
-- ULTRA MINIMAL EARNINGS SYSTEM - NO TABLE ASSUMPTIONS
-- =====================================================

-- Drop old functions safely
DROP FUNCTION IF EXISTS calculate_trend_submission_earnings() CASCADE;
DROP FUNCTION IF EXISTS calculate_validation_earnings() CASCADE;
DROP FUNCTION IF EXISTS get_tier_multiplier(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_session_streak_multiplier(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_daily_streak_multiplier(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_user_earnings_summary(UUID) CASCADE;

-- Remove any existing triggers (safe)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT schemaname, tablename, triggername 
             FROM pg_triggers 
             WHERE triggername LIKE '%earnings%' 
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || r.triggername || ' ON ' || r.schemaname || '.' || r.tablename;
    END LOOP;
END $$;

-- =====================================================
-- CORE EARNINGS FUNCTIONS (NO TABLE DEPENDENCIES)
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
-- EARNINGS CALCULATION FUNCTIONS (APP LEVEL)
-- =====================================================

-- Calculate trend earnings (no database changes)
CREATE OR REPLACE FUNCTION calculate_trend_earnings_amount(
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
    v_tier_multiplier := get_tier_multiplier(p_tier);
    v_session_multiplier := get_session_streak_multiplier(p_session_position);
    v_daily_multiplier := get_daily_streak_multiplier(p_daily_streak);
    v_final_amount := ROUND(v_base_amount * v_tier_multiplier * v_session_multiplier * v_daily_multiplier, 2);
    
    v_description := format(
        'Trend #%s: $%s × %s(%sx) × session(%sx) × %s-day(%sx) = $%s',
        p_session_position, v_base_amount, p_tier, v_tier_multiplier,
        v_session_multiplier, p_daily_streak, v_daily_multiplier, v_final_amount
    );
    
    RETURN QUERY SELECT v_base_amount, v_tier_multiplier, v_session_multiplier, v_daily_multiplier, v_final_amount, v_description;
END;
$$ LANGUAGE plpgsql;

-- Calculate validation earnings (no database changes) 
CREATE OR REPLACE FUNCTION calculate_validation_earnings_amount(
    p_tier TEXT DEFAULT 'learning'
) RETURNS DECIMAL AS $$
DECLARE
    v_base_amount DECIMAL(10,2) := 0.02; -- FIXED: $0.02 per validation
    v_tier_multiplier DECIMAL(3,2);
BEGIN
    v_tier_multiplier := get_tier_multiplier(p_tier);
    RETURN ROUND(v_base_amount * v_tier_multiplier, 2);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VALIDATION EARNINGS: $0.02 BASE RATE
-- =====================================================

-- Example usage function for validation earnings
CREATE OR REPLACE FUNCTION get_validation_rate_examples()
RETURNS TABLE (
    tier TEXT,
    multiplier DECIMAL,
    earning_amount DECIMAL,
    description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.tier_name::TEXT,
        get_tier_multiplier(t.tier_name),
        calculate_validation_earnings_amount(t.tier_name),
        format('$0.02 × %s tier (%sx) = $%s', 
               t.tier_name, 
               get_tier_multiplier(t.tier_name),
               calculate_validation_earnings_amount(t.tier_name))
    FROM (VALUES 
        ('learning'),
        ('verified'), 
        ('elite'),
        ('master'),
        ('restricted')
    ) AS t(tier_name);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TREND EARNINGS: $0.25 BASE RATE  
-- =====================================================

-- Example usage function for trend earnings
CREATE OR REPLACE FUNCTION get_trend_rate_examples()
RETURNS TABLE (
    scenario TEXT,
    tier TEXT,
    session_pos INTEGER,
    daily_streak INTEGER,
    final_amount DECIMAL,
    description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.scenario_name::TEXT,
        s.tier_name::TEXT,
        s.session_position,
        s.daily_streak_days,
        (calculate_trend_earnings_amount(s.tier_name, s.session_position, s.daily_streak_days)).final_amount,
        (calculate_trend_earnings_amount(s.tier_name, s.session_position, s.daily_streak_days)).description
    FROM (VALUES 
        ('Basic submission', 'learning', 1, 0),
        ('Session streak', 'learning', 3, 0),
        ('Daily streak', 'learning', 1, 7),
        ('Both streaks', 'verified', 3, 7),
        ('Max multipliers', 'master', 5, 30)
    ) AS s(scenario_name, tier_name, session_position, daily_streak_days);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Ultra minimal earnings system installed!';
    RAISE NOTICE '';
    RAISE NOTICE '💰 FIXED RATES:';
    RAISE NOTICE '   - Trend base: $0.25 (was inconsistent)';
    RAISE NOTICE '   - Validation base: $0.02 (was $0.10)';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 CALCULATION FUNCTIONS:';
    RAISE NOTICE '   - calculate_trend_earnings_amount(tier, session_pos, daily_streak)';
    RAISE NOTICE '   - calculate_validation_earnings_amount(tier)';
    RAISE NOTICE '';
    RAISE NOTICE '📊 EXAMPLE FUNCTIONS:';
    RAISE NOTICE '   - SELECT * FROM get_validation_rate_examples();';
    RAISE NOTICE '   - SELECT * FROM get_trend_rate_examples();';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 NO TRIGGERS - App manages earnings flow manually';
    RAISE NOTICE '📋 Check table structure: CHECK_TREND_VALIDATIONS_STRUCTURE.sql';
END $$;