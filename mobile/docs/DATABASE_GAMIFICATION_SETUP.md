# Database Setup for Gamification Features

This document contains the SQL commands to set up the database tables required for the points, achievements, and gamification features in WaveSight.

## Required Tables

### 1. Update Users Table

Add new columns to the existing users table:

```sql
-- Add gamification columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS level VARCHAR(20) DEFAULT 'bronze',
ADD COLUMN IF NOT EXISTS validations_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS validated_trends INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS referrals_count INTEGER DEFAULT 0;

-- Create index for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_users_points ON users(points DESC);
```

### 2. Points Log Table

Track all points awarded to users:

```sql
CREATE TABLE IF NOT EXISTS points_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL,
  points INTEGER NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_points_log_user_id ON points_log(user_id);
CREATE INDEX IF NOT EXISTS idx_points_log_created_at ON points_log(created_at DESC);
```

### 3. User Streaks Table

Track daily streaks for users:

```sql
CREATE TABLE IF NOT EXISTS user_streaks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_active_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_user_streaks_user_id ON user_streaks(user_id);
```

### 4. User Achievements Table

Track which achievements users have unlocked:

```sql
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id VARCHAR(50) NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked_at ON user_achievements(unlocked_at DESC);
```

### 5. Validations Table

Track trend validation votes:

```sql
CREATE TABLE IF NOT EXISTS validations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trend_id UUID REFERENCES captured_trends(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  vote VARCHAR(10) NOT NULL CHECK (vote IN ('yes', 'no', 'skip')),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(trend_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_validations_trend_id ON validations(trend_id);
CREATE INDEX IF NOT EXISTS idx_validations_user_id ON validations(user_id);
CREATE INDEX IF NOT EXISTS idx_validations_timestamp ON validations(timestamp DESC);
```

### 6. Update Captured Trends Table

Add validation-related columns:

```sql
-- Add validation columns to captured_trends table
ALTER TABLE captured_trends 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending_validation',
ADD COLUMN IF NOT EXISTS validation_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS positive_votes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS skip_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS validated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE;

-- Create index for validation queries
CREATE INDEX IF NOT EXISTS idx_captured_trends_status ON captured_trends(status);
CREATE INDEX IF NOT EXISTS idx_captured_trends_validation_count ON captured_trends(validation_count);
```

### 7. Leaderboard View (Optional)

Create a view for easy leaderboard queries:

```sql
CREATE OR REPLACE VIEW leaderboard AS
SELECT 
  u.id,
  u.username,
  u.points,
  u.level,
  u.trends_spotted,
  u.validated_trends,
  u.accuracy_score,
  COUNT(DISTINCT ua.achievement_id) as achievements_count,
  RANK() OVER (ORDER BY u.points DESC) as rank
FROM users u
LEFT JOIN user_achievements ua ON u.id = ua.user_id
GROUP BY u.id, u.username, u.points, u.level, u.trends_spotted, u.validated_trends, u.accuracy_score
ORDER BY u.points DESC;
```

## Row Level Security (RLS) Policies

Enable RLS on all tables:

```sql
-- Enable RLS
ALTER TABLE points_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE validations ENABLE ROW LEVEL SECURITY;

-- Points log policies
CREATE POLICY "Users can view their own points log" ON points_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert points log" ON points_log
  FOR INSERT WITH CHECK (true);

-- User streaks policies
CREATE POLICY "Users can view their own streak" ON user_streaks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage user streaks" ON user_streaks
  FOR ALL USING (true);

-- User achievements policies
CREATE POLICY "Users can view their own achievements" ON user_achievements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage achievements" ON user_achievements
  FOR ALL USING (true);

-- Validations policies
CREATE POLICY "Users can view all validations" ON validations
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own validations" ON validations
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

## Functions and Triggers

### Auto-update user stats trigger:

```sql
-- Function to update user stats after validation
CREATE OR REPLACE FUNCTION update_user_validation_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.vote != 'skip' THEN
    UPDATE users 
    SET validations_count = validations_count + 1
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_update_user_validation_stats
AFTER INSERT ON validations
FOR EACH ROW
EXECUTE FUNCTION update_user_validation_stats();
```

## Sample Data (Optional)

Insert some test achievements:

```sql
-- This is just for reference - achievements are defined in the app code
-- No need to insert into database as they're hardcoded in the app
```

## Verification

Run these queries to verify the setup:

```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('points_log', 'user_streaks', 'user_achievements', 'validations');

-- Check users table has new columns
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('points', 'level', 'validations_count', 'validated_trends', 'referrals_count');

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('points_log', 'user_streaks', 'user_achievements', 'validations');
```

## Notes

1. Run these commands in order as some tables depend on others
2. Make sure the `captured_trends` table exists before running the validations table creation
3. The leaderboard view is optional but recommended for performance
4. Adjust RLS policies based on your security requirements
5. Consider adding more indexes based on your query patterns