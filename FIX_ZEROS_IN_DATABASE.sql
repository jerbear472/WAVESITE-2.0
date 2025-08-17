-- =====================================================
-- FIX "0" AND "00" TEXT VALUES IN DATABASE
-- Simple version that handles text fields only
-- =====================================================

-- Check what we're dealing with
SELECT 'Checking for "0" and "00" values in text fields...' as info;

SELECT id, title, description, created_at
FROM trend_submissions
WHERE 
    title IN ('0', '00') OR
    description IN ('0', '00')
LIMIT 10;

-- Fix titles that are literally "0" or "00"
UPDATE trend_submissions
SET title = 'Untitled Trend'
WHERE title IN ('0', '00');

-- Fix descriptions that are literally "0" or "00"  
UPDATE trend_submissions
SET description = NULL
WHERE description IN ('0', '00');

-- Clean up empty strings
UPDATE trend_submissions
SET title = 'Untitled Trend'
WHERE title = '' OR title IS NULL;

UPDATE trend_submissions
SET description = NULL
WHERE description = '';

-- Fix trend_headline if it exists
UPDATE trend_submissions
SET trend_headline = NULL
WHERE trend_headline IN ('0', '00', '');

-- Fix why_trending if it exists
UPDATE trend_submissions
SET why_trending = NULL
WHERE why_trending IN ('0', '00', '');

-- Show results
SELECT 'After cleanup:' as info;
SELECT COUNT(*) as total_cleaned
FROM trend_submissions
WHERE title NOT IN ('0', '00') 
  AND (description IS NULL OR description NOT IN ('0', '00'));

-- Show sample of cleaned data
SELECT id, title, description, category, created_at
FROM trend_submissions
ORDER BY created_at DESC
LIMIT 5;

-- Success message
SELECT '✅ Cleanup complete! Refresh your dashboard to see the changes.' as message;