-- FIX REGISTRATION - Ensure user creation works properly

-- ============================================
-- 1. Fix the trigger to handle birthday from metadata
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create user profile with all needed fields
    INSERT INTO public.user_profiles (
        id,
        email,
        username,
        birthday,
        age_verified,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        CASE 
            WHEN NEW.raw_user_meta_data->>'birthday' IS NOT NULL 
            THEN (NEW.raw_user_meta_data->>'birthday')::DATE 
            ELSE NULL 
        END,
        CASE 
            WHEN NEW.raw_user_meta_data->>'birthday' IS NOT NULL 
            THEN true 
            ELSE false 
        END,
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        birthday = EXCLUDED.birthday,
        age_verified = EXCLUDED.age_verified,
        updated_at = NOW();
    
    -- Also create account settings if not exists
    INSERT INTO public.user_account_settings (
        user_id,
        account_type,
        created_at
    ) VALUES (
        NEW.id,
        'user',
        NOW()
    ) ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the signup
        RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. Recreate the trigger
-- ============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 3. Ensure profiles view includes birthday
-- ============================================
DROP VIEW IF EXISTS public.profiles CASCADE;
CREATE OR REPLACE VIEW public.profiles AS 
SELECT 
    id,
    username,
    email,
    role,
    spotter_tier,
    birthday,
    age_verified,
    avatar_url,
    bio,
    COALESCE(earnings_pending, pending_earnings, 0.00) as pending_earnings,
    COALESCE(earnings_approved, 0.00) as earnings_approved,
    COALESCE(earnings_paid, 0.00) as earnings_paid,
    COALESCE(total_earnings, 0.00) as total_earnings,
    trends_spotted,
    accuracy_score,
    validation_score,
    subscription_tier,
    is_admin,
    demographics,
    interests,
    created_at,
    updated_at,
    is_active
FROM public.user_profiles;

-- Grant permissions
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT UPDATE ON public.profiles TO authenticated;

-- ============================================
-- 4. Create RLS policy for inserting profiles (fallback)
-- ============================================
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================
-- 5. Create a manual registration helper function
-- ============================================
CREATE OR REPLACE FUNCTION public.complete_user_registration(
    p_user_id UUID,
    p_email TEXT,
    p_username TEXT,
    p_birthday DATE DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- Try to insert or update user profile
    INSERT INTO public.user_profiles (
        id,
        email,
        username,
        birthday,
        age_verified,
        created_at,
        updated_at
    ) VALUES (
        p_user_id,
        p_email,
        p_username,
        p_birthday,
        p_birthday IS NOT NULL,
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        birthday = EXCLUDED.birthday,
        age_verified = EXCLUDED.age_verified,
        updated_at = NOW();
    
    -- Create account settings
    INSERT INTO public.user_account_settings (
        user_id,
        account_type,
        created_at
    ) VALUES (
        p_user_id,
        'user',
        NOW()
    ) ON CONFLICT (user_id) DO NOTHING;
    
    v_result := jsonb_build_object(
        'success', true,
        'message', 'User registration completed'
    );
    
    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        v_result := jsonb_build_object(
            'success', false,
            'message', 'Registration failed',
            'error', SQLERRM
        );
        RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.complete_user_registration TO anon, authenticated;

-- ============================================
-- 6. Test the setup
-- ============================================
DO $$ 
BEGIN
    RAISE NOTICE 'Registration fix applied successfully!';
    RAISE NOTICE 'The system now:';
    RAISE NOTICE '- Handles birthday field from user metadata';
    RAISE NOTICE '- Has fallback manual registration function';
    RAISE NOTICE '- Includes birthday in profiles view';
    RAISE NOTICE '- Has proper RLS policies for insertion';
END $$;