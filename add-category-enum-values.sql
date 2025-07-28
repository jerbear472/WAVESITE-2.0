-- Add missing enum values to trend_category type
-- This is simpler than changing the column type

-- 1. Check current enum values
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'trend_category')
ORDER BY enumsortorder;

-- 2. Add the missing category values that the form is trying to use
-- Note: We need to add the mapped values, not the display values
DO $$ 
BEGIN
    -- Check if 'behavior_pattern' exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'trend_category')
        AND enumlabel = 'behavior_pattern'
    ) THEN
        ALTER TYPE trend_category ADD VALUE 'behavior_pattern';
    END IF;
    
    -- Add other missing values if needed
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'trend_category')
        AND enumlabel = 'visual_style'
    ) THEN
        ALTER TYPE trend_category ADD VALUE 'visual_style';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'trend_category')
        AND enumlabel = 'audio_music'
    ) THEN
        ALTER TYPE trend_category ADD VALUE 'audio_music';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'trend_category')
        AND enumlabel = 'creator_technique'
    ) THEN
        ALTER TYPE trend_category ADD VALUE 'creator_technique';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'trend_category')
        AND enumlabel = 'product_brand'
    ) THEN
        ALTER TYPE trend_category ADD VALUE 'product_brand';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        -- Value already exists, ignore
        NULL;
END $$;

-- 3. Show all enum values after update
SELECT enumlabel as category_values
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'trend_category')
ORDER BY enumsortorder;

-- Success message
SELECT 'Category enum values added successfully!' as result;