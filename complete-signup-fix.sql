-- Complete fix for signup issues
-- Run this entire script to fix all issues

-- STEP 1: Ensure profiles table has all required columns
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS birthday DATE,
ADD COLUMN IF NOT EXISTS age_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'starter',
ADD COLUMN IF NOT EXISTS total_earnings DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS pending_earnings DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS trends_spotted INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS accuracy_score DECIMAL(3,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS validation_score DECIMAL(3,2) DEFAULT 0.00;

-- STEP 2: Create profiles for orphaned auth users
INSERT INTO public.profiles (
    id,
    email,
    username,
    created_at
)
SELECT 
    au.id,
    au.email,
    COALESCE(
        au.raw_user_meta_data->>'username',
        split_part(au.email, '@', 1) || '_' || substring(au.id::text, 1, 4)
    ),
    au.created_at
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- STEP 3: Fix user_settings table structure
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email": true, "push": true, "trends": true}'::jsonb,
ADD COLUMN IF NOT EXISTS privacy_settings JSONB DEFAULT '{"profile_visibility": "public", "show_earnings": false}'::jsonb,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- STEP 4: Create user_settings for all users
INSERT INTO public.user_settings (user_id)
SELECT au.id
FROM auth.users au
LEFT JOIN public.user_settings us ON au.id = us.user_id
WHERE us.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- STEP 5: Create user_account_settings table if needed
CREATE TABLE IF NOT EXISTS public.user_account_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    account_type TEXT DEFAULT 'user' CHECK (account_type IN ('user', 'enterprise')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_account_settings ENABLE ROW LEVEL SECURITY;

-- Create policies only if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_account_settings' 
        AND policyname = 'Users can view their own account settings'
    ) THEN
        CREATE POLICY "Users can view their own account settings" ON public.user_account_settings
            FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_account_settings' 
        AND policyname = 'Users can update their own account settings'
    ) THEN
        CREATE POLICY "Users can update their own account settings" ON public.user_account_settings
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_account_settings' 
        AND policyname = 'Users can insert their own account settings'
    ) THEN
        CREATE POLICY "Users can insert their own account settings" ON public.user_account_settings
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- STEP 6: Create user_account_settings for all users
INSERT INTO public.user_account_settings (user_id, account_type)
SELECT au.id, 'user'
FROM auth.users au
LEFT JOIN public.user_account_settings uas ON au.id = uas.user_id
WHERE uas.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- STEP 7: Create or update the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    -- Create profile
    INSERT INTO public.profiles (
        id, 
        email, 
        username,
        birthday,
        age_verified,
        subscription_tier,
        created_at
    )
    VALUES (
        new.id, 
        new.email,
        COALESCE(
            new.raw_user_meta_data->>'username', 
            split_part(new.email, '@', 1) || '_' || substring(new.id::text, 1, 4)
        ),
        (new.raw_user_meta_data->>'birthday')::DATE,
        CASE 
            WHEN new.raw_user_meta_data->>'birthday' IS NOT NULL THEN TRUE 
            ELSE FALSE 
        END,
        'starter',
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        username = CASE 
            WHEN profiles.username IS NULL THEN EXCLUDED.username 
            ELSE profiles.username 
        END,
        birthday = CASE
            WHEN profiles.birthday IS NULL THEN EXCLUDED.birthday
            ELSE profiles.birthday
        END;

    -- Create user_settings
    INSERT INTO public.user_settings (user_id)
    VALUES (new.id)
    ON CONFLICT (user_id) DO NOTHING;

    -- Create user_account_settings
    INSERT INTO public.user_account_settings (user_id, account_type)
    VALUES (new.id, 'user')
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN new;
EXCEPTION WHEN others THEN
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 8: Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- STEP 9: Create the get_user_dashboard_stats function
CREATE OR REPLACE FUNCTION public.get_user_dashboard_stats(p_user_id UUID)
RETURNS TABLE (
    total_earnings DECIMAL(10,2),
    pending_earnings DECIMAL(10,2),
    trends_spotted INTEGER,
    accuracy_score DECIMAL(3,2),
    validation_score DECIMAL(3,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(p.total_earnings, 0.00),
        COALESCE(p.pending_earnings, 0.00),
        COALESCE(p.trends_spotted, 0),
        COALESCE(p.accuracy_score, 0.00),
        COALESCE(p.validation_score, 0.00)
    FROM public.profiles p
    WHERE p.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_user_dashboard_stats TO authenticated;

-- STEP 10: Final verification
SELECT 
    'Verification Report' as report,
    (SELECT COUNT(*) FROM auth.users) as total_auth_users,
    (SELECT COUNT(*) FROM public.profiles) as total_profiles,
    (SELECT COUNT(*) FROM public.user_settings) as total_user_settings,
    (SELECT COUNT(*) FROM public.user_account_settings) as total_account_settings,
    (SELECT COUNT(*) FROM auth.users au LEFT JOIN public.profiles p ON au.id = p.id WHERE p.id IS NULL) as orphaned_users;

-- Show any remaining orphaned users
SELECT 
    au.id,
    au.email,
    au.created_at,
    'Missing profile' as issue
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;