-- Create XP tracking tables if they don't exist

-- Create xp_ledger table for tracking all XP transactions
CREATE TABLE IF NOT EXISTS xp_ledger (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  xp_amount INTEGER NOT NULL DEFAULT 0,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'awaiting_validation', 'rejected')),
  trend_submission_id UUID REFERENCES trend_submissions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_xp_ledger_user ON xp_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_ledger_status ON xp_ledger(status);
CREATE INDEX IF NOT EXISTS idx_xp_ledger_created ON xp_ledger(created_at DESC);

-- Enable RLS
ALTER TABLE xp_ledger ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view own xp_ledger" ON xp_ledger;
DROP POLICY IF EXISTS "System can insert xp_ledger" ON xp_ledger;
DROP POLICY IF EXISTS "System can update xp_ledger" ON xp_ledger;

-- Users can view their own XP
CREATE POLICY "Users can view own xp_ledger" ON xp_ledger
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Allow inserts (for system operations)
CREATE POLICY "System can insert xp_ledger" ON xp_ledger
  FOR INSERT 
  WITH CHECK (true);

-- Allow updates (for status changes)
CREATE POLICY "System can update xp_ledger" ON xp_ledger
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON xp_ledger TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create a function to safely award XP
CREATE OR REPLACE FUNCTION award_xp(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT,
  p_status TEXT DEFAULT 'approved'
) RETURNS UUID AS $$
DECLARE
  v_xp_id UUID;
BEGIN
  INSERT INTO xp_ledger (user_id, amount, xp_amount, reason, status, created_at)
  VALUES (p_user_id, p_amount, p_amount, p_reason, p_status, NOW())
  RETURNING id INTO v_xp_id;
  
  RETURN v_xp_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION award_xp TO authenticated;

-- Migrate data from earnings_ledger if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'earnings_ledger') THEN
    -- Copy earnings data to xp_ledger
    INSERT INTO xp_ledger (user_id, amount, xp_amount, reason, status, trend_submission_id, created_at)
    SELECT 
      user_id,
      COALESCE(amount, 0),
      COALESCE(amount, 0), -- XP amount same as earnings amount
      COALESCE(reason, 'Migrated from earnings'),
      COALESCE(status, 'pending'),
      trend_submission_id,
      created_at
    FROM earnings_ledger
    WHERE NOT EXISTS (
      SELECT 1 FROM xp_ledger xl 
      WHERE xl.user_id = earnings_ledger.user_id 
      AND xl.created_at = earnings_ledger.created_at
    );
    
    RAISE NOTICE 'Migrated earnings_ledger data to xp_ledger';
  END IF;
END $$;

-- Create or update profiles table to track XP totals
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_xp INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS available_xp INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pending_xp INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS approved_xp INTEGER DEFAULT 0;

-- Create a function to update user XP totals
CREATE OR REPLACE FUNCTION update_user_xp_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the user's profile with new XP totals
  UPDATE profiles
  SET 
    total_xp = (
      SELECT COALESCE(SUM(xp_amount), 0)
      FROM xp_ledger
      WHERE user_id = NEW.user_id
    ),
    available_xp = (
      SELECT COALESCE(SUM(xp_amount), 0)
      FROM xp_ledger
      WHERE user_id = NEW.user_id AND status = 'approved'
    ),
    pending_xp = (
      SELECT COALESCE(SUM(xp_amount), 0)
      FROM xp_ledger
      WHERE user_id = NEW.user_id AND status IN ('pending', 'awaiting_validation')
    ),
    approved_xp = (
      SELECT COALESCE(SUM(xp_amount), 0)
      FROM xp_ledger
      WHERE user_id = NEW.user_id AND status = 'approved'
    ),
    updated_at = NOW()
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update XP totals
DROP TRIGGER IF EXISTS update_xp_totals ON xp_ledger;
CREATE TRIGGER update_xp_totals
AFTER INSERT OR UPDATE ON xp_ledger
FOR EACH ROW
EXECUTE FUNCTION update_user_xp_totals();

-- Now update the verification consensus function to use xp_ledger
CREATE OR REPLACE FUNCTION process_verification_consensus()
RETURNS TRIGGER AS $$
DECLARE
  v_total_votes INTEGER;
  v_peaked_votes INTEGER;
  v_growing_votes INTEGER;
  v_died_votes INTEGER;
  v_consensus_vote TEXT;
  v_is_correct BOOLEAN;
  v_user_id UUID;
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
    
    -- Get the user_id for the prediction
    SELECT user_id INTO v_user_id
    FROM trend_predictions
    WHERE id = NEW.prediction_id;
    
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
    IF v_is_correct AND v_user_id IS NOT NULL THEN
      UPDATE trend_predictions
      SET 
        xp_awarded = 50,
        xp_awarded_at = NOW()
      WHERE id = NEW.prediction_id;
      
      -- Use the award_xp function
      PERFORM award_xp(v_user_id, 50, 'Correct trend peak prediction', 'approved');
    END IF;
    
    -- Update voter reliability scores
    UPDATE verification_votes
    SET was_correct = (vote = v_consensus_vote)
    WHERE prediction_id = NEW.prediction_id;
    
    -- Award XP to correct voters
    INSERT INTO xp_ledger (user_id, amount, xp_amount, reason, status, created_at)
    SELECT 
      voter_id,
      5,
      5,
      'Correct verification vote',
      'approved',
      NOW()
    FROM verification_votes
    WHERE prediction_id = NEW.prediction_id
      AND vote = v_consensus_vote;
    
    -- Update user reliability scores
    WITH voter_stats AS (
      SELECT 
        voter_id,
        COUNT(*) as total_votes,
        COUNT(CASE WHEN was_correct THEN 1 END) as correct_votes
      FROM verification_votes
      GROUP BY voter_id
    )
    INSERT INTO user_reliability (
      user_id, 
      total_verification_votes, 
      correct_verification_votes,
      reliability_score,
      reliability_tier,
      vote_weight,
      updated_at
    )
    SELECT 
      vs.voter_id,
      vs.total_votes,
      vs.correct_votes,
      LEAST(100, GREATEST(0, (vs.correct_votes::FLOAT / vs.total_votes) * 100)),
      CASE
        WHEN (vs.correct_votes::FLOAT / vs.total_votes) >= 0.8 THEN 'expert'
        WHEN (vs.correct_votes::FLOAT / vs.total_votes) >= 0.65 THEN 'trusted'
        WHEN (vs.correct_votes::FLOAT / vs.total_votes) >= 0.5 THEN 'standard'
        ELSE 'novice'
      END,
      CASE
        WHEN (vs.correct_votes::FLOAT / vs.total_votes) >= 0.8 THEN 2.0
        WHEN (vs.correct_votes::FLOAT / vs.total_votes) >= 0.65 THEN 1.5
        WHEN (vs.correct_votes::FLOAT / vs.total_votes) >= 0.5 THEN 1.0
        ELSE 0.5
      END,
      NOW()
    FROM voter_stats vs
    ON CONFLICT (user_id) DO UPDATE SET
      total_verification_votes = EXCLUDED.total_verification_votes,
      correct_verification_votes = EXCLUDED.correct_verification_votes,
      reliability_score = EXCLUDED.reliability_score,
      reliability_tier = EXCLUDED.reliability_tier,
      vote_weight = EXCLUDED.vote_weight,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS check_verification_consensus ON verification_votes;
CREATE TRIGGER check_verification_consensus
AFTER INSERT ON verification_votes
FOR EACH ROW
EXECUTE FUNCTION process_verification_consensus();