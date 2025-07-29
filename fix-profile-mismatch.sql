-- Fix Profile Mismatch Issue

-- 1. Check if you exist in both tables
-- Replace with your actual email
WITH your_email AS (SELECT 'your-email@example.com'::text as email)
SELECT 
    'auth.users' as location,
    a.id,
    a.email,
    a.created_at
FROM auth.users a, your_email e
WHERE a.email = e.email

UNION ALL

SELECT 
    'profiles' as location,
    p.id,
    p.email,
    p.created_at::timestamptz
FROM public.profiles p, your_email e
WHERE p.email = e.email;

-- 2. Find orphaned auth users without profiles
SELECT 
    a.id as auth_id,
    a.email,
    'Missing Profile!' as issue
FROM auth.users a
LEFT JOIN public.profiles p ON a.id = p.id
WHERE p.id IS NULL;

-- 3. Create missing profiles for auth users
INSERT INTO public.profiles (id, email, username, created_at)
SELECT 
    a.id,
    a.email,
    COALESCE(a.raw_user_meta_data->>'username', split_part(a.email, '@', 1)) as username,
    NOW()
FROM auth.users a
LEFT JOIN public.profiles p ON a.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 4. Verify the fix worked
SELECT 
    a.id,
    a.email,
    p.id as profile_id,
    p.email as profile_email,
    CASE 
        WHEN p.id IS NULL THEN 'Still Missing Profile'
        WHEN a.id = p.id THEN 'Matched Correctly'
        ELSE 'ID Mismatch!'
    END as status
FROM auth.users a
LEFT JOIN public.profiles p ON a.email = p.email
ORDER BY a.created_at DESC;

-- 5. Now check if you have trends with your correct ID
WITH your_user AS (
    SELECT a.id 
    FROM auth.users a 
    WHERE a.email = 'your-email@example.com'
)
SELECT 
    COUNT(*) as your_trend_count,
    u.id as your_correct_user_id
FROM your_user u
LEFT JOIN trend_submissions t ON t.spotter_id = u.id
GROUP BY u.id;

-- 6. If you see trends with wrong spotter_id, update them
-- First, identify wrong submissions
WITH your_user AS (
    SELECT id FROM auth.users WHERE email = 'your-email@example.com'
)
SELECT 
    t.id as trend_id,
    t.description,
    t.spotter_id as wrong_spotter_id,
    u.id as correct_user_id,
    t.created_at
FROM trend_submissions t, your_user u
WHERE t.created_at > NOW() - INTERVAL '7 days'
AND t.spotter_id != u.id
ORDER BY t.created_at DESC;

-- 7. Update trends to correct spotter_id (CAREFUL - update email first!)
/*
WITH your_user AS (
    SELECT id FROM auth.users WHERE email = 'your-email@example.com'
)
UPDATE trend_submissions t
SET spotter_id = u.id
FROM your_user u
WHERE t.created_at > NOW() - INTERVAL '7 days'
AND t.description LIKE '%your test trend%'; -- Add a filter to be safe
*/