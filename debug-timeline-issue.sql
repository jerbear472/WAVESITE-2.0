-- Debug script to check why trends aren't appearing in timeline

-- 1. Check your user ID
SELECT id, email, username
FROM profiles
WHERE email = 'jeremyuys@gmail.com';

-- 2. Check ALL trend submissions (not just yours)
SELECT 
    id,
    spotter_id,
    created_at,
    description,
    status,
    category,
    post_url
FROM trend_submissions
ORDER BY created_at DESC
LIMIT 20;

-- 3. Check specifically for your submissions (replace YOUR_USER_ID with your actual ID from step 1)
/*
SELECT 
    id,
    spotter_id,
    created_at,
    description,
    status,
    category,
    post_url,
    evidence
FROM trend_submissions
WHERE spotter_id = 'YOUR_USER_ID'
ORDER BY created_at DESC;
*/

-- 4. Check if there's a mismatch between auth.users and profiles
SELECT 
    au.id as auth_id,
    au.email as auth_email,
    p.id as profile_id,
    p.email as profile_email,
    p.username
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE au.email = 'jeremyuys@gmail.com';

-- 5. Check RLS policies on trend_submissions
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'trend_submissions'
ORDER BY policyname;

-- 6. Test if you can insert directly (replace YOUR_USER_ID)
/*
INSERT INTO trend_submissions (
    spotter_id,
    category,
    description,
    platform,
    status,
    post_url,
    created_at
) VALUES (
    'YOUR_USER_ID',
    'meme_format',
    'Direct test submission',
    'other',
    'submitted',
    'https://example.com/test',
    NOW()
) RETURNING *;
*/

-- 7. Check for any recent errors in submissions
SELECT 
    id,
    spotter_id,
    created_at,
    description,
    evidence->>'fallback_submission' as is_fallback
FROM trend_submissions
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;