-- Check auth.users table for the user
SELECT 
    id,
    email,
    email_confirmed_at,
    created_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    banned_until
FROM auth.users 
WHERE email = 'YOUR_TEST_EMAIL@example.com';  -- Replace with actual test email

-- Check if user exists in profiles table
SELECT * FROM profiles 
WHERE email = 'YOUR_TEST_EMAIL@example.com';  -- Replace with actual test email

-- Check RLS policies on profiles table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- Check if RLS is enabled on profiles table
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'profiles';

-- Test if the email confirmation is actually working
-- This query shows all recent sign-up attempts
SELECT 
    id,
    email,
    email_confirmed_at,
    created_at,
    raw_app_meta_data->>'provider' as provider,
    raw_user_meta_data->>'username' as username
FROM auth.users 
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Check for any auth configuration issues
SELECT * FROM auth.schema_migrations ORDER BY version DESC LIMIT 5;