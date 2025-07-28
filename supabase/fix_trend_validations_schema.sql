-- Fix trend_validations table schema to match what the application expects

-- First, let's add the missing columns if they don't exist
ALTER TABLE trend_validations
ADD COLUMN IF NOT EXISTS confirmed BOOLEAN,
ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2) DEFAULT 0.50 CHECK (confidence_score >= 0 AND confidence_score <= 1),
ADD COLUMN IF NOT EXISTS time_spent_seconds INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reward_amount DECIMAL(10,2) DEFAULT 0.10;

-- Create a computed column or update existing vote data to confirmed
-- If vote = 'verify' then confirmed = true, if vote = 'reject' then confirmed = false
UPDATE trend_validations
SET confirmed = CASE 
    WHEN vote = 'verify' THEN true
    WHEN vote = 'reject' THEN false
    ELSE NULL
END
WHERE confirmed IS NULL;

-- Add trend_id column if it doesn't exist (some pages use trend_id, others use trend_submission_id)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'trend_validations' 
                  AND column_name = 'trend_id') THEN
        ALTER TABLE trend_validations ADD COLUMN trend_id UUID;
        
        -- Copy data from trend_submission_id to trend_id if it exists
        UPDATE trend_validations 
        SET trend_id = trend_submission_id 
        WHERE trend_id IS NULL AND trend_submission_id IS NOT NULL;
        
        -- Add foreign key constraint
        ALTER TABLE trend_validations 
        ADD CONSTRAINT fk_trend_id 
        FOREIGN KEY (trend_id) 
        REFERENCES trend_submissions(id) 
        ON DELETE CASCADE;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trend_validations_trend_id ON trend_validations(trend_id);
CREATE INDEX IF NOT EXISTS idx_trend_validations_confirmed ON trend_validations(confirmed);
CREATE INDEX IF NOT EXISTS idx_trend_validations_confidence ON trend_validations(confidence_score);

-- Add comments to describe the columns
COMMENT ON COLUMN trend_validations.confirmed IS 'Whether the validator confirmed the trend as valid';
COMMENT ON COLUMN trend_validations.confidence_score IS 'Validator confidence in their decision (0.0 to 1.0)';
COMMENT ON COLUMN trend_validations.time_spent_seconds IS 'Time spent reviewing the trend in seconds';
COMMENT ON COLUMN trend_validations.reward_amount IS 'Amount earned for this validation';

-- Create or replace a trigger to sync vote and confirmed columns
CREATE OR REPLACE FUNCTION sync_vote_confirmed()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.vote IS NOT NULL AND NEW.confirmed IS NULL THEN
        NEW.confirmed = (NEW.vote = 'verify');
    ELSIF NEW.confirmed IS NOT NULL AND NEW.vote IS NULL THEN
        NEW.vote = CASE WHEN NEW.confirmed THEN 'verify' ELSE 'reject' END;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_vote_confirmed_trigger ON trend_validations;
CREATE TRIGGER sync_vote_confirmed_trigger
BEFORE INSERT OR UPDATE ON trend_validations
FOR EACH ROW
EXECUTE FUNCTION sync_vote_confirmed();