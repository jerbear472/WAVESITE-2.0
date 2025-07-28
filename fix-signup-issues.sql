-- Fix 1: Create profiles table that matches the web app expectations
-- This creates a view that maps user_profiles to profiles for compatibility

-- First, check if profiles view/table already exists
DROP VIEW IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Create profiles view that maps to user_profiles
CREATE VIEW public.profiles AS
SELECT 
    id,
    username,
    email,
    role,
    demographics,
    interests,
    created_at,
    is_active,
    total_earnings,
    pending_earnings,
    trends_spotted,
    accuracy_score,
    validation_score,
    -- Add fields expected by the web app
    NULL::DATE as birthday,
    FALSE as age_verified,
    'starter'::TEXT as subscription_tier
FROM public.user_profiles;

-- Create necessary RLS policies for the view
ALTER VIEW public.profiles SET (security_invoker = on);

-- Grant permissions
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;

-- Fix 2: Add birthday field to user_profiles if it doesn't exist
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS birthday DATE,
ADD COLUMN IF NOT EXISTS age_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'starter';

-- Fix 3: Update the handle_new_user function to work with the new fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.user_profiles (
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
        age_verified = EXCLUDED.age_verified
    WHERE user_profiles.birthday IS NULL;
    
    RETURN new;
EXCEPTION
    WHEN unique_violation THEN
        -- Handle case where user already exists
        RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix 4: Create user_settings table if it doesn't exist
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

-- Fix 5: Create user_account_settings table if it doesn't exist
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

-- Fix 6: Create a function to get user dashboard stats
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
        COALESCE(up.total_earnings, 0.00),
        COALESCE(up.pending_earnings, 0.00),
        COALESCE(up.trends_spotted, 0),
        COALESCE(up.accuracy_score, 0.00),
        COALESCE(up.validation_score, 0.00)
    FROM public.user_profiles up
    WHERE up.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_dashboard_stats TO authenticated;