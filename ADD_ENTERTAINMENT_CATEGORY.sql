-- Add entertainment category to the trend_category enum
-- This fixes the issue where "entertainment" was being used in the code but didn't exist in the database

DO $$
BEGIN
    -- Check if entertainment doesn't exist in the enum
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'entertainment' AND enumtypid = 'trend_category'::regtype) THEN
        -- Add entertainment to the enum
        ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'entertainment';
        RAISE NOTICE 'Added "entertainment" to trend_category enum';
    ELSE
        RAISE NOTICE '"entertainment" already exists in trend_category enum';
    END IF;
    
    -- Also add "other" as a catch-all category if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'other' AND enumtypid = 'trend_category'::regtype) THEN
        ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'other';
        RAISE NOTICE 'Added "other" to trend_category enum';
    END IF;
    
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Category already exists';
END $$;

-- List all current enum values for verification
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'trend_category'::regtype 
ORDER BY enumsortorder;