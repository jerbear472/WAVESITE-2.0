-- Manual test to verify thumbnail_url can be saved
-- Run this in Supabase SQL editor to test

-- First, get a user ID (you'll need to replace this with your actual user ID)
-- You can find your user ID by running:
-- SELECT id, email FROM auth.users LIMIT 5;

-- Create a test submission with all fields including thumbnail
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
    wave_score,
    creator_handle,
    creator_name,
    post_caption,
    likes_count,
    comments_count,
    views_count,
    hashtags
) VALUES (
    (SELECT id FROM auth.users LIMIT 1), -- Gets first user, replace with your ID
    'meme_format',
    'TEST: YouTube video with thumbnail - Rick Roll',
    jsonb_build_object(
        'url', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'title', 'Test Trend with Thumbnail',
        'platform', 'youtube',
        'categories', ARRAY['Humor & Memes'],
        'moods', ARRAY['Playful'],
        'ageRanges', ARRAY['18-24'],
        'spreadSpeed', 'viral'
    ),
    'submitted',
    8,
    0.8,
    0,
    'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg', -- YouTube thumbnail
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    8, -- wave_score
    '@RickAstley',
    'Rick Astley',
    'Never gonna give you up, never gonna let you down',
    1000000,
    50000,
    100000000,
    ARRAY['rickroll', 'classic', 'meme']
)
RETURNING id, thumbnail_url, wave_score, post_url;

-- Verify it was saved correctly
SELECT 
    id,
    created_at,
    thumbnail_url,
    wave_score,
    post_url,
    screenshot_url
FROM public.trend_submissions
WHERE description LIKE '%TEST:%'
ORDER BY created_at DESC
LIMIT 1;