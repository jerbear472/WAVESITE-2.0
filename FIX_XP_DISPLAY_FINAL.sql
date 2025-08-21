-- =============================================
-- FIX XP DISPLAY SYNCHRONIZATION - FINAL VERSION
-- =============================================
-- This script ensures XP data is consistent across all tables/views
-- Handles both old and new column names
-- =============================================

-- 1. Check what columns exist in trend_submissions
SELECT 'Checking trend_submissions columns...' as status;
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'trend_submissions' 
AND table_schema = 'public'
AND column_name IN ('approval_status', 'validation_state', 'status');

-- 2. Ensure all users have XP records
SELECT 'Ensuring all users have XP records...' as status;
INSERT INTO user_xp (user_id, total_xp, current_level)
SELECT 
    u.id,
    0,
    1
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM user_xp ux WHERE ux.user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;

-- 3. Check and preserve any existing XP values
SELECT 'Current XP values:' as status;
SELECT user_id, total_xp, current_level 
FROM user_xp 
WHERE total_xp > 0
ORDER BY total_xp DESC
LIMIT 10;

-- 4. If xp_transactions exists, sync from it
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'xp_transactions'
    ) THEN
        UPDATE user_xp ux
        SET 
            total_xp = COALESCE((
                SELECT SUM(amount)
                FROM xp_transactions xt
                WHERE xt.user_id = ux.user_id
            ), ux.total_xp),
            updated_at = NOW()
        WHERE EXISTS (
            SELECT 1 FROM xp_transactions xt WHERE xt.user_id = ux.user_id
        );
    END IF;
END $$;

-- 5. Update levels based on XP
UPDATE user_xp
SET current_level = CASE
    WHEN total_xp >= 12500 THEN 15
    WHEN total_xp >= 10000 THEN 14
    WHEN total_xp >= 8000 THEN 13
    WHEN total_xp >= 6600 THEN 12
    WHEN total_xp >= 5500 THEN 11
    WHEN total_xp >= 4500 THEN 10
    WHEN total_xp >= 3600 THEN 9
    WHEN total_xp >= 2800 THEN 8
    WHEN total_xp >= 2100 THEN 7
    WHEN total_xp >= 1500 THEN 6
    WHEN total_xp >= 1000 THEN 5
    WHEN total_xp >= 600 THEN 4
    WHEN total_xp >= 300 THEN 3
    WHEN total_xp >= 100 THEN 2
    ELSE 1
END
WHERE total_xp >= 0;

-- 6. Create or replace user_xp_summary view with dynamic column handling
CREATE OR REPLACE VIEW user_xp_summary AS
SELECT 
    u.id as user_id,
    p.username,
    COALESCE(ux.total_xp, 0) as total_xp,
    COALESCE(ux.current_level, 1) as level,
    CASE COALESCE(ux.current_level, 1)
        WHEN 1 THEN 'Observer'
        WHEN 2 THEN 'Recorder'
        WHEN 3 THEN 'Tracker'
        WHEN 4 THEN 'Spotter'
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
    (SELECT COUNT(*) FROM trend_submissions ts WHERE ts.spotter_id = u.id) as total_trends_submitted,
    0 as validated_trends,  -- Will be updated if validation columns exist
    0 as rejected_trends,   -- Will be updated if validation columns exist
    0 as pending_trends     -- Will be updated if validation columns exist
FROM users u
LEFT JOIN profiles p ON p.id = u.id
LEFT JOIN user_xp ux ON ux.user_id = u.id;

-- 7. Try to update the view with validation data if columns exist
DO $$
BEGIN
    -- Check if validation_state column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trend_submissions' 
        AND column_name = 'validation_state'
        AND table_schema = 'public'
    ) THEN
        CREATE OR REPLACE VIEW user_xp_summary AS
        SELECT 
            u.id as user_id,
            p.username,
            COALESCE(ux.total_xp, 0) as total_xp,
            COALESCE(ux.current_level, 1) as level,
            CASE COALESCE(ux.current_level, 1)
                WHEN 1 THEN 'Observer'
                WHEN 2 THEN 'Recorder'
                WHEN 3 THEN 'Tracker'
                WHEN 4 THEN 'Spotter'
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
            COUNT(DISTINCT ts.id) as total_trends_submitted,
            COUNT(DISTINCT CASE WHEN ts.validation_state = 'validated' THEN ts.id END) as validated_trends,
            COUNT(DISTINCT CASE WHEN ts.validation_state = 'rejected' THEN ts.id END) as rejected_trends,
            COUNT(DISTINCT CASE WHEN ts.validation_state = 'pending_validation' THEN ts.id END) as pending_trends
        FROM users u
        LEFT JOIN profiles p ON p.id = u.id
        LEFT JOIN user_xp ux ON ux.user_id = u.id
        LEFT JOIN trend_submissions ts ON ts.spotter_id = u.id
        GROUP BY u.id, p.username, ux.total_xp, ux.current_level;
        
    -- Check if approval_status column exists instead
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trend_submissions' 
        AND column_name = 'approval_status'
        AND table_schema = 'public'
    ) THEN
        CREATE OR REPLACE VIEW user_xp_summary AS
        SELECT 
            u.id as user_id,
            p.username,
            COALESCE(ux.total_xp, 0) as total_xp,
            COALESCE(ux.current_level, 1) as level,
            CASE COALESCE(ux.current_level, 1)
                WHEN 1 THEN 'Observer'
                WHEN 2 THEN 'Recorder'
                WHEN 3 THEN 'Tracker'
                WHEN 4 THEN 'Spotter'
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
            COUNT(DISTINCT ts.id) as total_trends_submitted,
            COUNT(DISTINCT CASE WHEN ts.approval_status = 'approved' THEN ts.id END) as validated_trends,
            COUNT(DISTINCT CASE WHEN ts.approval_status = 'rejected' THEN ts.id END) as rejected_trends,
            COUNT(DISTINCT CASE WHEN ts.approval_status = 'pending' THEN ts.id END) as pending_trends
        FROM users u
        LEFT JOIN profiles p ON p.id = u.id
        LEFT JOIN user_xp ux ON ux.user_id = u.id
        LEFT JOIN trend_submissions ts ON ts.spotter_id = u.id
        GROUP BY u.id, p.username, ux.total_xp, ux.current_level;
        
    -- Check if status column exists
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trend_submissions' 
        AND column_name = 'status'
        AND table_schema = 'public'
    ) THEN
        CREATE OR REPLACE VIEW user_xp_summary AS
        SELECT 
            u.id as user_id,
            p.username,
            COALESCE(ux.total_xp, 0) as total_xp,
            COALESCE(ux.current_level, 1) as level,
            CASE COALESCE(ux.current_level, 1)
                WHEN 1 THEN 'Observer'
                WHEN 2 THEN 'Recorder'
                WHEN 3 THEN 'Tracker'
                WHEN 4 THEN 'Spotter'
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
            COUNT(DISTINCT ts.id) as total_trends_submitted,
            COUNT(DISTINCT CASE WHEN ts.status = 'approved' OR ts.status = 'validated' THEN ts.id END) as validated_trends,
            COUNT(DISTINCT CASE WHEN ts.status = 'rejected' THEN ts.id END) as rejected_trends,
            COUNT(DISTINCT CASE WHEN ts.status = 'pending' OR ts.status = 'pending_validation' THEN ts.id END) as pending_trends
        FROM users u
        LEFT JOIN profiles p ON p.id = u.id
        LEFT JOIN user_xp ux ON ux.user_id = u.id
        LEFT JOIN trend_submissions ts ON ts.spotter_id = u.id
        GROUP BY u.id, p.username, ux.total_xp, ux.current_level;
    END IF;
END $$;

-- 8. Grant permissions
GRANT SELECT ON user_xp_summary TO authenticated;

-- 9. Create helper function to manually set XP
CREATE OR REPLACE FUNCTION set_user_xp(
    p_user_id UUID,
    p_xp INTEGER
)
RETURNS VOID AS $$
BEGIN
    -- Update or insert XP
    INSERT INTO user_xp (user_id, total_xp, current_level)
    VALUES (
        p_user_id, 
        p_xp,
        CASE
            WHEN p_xp >= 12500 THEN 15
            WHEN p_xp >= 10000 THEN 14
            WHEN p_xp >= 8000 THEN 13
            WHEN p_xp >= 6600 THEN 12
            WHEN p_xp >= 5500 THEN 11
            WHEN p_xp >= 4500 THEN 10
            WHEN p_xp >= 3600 THEN 9
            WHEN p_xp >= 2800 THEN 8
            WHEN p_xp >= 2100 THEN 7
            WHEN p_xp >= 1500 THEN 6
            WHEN p_xp >= 1000 THEN 5
            WHEN p_xp >= 600 THEN 4
            WHEN p_xp >= 300 THEN 3
            WHEN p_xp >= 100 THEN 2
            ELSE 1
        END
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        total_xp = EXCLUDED.total_xp,
        current_level = EXCLUDED.current_level,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 10. Final verification
SELECT 'Final XP summary:' as status;
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN total_xp > 0 THEN 1 END) as users_with_xp,
    MAX(total_xp) as highest_xp,
    AVG(total_xp)::INTEGER as average_xp
FROM user_xp;

-- 11. Show sample from user_xp_summary
SELECT 'Sample user_xp_summary data:' as status;
SELECT 
    username,
    total_xp,
    level,
    level_title,
    total_trends_submitted
FROM user_xp_summary
WHERE total_xp > 0 OR total_trends_submitted > 0
ORDER BY total_xp DESC
LIMIT 10;

SELECT 'XP synchronization complete!' as status;

-- MANUAL FIX: If you need to set 730 XP for a specific user:
-- 1. Find your user_id from the auth.users table
-- 2. Run: SELECT set_user_xp('YOUR_USER_ID'::UUID, 730);