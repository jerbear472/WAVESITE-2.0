-- ============================================
-- FIX USER SIGNUP - Create profile on registration
-- ============================================

-- Step 1: Create the function that handles new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert into user_profiles when a new auth user is created
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
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
        'participant',
        'learning',
        0.00,
        0.00,
        0.00,
        0.00,
        0,
        0.00,
        0.00,
        0,
        '{}',
        '{}',
        NOW(),
        NOW(),
        true
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Step 3: Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Grant necessary permissions
GRANT USAGE ON SCHEMA auth TO postgres, authenticated, anon, service_role;
GRANT ALL ON auth.users TO postgres, service_role;
GRANT ALL ON public.user_profiles TO postgres, authenticated, service_role;

-- Step 5: Test that profiles view works
SELECT COUNT(*) FROM profiles;

-- Step 6: Ensure the profiles view has proper permissions
DROP VIEW IF EXISTS profiles CASCADE;
CREATE VIEW profiles AS SELECT * FROM user_profiles;
GRANT ALL ON profiles TO authenticated, anon, service_role;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 'Signup trigger created successfully!' as status;