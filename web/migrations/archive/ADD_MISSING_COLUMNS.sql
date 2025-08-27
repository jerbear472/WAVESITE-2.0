-- ADD MISSING COLUMNS FOR TREND INTELLIGENCE
-- This migration adds all the new fields we're tracking in the frontend

-- Step 1: Check existing columns first
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'trend_submissions';

-- Step 2: Add missing columns for velocity and size metrics
ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS trend_velocity VARCHAR(50),
ADD COLUMN IF NOT EXISTS trend_size VARCHAR(50),
ADD COLUMN IF NOT EXISTS ai_angle VARCHAR(50),
ADD COLUMN IF NOT EXISTS velocity_metrics JSONB;

-- Step 3: Add index for AI angle queries
CREATE INDEX IF NOT EXISTS idx_trend_submissions_ai_angle 
ON trend_submissions(ai_angle);

-- Step 4: Add index for velocity queries
CREATE INDEX IF NOT EXISTS idx_trend_submissions_velocity 
ON trend_submissions(trend_velocity);

-- Step 5: Add index for size queries  
CREATE INDEX IF NOT EXISTS idx_trend_submissions_size
ON trend_submissions(trend_size);

-- Step 6: Update existing records with default values
UPDATE trend_submissions
SET 
    ai_angle = CASE 
        WHEN is_ai_generated = true THEN 'using_ai'
        ELSE 'not_ai'
    END
WHERE ai_angle IS NULL;

UPDATE trend_submissions
SET trend_velocity = 'just_starting'
WHERE trend_velocity IS NULL;

UPDATE trend_submissions
SET trend_size = 'niche'
WHERE trend_size IS NULL;

-- Step 7: Verify the columns were added
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'trend_submissions'
AND column_name IN ('trend_velocity', 'trend_size', 'ai_angle', 'velocity_metrics')
ORDER BY column_name;

-- Step 8: Sample query to verify data
SELECT 
    id,
    description,
    trend_velocity,
    trend_size,
    ai_angle,
    is_ai_generated,
    created_at
FROM trend_submissions
ORDER BY created_at DESC
LIMIT 5;

-- Step 9: Add comments for documentation
COMMENT ON COLUMN trend_submissions.trend_velocity IS 'Trend momentum: just_starting, picking_up, viral, saturated, declining';
COMMENT ON COLUMN trend_submissions.trend_size IS 'Trend reach: micro, niche, viral, mega, global';
COMMENT ON COLUMN trend_submissions.ai_angle IS 'AI involvement: using_ai, reacting_to_ai, ai_tool_viral, ai_technique, anti_ai, not_ai';
COMMENT ON COLUMN trend_submissions.velocity_metrics IS 'JSON object with detailed velocity tracking data';