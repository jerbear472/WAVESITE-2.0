-- =====================================================
-- FIX LEVEL CALCULATION IN DATABASE
-- Ensures levels are calculated correctly based on XP
-- =====================================================

BEGIN;

-- 1. Create function to calculate level from XP
CREATE OR REPLACE FUNCTION calculate_level_from_xp(p_xp INTEGER)
RETURNS TABLE (
    level INTEGER,
    title TEXT,
    emoji TEXT
) AS $$
BEGIN
    -- Level thresholds and titles
    IF p_xp >= 12500 THEN
        RETURN QUERY SELECT 15, 'Legend'::TEXT, '⭐'::TEXT;
    ELSIF p_xp >= 10000 THEN
        RETURN QUERY SELECT 14, 'Master'::TEXT, '🏆'::TEXT;
    ELSIF p_xp >= 8000 THEN
        RETURN QUERY SELECT 13, 'Visionary'::TEXT, '✨'::TEXT;
    ELSIF p_xp >= 6600 THEN
        RETURN QUERY SELECT 12, 'Pioneer'::TEXT, '🚀'::TEXT;
    ELSIF p_xp >= 5500 THEN
        RETURN QUERY SELECT 11, 'Authority'::TEXT, '👑'::TEXT;
    ELSIF p_xp >= 4500 THEN
        RETURN QUERY SELECT 10, 'Researcher'::TEXT, '🔬'::TEXT;
    ELSIF p_xp >= 3600 THEN
        RETURN QUERY SELECT 9, 'Scholar'::TEXT, '📚'::TEXT;
    ELSIF p_xp >= 2800 THEN
        RETURN QUERY SELECT 8, 'Expert'::TEXT, '🧠'::TEXT;
    ELSIF p_xp >= 2100 THEN
        RETURN QUERY SELECT 7, 'Specialist'::TEXT, '🎯'::TEXT;
    ELSIF p_xp >= 1500 THEN
        RETURN QUERY SELECT 6, 'Interpreter'::TEXT, '🔬'::TEXT;
    ELSIF p_xp >= 1000 THEN
        RETURN QUERY SELECT 5, 'Analyst'::TEXT, '📊'::TEXT;
    ELSIF p_xp >= 600 THEN
        RETURN QUERY SELECT 4, 'Spotter'::TEXT, '📍'::TEXT;
    ELSIF p_xp >= 300 THEN
        RETURN QUERY SELECT 3, 'Tracker'::TEXT, '🔍'::TEXT;
    ELSIF p_xp >= 100 THEN
        RETURN QUERY SELECT 2, 'Recorder'::TEXT, '📝'::TEXT;
    ELSE
        RETURN QUERY SELECT 1, 'Observer'::TEXT, '👁️'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Update user_xp table with correct levels
UPDATE user_xp ux
SET 
    current_level = (SELECT level FROM calculate_level_from_xp(ux.total_xp)),
    updated_at = NOW()
WHERE ux.total_xp > 0;

-- 3. Recreate user_xp_summary view with correct level calculation
CREATE OR REPLACE VIEW user_xp_summary AS
SELECT 
    u.id as user_id,
    u.username,
    COALESCE(ux.total_xp, 0) as total_xp,
    (SELECT level FROM calculate_level_from_xp(COALESCE(ux.total_xp, 0))) as level,
    (SELECT title FROM calculate_level_from_xp(COALESCE(ux.total_xp, 0))) as level_title,
    (SELECT emoji FROM calculate_level_from_xp(COALESCE(ux.total_xp, 0))) as level_emoji,
    -- Calculate XP to next level
    CASE 
        WHEN COALESCE(ux.total_xp, 0) >= 12500 THEN 0  -- Max level
        WHEN COALESCE(ux.total_xp, 0) >= 10000 THEN 12500 - COALESCE(ux.total_xp, 0)
        WHEN COALESCE(ux.total_xp, 0) >= 8000 THEN 10000 - COALESCE(ux.total_xp, 0)
        WHEN COALESCE(ux.total_xp, 0) >= 6600 THEN 8000 - COALESCE(ux.total_xp, 0)
        WHEN COALESCE(ux.total_xp, 0) >= 5500 THEN 6600 - COALESCE(ux.total_xp, 0)
        WHEN COALESCE(ux.total_xp, 0) >= 4500 THEN 5500 - COALESCE(ux.total_xp, 0)
        WHEN COALESCE(ux.total_xp, 0) >= 3600 THEN 4500 - COALESCE(ux.total_xp, 0)
        WHEN COALESCE(ux.total_xp, 0) >= 2800 THEN 3600 - COALESCE(ux.total_xp, 0)
        WHEN COALESCE(ux.total_xp, 0) >= 2100 THEN 2800 - COALESCE(ux.total_xp, 0)
        WHEN COALESCE(ux.total_xp, 0) >= 1500 THEN 2100 - COALESCE(ux.total_xp, 0)
        WHEN COALESCE(ux.total_xp, 0) >= 1000 THEN 1500 - COALESCE(ux.total_xp, 0)
        WHEN COALESCE(ux.total_xp, 0) >= 600 THEN 1000 - COALESCE(ux.total_xp, 0)
        WHEN COALESCE(ux.total_xp, 0) >= 300 THEN 600 - COALESCE(ux.total_xp, 0)
        WHEN COALESCE(ux.total_xp, 0) >= 100 THEN 300 - COALESCE(ux.total_xp, 0)
        ELSE 100 - COALESCE(ux.total_xp, 0)
    END as xp_to_next_level,
    -- Trend statistics
    (SELECT COUNT(*) FROM trend_submissions WHERE spotter_id = u.id) as total_trends_submitted,
    (SELECT COUNT(*) FROM trend_submissions WHERE spotter_id = u.id AND status IN ('validated', 'approved')) as validated_trends,
    (SELECT COUNT(*) FROM trend_submissions WHERE spotter_id = u.id AND status = 'rejected') as rejected_trends,
    (SELECT COUNT(*) FROM trend_submissions WHERE spotter_id = u.id AND status IN ('submitted', 'validating')) as pending_trends,
    -- Today's XP
    (SELECT COALESCE(SUM(amount), 0) 
     FROM xp_transactions 
     WHERE user_id = u.id 
     AND created_at >= CURRENT_DATE) as todays_xp,
    -- This week's XP
    (SELECT COALESCE(SUM(amount), 0) 
     FROM xp_transactions 
     WHERE user_id = u.id 
     AND created_at >= CURRENT_DATE - INTERVAL '7 days') as weekly_xp
FROM user_profiles u
LEFT JOIN user_xp ux ON ux.user_id = u.id;

-- 4. Grant permissions
GRANT SELECT ON user_xp_summary TO authenticated;
GRANT SELECT ON user_xp_summary TO anon;

-- 5. Create function to get user level info
CREATE OR REPLACE FUNCTION get_user_level_info(p_user_id UUID)
RETURNS TABLE (
    total_xp INTEGER,
    current_level INTEGER,
    level_title TEXT,
    level_emoji TEXT,
    xp_to_next_level INTEGER,
    progress_percentage INTEGER
) AS $$
DECLARE
    v_total_xp INTEGER;
    v_level_info RECORD;
    v_current_threshold INTEGER;
    v_next_threshold INTEGER;
BEGIN
    -- Get user's total XP
    SELECT COALESCE(ux.total_xp, 0) INTO v_total_xp
    FROM user_xp ux
    WHERE ux.user_id = p_user_id;
    
    -- Get level info
    SELECT * INTO v_level_info FROM calculate_level_from_xp(v_total_xp);
    
    -- Calculate current and next thresholds
    CASE v_level_info.level
        WHEN 1 THEN v_current_threshold := 0; v_next_threshold := 100;
        WHEN 2 THEN v_current_threshold := 100; v_next_threshold := 300;
        WHEN 3 THEN v_current_threshold := 300; v_next_threshold := 600;
        WHEN 4 THEN v_current_threshold := 600; v_next_threshold := 1000;
        WHEN 5 THEN v_current_threshold := 1000; v_next_threshold := 1500;
        WHEN 6 THEN v_current_threshold := 1500; v_next_threshold := 2100;
        WHEN 7 THEN v_current_threshold := 2100; v_next_threshold := 2800;
        WHEN 8 THEN v_current_threshold := 2800; v_next_threshold := 3600;
        WHEN 9 THEN v_current_threshold := 3600; v_next_threshold := 4500;
        WHEN 10 THEN v_current_threshold := 4500; v_next_threshold := 5500;
        WHEN 11 THEN v_current_threshold := 5500; v_next_threshold := 6600;
        WHEN 12 THEN v_current_threshold := 6600; v_next_threshold := 8000;
        WHEN 13 THEN v_current_threshold := 8000; v_next_threshold := 10000;
        WHEN 14 THEN v_current_threshold := 10000; v_next_threshold := 12500;
        ELSE v_current_threshold := 12500; v_next_threshold := 12500;
    END CASE;
    
    RETURN QUERY SELECT 
        v_total_xp,
        v_level_info.level,
        v_level_info.title,
        v_level_info.emoji,
        GREATEST(v_next_threshold - v_total_xp, 0),
        CASE 
            WHEN v_level_info.level >= 15 THEN 100
            ELSE LEAST(
                ((v_total_xp - v_current_threshold)::NUMERIC / 
                 (v_next_threshold - v_current_threshold)::NUMERIC * 100)::INTEGER,
                100
            )
        END;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check a specific user's level calculation
SELECT * FROM get_user_level_info('YOUR_USER_ID_HERE');

-- Check all users with significant XP
SELECT 
    u.username,
    ux.total_xp,
    (SELECT level FROM calculate_level_from_xp(ux.total_xp)) as calculated_level,
    (SELECT title FROM calculate_level_from_xp(ux.total_xp)) as level_title,
    ux.current_level as stored_level
FROM user_xp ux
JOIN user_profiles u ON u.id = ux.user_id
WHERE ux.total_xp > 1000
ORDER BY ux.total_xp DESC
LIMIT 20;

-- Check the user_xp_summary view
SELECT 
    username,
    total_xp,
    level,
    level_title,
    level_emoji,
    xp_to_next_level
FROM user_xp_summary
WHERE total_xp > 1000
ORDER BY total_xp DESC
LIMIT 20;