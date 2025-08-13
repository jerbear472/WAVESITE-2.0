-- Bypass email confirmation for test user
UPDATE auth.users 
SET 
  email_confirmed_at = NOW(),
  confirmed_at = NOW()
WHERE email = 'testuser@wavesight.com';

-- Verify the update
SELECT id, email, email_confirmed_at, confirmed_at 
FROM auth.users 
WHERE email = 'testuser@wavesight.com';