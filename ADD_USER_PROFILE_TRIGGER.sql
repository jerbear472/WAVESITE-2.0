-- =====================================================
-- ADD USER PROFILE CREATION TRIGGER
-- =====================================================
-- This ensures user_profiles are created automatically on signup

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (
        user_id,
        username,
        email,
        performance_tier,
        current_balance,
        total_earned,
        quality_score,
        approval_rate,
        trends_submitted,
        trends_approved,
        validations_completed,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        NEW.email,
        'learning', -- New users start in learning tier
        0.00,       -- Start with $0 balance
        0.00,       -- No earnings yet
        0.50,       -- Default quality score
        0.50,       -- Default approval rate
        0,          -- No trends submitted
        0,          -- No trends approved
        0,          -- No validations
        NOW(),
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new user signups
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Also handle existing users who don't have profiles
INSERT INTO public.user_profiles (
    user_id,
    username,
    email,
    performance_tier,
    current_balance,
    total_earned,
    quality_score,
    approval_rate,
    trends_submitted,
    trends_approved,
    validations_completed,
    created_at,
    updated_at
)
SELECT 
    u.id,
    COALESCE(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1)),
    u.email,
    'learning',
    0.00,
    0.00,
    0.50,
    0.50,
    0,
    0,
    0,
    NOW(),
    NOW()
FROM auth.users u
LEFT JOIN public.user_profiles p ON u.id = p.user_id
WHERE p.user_id IS NULL;

-- Verify the trigger is working
DO $$
DECLARE
    user_count INTEGER;
    profile_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM auth.users;
    SELECT COUNT(*) INTO profile_count FROM public.user_profiles;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ User profile trigger installed!';
    RAISE NOTICE '   Users: %', user_count;
    RAISE NOTICE '   Profiles: %', profile_count;
    RAISE NOTICE '';
    RAISE NOTICE 'New users will automatically get profiles on signup.';
END $$;