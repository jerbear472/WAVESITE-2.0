-- Check what categories are valid in the current enum

-- Option 1: See all values in the trend_category enum
SELECT enumlabel as valid_category
FROM pg_enum
WHERE enumtypid = (
    SELECT oid 
    FROM pg_type 
    WHERE typname = 'trend_category'
)
ORDER BY enumsortorder;

-- Option 2: Check if specific categories exist
SELECT 
    'humor_memes' as test_value,
    EXISTS (
        SELECT 1 
        FROM pg_enum 
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'trend_category')
        AND enumlabel = 'humor_memes'
    ) as is_valid;

-- Option 3: Show the exact constraint
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'trend_submissions'::regclass
    AND contype = 'c'  -- check constraint
    AND pg_get_constraintdef(oid) LIKE '%category%';