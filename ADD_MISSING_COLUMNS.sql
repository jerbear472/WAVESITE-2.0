-- Add missing columns to trend_submissions table
-- This fixes the submission hanging issue by ensuring all fields from the frontend have matching columns

-- Check current columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'trend_submissions'
ORDER BY ordinal_position;

-- Add missing columns (safe - won't error if column already exists)
DO $$ 
BEGIN
    -- Platform field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' 
                   AND column_name = 'platform') THEN
        ALTER TABLE trend_submissions ADD COLUMN platform TEXT;
    END IF;

    -- Post URL field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' 
                   AND column_name = 'post_url') THEN
        ALTER TABLE trend_submissions ADD COLUMN post_url TEXT;
    END IF;

    -- Screenshot URL field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' 
                   AND column_name = 'screenshot_url') THEN
        ALTER TABLE trend_submissions ADD COLUMN screenshot_url TEXT;
    END IF;

    -- Thumbnail URL field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' 
                   AND column_name = 'thumbnail_url') THEN
        ALTER TABLE trend_submissions ADD COLUMN thumbnail_url TEXT;
    END IF;

    -- Creator handle field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' 
                   AND column_name = 'creator_handle') THEN
        ALTER TABLE trend_submissions ADD COLUMN creator_handle TEXT;
    END IF;

    -- Engagement metrics
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' 
                   AND column_name = 'views_count') THEN
        ALTER TABLE trend_submissions ADD COLUMN views_count INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' 
                   AND column_name = 'likes_count') THEN
        ALTER TABLE trend_submissions ADD COLUMN likes_count INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' 
                   AND column_name = 'comments_count') THEN
        ALTER TABLE trend_submissions ADD COLUMN comments_count INTEGER DEFAULT 0;
    END IF;

    -- Hashtags array
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' 
                   AND column_name = 'hashtags') THEN
        ALTER TABLE trend_submissions ADD COLUMN hashtags TEXT[] DEFAULT '{}';
    END IF;

    -- Wave score (sentiment metric)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' 
                   AND column_name = 'wave_score') THEN
        ALTER TABLE trend_submissions ADD COLUMN wave_score INTEGER DEFAULT 50;
    END IF;

    -- Quality score
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' 
                   AND column_name = 'quality_score') THEN
        ALTER TABLE trend_submissions ADD COLUMN quality_score INTEGER DEFAULT 75;
    END IF;

    -- Trend velocity (just_starting, picking_up, viral, saturated, declining)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' 
                   AND column_name = 'trend_velocity') THEN
        ALTER TABLE trend_submissions ADD COLUMN trend_velocity TEXT DEFAULT 'just_starting';
    END IF;

    -- Trend size (micro, niche, viral, mega, global)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' 
                   AND column_name = 'trend_size') THEN
        ALTER TABLE trend_submissions ADD COLUMN trend_size TEXT DEFAULT 'niche';
    END IF;

    -- AI angle
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' 
                   AND column_name = 'ai_angle') THEN
        ALTER TABLE trend_submissions ADD COLUMN ai_angle TEXT DEFAULT 'not_ai';
    END IF;

    -- Sentiment score (0-100)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' 
                   AND column_name = 'sentiment') THEN
        ALTER TABLE trend_submissions ADD COLUMN sentiment INTEGER DEFAULT 50;
    END IF;

    -- Audience age ranges
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' 
                   AND column_name = 'audience_age') THEN
        ALTER TABLE trend_submissions ADD COLUMN audience_age TEXT[] DEFAULT '{}';
    END IF;

    -- Category-specific answers (JSONB)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' 
                   AND column_name = 'category_answers') THEN
        ALTER TABLE trend_submissions ADD COLUMN category_answers JSONB DEFAULT '{}';
    END IF;

    -- Velocity metrics (JSONB)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' 
                   AND column_name = 'velocity_metrics') THEN
        ALTER TABLE trend_submissions ADD COLUMN velocity_metrics JSONB DEFAULT '{}';
    END IF;

    -- Is AI generated flag
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' 
                   AND column_name = 'is_ai_generated') THEN
        ALTER TABLE trend_submissions ADD COLUMN is_ai_generated BOOLEAN DEFAULT false;
    END IF;

    -- Evidence field (for backwards compatibility)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' 
                   AND column_name = 'evidence') THEN
        ALTER TABLE trend_submissions ADD COLUMN evidence JSONB DEFAULT '{}';
    END IF;
    
    RAISE NOTICE 'All columns have been checked and added if missing';
END $$;

-- Verify all columns are present
SELECT 
    'Column Check' as report,
    COUNT(*) as total_columns,
    COUNT(CASE WHEN column_name IN (
        'platform', 'post_url', 'screenshot_url', 'thumbnail_url', 'creator_handle',
        'views_count', 'likes_count', 'comments_count', 'hashtags',
        'wave_score', 'quality_score', 'trend_velocity', 'trend_size',
        'ai_angle', 'sentiment', 'audience_age', 'category_answers',
        'velocity_metrics', 'is_ai_generated', 'evidence'
    ) THEN 1 END) as new_columns_count
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'trend_submissions';

-- List all columns after update
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'trend_submissions'
ORDER BY ordinal_position;