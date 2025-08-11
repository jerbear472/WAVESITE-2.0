-- Fix numeric field overflow by changing INTEGER to BIGINT for large social media counts
-- Run this in Supabase SQL editor

-- Change engagement count fields from INTEGER to BIGINT to handle large social media numbers
ALTER TABLE public.trend_submissions 
ALTER COLUMN likes_count TYPE BIGINT,
ALTER COLUMN comments_count TYPE BIGINT,
ALTER COLUMN shares_count TYPE BIGINT, 
ALTER COLUMN views_count TYPE BIGINT;

-- Also update any other numeric fields that might overflow
ALTER TABLE public.trend_submissions
ALTER COLUMN validation_count TYPE INTEGER,  -- This should stay INTEGER as it's small
ALTER COLUMN approve_count TYPE INTEGER,     -- This should stay INTEGER as it's small
ALTER COLUMN reject_count TYPE INTEGER;      -- This should stay INTEGER as it's small

-- Verify the changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'trend_submissions'
AND column_name IN ('likes_count', 'comments_count', 'shares_count', 'views_count', 'validation_count', 'approve_count', 'reject_count')
ORDER BY column_name;

-- Test with a large number to ensure it works
INSERT INTO public.trend_submissions (
    spotter_id,
    category,
    description,
    evidence,
    status,
    virality_prediction,
    quality_score,
    validation_count,
    likes_count,
    comments_count,
    views_count,
    shares_count
) VALUES (
    (SELECT id FROM auth.users LIMIT 1),
    'meme_format',
    'TEST: Large numbers overflow test',
    '{"url": "https://test.com", "title": "Overflow Test"}',
    'submitted',
    8,
    0.8,
    0,
    9999999999,    -- 9.9 billion likes
    8888888888,    -- 8.8 billion comments  
    7777777777,    -- 7.7 billion views
    6666666666     -- 6.6 billion shares
) RETURNING id, likes_count, comments_count, views_count, shares_count;

-- Clean up test record (replace the ID from the previous query)
-- DELETE FROM public.trend_submissions WHERE description = 'TEST: Large numbers overflow test';