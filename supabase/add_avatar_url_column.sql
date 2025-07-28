-- Add avatar_url column to profiles table if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add bio and website columns if they don't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS bio TEXT;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS website TEXT;

-- Add notifications preferences
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS notifications JSONB DEFAULT '{"email": true, "push": true, "trends": true, "earnings": true}'::jsonb;

-- Add privacy settings
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS privacy JSONB DEFAULT '{"profile_public": true, "show_earnings": false, "show_trends": true}'::jsonb;

-- Add theme preference
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'system';

-- Add language preference  
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';

-- Add updated_at timestamp
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();