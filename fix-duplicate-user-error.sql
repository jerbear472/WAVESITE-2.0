-- Fix duplicate user email error
-- This script helps resolve the "duplicate key value violates unique constraint" error

-- Option 1: Check existing users with that email
SELECT 
    id, 
    email, 
    username,
    created_at,
    subscription_tier
FROM public.profiles 
WHERE email = 'test@wavesight.app';

-- Option 2: If you want to delete the existing user (BE CAREFUL!)
-- Uncomment the lines below only if you're sure you want to delete this test user
/*
DELETE FROM public.profiles WHERE email = 'test@wavesight.app';
DELETE FROM auth.users WHERE email = 'test@wavesight.app';
*/

-- Option 3: Update the existing user instead of creating a new one
-- Uncomment and modify as needed
/*
UPDATE public.profiles 
SET 
    username = 'updated_test_user',
    subscription_tier = 'starter'
WHERE email = 'test@wavesight.app';
*/

-- Option 4: Create a new test user with a different email
-- Use this in your application code instead
/*
INSERT INTO public.profiles (id, email, username, subscription_tier)
VALUES (
    gen_random_uuid(),
    'test2@wavesight.app',  -- Different email
    'test_user_2',
    'starter'
);
*/

-- Check all existing test users to avoid future conflicts
SELECT 
    id, 
    email, 
    username,
    created_at
FROM public.profiles 
WHERE email LIKE '%test%' OR email LIKE '%wavesight%'
ORDER BY created_at DESC;