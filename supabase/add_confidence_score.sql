-- Add confidence_score column to trend_validations table

-- Add the confidence_score column if it doesn't exist
ALTER TABLE trend_validations
ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2) DEFAULT 0.50 CHECK (confidence_score >= 0 AND confidence_score <= 1);

-- Update existing records to have a default confidence score
UPDATE trend_validations
SET confidence_score = 0.50
WHERE confidence_score IS NULL;

-- Add comment to describe the column
COMMENT ON COLUMN trend_validations.confidence_score IS 'User confidence in validation (0.0 to 1.0)';

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_trend_validations_confidence 
ON trend_validations(confidence_score);

-- Update the RLS policies if needed to include confidence_score
-- (The existing policies should work fine as they don't specify columns)