-- Add ALL categories EXACTLY as the form sends them (with capital letters)
DO $$
BEGIN
    -- Add categories with exact casing as sent by the form
    ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'Fashion & Beauty';
    ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'Food & Drink';
    ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'Humor & Memes';
    ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'Lifestyle';
    ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'Politics & Social Issues';
    ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'Music & Dance';
    ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'Sports & Fitness';
    ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'Tech & Gaming';
    ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'Art & Creativity';
    ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'Education & Science';
    
    -- Also add the converted versions
    ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'fashion_beauty';
    ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'food_drink';
    ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'humor_memes';
    ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'lifestyle';
    ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'politics_social';
    ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'music_dance';
    ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'sports_fitness';
    ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'tech_gaming';
    ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'art_creativity';
    ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'education_science';
    ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'meme_format';
EXCEPTION 
    WHEN duplicate_object THEN null;
END $$;

-- Show all categories
SELECT enumlabel as valid_category 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'trend_category')
ORDER BY enumlabel;