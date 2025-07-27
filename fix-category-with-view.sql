-- Fix category enum issue when there's a dependent view

-- 1. First, let's see what categories are actually valid
SELECT enumlabel as valid_category
FROM pg_enum
WHERE enumtypid = (
    SELECT oid FROM pg_type WHERE typname = 'trend_category'
)
ORDER BY enumsortorder;

-- 2. Check what view depends on this
SELECT 
    v.viewname,
    v.definition
FROM pg_views v
WHERE v.viewname = 'public_trends';

-- 3. OPTION A: Add the missing enum value (Recommended - less disruptive)
-- Check if 'humor_memes' exists, if not add it
DO $$
BEGIN
    -- Check if the enum value already exists
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_enum 
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'trend_category')
        AND enumlabel = 'humor_memes'
    ) THEN
        -- Add the new enum value
        ALTER TYPE trend_category ADD VALUE 'humor_memes';
    END IF;
END $$;

-- 4. Show all valid categories after update
SELECT 
    'Valid categories after update:' as info,
    array_agg(enumlabel ORDER BY enumsortorder) as categories
FROM pg_enum
WHERE enumtypid = (
    SELECT oid FROM pg_type WHERE typname = 'trend_category'
);