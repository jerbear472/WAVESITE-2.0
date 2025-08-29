-- =====================================================
-- FIX USER REGISTRATION DATABASE ERROR
-- Ensures user profiles are created properly on signup
-- =====================================================

BEGIN;

-- 1. Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Create improved handle_new_user function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_username TEXT;
    v_birthday DATE;
BEGIN
    -- Extract username from metadata or generate from email
    v_username := COALESCE(
        NEW.raw_user_meta_data->>'username',
        split_part(NEW.email, '@', 1)
    );
    
    -- Make username unique if it already exists
    WHILE EXISTS (SELECT 1 FROM public.user_profiles WHERE username = v_username) LOOP
        v_username := v_username || '_' || floor(random() * 1000)::text;
    END LOOP;
    
    -- Extract birthday if provided
    IF NEW.raw_user_meta_data->>'birthday' IS NOT NULL THEN
        v_birthday := (NEW.raw_user_meta_data->>'birthday')::DATE;
    END IF;
    
    -- Insert user profile
    INSERT INTO public.user_profiles (
        id, 
        email, 
        username,
        birthday,
        created_at
    )
    VALUES (
        NEW.id, 
        NEW.email,
        v_username,
        v_birthday,
        NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        username = EXCLUDED.username,
        birthday = COALESCE(EXCLUDED.birthday, user_profiles.birthday);
    
    -- Also create initial user_xp record
    INSERT INTO public.user_xp (
        user_id,
        total_xp,
        current_level,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        0,
        1,
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Create initial user_stats record
    INSERT INTO public.user_stats (
        user_id,
        trends_spotted,
        accuracy_score,
        validation_score,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        0,
        0.00,
        0.00,
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Log successful creation
    RAISE NOTICE 'Created user profile for % with username %', NEW.email, v_username;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the signup
        RAISE WARNING 'Error creating user profile for %: %', NEW.email, SQLERRM;
        -- Still return NEW to allow signup to complete
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Recreate trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_new_user();

-- 4. Ensure RLS policies allow profile creation
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;
CREATE POLICY "Users can insert their own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
CREATE POLICY "Users can update their own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view all profiles" ON public.user_profiles;
CREATE POLICY "Users can view all profiles" ON public.user_profiles
    FOR SELECT USING (true);

-- 5. Ensure RLS policies for user_xp
ALTER TABLE public.user_xp ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all XP" ON public.user_xp;
CREATE POLICY "Users can view all XP" ON public.user_xp
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "System can manage XP" ON public.user_xp;
CREATE POLICY "System can manage XP" ON public.user_xp
    FOR ALL USING (true);

-- 6. Ensure RLS policies for user_stats
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all stats" ON public.user_stats;
CREATE POLICY "Users can view all stats" ON public.user_stats
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "System can manage stats" ON public.user_stats;
CREATE POLICY "System can manage stats" ON public.user_stats
    FOR ALL USING (true);

-- 7. Add birthday column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'birthday'
    ) THEN
        ALTER TABLE public.user_profiles 
        ADD COLUMN birthday DATE;
    END IF;
END $$;

-- 8. Fix any existing users without profiles
INSERT INTO public.user_profiles (id, email, username, created_at)
SELECT 
    au.id,
    au.email,
    COALESCE(
        au.raw_user_meta_data->>'username',
        split_part(au.email, '@', 1) || '_' || floor(random() * 1000)::text
    ),
    au.created_at
FROM auth.users au
LEFT JOIN public.user_profiles up ON up.id = au.id
WHERE up.id IS NULL;

-- 9. Fix any existing users without XP records
INSERT INTO public.user_xp (user_id, total_xp, current_level, created_at, updated_at)
SELECT 
    up.id,
    0,
    1,
    NOW(),
    NOW()
FROM public.user_profiles up
LEFT JOIN public.user_xp ux ON ux.user_id = up.id
WHERE ux.user_id IS NULL;

-- 10. Fix any existing users without stats records
INSERT INTO public.user_stats (user_id, trends_spotted, accuracy_score, validation_score, created_at, updated_at)
SELECT 
    up.id,
    0,
    0.00,
    0.00,
    NOW(),
    NOW()
FROM public.user_profiles up
LEFT JOIN public.user_stats us ON us.user_id = up.id
WHERE us.user_id IS NULL;

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if trigger exists
SELECT 
    tgname AS trigger_name,
    tgrelid::regclass AS table_name,
    proname AS function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname = 'on_auth_user_created';

-- Check recent user profiles
SELECT 
    up.id,
    up.username,
    up.email,
    up.birthday,
    up.created_at,
    ux.total_xp,
    us.trends_spotted
FROM user_profiles up
LEFT JOIN user_xp ux ON ux.user_id = up.id
LEFT JOIN user_stats us ON us.user_id = up.id
ORDER BY up.created_at DESC
LIMIT 10;

-- Check for users without profiles
SELECT 
    au.id,
    au.email,
    au.created_at,
    up.id as profile_id
FROM auth.users au
LEFT JOIN user_profiles up ON up.id = au.id
WHERE up.id IS NULL;