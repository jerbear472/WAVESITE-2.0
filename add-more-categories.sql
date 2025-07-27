-- Add more category options to the trend_category enum
-- This will give more flexibility for categorizing trends

-- First, check current values
SELECT 'Current category enum values:' as info;
SELECT enumlabel as category
FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'trend_category')
ORDER BY enumsortorder;

-- Add new values to the enum
-- Note: You can only add new values, not remove existing ones
DO $$ 
BEGIN
    -- Check if enum value doesn't exist before adding
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'trend_category')
        AND enumlabel = 'lifestyle'
    ) THEN
        ALTER TYPE trend_category ADD VALUE 'lifestyle';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'trend_category')
        AND enumlabel = 'entertainment'
    ) THEN
        ALTER TYPE trend_category ADD VALUE 'entertainment';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'trend_category')
        AND enumlabel = 'fashion_beauty'
    ) THEN
        ALTER TYPE trend_category ADD VALUE 'fashion_beauty';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'trend_category')
        AND enumlabel = 'food_drink'
    ) THEN
        ALTER TYPE trend_category ADD VALUE 'food_drink';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'trend_category')
        AND enumlabel = 'sports_fitness'
    ) THEN
        ALTER TYPE trend_category ADD VALUE 'sports_fitness';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'trend_category')
        AND enumlabel = 'tech_gaming'
    ) THEN
        ALTER TYPE trend_category ADD VALUE 'tech_gaming';
    END IF;
END $$;

-- Show updated values
SELECT 'Updated category enum values:' as info;
SELECT enumlabel as category
FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'trend_category')
ORDER BY enumsortorder;