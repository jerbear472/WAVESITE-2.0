-- Fix user_settings table structure
-- First, let's see what columns currently exist

-- Check current structure of user_settings
SELECT 
    column_name, 
    data_type, 
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'user_settings'
ORDER BY ordinal_position;

-- Add missing columns to user_settings if they don't exist
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email": true, "push": true, "trends": true}'::jsonb,
ADD COLUMN IF NOT EXISTS privacy_settings JSONB DEFAULT '{"profile_visibility": "public", "show_earnings": false}'::jsonb,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Now insert missing user_settings records
INSERT INTO public.user_settings (user_id)
SELECT 
    au.id
FROM auth.users au
LEFT JOIN public.user_settings us ON au.id = us.user_id
WHERE us.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Update any existing records that have null values
UPDATE public.user_settings
SET 
    notification_preferences = COALESCE(notification_preferences, '{"email": true, "push": true, "trends": true}'::jsonb),
    privacy_settings = COALESCE(privacy_settings, '{"profile_visibility": "public", "show_earnings": false}'::jsonb)
WHERE notification_preferences IS NULL OR privacy_settings IS NULL;

-- Check if user_account_settings table exists, create if not
CREATE TABLE IF NOT EXISTS public.user_account_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    account_type TEXT DEFAULT 'user' CHECK (account_type IN ('user', 'enterprise')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on user_account_settings
ALTER TABLE public.user_account_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for user_account_settings
CREATE POLICY "Users can view their own account settings" ON public.user_account_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own account settings" ON public.user_account_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own account settings" ON public.user_account_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Insert missing user_account_settings records
INSERT INTO public.user_account_settings (user_id, account_type)
SELECT 
    au.id,
    'user' as account_type
FROM auth.users au
LEFT JOIN public.user_account_settings uas ON au.id = uas.user_id
WHERE uas.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Verify the tables now have all users
SELECT 
    'auth.users' as table_name,
    COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
    'profiles' as table_name,
    COUNT(*) as count
FROM public.profiles
UNION ALL
SELECT 
    'user_settings' as table_name,
    COUNT(*) as count
FROM public.user_settings
UNION ALL
SELECT 
    'user_account_settings' as table_name,
    COUNT(*) as count
FROM public.user_account_settings;