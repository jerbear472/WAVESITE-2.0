-- Validation Schema Setup for WaveSite Mobile App
-- This ensures all necessary tables and columns exist for validation functionality

-- First, ensure we have the necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add missing columns to auth.users metadata if needed
-- (Note: We'll use a separate users table for app-specific data)

-- Create users table for app-specific user data if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  trends_spotted INTEGER DEFAULT 0,
  validated_trends INTEGER DEFAULT 0,
  validations_count INTEGER DEFAULT 0,
  accuracy_score DECIMAL(3,2) DEFAULT 0.00,
  points INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for users table
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users table
CREATE POLICY "Users can view all user profiles"
  ON users FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Ensure captured_trends table has all necessary columns
ALTER TABLE captured_trends 
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS username TEXT,
ADD COLUMN IF NOT EXISTS accuracy_score DECIMAL(3,2) DEFAULT 0.00;

-- Update the status check constraint to include all possible statuses
ALTER TABLE captured_trends 
DROP CONSTRAINT IF EXISTS captured_trends_status_check;

ALTER TABLE captured_trends 
ADD CONSTRAINT captured_trends_status_check 
CHECK (status IN ('pending_validation', 'validated', 'rejected', 'viral'));

-- Create function to automatically create user profile on auth signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, username)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', new.email)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup (drop if exists first)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update RLS policies for captured_trends to allow all users to view for validation
DROP POLICY IF EXISTS "Users can view their own captured trends" ON captured_trends;
CREATE POLICY "Users can view all trends for validation"
  ON captured_trends FOR SELECT
  USING (true);

-- Keep other policies as is
CREATE POLICY IF NOT EXISTS "Users can insert their own captured trends"
  ON captured_trends FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their own captured trends"
  ON captured_trends FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create points_transactions table for tracking points
CREATE TABLE IF NOT EXISTS points_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  transaction_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for points_transactions
CREATE INDEX IF NOT EXISTS idx_points_transactions_user_id ON points_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_points_transactions_created_at ON points_transactions(created_at DESC);

-- Enable RLS on points_transactions
ALTER TABLE points_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for points_transactions
CREATE POLICY "Users can view their own points transactions"
  ON points_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert points transactions"
  ON points_transactions FOR INSERT
  WITH CHECK (true);

-- Create achievements table
CREATE TABLE IF NOT EXISTS achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL,
  achieved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  UNIQUE(user_id, achievement_type)
);

-- Create indexes for achievements
CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON achievements(user_id);

-- Enable RLS on achievements
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for achievements
CREATE POLICY "Users can view their own achievements"
  ON achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert achievements"
  ON achievements FOR INSERT
  WITH CHECK (true);

-- Create a view for validation queue that includes user information
CREATE OR REPLACE VIEW validation_queue AS
SELECT 
  ct.id,
  ct.user_id,
  ct.url,
  ct.platform,
  ct.title,
  ct.description,
  ct.hashtags,
  ct.status,
  ct.validation_count,
  ct.positive_votes,
  ct.skip_count,
  ct.category,
  ct.captured_at,
  ct.metadata,
  u.username as submitted_by_username
FROM captured_trends ct
LEFT JOIN users u ON ct.user_id = u.id
WHERE ct.status = 'pending_validation';

-- Grant access to the view
GRANT SELECT ON validation_queue TO authenticated;

-- Create function to update user stats after validation
CREATE OR REPLACE FUNCTION update_user_validation_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update validator's stats
  UPDATE users
  SET 
    validations_count = validations_count + 1,
    last_activity_date = CURRENT_DATE,
    updated_at = NOW()
  WHERE id = NEW.user_id AND NEW.vote != 'skip';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating user stats
DROP TRIGGER IF EXISTS update_user_stats_on_validation ON validations;
CREATE TRIGGER update_user_stats_on_validation
  AFTER INSERT ON validations
  FOR EACH ROW EXECUTE FUNCTION update_user_validation_stats();

-- Create function to check and update trend status based on validation count
CREATE OR REPLACE FUNCTION check_trend_consensus()
RETURNS TRIGGER AS $$
DECLARE
  approval_rate DECIMAL;
BEGIN
  -- Only check if we have at least 10 validations
  IF NEW.validation_count >= 10 THEN
    approval_rate := NEW.positive_votes::DECIMAL / NEW.validation_count;
    
    IF approval_rate >= 0.7 THEN
      -- Mark as validated
      UPDATE captured_trends 
      SET status = 'validated', validated_at = NOW()
      WHERE id = NEW.id;
      
      -- Award points to trend submitter
      UPDATE users
      SET 
        validated_trends = validated_trends + 1,
        points = points + 50, -- 50 points for validated trend
        updated_at = NOW()
      WHERE id = NEW.user_id;
      
    ELSIF approval_rate <= 0.3 THEN
      -- Mark as rejected
      UPDATE captured_trends 
      SET status = 'rejected', rejected_at = NOW()
      WHERE id = NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for checking consensus
DROP TRIGGER IF EXISTS check_consensus_on_update ON captured_trends;
CREATE TRIGGER check_consensus_on_update
  AFTER UPDATE OF validation_count ON captured_trends
  FOR EACH ROW EXECUTE FUNCTION check_trend_consensus();

-- Insert some test data if tables are empty
DO $$
BEGIN
  -- Check if we have any captured trends
  IF NOT EXISTS (SELECT 1 FROM captured_trends LIMIT 1) THEN
    -- Create a test user if needed
    INSERT INTO auth.users (id, email)
    VALUES ('11111111-1111-1111-1111-111111111111', 'test@example.com')
    ON CONFLICT (id) DO NOTHING;
    
    -- Insert test trends
    INSERT INTO captured_trends (user_id, url, platform, title, description, hashtags, status, validation_count, positive_votes)
    VALUES 
      ('11111111-1111-1111-1111-111111111111', 'https://tiktok.com/test1', 'tiktok', 'Dance Challenge #1', 'New viral dance move', '#DanceChallenge #Viral', 'pending_validation', 3, 2),
      ('11111111-1111-1111-1111-111111111111', 'https://instagram.com/test2', 'instagram', 'Fashion Trend Alert', 'Oversized blazers are back', '#Fashion #OOTD #Style', 'pending_validation', 5, 4),
      ('11111111-1111-1111-1111-111111111111', 'https://youtube.com/test3', 'youtube', 'Tech Review Trend', 'Unboxing videos with ASMR', '#Tech #ASMR #Unboxing', 'pending_validation', 7, 5);
  END IF;
END $$;

-- Summary of changes
SELECT 
  'Validation schema setup complete!' as message,
  (SELECT COUNT(*) FROM captured_trends WHERE status = 'pending_validation') as trends_to_validate,
  (SELECT COUNT(*) FROM users) as total_users,
  (SELECT COUNT(*) FROM validations) as total_validations;