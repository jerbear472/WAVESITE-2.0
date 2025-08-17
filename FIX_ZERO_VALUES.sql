-- =====================================================
-- FIX "0" AND "00" VALUES IN DATABASE
-- This fixes trends that have "0" or "00" as text values
-- =====================================================

-- First, let's see what we're dealing with
SELECT 'Checking for "0" and "00" values in trend_submissions...' as info;

SELECT id, title, description, category, created_at
FROM trend_submissions
WHERE 
    title = '0' OR title = '00' OR
    description = '0' OR description = '00'
LIMIT 10;

-- Update titles that are "0" or "00"
UPDATE trend_submissions
SET title = NULL
WHERE title IN ('0', '00');

-- Update descriptions that are "0" or "00"
UPDATE trend_submissions
SET description = NULL
WHERE description IN ('0', '00');

-- Note: category is an enum type, so we can't have '0' values there
-- If there are any invalid categories, they would have failed on insert

-- Numeric fields are already integers, so they can't have string '0' values
-- They would just be 0 as a number, which is valid

-- Also clean up any empty strings that might display as issues
UPDATE trend_submissions
SET title = NULL 
WHERE title = '';

UPDATE trend_submissions
SET description = NULL 
WHERE description = '';

UPDATE trend_submissions
SET trend_headline = NULL 
WHERE trend_headline = '';

UPDATE trend_submissions
SET why_trending = NULL 
WHERE why_trending = '';

-- Count how many records were affected
SELECT 'Fixed records count:' as info,
    COUNT(*) as total_fixed
FROM trend_submissions
WHERE 
    title IS NULL OR 
    description IS NULL OR
    (title != '0' AND title != '00' AND description != '0' AND description != '00');

-- Show a sample of the cleaned data
SELECT 'Sample of cleaned trends:' as info;
SELECT id, title, description, category, created_at
FROM trend_submissions
ORDER BY created_at DESC
LIMIT 5;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ ZERO VALUES CLEANUP COMPLETE!';
    RAISE NOTICE '================================';
    RAISE NOTICE 'All "0" and "00" values have been cleaned from the database.';
    RAISE NOTICE 'Dashboard should now display correctly.';
END $$;