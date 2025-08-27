-- Add validation_count column to trend_submissions if it doesn't exist
ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS validation_count INTEGER DEFAULT 0;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_trend_submissions_validation_count 
ON trend_submissions(validation_count);

-- Update existing records to have a validation count based on actual validations
UPDATE trend_submissions ts
SET validation_count = (
  SELECT COUNT(*) 
  FROM trend_validations tv 
  WHERE tv.trend_id = ts.id
)
WHERE validation_count IS NULL OR validation_count = 0;