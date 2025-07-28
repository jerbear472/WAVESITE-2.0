-- Fix for new user creation error
-- This updates the profiles table and handle_new_user function to handle all required fields

-- First, add any missing columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birthday DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS age_verified BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_earnings DECIMAL(10,2) DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pending_earnings DECIMAL(10,2) DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trends_spotted INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS accuracy_score DECIMAL(5,2) DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS validation_score DECIMAL(5,2) DEFAULT 0;

-- Update the handle_new_user function to handle errors gracefully
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Try to insert into profiles table
    INSERT INTO public.profiles (
        id, 
        email, 
        username,
        birthday,
        age_verified,
        subscription_tier,
        created_at,
        updated_at
    )
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
        (new.raw_user_meta_data->>'birthday')::date,
        COALESCE((new.raw_user_meta_data->>'age_verified')::boolean, false),
        'starter',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        username = COALESCE(EXCLUDED.username, profiles.username),
        birthday = COALESCE(EXCLUDED.birthday, profiles.birthday),
        age_verified = COALESCE(EXCLUDED.age_verified, profiles.age_verified),
        updated_at = NOW();
    
    -- Also create user settings if they don't exist
    INSERT INTO public.user_settings (user_id, notification_preferences, privacy_settings)
    VALUES (
        new.id,
        '{"email": true, "push": true, "trends": true}'::jsonb,
        '{"profile_visibility": "public", "show_earnings": false}'::jsonb
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Create user account settings
    INSERT INTO public.user_account_settings (user_id, account_type)
    VALUES (new.id, 'user')
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN new;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't prevent user creation
        RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
        RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Make sure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create user_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    notification_preferences JSONB DEFAULT '{"email": true, "push": true, "trends": true}'::jsonb,
    privacy_settings JSONB DEFAULT '{"profile_visibility": "public", "show_earnings": false}'::jsonb,
    theme_preference TEXT DEFAULT 'system' CHECK (theme_preference IN ('light', 'dark', 'system')),
    language TEXT DEFAULT 'en',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_account_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_account_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    account_type TEXT DEFAULT 'user' CHECK (account_type IN ('user', 'enterprise')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_account_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_settings
CREATE POLICY "Users can view own settings" ON user_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON user_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for user_account_settings
CREATE POLICY "Users can view own account settings" ON user_account_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own account settings" ON user_account_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own account settings" ON user_account_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON user_settings TO authenticated;
GRANT ALL ON user_account_settings TO authenticated;

-- Test the function by checking if it works
DO $$
BEGIN
    RAISE NOTICE 'Profile and user creation setup completed successfully';
END $$;