-- User Personas and Settings Schema
-- Adds persistent storage for user personas and settings

-- User personas table
CREATE TABLE IF NOT EXISTS user_personas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Location data
    location_country TEXT,
    location_city TEXT,
    location_urban_type TEXT CHECK (location_urban_type IN ('urban', 'suburban', 'rural')),
    
    -- Demographics
    age_range TEXT,
    gender TEXT,
    education_level TEXT,
    relationship_status TEXT,
    has_children BOOLEAN DEFAULT false,
    
    -- Professional
    employment_status TEXT,
    industry TEXT,
    income_range TEXT,
    work_style TEXT CHECK (work_style IN ('office', 'remote', 'hybrid')),
    
    -- Interests (stored as JSONB array)
    interests JSONB DEFAULT '[]'::jsonb,
    
    -- Lifestyle
    shopping_habits JSONB DEFAULT '[]'::jsonb,
    media_consumption JSONB DEFAULT '[]'::jsonb,
    values JSONB DEFAULT '[]'::jsonb,
    
    -- Tech preferences
    tech_proficiency TEXT CHECK (tech_proficiency IN ('basic', 'intermediate', 'advanced', 'expert')),
    primary_devices JSONB DEFAULT '[]'::jsonb,
    social_platforms JSONB DEFAULT '[]'::jsonb,
    
    -- Metadata
    is_complete BOOLEAN DEFAULT false,
    completion_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one persona per user
    UNIQUE(user_id)
);

-- User settings table for general app preferences
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Notification preferences
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    trend_alerts BOOLEAN DEFAULT true,
    weekly_digest BOOLEAN DEFAULT true,
    
    -- Privacy settings
    profile_visibility TEXT DEFAULT 'public' CHECK (profile_visibility IN ('public', 'private', 'friends')),
    data_sharing BOOLEAN DEFAULT false,
    analytics_tracking BOOLEAN DEFAULT true,
    
    -- App preferences
    theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'system')),
    language TEXT DEFAULT 'en',
    timezone TEXT DEFAULT 'UTC',
    currency TEXT DEFAULT 'USD',
    
    -- Feature preferences
    tutorial_completed BOOLEAN DEFAULT false,
    onboarding_completed BOOLEAN DEFAULT false,
    beta_features BOOLEAN DEFAULT false,
    
    -- Custom settings (for extensibility)
    custom_settings JSONB DEFAULT '{}'::jsonb,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one settings record per user
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE user_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_personas
CREATE POLICY "Users can view their own persona" ON user_personas
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own persona" ON user_personas
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own persona" ON user_personas
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own persona" ON user_personas
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for user_settings
CREATE POLICY "Users can view their own settings" ON user_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" ON user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" ON user_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own settings" ON user_settings
    FOR DELETE USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_user_personas_updated_at 
    BEFORE UPDATE ON user_personas 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at 
    BEFORE UPDATE ON user_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create default settings when user is created
CREATE OR REPLACE FUNCTION create_user_defaults()
RETURNS TRIGGER AS $$
BEGIN
    -- Create default settings for new user
    INSERT INTO user_settings (user_id) VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the existing trigger to also create default settings
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create profile
    INSERT INTO public.profiles (id, email, username)
    VALUES (
        new.id,
        new.email,
        new.raw_user_meta_data->>'username'
    );
    
    -- Create default settings
    INSERT INTO user_settings (user_id) VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_personas_user_id ON user_personas(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_personas_updated_at ON user_personas(updated_at);
CREATE INDEX IF NOT EXISTS idx_user_settings_updated_at ON user_settings(updated_at);