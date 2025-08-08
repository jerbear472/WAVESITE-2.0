-- Check if trend_submissions table has all the required columns
-- This will help identify which columns might be causing the submission to hang

-- Check column structure of trend_submissions table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'trend_submissions'
ORDER BY ordinal_position;

-- Check if wave_score column exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'trend_submissions' 
            AND column_name = 'wave_score'
        ) THEN 'wave_score column EXISTS ✅'
        ELSE 'wave_score column MISSING ❌ - This might be causing the issue!'
    END as wave_score_status;

-- Check for other potentially missing columns
SELECT 
    'Checking for new fields that might be missing:' as status;

SELECT 
    column_name,
    CASE 
        WHEN column_name IN ('wave_score', 'moods', 'age_ranges', 'subcultures') 
        THEN '⚠️ New field - might need to be added'
        ELSE '✅ Standard field'
    END as field_status
FROM (
    VALUES 
        ('wave_score'),
        ('moods'),
        ('age_ranges'),
        ('subcultures'),
        ('hashtags'),
        ('creator_handle'),
        ('creator_name'),
        ('post_caption'),
        ('likes_count'),
        ('comments_count'),
        ('views_count')
) AS required_fields(column_name)
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'trend_submissions' 
    AND column_name = required_fields.column_name
);

-- Add missing columns if they don't exist
DO $$
BEGIN
    -- Add wave_score column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'trend_submissions' 
        AND column_name = 'wave_score'
    ) THEN
        ALTER TABLE trend_submissions ADD COLUMN wave_score INTEGER CHECK (wave_score >= 0 AND wave_score <= 100);
        RAISE NOTICE 'Added wave_score column';
    END IF;

    -- Add moods as part of evidence JSONB (it should already be there)
    -- The evidence column should handle moods, age_ranges, subcultures etc.
    
END $$;

-- Show final structure
SELECT 
    '---' as "---",
    'FINAL TABLE STRUCTURE' as "---";

SELECT 
    column_name,
    data_type,
    CASE 
        WHEN column_name = 'wave_score' THEN '🌊 Wave Score (0-100)'
        WHEN column_name = 'evidence' THEN '📦 Contains: moods, ageRanges, categories, etc.'
        WHEN column_name = 'status' THEN '📋 Submission status'
        WHEN column_name = 'spotter_id' THEN '👤 User who submitted'
        ELSE ''
    END as description
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'trend_submissions'
    AND column_name IN ('wave_score', 'evidence', 'status', 'spotter_id', 'category', 'description')
ORDER BY ordinal_position;