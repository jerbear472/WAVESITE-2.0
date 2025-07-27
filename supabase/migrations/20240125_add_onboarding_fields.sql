-- Add onboarding-related fields to user_profiles table
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS persona_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS venmo_username TEXT,
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Create index on venmo_username for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_venmo_username ON user_profiles(venmo_username);

-- Add constraint to ensure venmo_username is unique if provided
ALTER TABLE user_profiles
ADD CONSTRAINT unique_venmo_username UNIQUE (venmo_username);