-- Diagnose Why User Can't See Their Trends

-- 1. Get all auth users and their IDs
SELECT 
    id as user_id,
    email,
    created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check which spotter_ids have trends
SELECT 
    spotter_id,
    COUNT(*) as trend_count,
    MAX(created_at) as last_submission
FROM public.trend_submissions
GROUP BY spotter_id
ORDER BY last_submission DESC;

-- 3. Find any mismatch between auth.users and trend_submissions
SELECT 
    'Users without trends' as category,
    COUNT(DISTINCT u.id) as count
FROM auth.users u
LEFT JOIN public.trend_submissions t ON u.id = t.spotter_id
WHERE t.id IS NULL

UNION ALL

SELECT 
    'Trends without valid users' as category,
    COUNT(DISTINCT t.spotter_id) as count
FROM public.trend_submissions t
LEFT JOIN auth.users u ON t.spotter_id = u.id
WHERE u.id IS NULL;

-- 4. Check the actual RLS policy
SELECT 
    policyname,
    qual as using_clause,
    with_check
FROM pg_policies 
WHERE tablename = 'trend_submissions';

-- 5. Test query as if you were a specific user
-- Replace 'YOUR_EMAIL' with your actual email
WITH your_user AS (
    SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL' LIMIT 1
)
SELECT 
    'Your User ID' as info,
    id::text as value
FROM your_user

UNION ALL

SELECT 
    'Your Trend Count' as info,
    COUNT(*)::text as value
FROM trend_submissions t, your_user u
WHERE t.spotter_id = u.id;