-- Add is_ai_generated column to trend_submissions table
-- This tracks whether a trend involves AI-generated content

-- Add column to trend_submissions table
ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN trend_submissions.is_ai_generated IS 'Indicates if this trend involves AI-generated content (images, videos, text, music, etc.)';

-- Create an index for filtering AI-generated trends
CREATE INDEX IF NOT EXISTS idx_trend_submissions_ai_generated 
ON trend_submissions(is_ai_generated) 
WHERE is_ai_generated = true;

-- Update the evidence JSONB to include is_ai_generated for backward compatibility
-- This ensures the flag is available in both the column and the evidence JSON
UPDATE trend_submissions 
SET evidence = jsonb_set(
    COALESCE(evidence, '{}'::jsonb),
    '{is_ai_generated}',
    'false'::jsonb,
    true
)
WHERE evidence IS NOT NULL 
  AND NOT (evidence ? 'is_ai_generated');