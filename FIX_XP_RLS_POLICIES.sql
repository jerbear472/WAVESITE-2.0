-- Fix RLS policies for XP transactions and related tables

-- First, check if xp_transactions table exists (might be using xp_ledger instead)
-- If using xp_ledger table
ALTER TABLE xp_ledger ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own xp_ledger" ON xp_ledger;
DROP POLICY IF EXISTS "System can insert xp_ledger" ON xp_ledger;
DROP POLICY IF EXISTS "Service role can manage xp_ledger" ON xp_ledger;

-- Create new policies for xp_ledger
-- Allow users to view their own XP
CREATE POLICY "Users can view own xp_ledger" ON xp_ledger
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Allow system/service role to insert XP records
CREATE POLICY "System can insert xp_ledger" ON xp_ledger
  FOR INSERT 
  WITH CHECK (true);  -- Allow all inserts from authenticated contexts

-- Allow system to update XP records
CREATE POLICY "System can update xp_ledger" ON xp_ledger
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- If xp_transactions table exists separately
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'xp_transactions') THEN
    ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view own xp_transactions" ON xp_transactions;
    DROP POLICY IF EXISTS "System can insert xp_transactions" ON xp_transactions;
    DROP POLICY IF EXISTS "Service role can manage xp_transactions" ON xp_transactions;
    
    -- Create permissive policies
    CREATE POLICY "Users can view own xp_transactions" ON xp_transactions
      FOR SELECT 
      USING (auth.uid() = user_id);
    
    CREATE POLICY "System can insert xp_transactions" ON xp_transactions
      FOR INSERT 
      WITH CHECK (true);
      
    CREATE POLICY "System can update xp_transactions" ON xp_transactions
      FOR UPDATE
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Fix the trigger function to handle RLS properly
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
    
    -- Award XP if correct (using SECURITY DEFINER to bypass RLS)
    IF v_is_correct AND v_user_id IS NOT NULL THEN
      UPDATE trend_predictions
      SET 
        xp_awarded = 50,
        xp_awarded_at = NOW()
      WHERE id = NEW.prediction_id;
      
      -- Insert into xp_ledger with proper user context
      INSERT INTO xp_ledger (user_id, amount, xp_amount, reason, status, created_at)
      VALUES (
        v_user_id, 
        50, 
        50, 
        'Correct trend peak prediction', 
        'approved',
        NOW()
      );
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
    
    -- Update user reliability scores for all voters
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
$$ LANGUAGE plpgsql SECURITY DEFINER;  -- Important: SECURITY DEFINER allows trigger to bypass RLS

-- Re-create the trigger
DROP TRIGGER IF EXISTS check_verification_consensus ON verification_votes;
CREATE TRIGGER check_verification_consensus
AFTER INSERT ON verification_votes
FOR EACH ROW
EXECUTE FUNCTION process_verification_consensus();

-- Grant necessary permissions
GRANT INSERT, UPDATE ON xp_ledger TO authenticated;
GRANT INSERT, UPDATE ON xp_transactions TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create a helper function for awarding XP that bypasses RLS
CREATE OR REPLACE FUNCTION award_xp(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO xp_ledger (user_id, amount, xp_amount, reason, status, created_at)
  VALUES (p_user_id, p_amount, p_amount, p_reason, 'approved', NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION award_xp TO authenticated;