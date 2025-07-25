-- Create scroll_sessions table
CREATE TABLE IF NOT EXISTS scroll_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER DEFAULT 0,
  trends_logged INTEGER DEFAULT 0,
  earnings DECIMAL(10, 2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create logged_trends table for floating logger
CREATE TABLE IF NOT EXISTS logged_trends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES scroll_sessions(id) ON DELETE SET NULL,
  category VARCHAR(50) NOT NULL,
  notes TEXT,
  emoji VARCHAR(10),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  session_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create user_earnings table
CREATE TABLE IF NOT EXISTS user_earnings (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  total_earnings DECIMAL(10, 2) DEFAULT 0.00,
  available_balance DECIMAL(10, 2) DEFAULT 0.00,
  pending_balance DECIMAL(10, 2) DEFAULT 0.00,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create user_streaks table
CREATE TABLE IF NOT EXISTS user_streaks (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  streak_started_at DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create challenges table
CREATE TABLE IF NOT EXISTS challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly'
  target_value INTEGER NOT NULL,
  reward_amount DECIMAL(10, 2) DEFAULT 0.00,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create challenge_completions table
CREATE TABLE IF NOT EXISTS challenge_completions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  reward_claimed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, challenge_id)
);

-- Create trend_verifications table
CREATE TABLE IF NOT EXISTS trend_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  trend_id UUID REFERENCES captured_trends(id) ON DELETE CASCADE,
  vote VARCHAR(10) NOT NULL CHECK (vote IN ('yes', 'no', 'skip')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, trend_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_scroll_sessions_user_id ON scroll_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_scroll_sessions_start_time ON scroll_sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_logged_trends_user_id ON logged_trends(user_id);
CREATE INDEX IF NOT EXISTS idx_logged_trends_session_id ON logged_trends(session_id);
CREATE INDEX IF NOT EXISTS idx_logged_trends_timestamp ON logged_trends(timestamp);
CREATE INDEX IF NOT EXISTS idx_trend_verifications_user_id ON trend_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_trend_verifications_trend_id ON trend_verifications(trend_id);
CREATE INDEX IF NOT EXISTS idx_challenge_completions_user_id ON challenge_completions(user_id);

-- Create function to update user earnings
CREATE OR REPLACE FUNCTION update_user_earnings(
  p_user_id UUID,
  p_amount DECIMAL(10, 2)
)
RETURNS void AS $$
BEGIN
  INSERT INTO user_earnings (user_id, total_earnings, available_balance)
  VALUES (p_user_id, p_amount, p_amount)
  ON CONFLICT (user_id)
  DO UPDATE SET
    total_earnings = user_earnings.total_earnings + p_amount,
    available_balance = user_earnings.available_balance + p_amount,
    last_updated = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Create function to update user streak
CREATE OR REPLACE FUNCTION update_user_streak(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_last_activity_date DATE;
  v_current_streak INTEGER;
  v_today DATE := CURRENT_DATE;
BEGIN
  -- Get current streak info
  SELECT last_activity_date, current_streak
  INTO v_last_activity_date, v_current_streak
  FROM user_streaks
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    -- First activity
    INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_activity_date, streak_started_at)
    VALUES (p_user_id, 1, 1, v_today, v_today);
  ELSIF v_last_activity_date = v_today THEN
    -- Already updated today
    RETURN;
  ELSIF v_last_activity_date = v_today - INTERVAL '1 day' THEN
    -- Consecutive day
    UPDATE user_streaks
    SET current_streak = current_streak + 1,
        longest_streak = GREATEST(longest_streak, current_streak + 1),
        last_activity_date = v_today,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = p_user_id;
  ELSE
    -- Streak broken
    UPDATE user_streaks
    SET current_streak = 1,
        last_activity_date = v_today,
        streak_started_at = v_today,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE scroll_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE logged_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_verifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own scroll sessions" ON scroll_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scroll sessions" ON scroll_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scroll sessions" ON scroll_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own logged trends" ON logged_trends
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own logged trends" ON logged_trends
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own earnings" ON user_earnings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own streaks" ON user_streaks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own challenge completions" ON challenge_completions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own challenge completions" ON challenge_completions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own challenge completions" ON challenge_completions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view all challenges" ON challenges
  FOR SELECT USING (true);

CREATE POLICY "Users can create trend verifications" ON trend_verifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own trend verifications" ON trend_verifications
  FOR SELECT USING (auth.uid() = user_id);