-- Create a test user directly in the database with confirmed email
-- This is for debugging purposes only

-- First, check if we have any existing confirmed users
SELECT 
    au.id,
    au.email,
    au.email_confirmed_at,
    p.username
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE au.email_confirmed_at IS NOT NULL
LIMIT 5;

-- Update the most recent test user to have confirmed email
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email = 'test1755800878902@wavesight.com'
AND email_confirmed_at IS NULL;

-- Verify the update
SELECT 
    id,
    email,
    email_confirmed_at,
    created_at
FROM auth.users
WHERE email = 'test1755800878902@wavesight.com';