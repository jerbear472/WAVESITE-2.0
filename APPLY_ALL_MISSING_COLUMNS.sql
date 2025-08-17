-- =====================================================
-- COMPLETE DATABASE UPDATE FOR TREND SUBMISSIONS
-- Run this in Supabase SQL Editor
-- =====================================================

-- Add all missing columns for the new trend submission form
ALTER TABLE trend_submissions 
-- Platform and creator info
ADD COLUMN IF NOT EXISTS platform TEXT,
ADD COLUMN IF NOT EXISTS creator_handle TEXT,
ADD COLUMN IF NOT EXISTS creator_name TEXT,
ADD COLUMN IF NOT EXISTS post_caption TEXT,

-- Engagement metrics
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS shares_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0,

-- Content metadata
ADD COLUMN IF NOT EXISTS hashtags TEXT[],
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS screenshot_url TEXT,
ADD COLUMN IF NOT EXISTS post_url TEXT,

-- Trend velocity and size
ADD COLUMN IF NOT EXISTS trend_velocity TEXT CHECK (trend_velocity IN ('just_starting', 'picking_up', 'viral', 'saturated', 'declining')),
ADD COLUMN IF NOT EXISTS trend_size TEXT CHECK (trend_size IN ('micro', 'niche', 'viral', 'mega', 'global')),
ADD COLUMN IF NOT EXISTS first_seen_timing TEXT CHECK (first_seen_timing IN ('today', 'yesterday', 'this_week', 'last_week', 'older')),

-- AI and brand safety
ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS brand_safe BOOLEAN,

-- Audience demographics
ADD COLUMN IF NOT EXISTS audience_age TEXT[],

-- Category-specific answers
ADD COLUMN IF NOT EXISTS category_answers JSONB,

-- Quality and scoring
ADD COLUMN IF NOT EXISTS wave_score INTEGER DEFAULT 50 CHECK (wave_score >= 0 AND wave_score <= 100),
ADD COLUMN IF NOT EXISTS quality_score DECIMAL(3, 2) DEFAULT 0.50 CHECK (quality_score >= 0 AND quality_score <= 1),
ADD COLUMN IF NOT EXISTS virality_prediction INTEGER DEFAULT 5 CHECK (virality_prediction >= 0 AND virality_prediction <= 10),

-- Payment and earnings
ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS earnings DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS session_position INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS session_multiplier DECIMAL(3,2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS daily_multiplier DECIMAL(3,2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS tier_multiplier DECIMAL(3,2) DEFAULT 1.0,

-- Voting and validation
ADD COLUMN IF NOT EXISTS yes_votes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS no_votes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS validation_count INTEGER DEFAULT 0,

-- Status and evidence
ADD COLUMN IF NOT EXISTS earnings_status TEXT DEFAULT 'pending' CHECK (earnings_status IN ('pending', 'awaiting_verification', 'approved', 'paid', 'rejected')),
ADD COLUMN IF NOT EXISTS evidence JSONB,

-- Timestamps
ADD COLUMN IF NOT EXISTS posted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trend_submissions_platform ON trend_submissions(platform);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_velocity ON trend_submissions(trend_velocity, trend_size);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_ai_generated ON trend_submissions(is_ai_generated);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_creator ON trend_submissions(creator_handle);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_earnings ON trend_submissions(spotter_id, earnings_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_validation ON trend_submissions(status, validation_count);

-- Update any existing NULL values with defaults
UPDATE trend_submissions SET
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
    likes_count IS NULL 
    OR wave_score IS NULL
    OR payment_amount IS NULL;

-- Verify the update
SELECT 
    'Successfully added ' || COUNT(*) || ' columns' as message,
    array_agg(column_name ORDER BY column_name) as columns
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
    'earnings_status', 'evidence', 'posted_at', 'updated_at'
);