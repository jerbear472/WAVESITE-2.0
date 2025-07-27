-- Check existing category enum values and add missing ones

-- 1. First, check what categories currently exist
SELECT 'Current valid categories:' as info;
SELECT enumlabel as valid_category
FROM pg_enum
WHERE enumtypid = (
    SELECT oid FROM pg_type WHERE typname = 'trend_category'
)
ORDER BY enumsortorder;

-- 2. Add missing categories that the form uses
DO $$
DECLARE
    categories text[] := ARRAY[
        'fashion_beauty',
        'food_drink',
        'humor_memes',
        'lifestyle',
        'politics_social',
        'music_dance',
        'sports_fitness',
        'tech_gaming',
        'art_creativity',
        'education_science',
        'entertainment',
        'travel',
        'business',
        'health_wellness',
        'pets_animals',
        'meme_format'  -- Default fallback
    ];
    cat text;
BEGIN
    FOREACH cat IN ARRAY categories
    LOOP
        -- Check if enum value exists
        IF NOT EXISTS (
            SELECT 1 
            FROM pg_enum 
            WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'trend_category')
            AND enumlabel = cat
        ) THEN
            -- Add the enum value
            EXECUTE format('ALTER TYPE trend_category ADD VALUE %L', cat);
            RAISE NOTICE 'Added category: %', cat;
        END IF;
    END LOOP;
END $$;

-- 3. Show updated categories
SELECT 'Updated categories:' as info;
SELECT enumlabel as valid_category
FROM pg_enum
WHERE enumtypid = (
    SELECT oid FROM pg_type WHERE typname = 'trend_category'
)
ORDER BY enumsortorder;