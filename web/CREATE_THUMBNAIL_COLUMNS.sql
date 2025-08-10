-- Ensure thumbnail_url and wave_score columns exist
-- Run this in your Supabase SQL editor

-- Add columns if they don't exist
ALTER TABLE public.trend_submissions 
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS wave_score INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS post_url TEXT,
ADD COLUMN IF NOT EXISTS screenshot_url TEXT;

-- Check the columns exist
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'trend_submissions' 
  AND column_name IN ('thumbnail_url', 'wave_score', 'post_url', 'screenshot_url')
ORDER BY column_name;

-- Insert a test record with thumbnail
INSERT INTO public.trend_submissions (
    spotter_id,
    category, 
    description,
    evidence,
    status,
    virality_prediction,
    quality_score,
    validation_count,
    thumbnail_url,
    post_url,
    wave_score
) VALUES (
    (SELECT id FROM auth.users WHERE email IS NOT NULL LIMIT 1),
    'meme_format',
    'TEST: Rick Roll with thumbnail',
    '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "title": "Never Gonna Give You Up"}',
    'submitted',
    8,
    0.8,
    0,
    'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    8
) RETURNING id, thumbnail_url, wave_score, post_url;

-- Verify the test record
SELECT 
    id,
    thumbnail_url,
    wave_score, 
    post_url,
    screenshot_url,
    created_at
FROM public.trend_submissions 
WHERE description LIKE '%TEST:%'
ORDER BY created_at DESC 
LIMIT 1;