-- Fix Authentication Tables
-- The app expects 'user_profiles' but we have 'profiles'

-- Option 1: Create a view that maps profiles to user_profiles
CREATE OR REPLACE VIEW user_profiles AS
SELECT 
    id,
    email,
    username,
    full_name,
    avatar_url,
    bio,
    subscription_tier,
    created_at,
    updated_at,
    -- Add fields expected by the app
    'participant' as role,
    0 as total_earnings,
    0 as pending_earnings,
    0 as trends_spotted,
    0 as accuracy_score,
    0 as validation_score,
    'user' as view_mode
FROM profiles;

-- Grant permissions on the view
GRANT ALL ON user_profiles TO authenticated;
GRANT ALL ON user_profiles TO anon;

-- Create RLS policy for the view
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Ensure the test user exists
DO $$
BEGIN
    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'enterprise@test.com') THEN
        RAISE NOTICE 'Test user does not exist in auth.users';
    ELSE
        -- Make sure profile exists
        INSERT INTO profiles (id, email, username, subscription_tier)
        SELECT 
            id,
            email,
            'enterprise_test',
            'enterprise'
        FROM auth.users 
        WHERE email = 'enterprise@test.com'
        ON CONFLICT (id) DO UPDATE 
        SET subscription_tier = 'enterprise';
        
        RAISE NOTICE 'Test user profile ensured';
    END IF;
END $$;

-- Show current users
SELECT 
    p.email,
    p.username,
    p.subscription_tier,
    p.created_at,
    CASE 
        WHEN au.id IS NOT NULL THEN 'Yes'
        ELSE 'No'
    END as has_auth_user
FROM profiles p
LEFT JOIN auth.users au ON au.id = p.id
ORDER BY p.created_at DESC;