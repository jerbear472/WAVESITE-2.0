-- Add monetization and gamification tables for WaveSite

-- Scroll Sessions table
CREATE TABLE IF NOT EXISTS scroll_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_seconds INTEGER NOT NULL,
  trends_logged INTEGER DEFAULT 0,
  base_earnings DECIMAL(10, 2) DEFAULT 0,
  bonus_earnings DECIMAL(10, 2) DEFAULT 0,
  total_earnings DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Logged Trends table (quick-logged trends during scroll sessions)
CREATE TABLE IF NOT EXISTS logged_trends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL,
  notes TEXT,
  emoji VARCHAR(10),
  logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_id UUID REFERENCES scroll_sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trend Verifications table
CREATE TABLE IF NOT EXISTS trend_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trend_id UUID NOT NULL,
  verifier_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_valid BOOLEAN NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(trend_id, verifier_id)
);

-- User Streaks table
CREATE TABLE IF NOT EXISTS user_streaks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  streak_started_at DATE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Challenge Completions table
CREATE TABLE IF NOT EXISTS challenge_completions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id VARCHAR(50) NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reward_amount DECIMAL(10, 2) DEFAULT 0,
  week_start DATE NOT NULL,
  UNIQUE(user_id, challenge_id, week_start)
);

-- Add user_name column to logged_trends for display
ALTER TABLE logged_trends ADD COLUMN IF NOT EXISTS user_name VARCHAR(255);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_scroll_sessions_user_id ON scroll_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_scroll_sessions_started_at ON scroll_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_logged_trends_user_id ON logged_trends(user_id);
CREATE INDEX IF NOT EXISTS idx_logged_trends_category ON logged_trends(category);
CREATE INDEX IF NOT EXISTS idx_trend_verifications_verifier_id ON trend_verifications(verifier_id);
CREATE INDEX IF NOT EXISTS idx_challenge_completions_user_week ON challenge_completions(user_id, week_start);

-- RPC function to update user earnings
CREATE OR REPLACE FUNCTION update_user_earnings(
  user_id UUID,
  amount DECIMAL
)
RETURNS VOID AS $$
BEGIN
  -- This is a placeholder - you would update your users table
  -- or create a separate earnings table
  -- For now, we'll just log it in scroll_sessions
  -- In production, you'd want to update a user_earnings or users table
  RAISE NOTICE 'User % earned %', user_id, amount;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE scroll_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE logged_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_completions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own scroll sessions
CREATE POLICY "Users can view own scroll sessions" ON scroll_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scroll sessions" ON scroll_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can see all logged trends but only insert their own
CREATE POLICY "Users can view all logged trends" ON logged_trends
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own logged trends" ON logged_trends
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can see all verifications but only insert their own
CREATE POLICY "Users can view all verifications" ON trend_verifications
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own verifications" ON trend_verifications
  FOR INSERT WITH CHECK (auth.uid() = verifier_id);

-- Users can only see their own streaks
CREATE POLICY "Users can view own streaks" ON user_streaks
  FOR ALL USING (auth.uid() = user_id);

-- Users can only see their own challenge completions
CREATE POLICY "Users can view own completions" ON challenge_completions
  FOR ALL USING (auth.uid() = user_id);