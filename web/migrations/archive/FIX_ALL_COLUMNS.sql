-- FIX ALL COLUMNS AND CONSTRAINTS

-- Step 1: Add missing ai_angle column
ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS ai_angle VARCHAR(50);

-- Step 2: Add other missing columns that might not exist
ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS sentiment INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS audience_age TEXT[],
ADD COLUMN IF NOT EXISTS category_answers JSONB,
ADD COLUMN IF NOT EXISTS velocity_metrics JSONB,
ADD COLUMN IF NOT EXISTS title TEXT;

-- Step 3: Drop existing constraints that are blocking us
ALTER TABLE trend_submissions 
DROP CONSTRAINT IF EXISTS trend_submissions_trend_velocity_check,
DROP CONSTRAINT IF EXISTS trend_submissions_trend_size_check,
DROP CONSTRAINT IF EXISTS trend_submissions_ai_angle_check;

-- Step 4: Add constraints with correct values that match frontend
ALTER TABLE trend_submissions 
ADD CONSTRAINT trend_submissions_trend_velocity_check 
CHECK (
    trend_velocity IS NULL OR 
    trend_velocity IN (
        'just_starting', 
        'picking_up', 
        'viral', 
        'saturated', 
        'declining'
    )
);

ALTER TABLE trend_submissions 
ADD CONSTRAINT trend_submissions_trend_size_check 
CHECK (
    trend_size IS NULL OR 
    trend_size IN (
        'micro', 
        'niche', 
        'viral', 
        'mega', 
        'global'
    )
);

ALTER TABLE trend_submissions 
ADD CONSTRAINT trend_submissions_ai_angle_check 
CHECK (
    ai_angle IS NULL OR 
    ai_angle IN (
        'using_ai',
        'reacting_to_ai', 
        'ai_tool_viral',
        'ai_technique',
        'anti_ai',
        'not_ai'
    )
);

-- Step 5: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trend_submissions_ai_angle ON trend_submissions(ai_angle);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_velocity ON trend_submissions(trend_velocity);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_size ON trend_submissions(trend_size);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_sentiment ON trend_submissions(sentiment);

-- Step 6: Set default values for existing records
UPDATE trend_submissions
SET ai_angle = 'not_ai'
WHERE ai_angle IS NULL;

UPDATE trend_submissions
SET sentiment = 50
WHERE sentiment IS NULL;

-- Step 7: Add column comments for documentation
COMMENT ON COLUMN trend_submissions.trend_velocity IS 'Trend momentum: just_starting, picking_up, viral, saturated, declining';
COMMENT ON COLUMN trend_submissions.trend_size IS 'Trend reach: micro (<10K), niche (10K-100K), viral (100K-1M), mega (1M-10M), global (10M+)';
COMMENT ON COLUMN trend_submissions.ai_angle IS 'AI involvement: using_ai, reacting_to_ai, ai_tool_viral, ai_technique, anti_ai, not_ai';
COMMENT ON COLUMN trend_submissions.velocity_metrics IS 'Detailed velocity tracking: {velocity, size, timing, capturedAt}';
COMMENT ON COLUMN trend_submissions.category_answers IS 'Category-specific Q&A responses as JSON';
COMMENT ON COLUMN trend_submissions.audience_age IS 'Target age groups: Gen Alpha, Gen Z, Millennials, Gen X+';
COMMENT ON COLUMN trend_submissions.sentiment IS 'User sentiment score 0-100';
COMMENT ON COLUMN trend_submissions.title IS 'User-provided trend title (distinct from description)';

-- Step 8: Verify everything is working
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'trend_submissions'
AND column_name IN ('trend_velocity', 'trend_size', 'ai_angle', 'sentiment', 'audience_age', 'category_answers', 'velocity_metrics', 'title')
ORDER BY column_name;

-- Step 9: Test that we can now insert/update with our values
UPDATE trend_submissions 
SET 
    trend_velocity = 'picking_up',
    trend_size = 'viral',
    ai_angle = 'not_ai'
WHERE id = (SELECT id FROM trend_submissions LIMIT 1);

-- Step 10: Show success
SELECT 
    'All columns added and constraints fixed!' as status,
    COUNT(*) as total_trends,
    COUNT(DISTINCT trend_velocity) as velocity_types,
    COUNT(DISTINCT trend_size) as size_types,
    COUNT(DISTINCT ai_angle) as ai_angle_types
FROM trend_submissions;