-- =============================================
-- FIX XP DISPLAY SYNCHRONIZATION V2
-- =============================================
-- This script ensures XP data is consistent across all tables/views
-- Works with xp_transactions table (not xp_events)
-- =============================================

-- 1. First, let's check what XP-related tables exist
SELECT 'Checking existing XP tables...' as status;

-- Check if xp_transactions exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'xp_transactions'
) as xp_transactions_exists;

-- Check if user_xp exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_xp'
) as user_xp_exists;

-- 2. Check current data in user_xp table
SELECT 'Current user_xp data:' as status;
SELECT user_id, total_xp, current_level 
FROM user_xp 
WHERE total_xp > 0
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
LIMIT 10;

-- 4. First ensure all users have a row in user_xp
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

-- 5. Now update XP totals based on xp_transactions (if it exists and has data)
SELECT 'Updating XP totals from transactions...' as status;
UPDATE user_xp ux
SET 
    total_xp = COALESCE((
        SELECT SUM(amount)
        FROM xp_transactions xt
        WHERE xt.user_id = ux.user_id
        AND xt.status = 'completed'  -- Only count completed transactions
    ), ux.total_xp),  -- Keep existing XP if no transactions
    updated_at = NOW()
WHERE EXISTS (
    SELECT 1 FROM xp_transactions xt WHERE xt.user_id = ux.user_id
);

-- 6. Update levels based on XP totals
SELECT 'Updating user levels...' as status;
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
WHERE total_xp > 0;

-- 7. If there's a specific user with 730 XP, ensure it's properly set
-- You can uncomment and modify this with the actual user_id
-- UPDATE user_xp 
-- SET total_xp = 730, current_level = 4
-- WHERE user_id = 'YOUR_USER_ID_HERE';

-- 8. Check if user_xp_summary view exists and what it returns
SELECT 'Checking user_xp_summary view...' as status;
SELECT EXISTS (
    SELECT FROM information_schema.views
    WHERE table_schema = 'public' 
    AND table_name = 'user_xp_summary'
) as view_exists;

-- 9. Sample data from user_xp_summary if it exists
SELECT 'Sample from user_xp_summary:' as status;
SELECT 
    user_id,
    username,
    total_xp,
    level,
    level_title
FROM user_xp_summary
WHERE total_xp > 0
LIMIT 10;

-- 10. Create a simple trigger to keep XP in sync (if not exists)
CREATE OR REPLACE FUNCTION sync_user_xp()
RETURNS TRIGGER AS $$
BEGIN
    -- When xp_transactions changes, update user_xp
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE user_xp
        SET 
            total_xp = COALESCE((
                SELECT SUM(amount)
                FROM xp_transactions
                WHERE user_id = NEW.user_id
                AND status = 'completed'
            ), 0),
            updated_at = NOW()
        WHERE user_id = NEW.user_id;
        
        -- Update level based on new XP
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
        WHERE user_id = NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create trigger if xp_transactions table exists
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'xp_transactions'
    ) THEN
        DROP TRIGGER IF EXISTS sync_xp_on_transaction ON xp_transactions;
        CREATE TRIGGER sync_xp_on_transaction
        AFTER INSERT OR UPDATE ON xp_transactions
        FOR EACH ROW
        EXECUTE FUNCTION sync_user_xp();
    END IF;
END $$;

-- 11. Final verification
SELECT 'Final verification - user_xp table:' as status;
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN total_xp > 0 THEN 1 END) as users_with_xp,
    MAX(total_xp) as highest_xp,
    AVG(total_xp)::INTEGER as average_xp
FROM user_xp;

SELECT 'XP synchronization fix V2 complete!' as status;