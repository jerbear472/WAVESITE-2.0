-- =============================================
-- FIX XP DISPLAY - SAFE VERSION
-- =============================================
-- This script safely handles enum types and unknown column values
-- =============================================

-- 1. First, let's check what enum values are allowed for status column
SELECT 'Checking status enum values...' as info;
SELECT 
    e.enumlabel as allowed_value
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'trend_status'
ORDER BY e.enumsortorder;

-- 2. Check what columns exist
SELECT 'Checking trend_submissions columns...' as info;
SELECT 
    column_name,
    data_type,
    udt_name
FROM information_schema.columns 
WHERE table_name = 'trend_submissions' 
AND table_schema = 'public'
AND column_name IN ('approval_status', 'validation_state', 'status', 'bounty_validation_status');

-- 3. Ensure all users have XP records
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

-- 4. Update levels based on existing XP
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

-- 5. Create a simple user_xp_summary view that always works
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
    0 as validated_trends,
    0 as rejected_trends,
    0 as pending_trends
FROM users u
LEFT JOIN profiles p ON p.id = u.id
LEFT JOIN user_xp ux ON ux.user_id = u.id;

-- 6. Now try to create a more detailed view if we can determine the column structure
DO $$
DECLARE
    v_has_status BOOLEAN := FALSE;
    v_has_validation_state BOOLEAN := FALSE;
    v_has_approval_status BOOLEAN := FALSE;
    v_has_bounty_validation BOOLEAN := FALSE;
BEGIN
    -- Check which columns exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trend_submissions' 
        AND column_name = 'status'
        AND table_schema = 'public'
    ) INTO v_has_status;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trend_submissions' 
        AND column_name = 'validation_state'
        AND table_schema = 'public'
    ) INTO v_has_validation_state;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trend_submissions' 
        AND column_name = 'approval_status'
        AND table_schema = 'public'
    ) INTO v_has_approval_status;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trend_submissions' 
        AND column_name = 'bounty_validation_status'
        AND table_schema = 'public'
    ) INTO v_has_bounty_validation;
    
    -- Create view based on available columns
    IF v_has_status THEN
        -- Use status column with safe values (only 'approved', 'rejected', 'pending')
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
            COUNT(DISTINCT CASE WHEN ts.status = 'approved' THEN ts.id END) as validated_trends,
            COUNT(DISTINCT CASE WHEN ts.status = 'rejected' THEN ts.id END) as rejected_trends,
            COUNT(DISTINCT CASE WHEN ts.status = 'pending' THEN ts.id END) as pending_trends
        FROM users u
        LEFT JOIN profiles p ON p.id = u.id
        LEFT JOIN user_xp ux ON ux.user_id = u.id
        LEFT JOIN trend_submissions ts ON ts.spotter_id = u.id
        GROUP BY u.id, p.username, ux.total_xp, ux.current_level;
        
    ELSIF v_has_bounty_validation THEN
        -- Use bounty_validation_status column
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
            COUNT(DISTINCT CASE WHEN ts.bounty_validation_status = 'approved' THEN ts.id END) as validated_trends,
            COUNT(DISTINCT CASE WHEN ts.bounty_validation_status = 'rejected' THEN ts.id END) as rejected_trends,
            COUNT(DISTINCT CASE WHEN ts.bounty_validation_status = 'pending' THEN ts.id END) as pending_trends
        FROM users u
        LEFT JOIN profiles p ON p.id = u.id
        LEFT JOIN user_xp ux ON ux.user_id = u.id
        LEFT JOIN trend_submissions ts ON ts.spotter_id = u.id
        GROUP BY u.id, p.username, ux.total_xp, ux.current_level;
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        -- If anything fails, keep the simple view
        RAISE NOTICE 'Could not create detailed view: %', SQLERRM;
END $$;

-- 7. Grant permissions
GRANT SELECT ON user_xp_summary TO authenticated;

-- 8. Helper function to manually set XP (always safe)
CREATE OR REPLACE FUNCTION set_user_xp(
    p_user_id UUID,
    p_xp INTEGER
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_xp (user_id, total_xp, current_level, updated_at)
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
        END,
        NOW()
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        total_xp = EXCLUDED.total_xp,
        current_level = EXCLUDED.current_level,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 9. Show current XP data
SELECT 'Current XP standings:' as info;
SELECT 
    ux.user_id,
    p.username,
    ux.total_xp,
    ux.current_level
FROM user_xp ux
LEFT JOIN profiles p ON p.id = ux.user_id
WHERE ux.total_xp > 0
ORDER BY ux.total_xp DESC
LIMIT 10;

-- 10. Test the view
SELECT 'Testing user_xp_summary view:' as info;
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

SELECT 'XP sync complete!' as status;

-- =============================================
-- MANUAL FIX INSTRUCTIONS:
-- =============================================
-- If you see 730 XP in the header but 0 elsewhere:
-- 
-- 1. Find your user_id:
--    SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';
--
-- 2. Set your XP to 730:
--    SELECT set_user_xp('YOUR_USER_ID'::UUID, 730);
--
-- 3. Verify it worked:
--    SELECT * FROM user_xp_summary WHERE user_id = 'YOUR_USER_ID'::UUID;
-- =============================================