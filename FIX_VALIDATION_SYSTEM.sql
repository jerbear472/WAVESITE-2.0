-- Fix Validation System
-- This migration ensures validation votes work properly and update trend status

-- Step 1: Add validation vote columns to trend_validations if they don't exist
ALTER TABLE trend_validations 
ADD COLUMN IF NOT EXISTS vote VARCHAR(20) CHECK (vote IN ('wave', 'fire', 'skip', 'dead'));

-- Step 2: Add validation vote count columns to trend_submissions if they don't exist
ALTER TABLE trend_submissions
ADD COLUMN IF NOT EXISTS validation_wave_votes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS validation_fire_votes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS validation_skip_votes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS validation_dead_votes INTEGER DEFAULT 0;

-- Step 3: Create or replace the validation vote trigger
CREATE OR REPLACE FUNCTION update_trend_validation_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update validation vote counts
  UPDATE trend_submissions
  SET 
    validation_wave_votes = (
      SELECT COUNT(*) 
      FROM trend_validations 
      WHERE trend_id = NEW.trend_id AND vote = 'wave'
    ),
    validation_fire_votes = (
      SELECT COUNT(*) 
      FROM trend_validations 
      WHERE trend_id = NEW.trend_id AND vote = 'fire'
    ),
    validation_skip_votes = (
      SELECT COUNT(*) 
      FROM trend_validations 
      WHERE trend_id = NEW.trend_id AND vote = 'skip'
    ),
    validation_dead_votes = (
      SELECT COUNT(*) 
      FROM trend_validations 
      WHERE trend_id = NEW.trend_id AND vote = 'dead'
    ),
    validation_count = (
      SELECT COUNT(*) 
      FROM trend_validations 
      WHERE trend_id = NEW.trend_id
    )
  WHERE id = NEW.trend_id;
  
  -- Check if trend should be approved (3+ wave votes or 3+ fire votes)
  IF (
    SELECT validation_wave_votes + validation_fire_votes >= 3
    FROM trend_submissions 
    WHERE id = NEW.trend_id
  ) THEN
    UPDATE trend_submissions
    SET 
      status = 'validated',
      updated_at = NOW()
    WHERE id = NEW.trend_id 
    AND status IN ('submitted', 'validating');
    
    RAISE NOTICE 'Trend % approved with validation votes', NEW.trend_id;
  
  -- Check if trend should be rejected (3+ dead votes)
  ELSIF (
    SELECT validation_dead_votes >= 3
    FROM trend_submissions 
    WHERE id = NEW.trend_id
  ) THEN
    UPDATE trend_submissions
    SET 
      status = 'rejected',
      updated_at = NOW()
    WHERE id = NEW.trend_id 
    AND status IN ('submitted', 'validating');
    
    RAISE NOTICE 'Trend % rejected with dead votes', NEW.trend_id;
  
  -- Otherwise keep in validating status if it has any votes
  ELSIF (
    SELECT validation_count > 0
    FROM trend_submissions 
    WHERE id = NEW.trend_id
  ) THEN
    UPDATE trend_submissions
    SET 
      status = 'validating',
      updated_at = NOW()
    WHERE id = NEW.trend_id 
    AND status = 'submitted';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_trend_validation_status_trigger ON trend_validations;

-- Step 5: Create the trigger
CREATE TRIGGER update_trend_validation_status_trigger
AFTER INSERT OR UPDATE ON trend_validations
FOR EACH ROW
EXECUTE FUNCTION update_trend_validation_status();

-- Step 6: Create trigger for DELETE operations too
CREATE OR REPLACE FUNCTION update_trend_validation_status_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Update validation vote counts after a vote is deleted
  UPDATE trend_submissions
  SET 
    validation_wave_votes = (
      SELECT COUNT(*) 
      FROM trend_validations 
      WHERE trend_id = OLD.trend_id AND vote = 'wave'
    ),
    validation_fire_votes = (
      SELECT COUNT(*) 
      FROM trend_validations 
      WHERE trend_id = OLD.trend_id AND vote = 'fire'
    ),
    validation_skip_votes = (
      SELECT COUNT(*) 
      FROM trend_validations 
      WHERE trend_id = OLD.trend_id AND vote = 'skip'
    ),
    validation_dead_votes = (
      SELECT COUNT(*) 
      FROM trend_validations 
      WHERE trend_id = OLD.trend_id AND vote = 'dead'
    ),
    validation_count = (
      SELECT COUNT(*) 
      FROM trend_validations 
      WHERE trend_id = OLD.trend_id
    )
  WHERE id = OLD.trend_id;
  
  -- Re-evaluate status after deletion
  IF (
    SELECT validation_count = 0
    FROM trend_submissions 
    WHERE id = OLD.trend_id
  ) THEN
    -- No votes left, reset to submitted
    UPDATE trend_submissions
    SET 
      status = 'submitted',
      updated_at = NOW()
    WHERE id = OLD.trend_id 
    AND status = 'validating';
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_trend_validation_status_on_delete_trigger ON trend_validations;

CREATE TRIGGER update_trend_validation_status_on_delete_trigger
AFTER DELETE ON trend_validations
FOR EACH ROW
EXECUTE FUNCTION update_trend_validation_status_on_delete();

-- Step 7: Fix any existing validation votes that have wrong vote values
UPDATE trend_validations
SET vote = CASE 
  WHEN is_valid = true OR vote = 'verify' THEN 'wave'
  WHEN is_valid = false OR vote = 'reject' THEN 'dead'
  ELSE vote
END
WHERE vote IN ('verify', 'reject') OR vote IS NULL;

-- Step 8: Recalculate all validation counts for existing trends
UPDATE trend_submissions ts
SET 
  validation_wave_votes = (
    SELECT COUNT(*) 
    FROM trend_validations tv
    WHERE tv.trend_id = ts.id AND tv.vote = 'wave'
  ),
  validation_fire_votes = (
    SELECT COUNT(*) 
    FROM trend_validations tv
    WHERE tv.trend_id = ts.id AND tv.vote = 'fire'
  ),
  validation_skip_votes = (
    SELECT COUNT(*) 
    FROM trend_validations tv
    WHERE tv.trend_id = ts.id AND tv.vote = 'skip'
  ),
  validation_dead_votes = (
    SELECT COUNT(*) 
    FROM trend_validations tv
    WHERE tv.trend_id = ts.id AND tv.vote = 'dead'
  ),
  validation_count = (
    SELECT COUNT(*) 
    FROM trend_validations tv
    WHERE tv.trend_id = ts.id
  );

-- Step 9: Update status based on recalculated counts
UPDATE trend_submissions
SET status = 'validated'
WHERE (validation_wave_votes + validation_fire_votes) >= 3
AND status IN ('submitted', 'validating');

UPDATE trend_submissions
SET status = 'rejected'
WHERE validation_dead_votes >= 3
AND status IN ('submitted', 'validating');

UPDATE trend_submissions
SET status = 'validating'
WHERE validation_count > 0 
AND validation_count < 3
AND status = 'submitted';

-- Verify the fix
SELECT 
  status,
  COUNT(*) as count,
  SUM(validation_wave_votes) as total_wave_votes,
  SUM(validation_fire_votes) as total_fire_votes,
  SUM(validation_dead_votes) as total_dead_votes
FROM trend_submissions
GROUP BY status
ORDER BY status;