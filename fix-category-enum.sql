-- Fix the category enum issue in trend_submissions table

-- 1. First, check what the current enum values are
SELECT 
    t.typname as enum_name,
    array_agg(e.enumlabel ORDER BY e.enumsortorder) as enum_values
FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid  
    JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE t.typname = 'trend_category'
GROUP BY t.typname;

-- 2. Check current column type
SELECT 
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_name = 'trend_submissions' 
    AND column_name = 'category';

-- 3. If the column uses an enum, we need to either:
-- Option A: Add the missing value to the enum
-- Option B: Change the column to TEXT (simpler and more flexible)

-- OPTION B: Change to TEXT (Recommended - Run this)
ALTER TABLE trend_submissions 
ALTER COLUMN category TYPE TEXT;

-- Verify the change
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'trend_submissions' 
    AND column_name = 'category';

-- Success message
SELECT 'Category column changed to TEXT - now accepts any category value!' as status;