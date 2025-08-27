-- Check what category enum values are actually valid in the database

-- 1. Check the enum type definition
SELECT 
    t.typname AS enum_name,
    e.enumlabel AS valid_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname = 'trend_category'
ORDER BY e.enumsortorder;

-- 2. If no enum type, check the constraint
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'trend_submissions'::regclass
    AND conname LIKE '%category%';

-- 3. Check what categories are actually being used successfully
SELECT DISTINCT 
    category, 
    COUNT(*) as count
FROM trend_submissions
WHERE category IS NOT NULL
GROUP BY category
ORDER BY count DESC;