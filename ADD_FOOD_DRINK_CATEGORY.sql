-- =====================================================
-- ADD FOOD_DRINK TO CATEGORY ENUM
-- Run this in Supabase SQL Editor to properly support food trends
-- =====================================================

-- First, check current enum values
SELECT enumlabel as current_categories
FROM pg_enum 
WHERE enumtypid = (
    SELECT oid 
    FROM pg_type 
    WHERE typname = 'trend_category'
)
ORDER BY enumsortorder;

-- Add 'food_drink' to the trend_category enum if it doesn't exist
-- This requires altering the enum type
DO $$ 
BEGIN
    -- Check if 'food_drink' already exists in the enum
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_enum 
        WHERE enumtypid = 'trend_category'::regtype 
        AND enumlabel = 'food_drink'
    ) THEN
        -- Add the new value to the enum
        ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'food_drink';
        RAISE NOTICE '✅ Added food_drink to trend_category enum';
    ELSE
        RAISE NOTICE '⚠️ food_drink already exists in trend_category enum';
    END IF;
END $$;

-- Verify the update
SELECT enumlabel as updated_categories
FROM pg_enum 
WHERE enumtypid = (
    SELECT oid 
    FROM pg_type 
    WHERE typname = 'trend_category'
)
ORDER BY enumsortorder;

-- Update any existing records that might be using 'behavior_pattern' for food
-- (Optional - only if you want to migrate existing data)
/*
UPDATE trend_submissions 
SET category = 'food_drink'
WHERE category = 'behavior_pattern'
AND (
    trend_headline ILIKE '%food%' 
    OR trend_headline ILIKE '%drink%'
    OR trend_headline ILIKE '%restaurant%'
    OR trend_headline ILIKE '%recipe%'
    OR trend_headline ILIKE '%cooking%'
);
*/