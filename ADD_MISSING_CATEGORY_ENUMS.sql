-- =====================================================
-- ADD ALL MISSING CATEGORY ENUMS
-- This ensures every category in the form has a proper enum value
-- =====================================================

-- First, show current enum values
SELECT 'Current category enums:' as info, 
       array_agg(enumlabel ORDER BY enumsortorder) as current_values
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'trend_category');

-- Add all missing category enums needed by the form
DO $$ 
BEGIN
    -- Add 'sports' for Sports/Fitness category
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = 'trend_category'::regtype 
        AND enumlabel = 'sports'
    ) THEN
        ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'sports';
        RAISE NOTICE '✅ Added sports to trend_category enum';
    END IF;

    -- Add 'automotive' for Cars & Machines category
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = 'trend_category'::regtype 
        AND enumlabel = 'automotive'
    ) THEN
        ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'automotive';
        RAISE NOTICE '✅ Added automotive to trend_category enum';
    END IF;

    -- Add 'animals_pets' for Animals & Pets category
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = 'trend_category'::regtype 
        AND enumlabel = 'animals_pets'
    ) THEN
        ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'animals_pets';
        RAISE NOTICE '✅ Added animals_pets to trend_category enum';
    END IF;

    -- Add 'travel' for Travel & Places category
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = 'trend_category'::regtype 
        AND enumlabel = 'travel'
    ) THEN
        ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'travel';
        RAISE NOTICE '✅ Added travel to trend_category enum';
    END IF;

    -- Add 'education' for Education & Learning category
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = 'trend_category'::regtype 
        AND enumlabel = 'education'
    ) THEN
        ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'education';
        RAISE NOTICE '✅ Added education to trend_category enum';
    END IF;
END $$;

-- Verify all enums were added
SELECT 'Updated category enums:' as info,
       array_agg(enumlabel ORDER BY enumsortorder) as all_values
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'trend_category');

-- Show the complete mapping
SELECT '📊 Form Category → Database Enum Mapping:' as mapping_guide
UNION ALL
SELECT '  Meme/Humor → meme_format'
UNION ALL
SELECT '  Fashion/Beauty → fashion'
UNION ALL
SELECT '  Food/Drink → food_drink'
UNION ALL
SELECT '  Music/Dance → audio_music'
UNION ALL
SELECT '  Lifestyle → lifestyle'
UNION ALL
SELECT '  Tech/Gaming → gaming'
UNION ALL
SELECT '  Finance/Crypto → finance'
UNION ALL
SELECT '  Sports/Fitness → sports'
UNION ALL
SELECT '  Political/Social → political'
UNION ALL
SELECT '  Cars & Machines → automotive'
UNION ALL
SELECT '  Animals & Pets → animals_pets'
UNION ALL
SELECT '  Travel & Places → travel'
UNION ALL
SELECT '  Education & Learning → education'
UNION ALL
SELECT '  Health & Wellness → health'
UNION ALL
SELECT '  Product/Shopping → product_brand';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 ALL CATEGORY ENUMS ADDED!';
    RAISE NOTICE '================================';
    RAISE NOTICE 'Every category in your form now has a proper database enum.';
    RAISE NOTICE 'No more temporary workarounds needed!';
END $$;