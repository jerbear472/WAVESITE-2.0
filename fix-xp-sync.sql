-- Fix XP synchronization issues
-- This script ensures all users have proper XP data

BEGIN;

-- 1. Ensure all users in profiles have a user_xp entry
INSERT INTO user_xp (user_id, total_xp, current_level, xp_to_next_level)
SELECT 
    p.id,
    0,  -- Start with 0 XP
    1,  -- Start at level 1
    100 -- XP needed for level 2
FROM profiles p
WHERE p.id NOT IN (SELECT user_id FROM user_xp WHERE user_id IS NOT NULL)
ON CONFLICT (user_id) DO NOTHING;

-- 2. Update user_xp totals based on actual xp_transactions
UPDATE user_xp 
SET total_xp = COALESCE((
    SELECT SUM(amount) 
    FROM xp_transactions 
    WHERE user_id = user_xp.user_id 
    AND amount > 0
), 0)
WHERE EXISTS (
    SELECT 1 FROM xp_transactions 
    WHERE user_id = user_xp.user_id
);

-- 3. Update levels based on XP totals
UPDATE user_xp 
SET 
    current_level = CASE 
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
    END,
    xp_to_next_level = CASE 
        WHEN total_xp >= 12500 THEN 0  -- Max level
        WHEN total_xp >= 10000 THEN 12500 - total_xp
        WHEN total_xp >= 8000 THEN 10000 - total_xp
        WHEN total_xp >= 6600 THEN 8000 - total_xp
        WHEN total_xp >= 5500 THEN 6600 - total_xp
        WHEN total_xp >= 4500 THEN 5500 - total_xp
        WHEN total_xp >= 3600 THEN 4500 - total_xp
        WHEN total_xp >= 2800 THEN 3600 - total_xp
        WHEN total_xp >= 2100 THEN 2800 - total_xp
        WHEN total_xp >= 1500 THEN 2100 - total_xp
        WHEN total_xp >= 1000 THEN 1500 - total_xp
        WHEN total_xp >= 600 THEN 1000 - total_xp
        WHEN total_xp >= 300 THEN 600 - total_xp
        WHEN total_xp >= 100 THEN 300 - total_xp
        ELSE 100 - total_xp
    END
WHERE total_xp > 0;

-- 4. Refresh materialized views if they exist
-- (This will error if they don't exist, which is fine)
REFRESH MATERIALIZED VIEW user_xp_summary_materialized;
REFRESH MATERIALIZED VIEW xp_leaderboard_materialized;

-- 5. Create debugging view to check XP consistency
CREATE OR REPLACE VIEW xp_debug AS
SELECT 
    p.id as user_id,
    p.username,
    COALESCE(ux.total_xp, 0) as user_xp_total,
    COALESCE(ux.current_level, 1) as user_xp_level,
    (SELECT SUM(amount) FROM xp_transactions WHERE user_id = p.id AND amount > 0) as transactions_total,
    (SELECT COUNT(*) FROM xp_transactions WHERE user_id = p.id) as transaction_count,
    CASE 
        WHEN ux.total_xp IS NULL THEN 'Missing user_xp entry'
        WHEN ux.total_xp != COALESCE((SELECT SUM(amount) FROM xp_transactions WHERE user_id = p.id AND amount > 0), 0) 
             THEN 'XP mismatch'
        ELSE 'OK'
    END as status
FROM profiles p
LEFT JOIN user_xp ux ON ux.user_id = p.id
ORDER BY p.username;

COMMIT;

-- 6. Show debug results
SELECT * FROM xp_debug WHERE username ILIKE '%trendsetter%';

-- 7. Show final XP status for trendsetter
SELECT 
    p.username,
    ux.total_xp,
    ux.current_level,
    usc.total_xp as summary_xp,
    xl.total_xp as leaderboard_xp
FROM profiles p
LEFT JOIN user_xp ux ON ux.user_id = p.id
LEFT JOIN user_xp_summary usc ON usc.user_id = p.id  
LEFT JOIN xp_leaderboard xl ON xl.user_id = p.id
WHERE p.username ILIKE '%trendsetter%';