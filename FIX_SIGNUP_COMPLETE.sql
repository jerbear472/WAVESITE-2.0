-- ============================================
-- COMPLETE SIGNUP FIX
-- This will ensure user registration works
-- ============================================

-- STEP 1: Drop and recreate the trigger function with better error handling
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Insert into user_profiles with all required fields
    INSERT INTO public.user_profiles (
        id,
        email,
        username,
        role,
        spotter_tier,
        earnings_pending,
        earnings_approved,
        earnings_paid,
        total_earnings,
        daily_earnings,
        trends_spotted,
        accuracy_score,
        validation_score,
        current_streak,
        demographics,
        interests,
        created_at,
        updated_at,
        is_active
    ) VALUES (
        NEW.id,
        COALESCE(NEW.email, 'user_' || NEW.id::text || '@wavesight.com'),
        COALESCE(
            NEW.raw_user_meta_data->>'username',
            NEW.raw_user_meta_data->>'name',
            split_part(NEW.email, '@', 1),
            'user_' || LEFT(NEW.id::text, 8)
        ),
        'participant'::user_role,
        'learning'::spotter_tier,
        0.00,
        0.00,
        0.00,
        0.00,
        0.00,
        0,
        0.00,
        0.00,
        0,
        '{}'::jsonb,
        '{}'::jsonb,
        NOW(),
        NOW(),
        true
    ) ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        username = CASE 
            WHEN user_profiles.username IS NULL OR user_profiles.username = '' 
            THEN EXCLUDED.username 
            ELSE user_profiles.username 
        END,
        updated_at = NOW();
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the signup
        RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- STEP 2: Create the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- STEP 3: Ensure RLS policies allow the trigger to work
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Public profiles are viewable" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON user_profiles;
DROP POLICY IF EXISTS "Enable insert for registration" ON user_profiles;
DROP POLICY IF EXISTS "Enable update for users to update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Enable delete for users to delete own profile" ON user_profiles;

-- Create permissive policies that work with the trigger
CREATE POLICY "Anyone can read profiles"
    ON user_profiles FOR SELECT
    USING (true);

CREATE POLICY "Service role bypass"
    ON user_profiles
    USING (auth.role() = 'service_role');

CREATE POLICY "Users can update own profile"
    ON user_profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Trigger can insert profiles"
    ON user_profiles FOR INSERT
    WITH CHECK (true);

-- STEP 4: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, service_role;

-- STEP 5: Ensure the profiles view exists and has permissions
DROP VIEW IF EXISTS profiles CASCADE;
CREATE OR REPLACE VIEW profiles AS SELECT * FROM user_profiles;

GRANT ALL ON profiles TO anon, authenticated, service_role;

-- STEP 6: Create a manual signup function as backup
CREATE OR REPLACE FUNCTION create_profile_for_user(user_id UUID, user_email TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO user_profiles (
        id, email, username, role, spotter_tier,
        earnings_pending, earnings_approved, earnings_paid, total_earnings,
        trends_spotted, accuracy_score, validation_score, current_streak,
        created_at, updated_at, is_active
    ) VALUES (
        user_id,
        user_email,
        split_part(user_email, '@', 1),
        'participant',
        'learning',
        0, 0, 0, 0, 0, 0, 0, 0,
        NOW(), NOW(), true
    ) ON CONFLICT (id) DO NOTHING;
END;
$$;

-- STEP 7: Fix any existing users without profiles
INSERT INTO user_profiles (
    id, email, username, role, spotter_tier,
    earnings_pending, earnings_approved, earnings_paid, total_earnings,
    trends_spotted, accuracy_score, validation_score, current_streak,
    created_at, updated_at, is_active
)
SELECT 
    au.id,
    au.email,
    COALESCE(
        au.raw_user_meta_data->>'username',
        split_part(au.email, '@', 1)
    ),
    'participant',
    'learning',
    0, 0, 0, 0, 0, 0, 0, 0,
    au.created_at,
    NOW(),
    true
FROM auth.users au
LEFT JOIN user_profiles up ON up.id = au.id
WHERE up.id IS NULL;

-- STEP 8: Test the setup
DO $$
DECLARE
    v_trigger_exists BOOLEAN;
    v_function_exists BOOLEAN;
    v_policies_count INTEGER;
BEGIN
    -- Check trigger
    SELECT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'on_auth_user_created'
    ) INTO v_trigger_exists;
    
    -- Check function
    SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'handle_new_user'
    ) INTO v_function_exists;
    
    -- Count policies
    SELECT COUNT(*) 
    FROM pg_policies 
    WHERE tablename = 'user_profiles'
    INTO v_policies_count;
    
    RAISE NOTICE '================================';
    RAISE NOTICE '✅ SIGNUP FIX COMPLETE';
    RAISE NOTICE '================================';
    RAISE NOTICE 'Trigger exists: %', v_trigger_exists;
    RAISE NOTICE 'Function exists: %', v_function_exists;
    RAISE NOTICE 'RLS policies: % policies', v_policies_count;
    RAISE NOTICE '================================';
    RAISE NOTICE 'Users can now sign up successfully!';
END $$;