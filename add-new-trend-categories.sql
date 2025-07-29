-- Add new category options for luxury, celebrity, meme coin, and meme stock
-- This script adds the new categories to the trend_category enum

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
    -- Add luxury category
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'trend_category')
        AND enumlabel = 'luxury'
    ) THEN
        ALTER TYPE trend_category ADD VALUE 'luxury';
    END IF;
    
    -- Add celebrity category
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'trend_category')
        AND enumlabel = 'celebrity'
    ) THEN
        ALTER TYPE trend_category ADD VALUE 'celebrity';
    END IF;
    
    -- Add meme_coin category
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'trend_category')
        AND enumlabel = 'meme_coin'
    ) THEN
        ALTER TYPE trend_category ADD VALUE 'meme_coin';
    END IF;
    
    -- Add meme_stock category
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'trend_category')
        AND enumlabel = 'meme_stock'
    ) THEN
        ALTER TYPE trend_category ADD VALUE 'meme_stock';
    END IF;
END $$;

-- Show updated values
SELECT 'Updated category enum values:' as info;
SELECT enumlabel as category
FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'trend_category')
ORDER BY enumsortorder;

-- Note: If the category column is TEXT instead of enum, no database changes are needed
-- The application can accept any category value in that case