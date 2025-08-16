-- Check the valid enum values for trend_category
SELECT 
    column_name,
    data_type,
    udt_name,
    column_default
FROM information_schema.columns 
WHERE table_name = 'trend_submissions' 
AND column_name = 'category';

-- Get the enum type definition
SELECT 
    t.typname AS enum_name,
    array_agg(e.enumlabel ORDER BY e.enumsortorder) AS enum_values
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname = 'trend_category'
GROUP BY t.typname;

-- Alternative way to check enum values
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (
    SELECT oid 
    FROM pg_type 
    WHERE typname = 'trend_category'
)
ORDER BY enumsortorder;