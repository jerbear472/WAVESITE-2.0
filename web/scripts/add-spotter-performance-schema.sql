-- Add spotter performance fields to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS spotter_tier TEXT DEFAULT 'learning' CHECK (spotter_tier IN ('elite', 'verified', 'learning', 'restricted'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS spotter_approval_rate_30d DECIMAL(3,2) DEFAULT 0.00;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS spotter_viral_rate_30d DECIMAL(3,2) DEFAULT 0.00;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS spotter_quality_score DECIMAL(3,2) DEFAULT 0.50;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS consecutive_approved_trends INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_trends_submitted INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_trends_approved INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS spotter_tier_updated_at TIMESTAMP DEFAULT NOW();

-- Create spotter category expertise table
CREATE TABLE IF NOT EXISTS spotter_category_expertise (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  trends_submitted INTEGER DEFAULT 0,
  trends_approved INTEGER DEFAULT 0,
  approval_rate DECIMAL(3,2) DEFAULT 0.00,
  viral_rate DECIMAL(3,2) DEFAULT 0.00,
  expertise_level TEXT DEFAULT 'novice' CHECK (expertise_level IN ('novice', 'intermediate', 'expert', 'master')),
  last_submission_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, category)
);

-- Create spotter achievements table
CREATE TABLE IF NOT EXISTS spotter_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  unlocked_at TIMESTAMP DEFAULT NOW(),
  reward_type TEXT CHECK (reward_type IN ('multiplier', 'bonus', 'badge')),
  reward_value TEXT,
  UNIQUE(user_id, achievement_id)
);

-- Create daily challenges table
CREATE TABLE IF NOT EXISTS daily_challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id TEXT UNIQUE NOT NULL,
  challenge_date DATE DEFAULT CURRENT_DATE,
  category TEXT,
  description TEXT NOT NULL,
  target_count INTEGER NOT NULL,
  reward_amount DECIMAL(5,3) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create user daily challenge progress table
CREATE TABLE IF NOT EXISTS user_challenge_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id TEXT REFERENCES daily_challenges(challenge_id),
  progress INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,
  reward_claimed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, challenge_id)
);

-- Create spotter tier change log
CREATE TABLE IF NOT EXISTS spotter_tier_change_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  old_tier TEXT,
  new_tier TEXT NOT NULL,
  reason TEXT,
  metrics JSONB,
  changed_at TIMESTAMP DEFAULT NOW()
);

-- Add quality metrics to trend_submissions
ALTER TABLE trend_submissions ADD COLUMN IF NOT EXISTS quality_score DECIMAL(3,2) DEFAULT 0.50;
ALTER TABLE trend_submissions ADD COLUMN IF NOT EXISTS has_media BOOLEAN DEFAULT false;
ALTER TABLE trend_submissions ADD COLUMN IF NOT EXISTS metadata_completeness DECIMAL(3,2) DEFAULT 0.00;
ALTER TABLE trend_submissions ADD COLUMN IF NOT EXISTS early_detection BOOLEAN DEFAULT false;
ALTER TABLE trend_submissions ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(5,3);
ALTER TABLE trend_submissions ADD COLUMN IF NOT EXISTS payment_breakdown JSONB;

-- Create function to update spotter metrics
CREATE OR REPLACE FUNCTION update_spotter_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update total submissions count
  UPDATE profiles 
  SET total_trends_submitted = total_trends_submitted + 1
  WHERE id = NEW.spotter_id;

  -- Update category expertise
  INSERT INTO spotter_category_expertise (user_id, category, trends_submitted, last_submission_at)
  VALUES (NEW.spotter_id, NEW.category, 1, NOW())
  ON CONFLICT (user_id, category) 
  DO UPDATE SET 
    trends_submitted = spotter_category_expertise.trends_submitted + 1,
    last_submission_at = NOW(),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new trend submissions
DROP TRIGGER IF EXISTS update_spotter_metrics_trigger ON trend_submissions;
CREATE TRIGGER update_spotter_metrics_trigger
AFTER INSERT ON trend_submissions
FOR EACH ROW
EXECUTE FUNCTION update_spotter_metrics();

-- Create function to update approval metrics when trend status changes
CREATE OR REPLACE FUNCTION update_spotter_approval_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- If trend is moving to an approved stage
  IF NEW.stage IN ('validating', 'trending', 'viral') AND 
     (OLD.stage IS NULL OR OLD.stage NOT IN ('validating', 'trending', 'viral')) THEN
    
    -- Update user's approved count and consecutive streak
    UPDATE profiles 
    SET 
      total_trends_approved = total_trends_approved + 1,
      consecutive_approved_trends = consecutive_approved_trends + 1
    WHERE id = NEW.spotter_id;

    -- Update category expertise
    UPDATE spotter_category_expertise
    SET 
      trends_approved = trends_approved + 1,
      approval_rate = ROUND(CAST(trends_approved + 1 AS DECIMAL) / trends_submitted, 2),
      updated_at = NOW()
    WHERE user_id = NEW.spotter_id AND category = NEW.category;

  -- If trend is rejected, reset consecutive streak
  ELSIF NEW.stage = 'rejected' AND OLD.stage != 'rejected' THEN
    UPDATE profiles 
    SET consecutive_approved_trends = 0
    WHERE id = NEW.spotter_id;
  END IF;

  -- Update viral rate if trend goes viral
  IF NEW.stage = 'viral' AND OLD.stage != 'viral' THEN
    UPDATE spotter_category_expertise
    SET 
      viral_rate = ROUND(
        CAST(
          (SELECT COUNT(*) FROM trend_submissions 
           WHERE spotter_id = NEW.spotter_id 
           AND category = NEW.category 
           AND stage = 'viral') AS DECIMAL
        ) / NULLIF(trends_approved, 0), 2
      ),
      updated_at = NOW()
    WHERE user_id = NEW.spotter_id AND category = NEW.category;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for trend status updates
DROP TRIGGER IF EXISTS update_spotter_approval_metrics_trigger ON trend_submissions;
CREATE TRIGGER update_spotter_approval_metrics_trigger
AFTER UPDATE OF stage ON trend_submissions
FOR EACH ROW
EXECUTE FUNCTION update_spotter_approval_metrics();

-- Function to calculate 30-day metrics (to be called periodically)
CREATE OR REPLACE FUNCTION calculate_spotter_30d_metrics(p_user_id UUID)
RETURNS TABLE(
  approval_rate DECIMAL,
  viral_rate DECIMAL,
  total_submissions INTEGER,
  total_approved INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ROUND(
      CAST(COUNT(*) FILTER (WHERE stage IN ('validating', 'trending', 'viral')) AS DECIMAL) / 
      NULLIF(COUNT(*), 0), 2
    ) as approval_rate,
    ROUND(
      CAST(COUNT(*) FILTER (WHERE stage = 'viral') AS DECIMAL) / 
      NULLIF(COUNT(*) FILTER (WHERE stage IN ('validating', 'trending', 'viral')), 0), 2
    ) as viral_rate,
    COUNT(*)::INTEGER as total_submissions,
    COUNT(*) FILTER (WHERE stage IN ('validating', 'trending', 'viral'))::INTEGER as total_approved
  FROM trend_submissions
  WHERE spotter_id = p_user_id
  AND created_at >= NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Function to update spotter tier based on performance
CREATE OR REPLACE FUNCTION update_spotter_tier(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_metrics RECORD;
  v_old_tier TEXT;
  v_new_tier TEXT;
BEGIN
  -- Get current tier
  SELECT spotter_tier INTO v_old_tier FROM profiles WHERE id = p_user_id;

  -- Get 30-day metrics
  SELECT * INTO v_metrics FROM calculate_spotter_30d_metrics(p_user_id);

  -- Determine new tier
  IF v_metrics.approval_rate >= 0.80 AND v_metrics.total_submissions >= 50 THEN
    v_new_tier := 'elite';
  ELSIF v_metrics.approval_rate >= 0.50 AND v_metrics.total_submissions >= 20 THEN
    v_new_tier := 'verified';
  ELSIF v_metrics.approval_rate >= 0.30 OR v_metrics.total_submissions < 10 THEN
    v_new_tier := 'learning';
  ELSE
    v_new_tier := 'restricted';
  END IF;

  -- Update tier if changed
  IF v_old_tier != v_new_tier THEN
    UPDATE profiles 
    SET 
      spotter_tier = v_new_tier,
      spotter_tier_updated_at = NOW(),
      spotter_approval_rate_30d = v_metrics.approval_rate,
      spotter_viral_rate_30d = COALESCE(v_metrics.viral_rate, 0)
    WHERE id = p_user_id;

    -- Log tier change
    INSERT INTO spotter_tier_change_log (user_id, old_tier, new_tier, metrics)
    VALUES (p_user_id, v_old_tier, v_new_tier, json_build_object(
      'approval_rate', v_metrics.approval_rate,
      'viral_rate', v_metrics.viral_rate,
      'total_submissions', v_metrics.total_submissions,
      'total_approved', v_metrics.total_approved
    ));
  ELSE
    -- Just update metrics
    UPDATE profiles 
    SET 
      spotter_approval_rate_30d = v_metrics.approval_rate,
      spotter_viral_rate_30d = COALESCE(v_metrics.viral_rate, 0)
    WHERE id = p_user_id;
  END IF;

  RETURN v_new_tier;
END;
$$ LANGUAGE plpgsql;

-- Function to update spotter quality score (moving average)
CREATE OR REPLACE FUNCTION update_spotter_quality_score(
  p_user_id UUID,
  p_new_quality_score DECIMAL
)
RETURNS VOID AS $$
DECLARE
  v_current_score DECIMAL;
  v_weight DECIMAL := 0.1; -- Weight for new score (10%)
BEGIN
  SELECT spotter_quality_score INTO v_current_score 
  FROM profiles WHERE id = p_user_id;

  -- Calculate moving average
  UPDATE profiles
  SET spotter_quality_score = ROUND(
    (v_current_score * (1 - v_weight)) + (p_new_quality_score * v_weight), 2
  )
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_spotter_category_expertise_user ON spotter_category_expertise(user_id);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_spotter_date ON trend_submissions(spotter_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_challenge_progress_user ON user_challenge_progress(user_id, challenge_id);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON spotter_category_expertise TO authenticated;
GRANT SELECT, INSERT ON spotter_achievements TO authenticated;
GRANT SELECT ON daily_challenges TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_challenge_progress TO authenticated;
GRANT SELECT ON spotter_tier_change_log TO authenticated;