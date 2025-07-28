-- Check current database structure
-- Run this first to understand what tables exist

-- 1. Check what tables exist
SELECT 
    table_name, 
    table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'user_profiles', 'users')
ORDER BY table_name;

-- 2. Check columns in profiles table (if it exists)
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 3. Check if any users exist in profiles
SELECT COUNT(*) as user_count FROM public.profiles;

-- 4. Check sample data (limit 5)
SELECT 
    id, 
    email, 
    username, 
    created_at,
    birthday,
    subscription_tier
FROM public.profiles 
LIMIT 5;

-- 5. Check auth.users to see if there are users without profiles
SELECT 
    au.id,
    au.email,
    au.created_at,
    p.id as profile_id
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
LIMIT 10;