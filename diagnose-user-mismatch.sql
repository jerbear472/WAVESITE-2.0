-- Diagnose why trends aren't showing despite correct RLS policies

-- 1. Get your auth.users ID
SELECT 
    id as auth_user_id,
    email,
    created_at as user_created
FROM auth.users 
WHERE email = 'jeremyuys@gmail.com';

-- 2. Check if you have a profile
SELECT 
    id as profile_id,
    email,
    username,
    created_at as profile_created
FROM profiles 
WHERE email = 'jeremyuys@gmail.com';

-- 3. Check recent trend submissions and their spotter_ids
SELECT 
    id,
    spotter_id,
    description,
    created_at,
    status,
    post_url
FROM trend_submissions
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 10;

-- 4. IMPORTANT: Check if spotter_ids match your auth.user id
-- Replace 'YOUR_AUTH_ID' with the ID from query #1
/*
SELECT 
    COUNT(*) as your_trends_count,
    spotter_id
FROM trend_submissions
WHERE spotter_id = 'YOUR_AUTH_ID'
GROUP BY spotter_id;
*/

-- 5. Check for orphaned trends (trends without matching profiles)
SELECT 
    ts.id,
    ts.spotter_id,
    ts.description,
    ts.created_at,
    p.id as profile_exists
FROM trend_submissions ts
LEFT JOIN profiles p ON ts.spotter_id = p.id
WHERE ts.created_at > NOW() - INTERVAL '24 hours'
ORDER BY ts.created_at DESC;

-- 6. Get a summary of all unique spotter_ids
SELECT 
    spotter_id,
    COUNT(*) as trend_count,
    MAX(created_at) as latest_trend
FROM trend_submissions
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY spotter_id
ORDER BY latest_trend DESC;

-- 7. Test the RLS policy directly
-- This simulates what your app is doing
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claim.sub TO (SELECT id FROM auth.users WHERE email = 'jeremyuys@gmail.com');

-- Now try to select trends
SELECT 
    id,
    spotter_id,
    description,
    created_at
FROM trend_submissions
WHERE spotter_id = current_setting('request.jwt.claim.sub', true)::uuid
ORDER BY created_at DESC
LIMIT 5;

-- Reset role
RESET role;