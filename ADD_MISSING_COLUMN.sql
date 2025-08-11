-- Add the missing trend_umbrella_id column if it doesn't exist
ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS trend_umbrella_id UUID DEFAULT NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_trend_submissions_umbrella_id 
ON trend_submissions(trend_umbrella_id);

-- Verify it was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'trend_submissions' 
AND column_name = 'trend_umbrella_id';