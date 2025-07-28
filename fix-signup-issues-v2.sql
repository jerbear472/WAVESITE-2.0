-- Fix signup issues - Version 2
-- This handles the case where profiles already exists as a table

-- First, let's check what we have
-- Run this to see the current structure:
-- SELECT table_name, table_type FROM information_schema.tables 
-- WHERE table_schema = 'public' AND table_name IN ('profiles', 'user_profiles');

-- Option 1: If profiles table exists but is empty or can be dropped
-- Uncomment these lines if you want to drop and recreate:
-- DROP TABLE IF EXISTS public.profiles CASCADE;

-- Option 2: If profiles table exists and has data, let's update it
-- First, add missing columns to profiles table if they don't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS birthday DATE,
ADD COLUMN IF NOT EXISTS age_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'starter',
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'participant',
ADD COLUMN IF NOT EXISTS demographics JSONB,
ADD COLUMN IF NOT EXISTS interests JSONB,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS total_earnings DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS pending_earnings DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS trends_spotted INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS accuracy_score DECIMAL(3,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS validation_score DECIMAL(3,2) DEFAULT 0.00;

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Update the handle_new_user function to work with profiles table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
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
        COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
        (new.raw_user_meta_data->>'birthday')::DATE,
        CASE 
            WHEN new.raw_user_meta_data->>'birthday' IS NOT NULL THEN TRUE 
            ELSE FALSE 
        END,
        COALESCE(new.raw_user_meta_data->>'subscription_tier', 'starter')
    )
    ON CONFLICT (id) DO UPDATE SET
        birthday = EXCLUDED.birthday,
        age_verified = EXCLUDED.age_verified,
        username = CASE 
            WHEN profiles.username IS NULL THEN EXCLUDED.username 
            ELSE profiles.username 
        END
    WHERE profiles.birthday IS NULL;
    
    RETURN new;
EXCEPTION
    WHEN unique_violation THEN
        -- Handle case where user already exists
        RETURN new;
    WHEN others THEN
        -- Log error but don't fail the signup
        RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
        RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create user_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    notification_preferences JSONB DEFAULT '{"email": true, "push": true, "trends": true}'::jsonb,
    privacy_settings JSONB DEFAULT '{"profile_visibility": "public", "show_earnings": false}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own settings" ON public.user_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" ON public.user_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" ON public.user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create user_account_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_account_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    account_type TEXT DEFAULT 'user' CHECK (account_type IN ('user', 'enterprise')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_account_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own account settings" ON public.user_account_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own account settings" ON public.user_account_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own account settings" ON public.user_account_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create get_user_dashboard_stats function
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_dashboard_stats TO authenticated;

-- Grant necessary permissions
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.user_settings TO authenticated;
GRANT ALL ON public.user_account_settings TO authenticated;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_account_settings_user_id ON public.user_account_settings(user_id);