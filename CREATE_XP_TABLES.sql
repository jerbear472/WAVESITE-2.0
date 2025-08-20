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

-- Drop existing award_xp functions to avoid conflicts
DROP FUNCTION IF EXISTS award_xp(UUID, INTEGER, TEXT);
DROP FUNCTION IF EXISTS award_xp(UUID, INTEGER, TEXT, TEXT);

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
GRANT EXECUTE ON FUNCTION award_xp(UUID, INTEGER, TEXT, TEXT) TO authenticated;

-- Migrate data from earnings_ledger if it exists
DO $$
DECLARE
  v_column_list TEXT;
  v_query TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'earnings_ledger') THEN
    -- Get list of common columns between earnings_ledger and xp_ledger
    SELECT string_agg(column_name, ', ')
    INTO v_column_list
    FROM (
      SELECT c1.column_name
      FROM information_schema.columns c1
      JOIN information_schema.columns c2 
        ON c1.column_name = c2.column_name
      WHERE c1.table_name = 'earnings_ledger'
        AND c2.table_name = 'xp_ledger'
        AND c1.column_name IN ('user_id', 'amount', 'created_at', 'status')
    ) AS common_cols;
    
    -- Only migrate if we have at least user_id and amount
    IF v_column_list LIKE '%user_id%' AND v_column_list LIKE '%amount%' THEN
      -- Simple migration with available columns
      v_query := format(
        'INSERT INTO xp_ledger (user_id, amount, xp_amount, reason, status, created_at)
         SELECT 
           user_id,
           COALESCE(amount, 0),
           COALESCE(amount, 0),
           ''Migrated from earnings'',
           CASE 
             WHEN %s THEN COALESCE(status, ''approved'')
             ELSE ''approved''
           END,
           CASE 
             WHEN %s THEN created_at
             ELSE NOW()
           END
         FROM earnings_ledger
         WHERE NOT EXISTS (
           SELECT 1 FROM xp_ledger xl 
           WHERE xl.user_id = earnings_ledger.user_id 
           AND ABS(EXTRACT(EPOCH FROM (xl.created_at - earnings_ledger.created_at))) < 1
         )',
         CASE WHEN v_column_list LIKE '%status%' THEN 'TRUE' ELSE 'FALSE' END,
         CASE WHEN v_column_list LIKE '%created_at%' THEN 'TRUE' ELSE 'FALSE' END
      );
      
      EXECUTE v_query;
      
      RAISE NOTICE 'Migrated earnings_ledger data to xp_ledger';
    ELSE
      RAISE NOTICE 'Insufficient columns in earnings_ledger for migration';
    END IF;
  ELSE
    RAISE NOTICE 'No earnings_ledger table found, skipping migration';
  END IF;
END $$;

-- Skip profile alterations since profiles is a view, not a table
-- The dashboard can calculate XP totals directly from xp_ledger

-- Create a view for easy XP stats access
CREATE OR REPLACE VIEW user_xp_stats AS
SELECT 
  user_id,
  COUNT(*) as total_transactions,
  SUM(CASE WHEN status = 'approved' THEN xp_amount ELSE 0 END) as approved_xp,
  SUM(CASE WHEN status IN ('pending', 'awaiting_validation') THEN xp_amount ELSE 0 END) as pending_xp,
  SUM(CASE WHEN status = 'paid' THEN xp_amount ELSE 0 END) as paid_xp,
  SUM(xp_amount) as total_xp,
  MAX(created_at) as last_xp_earned
FROM xp_ledger
GROUP BY user_id;

-- Grant access to the view
GRANT SELECT ON user_xp_stats TO authenticated;

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
      
      -- Use the award_xp function with all parameters
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