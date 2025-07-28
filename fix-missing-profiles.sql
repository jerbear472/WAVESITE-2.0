-- Fix missing profiles for existing auth users
-- This creates profiles for any auth.users that don't have one

-- First, let's see all users missing profiles
SELECT 
    au.id,
    au.email,
    au.created_at,
    au.email_confirmed_at,
    p.id as profile_id
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- Create profiles for all users that don't have one
INSERT INTO public.profiles (
    id,
    email,
    username,
    created_at,
    subscription_tier,
    total_earnings,
    pending_earnings,
    trends_spotted,
    accuracy_score,
    validation_score
)
SELECT 
    au.id,
    au.email,
    COALESCE(
        au.raw_user_meta_data->>'username',
        split_part(au.email, '@', 1) || '_' || substring(au.id::text, 1, 4)
    ) as username,
    au.created_at,
    'starter' as subscription_tier,
    0.00 as total_earnings,
    0.00 as pending_earnings,
    0 as trends_spotted,
    0.00 as accuracy_score,
    0.00 as validation_score
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- Also create user_settings for users that don't have them
INSERT INTO public.user_settings (user_id, notification_preferences, privacy_settings)
SELECT 
    au.id,
    '{"email": true, "push": true, "trends": true}'::jsonb,
    '{"profile_visibility": "public", "show_earnings": false}'::jsonb
FROM auth.users au
LEFT JOIN public.user_settings us ON au.id = us.user_id
WHERE us.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Create user_account_settings for users that don't have them
INSERT INTO public.user_account_settings (user_id, account_type)
SELECT 
    au.id,
    'user' as account_type
FROM auth.users au
LEFT JOIN public.user_account_settings uas ON au.id = uas.user_id
WHERE uas.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Verify the fix worked
SELECT 
    au.id,
    au.email,
    p.username,
    p.created_at,
    p.subscription_tier
FROM auth.users au
JOIN public.profiles p ON au.id = p.id
ORDER BY au.created_at DESC;

-- Count check
SELECT 
    COUNT(DISTINCT au.id) as total_auth_users,
    COUNT(DISTINCT p.id) as total_profiles,
    COUNT(DISTINCT au.id) - COUNT(DISTINCT p.id) as missing_profiles
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id;