-- Check what category enum values are allowed in the database
SELECT 
    t.typname AS enum_name,
    e.enumlabel AS enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname = 'trend_category'
ORDER BY e.enumsortorder;

-- Also check the current category column type
SELECT 
    column_name,
    data_type,
    udt_name,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'trend_submissions'
    AND column_name = 'category';

-- If the category column is using an enum, we might need to change it to TEXT
-- to accept any category value