-- Debug Submission Process

-- 1. First, get YOUR user ID
-- Replace with your actual email
SELECT 
    id as your_user_id,
    email,
    created_at as account_created
FROM auth.users 
WHERE email = 'your-email@example.com';

-- 2. Check ALL recent submissions to see what spotter_id is being used
SELECT 
    id,
    spotter_id,
    description,
    status,
    created_at,
    -- Check if this matches any auth user
    CASE 
        WHEN EXISTS (SELECT 1 FROM auth.users WHERE id = t.spotter_id) 
        THEN 'Valid User' 
        ELSE 'Invalid User ID!' 
    END as user_status
FROM trend_submissions t
ORDER BY created_at DESC
LIMIT 10;

-- 3. See if there's a profiles table mismatch
SELECT 
    'auth.users' as table_name,
    COUNT(*) as row_count
FROM auth.users

UNION ALL

SELECT 
    'public.profiles' as table_name,
    COUNT(*) as row_count
FROM public.profiles

UNION ALL

SELECT 
    'Matching IDs' as table_name,
    COUNT(*) as row_count
FROM auth.users a
JOIN public.profiles p ON a.id = p.id;

-- 4. Check if submissions are using profile IDs instead of auth IDs
SELECT DISTINCT
    t.spotter_id,
    p.id as profile_id,
    a.id as auth_id,
    a.email
FROM trend_submissions t
LEFT JOIN public.profiles p ON t.spotter_id = p.id
LEFT JOIN auth.users a ON p.id = a.id
ORDER BY t.created_at DESC
LIMIT 5;

-- 5. Quick fix attempt - if you find your user ID above, update your trends
-- CAREFUL: Only run this after identifying your correct user_id
/*
UPDATE trend_submissions 
SET spotter_id = 'YOUR-ACTUAL-AUTH-USER-ID'
WHERE spotter_id = 'WRONG-ID-BEING-USED'
AND created_at > NOW() - INTERVAL '24 hours';
*/