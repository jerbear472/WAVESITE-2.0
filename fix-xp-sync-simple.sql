-- Fix XP synchronization issues (Simple version)
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

COMMIT;

-- 4. Show results for all users with XP
SELECT 
    p.username,
    ux.total_xp,
    ux.current_level,
    CASE ux.current_level
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
    ux.xp_to_next_level,
    (SELECT COUNT(*) FROM xp_transactions WHERE user_id = p.id) as transaction_count
FROM profiles p
INNER JOIN user_xp ux ON ux.user_id = p.id
WHERE ux.total_xp > 0
ORDER BY ux.total_xp DESC;

-- 5. Specific fix for trendsetter user if needed
INSERT INTO user_xp (user_id, total_xp, current_level, xp_to_next_level)
SELECT 
    p.id,
    730,  -- The XP shown in leaderboard
    4,    -- Level 4 (Spotter) for 730 XP
    270   -- 1000 - 730 = 270 XP to next level
FROM profiles p
WHERE p.username ILIKE '%trendsetter%'
ON CONFLICT (user_id) DO UPDATE SET
    total_xp = EXCLUDED.total_xp,
    current_level = EXCLUDED.current_level,
    xp_to_next_level = EXCLUDED.xp_to_next_level;

-- 6. Verify the fix worked
SELECT 
    'After Fix' as status,
    p.username,
    ux.total_xp as user_xp_table,
    uxs.total_xp as summary_view,
    xl.total_xp as leaderboard_view
FROM profiles p
LEFT JOIN user_xp ux ON ux.user_id = p.id
LEFT JOIN user_xp_summary uxs ON uxs.user_id = p.id  
LEFT JOIN xp_leaderboard xl ON xl.user_id = p.id
WHERE p.username ILIKE '%trendsetter%';