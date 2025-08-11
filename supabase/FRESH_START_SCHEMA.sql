-- FRESH START SCHEMA - Clean database setup with EARNINGS_STANDARD
-- Version 1.0.0 - Aligned with EARNINGS_STANDARD.ts

-- ============================================
-- ENABLE EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- CREATE ENUMS
-- ============================================
CREATE TYPE user_role AS ENUM ('participant', 'validator', 'manager', 'admin');
CREATE TYPE trend_category AS ENUM ('visual_style', 'audio_music', 'creator_technique', 'meme_format', 'product_brand', 'behavior_pattern');
CREATE TYPE trend_status AS ENUM ('submitted', 'validating', 'approved', 'rejected', 'viral');
CREATE TYPE spotter_tier AS ENUM ('elite', 'verified', 'learning', 'restricted');
CREATE TYPE earning_status AS ENUM ('pending', 'approved', 'paid', 'cancelled');

-- ============================================
-- USER PROFILES TABLE
-- ============================================
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role user_role DEFAULT 'participant',
    spotter_tier spotter_tier DEFAULT 'learning',
    
    -- Earnings fields (matching EARNINGS_STANDARD)
    earnings_pending DECIMAL(10,2) DEFAULT 0.00,
    earnings_approved DECIMAL(10,2) DEFAULT 0.00,
    earnings_paid DECIMAL(10,2) DEFAULT 0.00,
    total_earnings DECIMAL(10,2) DEFAULT 0.00,
    daily_earnings DECIMAL(10,2) DEFAULT 0.00,
    daily_earnings_date DATE,
    
    -- Stats
    trends_spotted INTEGER DEFAULT 0,
    accuracy_score DECIMAL(5,2) DEFAULT 0.00,
    validation_score DECIMAL(5,2) DEFAULT 0.00,
    current_streak INTEGER DEFAULT 0,
    last_submission_at TIMESTAMPTZ,
    
    -- Metadata
    demographics JSONB DEFAULT '{}',
    interests JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- ============================================
-- TREND SUBMISSIONS TABLE
-- ============================================
CREATE TABLE public.trend_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    spotter_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    
    -- Core fields
    category trend_category NOT NULL,
    description TEXT NOT NULL,
    status trend_status DEFAULT 'submitted',
    
    -- Media and content
    screenshot_url TEXT,
    thumbnail_url TEXT,
    post_url TEXT,
    platform TEXT,
    
    -- Social media data (BIGINT for large numbers)
    views_count BIGINT DEFAULT 0,
    likes_count BIGINT DEFAULT 0,
    comments_count BIGINT DEFAULT 0,
    shares_count BIGINT DEFAULT 0,
    follower_count BIGINT DEFAULT 0,
    
    -- Creator info
    creator_handle TEXT,
    creator_name TEXT,
    post_caption TEXT,
    hashtags TEXT[] DEFAULT '{}',
    
    -- Validation counts (INTEGER to prevent overflow)
    validation_count INTEGER DEFAULT 0,
    approve_count INTEGER DEFAULT 0,
    reject_count INTEGER DEFAULT 0,
    validation_status earning_status DEFAULT 'pending',
    
    -- Scores and predictions (proper types)
    quality_score DECIMAL(5,2) DEFAULT 0.50,
    virality_prediction INTEGER DEFAULT 5,
    wave_score INTEGER DEFAULT 50,
    
    -- Earnings (matching EARNINGS_STANDARD)
    base_amount DECIMAL(10,2) DEFAULT 1.00,
    bonus_amount DECIMAL(10,2) DEFAULT 0.00,
    tier_multiplier DECIMAL(3,2) DEFAULT 0.70,
    streak_multiplier DECIMAL(3,2) DEFAULT 1.00,
    total_earned DECIMAL(10,2) DEFAULT 0.00,
    earning_status earning_status DEFAULT 'pending',
    approval_bonus_paid BOOLEAN DEFAULT FALSE,
    applied_bonuses JSONB DEFAULT '[]',
    
    -- Additional data
    evidence JSONB DEFAULT '{}',
    other_platforms TEXT[] DEFAULT '{}',
    age_ranges JSONB DEFAULT '[]',
    subcultures JSONB DEFAULT '[]',
    
    -- Timestamps
    posted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    validated_at TIMESTAMPTZ,
    mainstream_at TIMESTAMPTZ,
    predicted_peak_date TIMESTAMPTZ
);

-- ============================================
-- TREND VALIDATIONS TABLE
-- ============================================
CREATE TABLE public.trend_validations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trend_id UUID REFERENCES public.trend_submissions(id) ON DELETE CASCADE,
    validator_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    
    -- Vote data
    vote TEXT CHECK (vote IN ('verify', 'reject')),
    confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Earnings (matching EARNINGS_STANDARD)
    reward_amount DECIMAL(10,2) DEFAULT 0.10,
    reward_status earning_status DEFAULT 'approved',
    
    -- Additional data
    evidence_url TEXT,
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicate votes
    UNIQUE(trend_id, validator_id)
);

-- ============================================
-- EARNINGS LEDGER TABLE
-- ============================================
CREATE TABLE public.earnings_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    
    -- Earning details
    amount DECIMAL(10,2) NOT NULL,
    type TEXT CHECK (type IN ('trend_submission', 'trend_validation', 'approval_bonus', 'scroll_session', 'challenge', 'referral')),
    status earning_status DEFAULT 'pending',
    
    -- References
    reference_id UUID,
    reference_table TEXT,
    description TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ
);

-- ============================================
-- CASHOUT REQUESTS TABLE
-- ============================================
CREATE TABLE public.cashout_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    
    -- Request details
    amount DECIMAL(10,2) NOT NULL,
    venmo_username TEXT,
    status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    
    -- Processing info
    transaction_id TEXT,
    failure_reason TEXT,
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX idx_trend_submissions_spotter ON public.trend_submissions(spotter_id);
CREATE INDEX idx_trend_submissions_status ON public.trend_submissions(status);
CREATE INDEX idx_trend_submissions_created ON public.trend_submissions(created_at DESC);
CREATE INDEX idx_trend_submissions_validation ON public.trend_submissions(validation_status, status);
CREATE INDEX idx_trend_validations_trend ON public.trend_validations(trend_id);
CREATE INDEX idx_trend_validations_validator ON public.trend_validations(validator_id);
CREATE INDEX idx_earnings_ledger_user ON public.earnings_ledger(user_id);
CREATE INDEX idx_earnings_ledger_status ON public.earnings_ledger(status);
CREATE INDEX idx_user_profiles_tier ON public.user_profiles(spotter_tier);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trend_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trend_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.earnings_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashout_requests ENABLE ROW LEVEL SECURITY;

-- User profiles policies
CREATE POLICY "Users can view their own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Trend submissions policies
CREATE POLICY "Anyone can view approved trends" ON public.trend_submissions
    FOR SELECT USING (status IN ('approved', 'viral'));
CREATE POLICY "Users can view their own submissions" ON public.trend_submissions
    FOR SELECT USING (auth.uid() = spotter_id);
CREATE POLICY "Authenticated users can submit trends" ON public.trend_submissions
    FOR INSERT WITH CHECK (auth.uid() = spotter_id);

-- Trend validations policies
CREATE POLICY "Users can view validations" ON public.trend_validations
    FOR SELECT USING (TRUE);
CREATE POLICY "Authenticated users can validate" ON public.trend_validations
    FOR INSERT WITH CHECK (auth.uid() = validator_id);

-- Earnings ledger policies
CREATE POLICY "Users can view their own earnings" ON public.earnings_ledger
    FOR SELECT USING (auth.uid() = user_id);

-- Cashout requests policies
CREATE POLICY "Users can view their own cashouts" ON public.cashout_requests
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create cashout requests" ON public.cashout_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- ESSENTIAL FUNCTIONS (from EARNINGS_STANDARD)
-- ============================================

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, username)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Cast trend vote function (simplified and working)
CREATE OR REPLACE FUNCTION public.cast_trend_vote(
    p_trend_id UUID,
    p_vote TEXT
)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID;
    v_spotter_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    -- Check if trend exists and get spotter
    SELECT spotter_id INTO v_spotter_id
    FROM public.trend_submissions
    WHERE id = p_trend_id;
    
    IF v_spotter_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Trend not found');
    END IF;
    
    IF v_spotter_id = v_user_id THEN
        RETURN json_build_object('success', false, 'error', 'Cannot validate your own trend');
    END IF;
    
    -- Check for existing vote
    IF EXISTS (
        SELECT 1 FROM public.trend_validations
        WHERE trend_id = p_trend_id
        AND validator_id = v_user_id
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Already voted on this trend');
    END IF;
    
    -- Insert vote
    INSERT INTO public.trend_validations (
        trend_id, validator_id, vote, confirmed, created_at
    ) VALUES (
        p_trend_id, v_user_id, p_vote, 
        CASE WHEN p_vote = 'verify' THEN true ELSE false END,
        NOW()
    );
    
    -- Update counts
    UPDATE public.trend_submissions
    SET 
        approve_count = (SELECT COUNT(*) FROM trend_validations WHERE trend_id = p_trend_id AND vote = 'verify'),
        reject_count = (SELECT COUNT(*) FROM trend_validations WHERE trend_id = p_trend_id AND vote = 'reject'),
        validation_count = (SELECT COUNT(*) FROM trend_validations WHERE trend_id = p_trend_id),
        status = CASE
            WHEN (SELECT COUNT(*) FROM trend_validations WHERE trend_id = p_trend_id AND vote = 'verify') >= 2 THEN 'approved'::trend_status
            WHEN (SELECT COUNT(*) FROM trend_validations WHERE trend_id = p_trend_id AND vote = 'reject') >= 2 THEN 'rejected'::trend_status
            ELSE 'validating'::trend_status
        END,
        updated_at = NOW()
    WHERE id = p_trend_id;
    
    RETURN json_build_object('success', true, 'message', 'Vote recorded successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.cast_trend_vote TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================
-- SIMPLE VIEW FOR VALIDATION PAGE
-- ============================================
CREATE VIEW verify_page AS
SELECT * FROM trend_submissions
WHERE status IN ('submitted', 'validating');

GRANT SELECT ON verify_page TO authenticated;

-- Done! Clean schema aligned with EARNINGS_STANDARD