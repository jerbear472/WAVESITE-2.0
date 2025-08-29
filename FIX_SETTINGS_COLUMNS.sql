-- =====================================================
-- FIX SETTINGS PAGE - ADD MISSING COLUMNS
-- Adds notification and privacy settings to user_profiles
-- =====================================================

BEGIN;

-- 1. Add notification_preferences column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'notification_preferences'
    ) THEN
        ALTER TABLE public.user_profiles 
        ADD COLUMN notification_preferences JSONB DEFAULT '{
            "email": true,
            "push": true,
            "trends": true,
            "earnings": true
        }'::JSONB;
    END IF;
END $$;

-- 2. Add privacy_settings column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'privacy_settings'
    ) THEN
        ALTER TABLE public.user_profiles 
        ADD COLUMN privacy_settings JSONB DEFAULT '{
            "profile_public": true,
            "show_earnings": false,
            "show_trends": true
        }'::JSONB;
    END IF;
END $$;

-- 3. Add theme column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'theme'
    ) THEN
        ALTER TABLE public.user_profiles 
        ADD COLUMN theme TEXT DEFAULT 'system';
    END IF;
END $$;

-- 4. Add language column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'language'
    ) THEN
        ALTER TABLE public.user_profiles 
        ADD COLUMN language TEXT DEFAULT 'en';
    END IF;
END $$;

-- 5. Add bio column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'bio'
    ) THEN
        ALTER TABLE public.user_profiles 
        ADD COLUMN bio TEXT;
    END IF;
END $$;

-- 6. Add website column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'website'
    ) THEN
        ALTER TABLE public.user_profiles 
        ADD COLUMN website TEXT;
    END IF;
END $$;

-- 7. Add avatar_url column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'avatar_url'
    ) THEN
        ALTER TABLE public.user_profiles 
        ADD COLUMN avatar_url TEXT;
    END IF;
END $$;

-- 8. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_notification_preferences 
ON public.user_profiles USING GIN (notification_preferences);

CREATE INDEX IF NOT EXISTS idx_user_profiles_privacy_settings 
ON public.user_profiles USING GIN (privacy_settings);

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check all columns in user_profiles table
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Check a sample user profile with new columns
SELECT 
    id,
    username,
    email,
    bio,
    website,
    avatar_url,
    notification_preferences,
    privacy_settings,
    theme,
    language
FROM user_profiles
LIMIT 5;