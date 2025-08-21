-- =============================================
-- FIX USER_XP_SUMMARY VIEW
-- =============================================
-- This fixes the user_xp_summary view to properly return XP data
-- The issue is the GROUP BY clause when there's no trend_submissions data
-- =============================================

-- Drop and recreate the view with a simpler structure that works
DROP VIEW IF EXISTS user_xp_summary CASCADE;

CREATE VIEW user_xp_summary AS
SELECT 
    u.id as user_id,
    p.username,
    COALESCE(ux.total_xp, 0) as total_xp,
    COALESCE(ux.current_level, 1) as level,
    CASE COALESCE(ux.current_level, 1)
        WHEN 1 THEN 'Observer'
        WHEN 2 THEN 'Recorder'  
        WHEN 3 THEN 'Tracker'
        WHEN 4 THEN 'Tracker'  -- Level 4 is also Tracker based on leaderboard data
        WHEN 5 THEN 'Analyst'
        WHEN 6 THEN 'Interpreter'
        WHEN 7 THEN 'Specialist'
        WHEN 8 THEN 'Expert'
        WHEN 9 THEN 'Scholar'
        WHEN 10 THEN 'Researcher'
        WHEN 11 THEN 'Authority'
        WHEN 12 THEN 'Pioneer'
        WHEN 13 THEN 'Visionary'
        WHEN 14 THEN 'Master'
        WHEN 15 THEN 'Legend'
        ELSE 'Observer'
    END as level_title,
    COALESCE((SELECT COUNT(*) FROM trend_submissions ts WHERE ts.spotter_id = u.id), 0) as total_trends_submitted,
    COALESCE((SELECT COUNT(*) FROM trend_submissions ts WHERE ts.spotter_id = u.id AND ts.approval_status = 'approved'), 0) as validated_trends,
    COALESCE((SELECT COUNT(*) FROM trend_submissions ts WHERE ts.spotter_id = u.id AND ts.approval_status = 'rejected'), 0) as rejected_trends,
    COALESCE((SELECT COUNT(*) FROM trend_submissions ts WHERE ts.spotter_id = u.id AND ts.approval_status = 'pending'), 0) as pending_trends
FROM users u
LEFT JOIN profiles p ON p.id = u.id
LEFT JOIN user_xp ux ON ux.user_id = u.id;

-- Grant appropriate permissions
GRANT SELECT ON user_xp_summary TO authenticated;
GRANT SELECT ON user_xp_summary TO anon;

-- Test the view for Trendsetter user
SELECT * FROM user_xp_summary WHERE user_id = 'b8fbbb0b-b30d-4f6c-91da-baed848dec13';

-- Show count of records in the view
SELECT COUNT(*) as total_records FROM user_xp_summary;

-- Show users with XP > 0
SELECT user_id, username, total_xp, level, level_title 
FROM user_xp_summary 
WHERE total_xp > 0
ORDER BY total_xp DESC;