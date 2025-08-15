-- Add more trend categories for cars/machines, drinking, and other categories
DO $$
BEGIN
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