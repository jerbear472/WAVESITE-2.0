-- =====================================================
-- ADD MISSING COLUMNS FOR NEW TREND SUBMISSION FIELDS
-- =====================================================

BEGIN;

-- First, let's check what columns currently exist
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'trend_submissions'
ORDER BY ordinal_position;

-- =====================================================
-- ADD NEW COLUMNS BASED ON SmartTrendSubmission FIELDS
-- =====================================================

-- Platform detection
ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS platform TEXT;

-- Creator information
ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS creator_handle TEXT,
ADD COLUMN IF NOT EXISTS creator_name TEXT,
ADD COLUMN IF NOT EXISTS post_caption TEXT;

-- Engagement metrics
ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS shares_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;

-- Content metadata
ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS hashtags TEXT[],
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS screenshot_url TEXT,
ADD COLUMN IF NOT EXISTS post_url TEXT;

-- Trend velocity and size (HIGH VALUE DATA)
ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS trend_velocity TEXT CHECK (trend_velocity IN ('just_starting', 'picking_up', 'viral', 'saturated', 'declining')),
ADD COLUMN IF NOT EXISTS trend_size TEXT CHECK (trend_size IN ('micro', 'niche', 'viral', 'mega', 'global')),
ADD COLUMN IF NOT EXISTS first_seen_timing TEXT CHECK (first_seen_timing IN ('today', 'yesterday', 'this_week', 'last_week', 'older'));

-- AI-generated content flag (NEW FIELD)
ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT FALSE;

-- Brand safety flag
ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS brand_safe BOOLEAN;

-- Audience demographics
ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS audience_age TEXT[];

-- Category-specific answers (stored as JSONB for flexibility)
ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS category_answers JSONB;

-- Wave score for sentiment/quality
ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS wave_score INTEGER DEFAULT 50 CHECK (wave_score >= 0 AND wave_score <= 100);

-- Quality score
ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS quality_score DECIMAL(3, 2) DEFAULT 0.50 CHECK (quality_score >= 0 AND quality_score <= 1);

-- Virality prediction score
ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS virality_prediction INTEGER DEFAULT 5 CHECK (virality_prediction >= 0 AND virality_prediction <= 10);

-- Payment amount (already added but let's ensure it exists)
ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10, 2) DEFAULT 0.00;

-- Earnings tracking (for multipliers)
ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS earnings DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS session_position INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS session_multiplier DECIMAL(3,2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS daily_multiplier DECIMAL(3,2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS tier_multiplier DECIMAL(3,2) DEFAULT 1.0;

-- Voting tracking
ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS yes_votes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS no_votes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS validation_count INTEGER DEFAULT 0;

-- Earnings status
ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS earnings_status TEXT DEFAULT 'pending' CHECK (earnings_status IN ('pending', 'awaiting_verification', 'approved', 'paid', 'rejected'));

-- Evidence field for storing all extra data
ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS evidence JSONB;

-- Timestamps (if not already present)
ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS posted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Index for platform filtering
CREATE INDEX IF NOT EXISTS idx_trend_submissions_platform 
ON trend_submissions(platform);

-- Index for velocity and size analysis
CREATE INDEX IF NOT EXISTS idx_trend_submissions_velocity 
ON trend_submissions(trend_velocity, trend_size);

-- Index for AI-generated content filtering
CREATE INDEX IF NOT EXISTS idx_trend_submissions_ai_generated 
ON trend_submissions(is_ai_generated);

-- Index for creator handle searches
CREATE INDEX IF NOT EXISTS idx_trend_submissions_creator 
ON trend_submissions(creator_handle);

-- Index for earnings queries
CREATE INDEX IF NOT EXISTS idx_trend_submissions_earnings 
ON trend_submissions(spotter_id, earnings_status, created_at DESC);

-- Index for validation queries
CREATE INDEX IF NOT EXISTS idx_trend_submissions_validation 
ON trend_submissions(status, validation_count);

-- =====================================================
-- UPDATE EXISTING NULL VALUES WITH DEFAULTS
-- =====================================================

-- Set default values for any existing records that might have NULLs
UPDATE trend_submissions SET
    platform = COALESCE(platform, 'unknown'),
    likes_count = COALESCE(likes_count, 0),
    comments_count = COALESCE(comments_count, 0),
    shares_count = COALESCE(shares_count, 0),
    views_count = COALESCE(views_count, 0),
    wave_score = COALESCE(wave_score, 50),
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
    platform IS NULL 
    OR likes_count IS NULL 
    OR wave_score IS NULL;

-- =====================================================
-- VERIFY ALL COLUMNS WERE ADDED
-- =====================================================

SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'trend_submissions'
AND column_name IN (
    'platform', 'creator_handle', 'creator_name', 'post_caption',
    'likes_count', 'comments_count', 'shares_count', 'views_count',
    'hashtags', 'thumbnail_url', 'screenshot_url', 'post_url',
    'trend_velocity', 'trend_size', 'first_seen_timing',
    'is_ai_generated', 'brand_safe', 'audience_age',
    'category_answers', 'wave_score', 'quality_score',
    'virality_prediction', 'payment_amount', 'earnings',
    'session_position', 'session_multiplier', 'daily_multiplier',
    'tier_multiplier', 'yes_votes', 'no_votes', 'validation_count',
    'earnings_status', 'evidence', 'posted_at'
)
ORDER BY column_name;

COMMIT;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✅ All missing columns have been added successfully!';
    RAISE NOTICE '📊 The trend_submissions table now supports:';
    RAISE NOTICE '   - Platform detection and creator info';
    RAISE NOTICE '   - Full engagement metrics (likes, comments, shares, views)';
    RAISE NOTICE '   - Trend velocity and size tracking';
    RAISE NOTICE '   - AI-generated content flagging';
    RAISE NOTICE '   - Brand safety indicators';
    RAISE NOTICE '   - Audience demographics';
    RAISE NOTICE '   - Category-specific answers';
    RAISE NOTICE '   - Complete earnings and multiplier tracking';
END $$;