-- Complete Validation System Fix
-- Ensures proper multi-user voting with no duplicates

-- Step 1: Ensure trend_validations table has proper structure
ALTER TABLE trend_validations 
ADD COLUMN IF NOT EXISTS vote VARCHAR(20) CHECK (vote IN ('wave', 'fire', 'skip', 'dead'));

-- Step 2: Add UNIQUE constraint to prevent duplicate votes
-- Drop existing constraint if it exists
ALTER TABLE trend_validations 
DROP CONSTRAINT IF EXISTS unique_user_trend_validation;

-- Add the unique constraint
ALTER TABLE trend_validations 
ADD CONSTRAINT unique_user_trend_validation 
UNIQUE(trend_id, validator_id);

-- Step 3: Ensure trend_submissions has validation vote columns
ALTER TABLE trend_submissions
ADD COLUMN IF NOT EXISTS validation_wave_votes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS validation_fire_votes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS validation_skip_votes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS validation_dead_votes INTEGER DEFAULT 0;

-- Step 4: Create or replace the validation vote trigger function
CREATE OR REPLACE FUNCTION update_trend_validation_status()
RETURNS TRIGGER AS $$
DECLARE
  v_wave_votes INTEGER;
  v_fire_votes INTEGER;
  v_dead_votes INTEGER;
  v_total_approvals INTEGER;
BEGIN
  -- Count all vote types for this trend
  SELECT 
    COUNT(CASE WHEN vote = 'wave' THEN 1 END),
    COUNT(CASE WHEN vote = 'fire' THEN 1 END),
    COUNT(CASE WHEN vote = 'dead' THEN 1 END)
  INTO v_wave_votes, v_fire_votes, v_dead_votes
  FROM trend_validations
  WHERE trend_id = COALESCE(NEW.trend_id, OLD.trend_id);
  
  v_total_approvals := v_wave_votes + v_fire_votes;
  
  -- Update the counts in trend_submissions
  UPDATE trend_submissions
  SET 
    validation_wave_votes = v_wave_votes,
    validation_fire_votes = v_fire_votes,
    validation_dead_votes = v_dead_votes,
    validation_count = v_wave_votes + v_fire_votes + v_dead_votes,
    updated_at = NOW()
  WHERE id = COALESCE(NEW.trend_id, OLD.trend_id);
  
  -- Update status based on vote counts
  IF v_total_approvals >= 3 THEN
    -- Trend is validated/approved
    UPDATE trend_submissions
    SET 
      status = 'validated',
      updated_at = NOW()
    WHERE id = COALESCE(NEW.trend_id, OLD.trend_id)
    AND status IN ('submitted', 'validating');
    
    RAISE NOTICE 'Trend % validated with % approval votes', COALESCE(NEW.trend_id, OLD.trend_id), v_total_approvals;
    
  ELSIF v_dead_votes >= 3 THEN
    -- Trend is rejected
    UPDATE trend_submissions
    SET 
      status = 'rejected',
      updated_at = NOW()
    WHERE id = COALESCE(NEW.trend_id, OLD.trend_id)
    AND status IN ('submitted', 'validating');
    
    RAISE NOTICE 'Trend % rejected with % dead votes', COALESCE(NEW.trend_id, OLD.trend_id), v_dead_votes;
    
  ELSIF (v_wave_votes + v_fire_votes + v_dead_votes) > 0 THEN
    -- Trend is being validated but not enough votes yet
    UPDATE trend_submissions
    SET 
      status = 'validating',
      updated_at = NOW()
    WHERE id = COALESCE(NEW.trend_id, OLD.trend_id)
    AND status = 'submitted';
    
  ELSE
    -- No votes, reset to submitted
    UPDATE trend_submissions
    SET 
      status = 'submitted',
      updated_at = NOW()
    WHERE id = COALESCE(NEW.trend_id, OLD.trend_id)
    AND status = 'validating';
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Step 5: Drop and recreate triggers
DROP TRIGGER IF EXISTS update_trend_validation_status_trigger ON trend_validations;
DROP TRIGGER IF EXISTS update_trend_validation_status_on_delete_trigger ON trend_validations;
DROP TRIGGER IF EXISTS update_trend_validation_status_on_update_trigger ON trend_validations;

-- Create trigger for INSERT
CREATE TRIGGER update_trend_validation_status_trigger
AFTER INSERT ON trend_validations
FOR EACH ROW
EXECUTE FUNCTION update_trend_validation_status();

-- Create trigger for UPDATE
CREATE TRIGGER update_trend_validation_status_on_update_trigger
AFTER UPDATE ON trend_validations
FOR EACH ROW
EXECUTE FUNCTION update_trend_validation_status();

-- Create trigger for DELETE
CREATE TRIGGER update_trend_validation_status_on_delete_trigger
AFTER DELETE ON trend_validations
FOR EACH ROW
EXECUTE FUNCTION update_trend_validation_status();

-- Step 6: Fix any existing validation votes with wrong values
UPDATE trend_validations
SET vote = CASE 
  WHEN is_valid = true OR vote = 'verify' THEN 'wave'
  WHEN is_valid = false OR vote = 'reject' THEN 'dead'
  ELSE COALESCE(vote, 'skip')
END
WHERE vote IN ('verify', 'reject') OR vote IS NULL;

-- Step 7: Recalculate all validation counts for existing trends
WITH vote_counts AS (
  SELECT 
    trend_id,
    COUNT(CASE WHEN vote = 'wave' THEN 1 END) as wave_votes,
    COUNT(CASE WHEN vote = 'fire' THEN 1 END) as fire_votes,
    COUNT(CASE WHEN vote = 'skip' THEN 1 END) as skip_votes,
    COUNT(CASE WHEN vote = 'dead' THEN 1 END) as dead_votes,
    COUNT(*) as total_votes
  FROM trend_validations
  GROUP BY trend_id
)
UPDATE trend_submissions ts
SET 
  validation_wave_votes = COALESCE(vc.wave_votes, 0),
  validation_fire_votes = COALESCE(vc.fire_votes, 0),
  validation_skip_votes = COALESCE(vc.skip_votes, 0),
  validation_dead_votes = COALESCE(vc.dead_votes, 0),
  validation_count = COALESCE(vc.total_votes, 0)
FROM vote_counts vc
WHERE ts.id = vc.trend_id;

-- Step 8: Update status based on recalculated counts
-- Mark as validated if 3+ approval votes
UPDATE trend_submissions
SET status = 'validated'
WHERE (validation_wave_votes + validation_fire_votes) >= 3
AND status IN ('submitted', 'validating');

-- Mark as rejected if 3+ dead votes
UPDATE trend_submissions
SET status = 'rejected'
WHERE validation_dead_votes >= 3
AND status IN ('submitted', 'validating');

-- Mark as validating if has votes but not enough for decision
UPDATE trend_submissions
SET status = 'validating'
WHERE validation_count > 0 
AND validation_count < 3
AND status = 'submitted';

-- Step 9: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_trend_validations_user_trend 
ON trend_validations(validator_id, trend_id);

CREATE INDEX IF NOT EXISTS idx_trend_validations_trend_vote 
ON trend_validations(trend_id, vote);

-- Step 10: Enable RLS on trend_validations
ALTER TABLE trend_validations ENABLE ROW LEVEL SECURITY;

-- Create policy for users to see all validations
DROP POLICY IF EXISTS "Users can view all validations" ON trend_validations;
CREATE POLICY "Users can view all validations" ON trend_validations
  FOR SELECT USING (true);

-- Create policy for users to insert their own validations
DROP POLICY IF EXISTS "Users can create their own validations" ON trend_validations;
CREATE POLICY "Users can create their own validations" ON trend_validations
  FOR INSERT WITH CHECK (auth.uid() = validator_id);

-- Create policy to prevent users from updating validations
DROP POLICY IF EXISTS "Validations cannot be updated" ON trend_validations;
CREATE POLICY "Validations cannot be updated" ON trend_validations
  FOR UPDATE USING (false);

-- Create policy to prevent users from deleting validations
DROP POLICY IF EXISTS "Validations cannot be deleted" ON trend_validations;
CREATE POLICY "Validations cannot be deleted" ON trend_validations
  FOR DELETE USING (false);

-- Step 11: Verify the system
DO $$
DECLARE
  v_total_trends INTEGER;
  v_submitted INTEGER;
  v_validating INTEGER;
  v_validated INTEGER;
  v_rejected INTEGER;
  v_total_votes INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_trends FROM trend_submissions;
  SELECT COUNT(*) INTO v_submitted FROM trend_submissions WHERE status = 'submitted';
  SELECT COUNT(*) INTO v_validating FROM trend_submissions WHERE status = 'validating';
  SELECT COUNT(*) INTO v_validated FROM trend_submissions WHERE status = 'validated';
  SELECT COUNT(*) INTO v_rejected FROM trend_submissions WHERE status = 'rejected';
  SELECT COUNT(*) INTO v_total_votes FROM trend_validations;
  
  RAISE NOTICE '=== Validation System Status ===';
  RAISE NOTICE 'Total trends: %', v_total_trends;
  RAISE NOTICE 'Submitted (awaiting votes): %', v_submitted;
  RAISE NOTICE 'Validating (has votes): %', v_validating;
  RAISE NOTICE 'Validated (approved): %', v_validated;
  RAISE NOTICE 'Rejected: %', v_rejected;
  RAISE NOTICE 'Total validation votes: %', v_total_votes;
  RAISE NOTICE '================================';
END $$;

-- Final verification query
SELECT 
  status,
  COUNT(*) as count,
  SUM(validation_wave_votes) as total_wave_votes,
  SUM(validation_fire_votes) as total_fire_votes,
  SUM(validation_dead_votes) as total_dead_votes,
  AVG(validation_count) as avg_votes_per_trend
FROM trend_submissions
GROUP BY status
ORDER BY status;