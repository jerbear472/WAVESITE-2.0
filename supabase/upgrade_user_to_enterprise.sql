-- Upgrade User to Enterprise
-- Run this after a user has registered through your app

-- Replace 'user@example.com' with the actual user email
UPDATE profiles 
SET subscription_tier = 'enterprise'
WHERE email = 'user@example.com';

-- Verify the update
SELECT id, email, username, subscription_tier, created_at 
FROM profiles 
WHERE email = 'user@example.com';

-- Create an API key for the user
INSERT INTO api_keys (user_id, name, key, rate_limit)
SELECT 
    id,
    'My First API Key',
    generate_api_key(),
    10000
FROM profiles 
WHERE email = 'user@example.com';

-- Show the created API key
SELECT * FROM api_keys 
WHERE user_id = (SELECT id FROM profiles WHERE email = 'user@example.com');