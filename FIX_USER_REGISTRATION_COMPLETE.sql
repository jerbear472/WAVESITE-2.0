-- =====================================================
-- FIX USER REGISTRATION - COMPLETE SOLUTION
-- Creates all missing tables and fixes registration
-- =====================================================

BEGIN;

-- 1. Create user_stats table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_stats (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    trends_spotted INTEGER DEFAULT 0,
    accuracy_score DECIMAL(5,2) DEFAULT 0.00,
    validation_score DECIMAL(5,2) DEFAULT 0.00,
    current_streak INTEGER DEFAULT 0,
    session_streak INTEGER DEFAULT 0,
    performance_tier TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create user_xp table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_xp (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    total_xp INTEGER DEFAULT 0,
    current_level INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add birthday column to user_profiles if it doesn't exist
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

-- 4. Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 5. Create improved handle_new_user function
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
        BEGIN
            v_birthday := (NEW.raw_user_meta_data->>'birthday')::DATE;
        EXCEPTION
            WHEN OTHERS THEN
                v_birthday := NULL;
        END;
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
        username = COALESCE(user_profiles.username, EXCLUDED.username),
        birthday = COALESCE(user_profiles.birthday, EXCLUDED.birthday);
    
    -- Create user_xp record
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
    
    -- Create user_stats record
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
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the signup
        RAISE WARNING 'Error in handle_new_user for %: %', NEW.email, SQLERRM;
        -- Still return NEW to allow signup to complete
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Recreate trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_new_user();

-- 7. Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_xp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies for user_profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.user_profiles;
CREATE POLICY "Users can view all profiles" ON public.user_profiles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;
CREATE POLICY "Users can insert their own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
CREATE POLICY "Users can update their own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- 9. Create RLS policies for user_xp
DROP POLICY IF EXISTS "Users can view all XP" ON public.user_xp;
CREATE POLICY "Users can view all XP" ON public.user_xp
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update their own XP" ON public.user_xp;
CREATE POLICY "Users can update their own XP" ON public.user_xp
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage XP" ON public.user_xp;
CREATE POLICY "Service role can manage XP" ON public.user_xp
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- 10. Create RLS policies for user_stats
DROP POLICY IF EXISTS "Users can view all stats" ON public.user_stats;
CREATE POLICY "Users can view all stats" ON public.user_stats
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update their own stats" ON public.user_stats;
CREATE POLICY "Users can update their own stats" ON public.user_stats
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage stats" ON public.user_stats;
CREATE POLICY "Service role can manage stats" ON public.user_stats
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- 11. Fix any existing users without profiles
INSERT INTO public.user_profiles (id, email, username, created_at)
SELECT 
    au.id,
    au.email,
    COALESCE(
        au.raw_user_meta_data->>'username',
        split_part(au.email, '@', 1) || '_' || substr(au.id::text, 1, 4)
    ),
    au.created_at
FROM auth.users au
LEFT JOIN public.user_profiles up ON up.id = au.id
WHERE up.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 12. Fix any existing users without XP records
INSERT INTO public.user_xp (user_id, total_xp, current_level, created_at, updated_at)
SELECT 
    up.id,
    0,
    1,
    up.created_at,
    NOW()
FROM public.user_profiles up
LEFT JOIN public.user_xp ux ON ux.user_id = up.id
WHERE ux.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- 13. Fix any existing users without stats records
INSERT INTO public.user_stats (user_id, trends_spotted, accuracy_score, validation_score, created_at, updated_at)
SELECT 
    up.id,
    0,
    0.00,
    0.00,
    up.created_at,
    NOW()
FROM public.user_profiles up
LEFT JOIN public.user_stats us ON us.user_id = up.id
WHERE us.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- 14. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON public.user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_xp_total ON public.user_xp(total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON public.user_stats(user_id);

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_profiles', 'user_xp', 'user_stats')
ORDER BY table_name;

-- Check if trigger exists
SELECT 
    tgname AS trigger_name,
    tgrelid::regclass AS table_name,
    proname AS function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname = 'on_auth_user_created';

-- Check recent user profiles with related data
SELECT 
    up.id,
    up.username,
    up.email,
    up.birthday,
    up.created_at,
    ux.total_xp,
    ux.current_level,
    us.trends_spotted,
    us.accuracy_score
FROM user_profiles up
LEFT JOIN user_xp ux ON ux.user_id = up.id
LEFT JOIN user_stats us ON us.user_id = up.id
ORDER BY up.created_at DESC
LIMIT 10;

-- Check for any users without complete data
SELECT 
    au.id,
    au.email,
    au.created_at,
    CASE WHEN up.id IS NULL THEN 'Missing profile' ELSE 'Has profile' END as profile_status,
    CASE WHEN ux.user_id IS NULL THEN 'Missing XP' ELSE 'Has XP' END as xp_status,
    CASE WHEN us.user_id IS NULL THEN 'Missing stats' ELSE 'Has stats' END as stats_status
FROM auth.users au
LEFT JOIN user_profiles up ON up.id = au.id
LEFT JOIN user_xp ux ON ux.user_id = au.id
LEFT JOIN user_stats us ON us.user_id = au.id
WHERE up.id IS NULL OR ux.user_id IS NULL OR us.user_id IS NULL;