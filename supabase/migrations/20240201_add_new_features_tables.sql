-- Create scroll_sessions table
CREATE TABLE IF NOT EXISTS scroll_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_ms INTEGER,
  trends_logged INTEGER DEFAULT 0,
  earnings DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create logged_trends table
CREATE TABLE IF NOT EXISTS logged_trends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL,
  notes TEXT,
  emoji VARCHAR(10),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  session_active BOOLEAN DEFAULT false,
  verified BOOLEAN DEFAULT NULL,
  verification_count INTEGER DEFAULT 0
);

-- Create trend_verifications table
CREATE TABLE IF NOT EXISTS trend_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trend_id UUID REFERENCES logged_trends(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  vote VARCHAR(10) CHECK (vote IN ('confirm', 'reject')),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trend_id, user_id)
);

-- Create user_streaks table
CREATE TABLE IF NOT EXISTS user_streaks (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_active_date DATE DEFAULT CURRENT_DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create challenge_completions table
CREATE TABLE IF NOT EXISTS challenge_completions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id VARCHAR(100) NOT NULL,
  week_start DATE NOT NULL,
  reward DECIMAL(10, 2) NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, challenge_id, week_start)
);

-- Create earnings_summary view
CREATE OR REPLACE VIEW earnings_summary AS
SELECT 
  u.id as user_id,
  COALESCE(SUM(s.earnings), 0) as total_session_earnings,
  COALESCE(COUNT(DISTINCT s.id), 0) as total_sessions,
  COALESCE(AVG(s.earnings), 0) as avg_session_earnings,
  COALESCE(COUNT(DISTINCT t.id), 0) as total_trends_logged,
  COALESCE(COUNT(DISTINCT v.id), 0) as total_verifications,
  COALESCE(COUNT(DISTINCT v.id) * 0.05, 0) as verification_earnings,
  COALESCE(SUM(c.reward), 0) as challenge_earnings
FROM auth.users u
LEFT JOIN scroll_sessions s ON u.id = s.user_id
LEFT JOIN logged_trends t ON u.id = t.user_id
LEFT JOIN trend_verifications v ON u.id = v.user_id
LEFT JOIN challenge_completions c ON u.id = c.user_id
GROUP BY u.id;

-- Add indexes for performance
CREATE INDEX idx_scroll_sessions_user_id ON scroll_sessions(user_id);
CREATE INDEX idx_scroll_sessions_start_time ON scroll_sessions(start_time);
CREATE INDEX idx_logged_trends_user_id ON logged_trends(user_id);
CREATE INDEX idx_logged_trends_timestamp ON logged_trends(timestamp);
CREATE INDEX idx_logged_trends_category ON logged_trends(category);
CREATE INDEX idx_trend_verifications_trend_id ON trend_verifications(trend_id);
CREATE INDEX idx_trend_verifications_user_id ON trend_verifications(user_id);
CREATE INDEX idx_user_streaks_last_active ON user_streaks(last_active_date);

-- Functions for updating user earnings
CREATE OR REPLACE FUNCTION update_user_earnings(
  p_user_id UUID,
  p_amount DECIMAL
) RETURNS VOID AS $$
BEGIN
  -- This would update a user's total earnings in their profile
  -- Implementation depends on your user profile structure
  UPDATE profiles
  SET total_earnings = COALESCE(total_earnings, 0) + p_amount
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function for awarding verification points
CREATE OR REPLACE FUNCTION award_verification_points(
  p_user_id UUID,
  p_amount DECIMAL
) RETURNS VOID AS $$
BEGIN
  -- This would update verification earnings
  -- Implementation depends on your earnings tracking structure
  UPDATE profiles
  SET verification_earnings = COALESCE(verification_earnings, 0) + p_amount
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update streak on new activity
CREATE OR REPLACE FUNCTION update_user_streak() RETURNS TRIGGER AS $$
DECLARE
  v_last_active DATE;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
BEGIN
  -- Get existing streak data
  SELECT last_active_date, current_streak, longest_streak
  INTO v_last_active, v_current_streak, v_longest_streak
  FROM user_streaks
  WHERE user_id = NEW.user_id;

  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_active_date)
    VALUES (NEW.user_id, 1, 1, CURRENT_DATE);
    RETURN NEW;
  END IF;

  -- Check if streak continues
  IF v_last_active = CURRENT_DATE - INTERVAL '1 day' THEN
    -- Continue streak
    v_current_streak := v_current_streak + 1;
    v_longest_streak := GREATEST(v_longest_streak, v_current_streak);
  ELSIF v_last_active < CURRENT_DATE - INTERVAL '1 day' THEN
    -- Streak broken
    v_current_streak := 1;
  END IF;

  -- Update streak record
  UPDATE user_streaks
  SET current_streak = v_current_streak,
      longest_streak = v_longest_streak,
      last_active_date = CURRENT_DATE,
      updated_at = NOW()
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for streak updates
CREATE TRIGGER update_streak_on_session
AFTER INSERT ON scroll_sessions
FOR EACH ROW
EXECUTE FUNCTION update_user_streak();

-- Row Level Security
ALTER TABLE scroll_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE logged_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_completions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own sessions" ON scroll_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON scroll_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view all trends" ON logged_trends
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own trends" ON logged_trends
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view all verifications" ON trend_verifications
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own verifications" ON trend_verifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own streaks" ON user_streaks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own streaks" ON user_streaks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own completions" ON challenge_completions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own completions" ON challenge_completions
  FOR INSERT WITH CHECK (auth.uid() = user_id);