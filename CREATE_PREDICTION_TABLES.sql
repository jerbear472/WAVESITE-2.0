-- Trend Predictions Table
-- Stores user predictions about when trends will peak
CREATE TABLE IF NOT EXISTS trend_predictions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trend_submission_id UUID REFERENCES trend_submissions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Prediction details
  predicted_peak_timeframe TEXT NOT NULL, -- '24_hours', '3_days', '1_week', etc.
  predicted_peak_date TIMESTAMPTZ NOT NULL, -- Calculated expiry date
  prediction_made_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Trend identifiers for verification
  trend_name TEXT NOT NULL, -- For Google Trends lookup
  trend_keywords TEXT[], -- Alternative search terms
  platform TEXT, -- Where trend originated
  category TEXT, -- Trend category
  
  -- Verification status
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'auto_verified_correct', 'auto_verified_incorrect', 'community_verified_correct', 'community_verified_incorrect', 'expired')),
  verification_method TEXT CHECK (verification_method IN ('google_trends', 'community', NULL)),
  verified_at TIMESTAMPTZ,
  
  -- Google Trends data (if auto-verified)
  google_trends_data JSONB, -- Store the trend curve data
  peak_detected_date TIMESTAMPTZ, -- When Google Trends shows the peak occurred
  confidence_score FLOAT, -- How confident the auto-verification is (0-100)
  
  -- XP rewards
  xp_awarded INTEGER DEFAULT 0,
  xp_awarded_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Verification Votes Table
-- Stores community votes on whether a trend peaked
CREATE TABLE IF NOT EXISTS verification_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prediction_id UUID REFERENCES trend_predictions(id) ON DELETE CASCADE,
  voter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Vote details
  vote TEXT NOT NULL CHECK (vote IN ('peaked', 'still_growing', 'died', 'not_sure')),
  vote_reason TEXT, -- Optional explanation
  voted_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Was this vote with the consensus?
  was_correct BOOLEAN, -- Set after consensus is reached
  reliability_points_earned INTEGER DEFAULT 0,
  
  -- Prevent duplicate votes
  UNIQUE(prediction_id, voter_id),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Reliability Scores
-- Tracks how accurate users are at verification
CREATE TABLE IF NOT EXISTS user_reliability (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  
  -- Voting stats
  total_verification_votes INTEGER DEFAULT 0,
  correct_verification_votes INTEGER DEFAULT 0,
  reliability_score FLOAT DEFAULT 50.0, -- 0-100, starts at 50
  
  -- Prediction stats
  total_predictions INTEGER DEFAULT 0,
  correct_predictions INTEGER DEFAULT 0,
  prediction_accuracy FLOAT DEFAULT 0, -- Percentage
  
  -- Streak tracking
  current_correct_streak INTEGER DEFAULT 0,
  best_correct_streak INTEGER DEFAULT 0,
  
  -- Tier for weighted voting
  reliability_tier TEXT DEFAULT 'standard' CHECK (reliability_tier IN ('novice', 'standard', 'trusted', 'expert')),
  vote_weight FLOAT DEFAULT 1.0, -- Multiplier for vote importance
  
  last_vote_at TIMESTAMPTZ,
  last_prediction_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Verification Queue View
-- Makes it easy to get trends needing verification
CREATE OR REPLACE VIEW verification_queue AS
SELECT 
  tp.*,
  ts.title as trend_title,
  ts.description as trend_description,
  ts.thumbnail_url,
  COALESCE(u.raw_user_meta_data->>'username', u.email) as predictor_username,
  u.raw_user_meta_data->>'avatar_url' as predictor_avatar,
  COUNT(vv.id) as vote_count,
  -- Calculate consensus
  COUNT(CASE WHEN vv.vote = 'peaked' THEN 1 END) as peaked_votes,
  COUNT(CASE WHEN vv.vote = 'still_growing' THEN 1 END) as growing_votes,
  COUNT(CASE WHEN vv.vote = 'died' THEN 1 END) as died_votes
FROM trend_predictions tp
JOIN trend_submissions ts ON tp.trend_submission_id = ts.id
JOIN auth.users u ON tp.user_id = u.id
LEFT JOIN verification_votes vv ON tp.id = vv.prediction_id
WHERE 
  tp.verification_status = 'pending'
  AND tp.predicted_peak_date < NOW() -- Prediction period has expired
GROUP BY tp.id, ts.id, u.id
ORDER BY tp.predicted_peak_date ASC;

-- Indexes for performance
CREATE INDEX idx_trend_predictions_status ON trend_predictions(verification_status);
CREATE INDEX idx_trend_predictions_user ON trend_predictions(user_id);
CREATE INDEX idx_trend_predictions_expiry ON trend_predictions(predicted_peak_date);
CREATE INDEX idx_verification_votes_prediction ON verification_votes(prediction_id);
CREATE INDEX idx_verification_votes_voter ON verification_votes(voter_id);
CREATE INDEX idx_user_reliability_score ON user_reliability(reliability_score DESC);

-- RLS Policies
ALTER TABLE trend_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reliability ENABLE ROW LEVEL SECURITY;

-- Users can see all predictions
CREATE POLICY "Predictions are viewable by all" ON trend_predictions
  FOR SELECT USING (true);

-- Users can create their own predictions
CREATE POLICY "Users can create own predictions" ON trend_predictions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can vote on predictions (but not their own)
CREATE POLICY "Users can vote on others predictions" ON verification_votes
  FOR INSERT WITH CHECK (
    auth.uid() = voter_id AND
    auth.uid() != (SELECT user_id FROM trend_predictions WHERE id = prediction_id)
  );

-- Users can see all votes
CREATE POLICY "Votes are viewable by all" ON verification_votes
  FOR SELECT USING (true);

-- Users can see all reliability scores
CREATE POLICY "Reliability scores are viewable by all" ON user_reliability
  FOR SELECT USING (true);

-- System can update reliability scores
CREATE POLICY "System updates reliability" ON user_reliability
  FOR ALL USING (true);

-- Trigger to update prediction when submission is made
CREATE OR REPLACE FUNCTION create_trend_prediction()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create prediction if predicted_peak_date exists
  IF NEW.predicted_peak_date IS NOT NULL THEN
    INSERT INTO trend_predictions (
      trend_submission_id,
      user_id,
      predicted_peak_timeframe,
      predicted_peak_date,
      trend_name,
      trend_keywords,
      platform,
      category
    ) VALUES (
      NEW.id,
      NEW.spotter_id,
      COALESCE(NEW.evidence->>'predicted_peak_timeframe', 'not_specified'),
      NEW.predicted_peak_date,
      COALESCE(NEW.title, NEW.trend_name),
      ARRAY[NEW.title, NEW.trend_name, NEW.description],
      NEW.platform,
      NEW.category
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to trend_submissions
CREATE TRIGGER create_prediction_on_submission
AFTER INSERT ON trend_submissions
FOR EACH ROW
EXECUTE FUNCTION create_trend_prediction();

-- Function to check and process verification consensus
CREATE OR REPLACE FUNCTION process_verification_consensus()
RETURNS TRIGGER AS $$
DECLARE
  v_total_votes INTEGER;
  v_peaked_votes INTEGER;
  v_growing_votes INTEGER;
  v_died_votes INTEGER;
  v_consensus_vote TEXT;
  v_is_correct BOOLEAN;
BEGIN
  -- Count votes for this prediction
  SELECT 
    COUNT(*),
    COUNT(CASE WHEN vote = 'peaked' THEN 1 END),
    COUNT(CASE WHEN vote = 'still_growing' THEN 1 END),
    COUNT(CASE WHEN vote = 'died' THEN 1 END)
  INTO v_total_votes, v_peaked_votes, v_growing_votes, v_died_votes
  FROM verification_votes
  WHERE prediction_id = NEW.prediction_id;
  
  -- Check if we have enough votes (5 minimum)
  IF v_total_votes >= 5 THEN
    -- Determine consensus (60% threshold)
    IF v_peaked_votes::FLOAT / v_total_votes >= 0.6 THEN
      v_consensus_vote := 'peaked';
      v_is_correct := TRUE;
    ELSIF v_growing_votes::FLOAT / v_total_votes >= 0.6 THEN
      v_consensus_vote := 'still_growing';
      v_is_correct := FALSE;
    ELSIF v_died_votes::FLOAT / v_total_votes >= 0.6 THEN
      v_consensus_vote := 'died';
      v_is_correct := TRUE; -- Died counts as a type of peak
    ELSE
      -- No consensus yet
      RETURN NEW;
    END IF;
    
    -- Update prediction status
    UPDATE trend_predictions
    SET 
      verification_status = CASE 
        WHEN v_is_correct THEN 'community_verified_correct'
        ELSE 'community_verified_incorrect'
      END,
      verification_method = 'community',
      verified_at = NOW()
    WHERE id = NEW.prediction_id;
    
    -- Award XP if correct
    IF v_is_correct THEN
      UPDATE trend_predictions
      SET 
        xp_awarded = 50,
        xp_awarded_at = NOW()
      WHERE id = NEW.prediction_id;
      
      -- Add to XP ledger
      INSERT INTO xp_ledger (user_id, amount, xp_amount, reason, status)
      SELECT user_id, 50, 50, 'Correct trend peak prediction', 'approved'
      FROM trend_predictions
      WHERE id = NEW.prediction_id;
    END IF;
    
    -- Update voter reliability scores
    UPDATE verification_votes
    SET was_correct = (vote = v_consensus_vote)
    WHERE prediction_id = NEW.prediction_id;
    
    -- Update user reliability scores for all voters
    WITH voter_stats AS (
      SELECT 
        voter_id,
        COUNT(*) as total_votes,
        COUNT(CASE WHEN was_correct THEN 1 END) as correct_votes
      FROM verification_votes
      GROUP BY voter_id
    )
    UPDATE user_reliability ur
    SET 
      total_verification_votes = vs.total_votes,
      correct_verification_votes = vs.correct_votes,
      reliability_score = LEAST(100, GREATEST(0, (vs.correct_votes::FLOAT / vs.total_votes) * 100)),
      reliability_tier = CASE
        WHEN (vs.correct_votes::FLOAT / vs.total_votes) >= 0.8 THEN 'expert'
        WHEN (vs.correct_votes::FLOAT / vs.total_votes) >= 0.65 THEN 'trusted'
        WHEN (vs.correct_votes::FLOAT / vs.total_votes) >= 0.5 THEN 'standard'
        ELSE 'novice'
      END,
      vote_weight = CASE
        WHEN (vs.correct_votes::FLOAT / vs.total_votes) >= 0.8 THEN 2.0
        WHEN (vs.correct_votes::FLOAT / vs.total_votes) >= 0.65 THEN 1.5
        WHEN (vs.correct_votes::FLOAT / vs.total_votes) >= 0.5 THEN 1.0
        ELSE 0.5
      END,
      updated_at = NOW()
    FROM voter_stats vs
    WHERE ur.user_id = vs.voter_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger after each vote
CREATE TRIGGER check_verification_consensus
AFTER INSERT ON verification_votes
FOR EACH ROW
EXECUTE FUNCTION process_verification_consensus();