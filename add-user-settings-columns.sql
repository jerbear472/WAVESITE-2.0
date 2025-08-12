-- Add missing columns to users table for settings persistence
-- Run this in your Supabase SQL Editor

-- Add website column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS website TEXT;

-- Add notification preferences as JSONB
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "email": true,
  "push": true,
  "trends": true,
  "earnings": true
}'::jsonb;

-- Add privacy settings as JSONB
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS privacy_settings JSONB DEFAULT '{
  "profile_public": true,
  "show_earnings": false,
  "show_trends": true
}'::jsonb;

-- Add theme preference
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'system' 
CHECK (theme IN ('light', 'dark', 'system'));

-- Add language preference
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';

-- Add role column if it doesn't exist (for admin check)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user'
CHECK (role IN ('user', 'admin', 'manager', 'moderator'));

-- Add updated_at timestamp
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create an update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if it exists and recreate
DROP TRIGGER IF EXISTS update_users_updated_at ON users;

CREATE TRIGGER update_users_updated_at 
BEFORE UPDATE ON users 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Verify the columns were added
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
    AND column_name IN (
        'website', 
        'notification_preferences', 
        'privacy_settings', 
        'theme', 
        'language', 
        'role',
        'updated_at'
    )
ORDER BY column_name;

-- Update RLS policies to ensure users can update their own settings
DROP POLICY IF EXISTS "Users can update own profile" ON users;

CREATE POLICY "Users can update own profile"
ON users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Ensure users can read their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON users;

CREATE POLICY "Users can view own profile"
ON users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Add policy for public profiles (respecting privacy settings)
DROP POLICY IF EXISTS "Public profiles are viewable" ON users;

CREATE POLICY "Public profiles are viewable"
ON users
FOR SELECT
TO authenticated
USING (
    (privacy_settings->>'profile_public')::boolean = true
    OR auth.uid() = id
);

-- Success message
SELECT 'User settings columns added successfully! Settings will now persist across sessions.' as message;