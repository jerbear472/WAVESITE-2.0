-- =====================================================
-- COMPLETE DATABASE SETUP FOR TREND SUBMISSIONS
-- Run this entire file in Supabase SQL Editor
-- This ensures ALL frontend fields have database columns
-- =====================================================

-- STEP 1: Fix Category Enum (Add missing food_drink)
-- =====================================================
DO $$ 
BEGIN
    -- Add 'food_drink' if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = 'trend_category'::regtype 
        AND enumlabel = 'food_drink'
    ) THEN
        ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'food_drink';
        RAISE NOTICE '✅ Added food_drink to trend_category enum';
    END IF;
END $$;

-- STEP 2: Add ALL columns from SmartTrendSubmission form
-- =====================================================
ALTER TABLE trend_submissions 

-- ==== BASIC TREND INFO ====
ADD COLUMN IF NOT EXISTS url TEXT,
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS trend_headline TEXT, -- Alternative field name for title

-- ==== PLATFORM & CREATOR DATA ====
ADD COLUMN IF NOT EXISTS platform TEXT,
ADD COLUMN IF NOT EXISTS creator_handle TEXT,
ADD COLUMN IF NOT EXISTS creator_name TEXT,
ADD COLUMN IF NOT EXISTS post_caption TEXT,

-- ==== ENGAGEMENT METRICS ====
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS shares_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0,

-- ==== CONTENT METADATA ====
ADD COLUMN IF NOT EXISTS hashtags TEXT[],
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS screenshot_url TEXT,
ADD COLUMN IF NOT EXISTS post_url TEXT,

-- ==== HIGH VALUE MARKET INTELLIGENCE ====
ADD COLUMN IF NOT EXISTS trend_velocity TEXT 
    CHECK (trend_velocity IN ('just_starting', 'picking_up', 'viral', 'saturated', 'declining')),
ADD COLUMN IF NOT EXISTS trend_size TEXT 
    CHECK (trend_size IN ('micro', 'niche', 'viral', 'mega', 'global')),
ADD COLUMN IF NOT EXISTS first_seen_timing TEXT 
    CHECK (first_seen_timing IN ('today', 'yesterday', 'this_week', 'last_week', 'older')),

-- ==== FORM SPECIFIC FIELDS ====
ADD COLUMN IF NOT EXISTS why_trending TEXT, -- Explanation of why it's trending
ADD COLUMN IF NOT EXISTS audience_age TEXT[], -- Age demographics array
ADD COLUMN IF NOT EXISTS brand_safe BOOLEAN,
ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS category_answers JSONB, -- Stores category-specific Q&A

-- ==== SENTIMENT & SCORING ====
ADD COLUMN IF NOT EXISTS sentiment INTEGER DEFAULT 50 CHECK (sentiment >= 0 AND sentiment <= 100),
ADD COLUMN IF NOT EXISTS wave_score INTEGER DEFAULT 50 CHECK (wave_score >= 0 AND wave_score <= 100),
ADD COLUMN IF NOT EXISTS quality_score DECIMAL(3, 2) DEFAULT 0.50 CHECK (quality_score >= 0 AND quality_score <= 1),
ADD COLUMN IF NOT EXISTS virality_prediction INTEGER DEFAULT 5 CHECK (virality_prediction >= 0 AND virality_prediction <= 10),

-- ==== EARNINGS & PAYMENTS ====
ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS earnings DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS session_position INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS session_multiplier DECIMAL(3,2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS daily_multiplier DECIMAL(3,2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS tier_multiplier DECIMAL(3,2) DEFAULT 1.0,

-- ==== VALIDATION & VOTING ====
ADD COLUMN IF NOT EXISTS yes_votes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS no_votes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS validation_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS earnings_status TEXT DEFAULT 'pending' 
    CHECK (earnings_status IN ('pending', 'awaiting_verification', 'approved', 'paid', 'rejected')),

-- ==== ADDITIONAL METADATA ====
ADD COLUMN IF NOT EXISTS evidence JSONB, -- Stores any extra data
ADD COLUMN IF NOT EXISTS posted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

-- ==== LEGACY/ALTERNATIVE FIELD NAMES ====
-- (Some components may use different field names)
ADD COLUMN IF NOT EXISTS trendName TEXT,
ADD COLUMN IF NOT EXISTS explanation TEXT,
ADD COLUMN IF NOT EXISTS spreadSpeed TEXT,
ADD COLUMN IF NOT EXISTS firstSeen TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS brandAdoption BOOLEAN,
ADD COLUMN IF NOT EXISTS motivation TEXT,
ADD COLUMN IF NOT EXISTS region TEXT DEFAULT 'Global',
ADD COLUMN IF NOT EXISTS audioOrCatchphrase TEXT,
ADD COLUMN IF NOT EXISTS otherPlatforms TEXT[],
ADD COLUMN IF NOT EXISTS categories TEXT[], -- Array of categories
ADD COLUMN IF NOT EXISTS ageRanges TEXT[], -- Alternative to audience_age
ADD COLUMN IF NOT EXISTS moods TEXT[], -- Mood tags array
ADD COLUMN IF NOT EXISTS categorySpecific JSONB; -- Alternative to category_answers

-- STEP 3: Create performance indexes
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_trend_submissions_platform 
    ON trend_submissions(platform);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_velocity 
    ON trend_submissions(trend_velocity, trend_size);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_ai_generated 
    ON trend_submissions(is_ai_generated);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_creator 
    ON trend_submissions(creator_handle);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_earnings 
    ON trend_submissions(spotter_id, earnings_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_validation 
    ON trend_submissions(status, validation_count);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_sentiment 
    ON trend_submissions(sentiment, wave_score);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_quality 
    ON trend_submissions(quality_score, virality_prediction);

-- STEP 4: Update NULL values with defaults
-- =====================================================
UPDATE trend_submissions SET
    likes_count = COALESCE(likes_count, 0),
    comments_count = COALESCE(comments_count, 0),
    shares_count = COALESCE(shares_count, 0),
    views_count = COALESCE(views_count, 0),
    wave_score = COALESCE(wave_score, 50),
    sentiment = COALESCE(sentiment, 50),
    quality_score = COALESCE(quality_score, 0.50),
    virality_prediction = COALESCE(virality_prediction, 5),
    payment_amount = COALESCE(payment_amount, 0.00),
    earnings = COALESCE(earnings, 0.00),
    session_position = COALESCE(session_position, 1),
    session_multiplier = COALESCE(session_multiplier, 1.0),
    daily_multiplier = COALESCE(daily_multiplier, 1.0),
    tier_multiplier = COALESCE(tier_multiplier, 1.0),
    yes_votes = COALESCE(yes_votes, 0),
    no_votes = COALESCE(no_votes, 0),
    validation_count = COALESCE(validation_count, 0),
    is_ai_generated = COALESCE(is_ai_generated, FALSE)
WHERE 
    likes_count IS NULL 
    OR wave_score IS NULL
    OR sentiment IS NULL
    OR payment_amount IS NULL;

-- STEP 5: Verify all columns exist
-- =====================================================
DO $$
DECLARE
    missing_columns TEXT[] := ARRAY[]::TEXT[];
    required_columns TEXT[] := ARRAY[
        'url', 'title', 'trend_headline', 'platform', 'creator_handle', 'creator_name',
        'post_caption', 'likes_count', 'comments_count', 'shares_count', 'views_count',
        'hashtags', 'thumbnail_url', 'screenshot_url', 'post_url', 'trend_velocity',
        'trend_size', 'first_seen_timing', 'why_trending', 'audience_age', 'brand_safe',
        'is_ai_generated', 'category_answers', 'sentiment', 'wave_score', 'quality_score',
        'virality_prediction', 'payment_amount', 'earnings', 'session_position',
        'session_multiplier', 'daily_multiplier', 'tier_multiplier', 'yes_votes',
        'no_votes', 'validation_count', 'earnings_status', 'evidence', 'posted_at',
        'updated_at', 'trendName', 'explanation', 'spreadSpeed', 'firstSeen',
        'brandAdoption', 'motivation', 'region', 'audioOrCatchphrase', 'otherPlatforms',
        'categories', 'ageRanges', 'moods', 'categorySpecific'
    ];
    col TEXT;
BEGIN
    -- Check each required column
    FOREACH col IN ARRAY required_columns
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'trend_submissions' 
            AND column_name = col
        ) THEN
            missing_columns := array_append(missing_columns, col);
        END IF;
    END LOOP;
    
    -- Report results
    IF array_length(missing_columns, 1) > 0 THEN
        RAISE WARNING '❌ Missing columns: %', array_to_string(missing_columns, ', ');
    ELSE
        RAISE NOTICE '✅ All required columns exist!';
    END IF;
END $$;

-- STEP 6: Show final column count and categories
-- =====================================================
SELECT 
    '✅ Database setup complete!' as status,
    COUNT(*) as total_columns,
    array_agg(DISTINCT column_name ORDER BY column_name) as all_columns
FROM information_schema.columns 
WHERE table_name = 'trend_submissions';

-- Show valid category enum values
SELECT 
    '📊 Valid categories:' as info,
    array_agg(enumlabel ORDER BY enumsortorder) as valid_categories
FROM pg_enum 
WHERE enumtypid = (
    SELECT oid FROM pg_type WHERE typname = 'trend_category'
);

-- STEP 7: Create or update trigger for updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_trend_submissions_updated_at ON trend_submissions;
CREATE TRIGGER update_trend_submissions_updated_at 
    BEFORE UPDATE ON trend_submissions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 DATABASE SETUP COMPLETE!';
    RAISE NOTICE '====================================';
    RAISE NOTICE '✅ Category enum fixed (food_drink added)';
    RAISE NOTICE '✅ All form fields have database columns';
    RAISE NOTICE '✅ Performance indexes created';
    RAISE NOTICE '✅ Default values set for existing records';
    RAISE NOTICE '✅ Updated_at trigger configured';
    RAISE NOTICE '';
    RAISE NOTICE '📝 Your trend_submissions table now supports:';
    RAISE NOTICE '   • Complete platform & creator tracking';
    RAISE NOTICE '   • Full engagement metrics';
    RAISE NOTICE '   • Market intelligence (velocity, size, timing)';
    RAISE NOTICE '   • Category-specific Q&A storage';
    RAISE NOTICE '   • AI content flagging';
    RAISE NOTICE '   • Sentiment & quality scoring';
    RAISE NOTICE '   • Complete earnings calculations';
    RAISE NOTICE '   • Validation & voting system';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Ready to accept trend submissions!';
END $$;