-- Fix the category column to accept any value
-- This changes it from enum to TEXT type

-- 1. First, check current category type
SELECT 
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'trend_submissions'
    AND column_name = 'category';

-- 2. Change category column from enum to TEXT
ALTER TABLE public.trend_submissions 
ALTER COLUMN category TYPE TEXT;

-- 3. Remove any CHECK constraints on category if they exist
DO $$ 
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find and drop any CHECK constraints on the category column
    FOR constraint_name IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.trend_submissions'::regclass 
        AND contype = 'c' 
        AND conname LIKE '%category%'
    LOOP
        EXECUTE format('ALTER TABLE public.trend_submissions DROP CONSTRAINT %I', constraint_name);
    END LOOP;
END $$;

-- 4. Verify the change
SELECT 
    column_name,
    data_type,
    udt_name,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'trend_submissions'
    AND column_name = 'category';

-- Success message
SELECT 'Category column changed to TEXT - can now accept any category value!' as result;