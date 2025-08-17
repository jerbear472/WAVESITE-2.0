-- Check what category enum values are actually valid in the database
SELECT enumlabel as valid_category_value
FROM pg_enum 
WHERE enumtypid = (
    SELECT oid 
    FROM pg_type 
    WHERE typname = 'trend_category'
)
ORDER BY enumsortorder;

-- This will show you ALL the valid category values
-- Copy this list to update the safeCategory.ts file