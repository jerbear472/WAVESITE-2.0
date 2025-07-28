-- Simple fix for profiles table
-- This just ensures all required columns exist without dropping anything

-- Add any missing columns to profiles table
DO $$ 
BEGIN
    -- Check and add username column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'profiles' 
                   AND column_name = 'username') THEN
        ALTER TABLE public.profiles ADD COLUMN username TEXT;
        -- Try to set unique constraint, but don't fail if duplicates exist
        BEGIN
            ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_unique UNIQUE (username);
        EXCEPTION WHEN others THEN
            RAISE NOTICE 'Could not add unique constraint on username: %', SQLERRM;
        END;
    END IF;

    -- Check and add email column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'profiles' 
                   AND column_name = 'email') THEN
        ALTER TABLE public.profiles ADD COLUMN email TEXT;
    END IF;

    -- Check and add birthday column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'profiles' 
                   AND column_name = 'birthday') THEN
        ALTER TABLE public.profiles ADD COLUMN birthday DATE;
    END IF;

    -- Check and add age_verified column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'profiles' 
                   AND column_name = 'age_verified') THEN
        ALTER TABLE public.profiles ADD COLUMN age_verified BOOLEAN DEFAULT FALSE;
    END IF;

    -- Check and add subscription_tier column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'profiles' 
                   AND column_name = 'subscription_tier') THEN
        ALTER TABLE public.profiles ADD COLUMN subscription_tier TEXT DEFAULT 'starter';
    END IF;

    -- Add earnings and stats columns if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'profiles' 
                   AND column_name = 'total_earnings') THEN
        ALTER TABLE public.profiles ADD COLUMN total_earnings DECIMAL(10,2) DEFAULT 0.00;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'profiles' 
                   AND column_name = 'pending_earnings') THEN
        ALTER TABLE public.profiles ADD COLUMN pending_earnings DECIMAL(10,2) DEFAULT 0.00;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'profiles' 
                   AND column_name = 'trends_spotted') THEN
        ALTER TABLE public.profiles ADD COLUMN trends_spotted INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'profiles' 
                   AND column_name = 'accuracy_score') THEN
        ALTER TABLE public.profiles ADD COLUMN accuracy_score DECIMAL(3,2) DEFAULT 0.00;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'profiles' 
                   AND column_name = 'validation_score') THEN
        ALTER TABLE public.profiles ADD COLUMN validation_score DECIMAL(3,2) DEFAULT 0.00;
    END IF;
END $$;

-- Update any profiles that have null username to use email prefix
UPDATE public.profiles 
SET username = split_part(email, '@', 1) || '_' || substring(id::text, 1, 4)
WHERE username IS NULL AND email IS NOT NULL;

-- Update any profiles that have null email from auth.users
UPDATE public.profiles p
SET email = au.email
FROM auth.users au
WHERE p.id = au.id AND p.email IS NULL;

-- The rest of the setup remains the same
-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    -- Try to insert, update if exists
    INSERT INTO public.profiles (
        id, 
        email, 
        username,
        birthday,
        age_verified,
        subscription_tier
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
        'starter'
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
        END,
        age_verified = CASE
            WHEN profiles.birthday IS NOT NULL THEN TRUE
            ELSE EXCLUDED.age_verified
        END;
    
    RETURN new;
EXCEPTION WHEN others THEN
    -- Log error but don't fail signup
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();