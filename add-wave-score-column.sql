-- Add wave_score column to trend_submissions table
ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS wave_score INTEGER 
CHECK (wave_score >= 0 AND wave_score <= 100);

-- Add comment to explain the column
COMMENT ON COLUMN trend_submissions.wave_score IS 'User-submitted coolness rating for the trend (0-100 scale)';

-- Update any existing rows to have a default wave_score of 50
UPDATE trend_submissions 
SET wave_score = 50 
WHERE wave_score IS NULL;