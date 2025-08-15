-- Add comprehensive trend categories
DO $$
BEGIN
    -- Essential categories
    -- Add political category
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'political' AND enumtypid = 'trend_category'::regtype) THEN
        ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'political';
    END IF;
    
    -- Add finance category (includes crypto)
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'finance' AND enumtypid = 'trend_category'::regtype) THEN
        ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'finance';
    END IF;
    
    -- Add news_events category
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'news_events' AND enumtypid = 'trend_category'::regtype) THEN
        ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'news_events';
    END IF;
    
    -- Add education category
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'education' AND enumtypid = 'trend_category'::regtype) THEN
        ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'education';
    END IF;
    
    -- Add relationship category
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'relationship' AND enumtypid = 'trend_category'::regtype) THEN
        ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'relationship';
    END IF;
    
    -- Add animals_pets category
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'animals_pets' AND enumtypid = 'trend_category'::regtype) THEN
        ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'animals_pets';
    END IF;
    
    -- Lifestyle categories
    -- Add automotive/vehicles category
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'automotive' AND enumtypid = 'trend_category'::regtype) THEN
        ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'automotive';
    END IF;
    
    -- Add food_drink category (covers drinking and food trends)
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'food_drink' AND enumtypid = 'trend_category'::regtype) THEN
        ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'food_drink';
    END IF;
    
    -- Add technology category (for tech/gadget trends)
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'technology' AND enumtypid = 'trend_category'::regtype) THEN
        ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'technology';
    END IF;
    
    -- Add sports category
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'sports' AND enumtypid = 'trend_category'::regtype) THEN
        ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'sports';
    END IF;
    
    -- Add dance category (popular on TikTok)
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'dance' AND enumtypid = 'trend_category'::regtype) THEN
        ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'dance';
    END IF;
    
    -- Add travel category
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'travel' AND enumtypid = 'trend_category'::regtype) THEN
        ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'travel';
    END IF;
    
    -- Add fashion category
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'fashion' AND enumtypid = 'trend_category'::regtype) THEN
        ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'fashion';
    END IF;
    
    -- Add gaming category
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'gaming' AND enumtypid = 'trend_category'::regtype) THEN
        ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'gaming';
    END IF;
    
    -- Add health category
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'health' AND enumtypid = 'trend_category'::regtype) THEN
        ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'health';
    END IF;
    
    -- Add diy_crafts category
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'diy_crafts' AND enumtypid = 'trend_category'::regtype) THEN
        ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'diy_crafts';
    END IF;
    
EXCEPTION
    WHEN duplicate_object THEN
        NULL;
END $$;

-- Add a metadata column to store category-specific follow-up questions
ALTER TABLE trend_submissions ADD COLUMN IF NOT EXISTS follow_up_data JSONB;

-- Add comment to explain the structure
COMMENT ON COLUMN trend_submissions.follow_up_data IS 'Stores category-specific follow-up question responses. Structure varies by category.';