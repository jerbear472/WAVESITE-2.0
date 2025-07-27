-- Check EXACTLY what's in your database

-- 1. Show all enum values for trend_category
SELECT 'Current enum values:' as info;
SELECT enumlabel, enumsortorder 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'trend_category')
ORDER BY enumsortorder;

-- 2. Check if the column is actually using the enum
SELECT 
    column_name,
    data_type,
    udt_name,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'trend_submissions' 
AND column_name = 'category';

-- 3. Try a test insert with different values
DO $$
DECLARE
    test_values text[] := ARRAY['humor_memes', 'meme_format', 'test'];
    val text;
    result text;
BEGIN
    FOREACH val IN ARRAY test_values
    LOOP
        BEGIN
            -- Try to cast the value
            EXECUTE format('SELECT %L::trend_category', val) INTO result;
            RAISE NOTICE 'Value % is VALID', val;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Value % is INVALID: %', val, SQLERRM;
        END;
    END LOOP;
END $$;

-- 4. Show any check constraints on the table
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'trend_submissions'::regclass
AND contype = 'c';  -- check constraints