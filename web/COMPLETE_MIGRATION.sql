-- COMPLETE MIGRATION: Add all missing columns for trend intelligence
-- Run this to ensure database matches frontend data model

-- Step 1: Add all missing columns in one go
ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS trend_velocity VARCHAR(50),
ADD COLUMN IF NOT EXISTS trend_size VARCHAR(50),
ADD COLUMN IF NOT EXISTS ai_angle VARCHAR(50),
ADD COLUMN IF NOT EXISTS velocity_metrics JSONB,
ADD COLUMN IF NOT EXISTS category_answers JSONB,
ADD COLUMN IF NOT EXISTS audience_age TEXT[],
ADD COLUMN IF NOT EXISTS sentiment INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS title TEXT;

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trend_submissions_ai_angle ON trend_submissions(ai_angle);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_velocity ON trend_submissions(trend_velocity);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_size ON trend_submissions(trend_size);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_sentiment ON trend_submissions(sentiment);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_category_gin ON trend_submissions USING gin(category_answers);

-- Step 3: Migrate existing data
-- Copy description to title if title is empty
UPDATE trend_submissions
SET title = description
WHERE title IS NULL AND description IS NOT NULL;

-- Set default AI angle based on is_ai_generated flag
UPDATE trend_submissions
SET ai_angle = CASE 
    WHEN is_ai_generated = true THEN 'using_ai'
    ELSE 'not_ai'
END
WHERE ai_angle IS NULL;

-- Set default velocity for existing records
UPDATE trend_submissions
SET trend_velocity = 
    CASE 
        WHEN views_count > 1000000 THEN 'viral'
        WHEN views_count > 100000 THEN 'picking_up'
        WHEN views_count > 10000 THEN 'just_starting'
        ELSE 'just_starting'
    END
WHERE trend_velocity IS NULL;

-- Set default size based on engagement
UPDATE trend_submissions
SET trend_size = 
    CASE 
        WHEN views_count > 10000000 THEN 'global'
        WHEN views_count > 1000000 THEN 'mega'
        WHEN views_count > 100000 THEN 'viral'
        WHEN views_count > 10000 THEN 'niche'
        ELSE 'micro'
    END
WHERE trend_size IS NULL;

-- Step 4: Add column comments for documentation
COMMENT ON COLUMN trend_submissions.trend_velocity IS 'Trend momentum: just_starting, picking_up, viral, saturated, declining';
COMMENT ON COLUMN trend_submissions.trend_size IS 'Trend reach: micro (<10K), niche (10K-100K), viral (100K-1M), mega (1M-10M), global (10M+)';
COMMENT ON COLUMN trend_submissions.ai_angle IS 'AI involvement: using_ai, reacting_to_ai, ai_tool_viral, ai_technique, anti_ai, not_ai';
COMMENT ON COLUMN trend_submissions.velocity_metrics IS 'Detailed velocity tracking: {velocity, size, timing, capturedAt}';
COMMENT ON COLUMN trend_submissions.category_answers IS 'Category-specific Q&A responses as JSON';
COMMENT ON COLUMN trend_submissions.audience_age IS 'Target age groups: Gen Alpha, Gen Z, Millennials, Gen X+';
COMMENT ON COLUMN trend_submissions.sentiment IS 'User sentiment score 0-100';
COMMENT ON COLUMN trend_submissions.title IS 'User-provided trend title (distinct from description)';

-- Step 5: Verify all columns exist
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'trend_submissions'
AND column_name IN (
    'trend_velocity', 
    'trend_size', 
    'ai_angle', 
    'velocity_metrics',
    'category_answers',
    'audience_age',
    'sentiment',
    'title'
)
ORDER BY column_name;

-- Step 6: Show sample of updated data
SELECT 
    id,
    title,
    description,
    trend_velocity,
    trend_size,
    ai_angle,
    sentiment,
    audience_age,
    category,
    views_count,
    created_at
FROM trend_submissions
ORDER BY created_at DESC
LIMIT 10;

-- Step 7: Create a view for easy analytics
CREATE OR REPLACE VIEW trend_intelligence AS
SELECT 
    id,
    title,
    url,
    platform,
    category,
    trend_velocity,
    trend_size,
    ai_angle,
    sentiment,
    audience_age,
    views_count,
    likes_count,
    comments_count,
    wave_score,
    spotter_id,
    created_at,
    CASE 
        WHEN ai_angle != 'not_ai' THEN true
        ELSE false
    END as has_ai_component,
    CASE 
        WHEN trend_velocity IN ('viral', 'saturated') THEN 'hot'
        WHEN trend_velocity IN ('picking_up') THEN 'rising'
        ELSE 'emerging'
    END as trend_status
FROM trend_submissions
WHERE status != 'rejected';

-- Grant permissions
GRANT SELECT ON trend_intelligence TO authenticated;
GRANT ALL ON trend_submissions TO authenticated;

-- Step 8: Summary
SELECT 
    'Migration Complete!' as status,
    COUNT(*) as total_trends,
    COUNT(DISTINCT ai_angle) as ai_angle_types,
    COUNT(DISTINCT trend_velocity) as velocity_types,
    COUNT(DISTINCT trend_size) as size_types
FROM trend_submissions;