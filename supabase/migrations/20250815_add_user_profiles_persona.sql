-- Create user_profiles table to store persona and personalization data
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    
    -- Basic profile info
    username TEXT UNIQUE,
    display_name TEXT,
    bio TEXT,
    avatar_url TEXT,
    
    -- Persona/Personalization data
    interests TEXT[], -- Array of interest categories
    platforms TEXT[], -- Array of preferred platforms
    persona_data JSONB, -- Flexible JSON for additional persona attributes
    
    -- Preferences
    notification_preferences JSONB DEFAULT '{"trends": true, "earnings": true, "validations": true}'::jsonb,
    privacy_settings JSONB DEFAULT '{"profile_visible": true, "show_earnings": false}'::jsonb,
    
    -- Activity tracking
    onboarding_completed BOOLEAN DEFAULT false,
    personalization_completed BOOLEAN DEFAULT false,
    last_active TIMESTAMPTZ DEFAULT NOW(),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON public.user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_interests ON public.user_profiles USING GIN(interests);
CREATE INDEX IF NOT EXISTS idx_user_profiles_platforms ON public.user_profiles USING GIN(platforms);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all profiles" ON public.user_profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile" ON public.user_profiles
    FOR DELETE USING (auth.uid() = user_id);

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.user_profiles (user_id, username, display_name)
    VALUES (
        NEW.id,
        LOWER(SPLIT_PART(NEW.email, '@', 1)),
        SPLIT_PART(NEW.email, '@', 1)
    )
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup (if not exists)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add persona_data column to existing user_profiles if the table already exists
DO $$
BEGIN
    -- Check if user_profiles table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
        -- Add columns if they don't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'user_profiles' AND column_name = 'interests') THEN
            ALTER TABLE public.user_profiles ADD COLUMN interests TEXT[];
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'user_profiles' AND column_name = 'platforms') THEN
            ALTER TABLE public.user_profiles ADD COLUMN platforms TEXT[];
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'user_profiles' AND column_name = 'persona_data') THEN
            ALTER TABLE public.user_profiles ADD COLUMN persona_data JSONB;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'user_profiles' AND column_name = 'personalization_completed') THEN
            ALTER TABLE public.user_profiles ADD COLUMN personalization_completed BOOLEAN DEFAULT false;
        END IF;
    END IF;
END $$;