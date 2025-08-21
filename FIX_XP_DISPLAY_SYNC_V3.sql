-- =============================================
-- FIX XP DISPLAY SYNCHRONIZATION V3
-- =============================================
-- This script ensures XP data is consistent across all tables/views
-- Works with xp_transactions table without assuming a status column
-- =============================================

-- 1. Check existing tables and columns
SELECT 'Checking XP table structure...' as status;

-- Check if xp_transactions has a status column
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'xp_transactions' 
AND table_schema = 'public';

-- 2. Check current data in user_xp table
SELECT 'Current user_xp data (top 10 users with XP):' as status;
SELECT user_id, total_xp, current_level 
FROM user_xp 
WHERE total_xp > 0
ORDER BY total_xp DESC
LIMIT 10;

-- 3. Check if there's data in xp_transactions
SELECT 'Current xp_transactions summary:' as status;
SELECT 
    user_id, 
    SUM(amount) as total_xp_from_transactions,
    COUNT(*) as transaction_count
FROM xp_transactions
GROUP BY user_id
HAVING SUM(amount) > 0
ORDER BY total_xp_from_transactions DESC
LIMIT 10;

-- 4. Ensure all users have a row in user_xp
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

-- 5. Update XP totals based on xp_transactions (all transactions, no status filter)
SELECT 'Updating XP totals from transactions...' as status;
UPDATE user_xp ux
SET 
    total_xp = COALESCE((
        SELECT SUM(amount)
        FROM xp_transactions xt
        WHERE xt.user_id = ux.user_id
    ), ux.total_xp),  -- Keep existing XP if no transactions
    updated_at = NOW()
WHERE EXISTS (
    SELECT 1 FROM xp_transactions xt WHERE xt.user_id = ux.user_id
);

-- 6. If no transactions exist but user has XP, preserve it
-- This handles cases where XP was set directly
SELECT 'Preserving existing XP values without transactions...' as status;
UPDATE user_xp
SET updated_at = NOW()
WHERE total_xp > 0
AND NOT EXISTS (
    SELECT 1 FROM xp_transactions xt WHERE xt.user_id = user_xp.user_id
);

-- 7. Update levels based on XP totals
SELECT 'Updating user levels based on XP...' as status;
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
END;

-- 8. Create or update the user_xp_summary view to ensure consistency
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

-- 9. Grant appropriate permissions
GRANT SELECT ON user_xp_summary TO authenticated;

-- 10. Create a function to manually set XP if needed (for debugging)
CREATE OR REPLACE FUNCTION set_user_xp(
    p_user_id UUID,
    p_xp INTEGER
)
RETURNS VOID AS $$
BEGIN
    UPDATE user_xp
    SET 
        total_xp = p_xp,
        current_level = CASE
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
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- If no row exists, insert one
    IF NOT FOUND THEN
        INSERT INTO user_xp (user_id, total_xp, current_level)
        VALUES (p_user_id, p_xp, 
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
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 11. If you know the specific user with 730 XP, you can set it directly:
-- Example (replace with actual user_id):
-- SELECT set_user_xp('YOUR_USER_ID_HERE'::UUID, 730);

-- 12. Final verification
SELECT 'Final verification - user_xp table:' as status;
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN total_xp > 0 THEN 1 END) as users_with_xp,
    MAX(total_xp) as highest_xp,
    AVG(total_xp)::INTEGER as average_xp
FROM user_xp;

SELECT 'Final verification - user_xp_summary view:' as status;
SELECT 
    user_id,
    username,
    total_xp,
    level,
    level_title
FROM user_xp_summary
WHERE total_xp > 0
ORDER BY total_xp DESC
LIMIT 10;

SELECT 'XP synchronization fix V3 complete!' as status;

-- Note: If you still see 730 XP in the header but 0 in dashboard after running this,
-- you can manually set the XP for your user:
-- SELECT set_user_xp('YOUR_USER_ID'::UUID, 730);