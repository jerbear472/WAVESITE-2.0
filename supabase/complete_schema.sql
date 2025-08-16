-- COMPLETE SCHEMA FOR NEW SUPABASE INSTANCE
-- This includes all tables, triggers, and functions needed for the app

-- ============================================
-- ENABLE EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- DROP EXISTING TYPES (IF ANY) TO AVOID CONFLICTS
-- ============================================
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS trend_category CASCADE;
DROP TYPE IF EXISTS trend_status CASCADE;
DROP TYPE IF EXISTS spotter_tier CASCADE;
DROP TYPE IF EXISTS earning_status CASCADE;

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
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role user_role DEFAULT 'participant',
    spotter_tier spotter_tier DEFAULT 'learning',
    
    -- Profile data
    birthday DATE,
    age_verified BOOLEAN DEFAULT FALSE,
    avatar_url TEXT,
    bio TEXT,
    
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
    
    -- Subscription
    subscription_tier TEXT DEFAULT 'starter',
    is_admin BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    demographics JSONB DEFAULT '{}',
    interests JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Create alias table for compatibility with frontend
CREATE OR REPLACE VIEW public.profiles AS 
SELECT * FROM public.user_profiles;

-- ============================================
-- TREND SUBMISSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.trend_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    spotter_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    
    -- Core fields
    category trend_category NOT NULL,
    description TEXT NOT NULL,
    status trend_status DEFAULT 'submitted',
    
    -- Alternative naming for compatibility
    trend_name TEXT,
    
    -- Media and content
    screenshot_url TEXT,
    thumbnail_url TEXT,
    image_url TEXT, -- Alternative naming
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
    confidence_score DECIMAL(5,2) DEFAULT 0.50,
    
    -- Earnings (matching EARNINGS_STANDARD)
    base_amount DECIMAL(10,2) DEFAULT 1.00,
    bonus_amount DECIMAL(10,2) DEFAULT 0.00,
    tier_multiplier DECIMAL(3,2) DEFAULT 0.70,
    streak_multiplier DECIMAL(3,2) DEFAULT 1.00,
    total_earned DECIMAL(10,2) DEFAULT 0.00,
    earning_status earning_status DEFAULT 'pending',
    approval_bonus_paid BOOLEAN DEFAULT FALSE,
    applied_bonuses JSONB DEFAULT '[]',
    bounty_amount DECIMAL(10,2) DEFAULT 0.00,
    bounty_paid BOOLEAN DEFAULT FALSE,
    
    -- Additional data
    evidence JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    other_platforms TEXT[] DEFAULT '{}',
    age_ranges JSONB DEFAULT '[]',
    subcultures JSONB DEFAULT '[]',
    
    -- User ID alternative naming
    user_id UUID GENERATED ALWAYS AS (spotter_id) STORED,
    
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
CREATE TABLE IF NOT EXISTS public.trend_validations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trend_id UUID REFERENCES public.trend_submissions(id) ON DELETE CASCADE,
    validator_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    
    -- Vote data
    vote TEXT CHECK (vote IN ('verify', 'reject')),
    confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Earnings (matching EARNINGS_STANDARD)
    reward_amount DECIMAL(10,2) DEFAULT 0.02,
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
CREATE TABLE IF NOT EXISTS public.earnings_ledger (
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
CREATE TABLE IF NOT EXISTS public.cashout_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    
    -- Request details
    amount DECIMAL(10,2) NOT NULL,
    venmo_username TEXT,
    status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')) DEFAULT 'pending',
    
    -- Processing info
    transaction_id TEXT,
    failure_reason TEXT,
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- ============================================
-- USER ACCOUNT SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_account_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE UNIQUE,
    account_type TEXT DEFAULT 'user',
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CAPTURED TRENDS TABLE (for mobile app)
-- ============================================
CREATE TABLE IF NOT EXISTS public.captured_trends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    
    -- Capture data
    platform TEXT NOT NULL,
    content_url TEXT,
    thumbnail_url TEXT,
    title TEXT,
    description TEXT,
    
    -- Metadata
    creator_username TEXT,
    creator_display_name TEXT,
    views_count BIGINT DEFAULT 0,
    likes_count BIGINT DEFAULT 0,
    comments_count BIGINT DEFAULT 0,
    shares_count BIGINT DEFAULT 0,
    
    -- Status
    processed BOOLEAN DEFAULT FALSE,
    submitted_as_trend BOOLEAN DEFAULT FALSE,
    trend_submission_id UUID REFERENCES public.trend_submissions(id),
    
    -- Timestamps
    captured_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SCROLL SESSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.scroll_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    
    -- Session data
    session_id TEXT UNIQUE NOT NULL,
    platform TEXT NOT NULL,
    start_time TIMESTAMPTZ DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    duration_seconds INTEGER DEFAULT 0,
    
    -- Capture stats
    videos_viewed INTEGER DEFAULT 0,
    trends_captured INTEGER DEFAULT 0,
    
    -- Earnings
    base_earnings DECIMAL(10,2) DEFAULT 0.00,
    bonus_earnings DECIMAL(10,2) DEFAULT 0.00,
    total_earnings DECIMAL(10,2) DEFAULT 0.00,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SUBMISSION QUEUE TABLE (for failsafe)
-- ============================================
CREATE TABLE IF NOT EXISTS public.submission_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_data JSONB NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TRIGGERS
-- ============================================

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (
        id,
        email,
        username,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        NOW(),
        NOW()
    );
    
    -- Also create account settings
    INSERT INTO public.user_account_settings (
        user_id,
        account_type,
        created_at
    ) VALUES (
        NEW.id,
        'user',
        NOW()
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers for tables with updated_at
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trend_submissions_updated_at BEFORE UPDATE ON public.trend_submissions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trend_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trend_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.earnings_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_account_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.captured_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scroll_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_queue ENABLE ROW LEVEL SECURITY;

-- User Profiles policies
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Public profiles are viewable" ON public.user_profiles
    FOR SELECT USING (true);

-- Trend Submissions policies
CREATE POLICY "Users can create trend submissions" ON public.trend_submissions
    FOR INSERT WITH CHECK (auth.uid() = spotter_id);

CREATE POLICY "Users can view all trend submissions" ON public.trend_submissions
    FOR SELECT USING (true);

CREATE POLICY "Users can update own trend submissions" ON public.trend_submissions
    FOR UPDATE USING (auth.uid() = spotter_id);

-- Trend Validations policies
CREATE POLICY "Users can create validations" ON public.trend_validations
    FOR INSERT WITH CHECK (auth.uid() = validator_id);

CREATE POLICY "Users can view all validations" ON public.trend_validations
    FOR SELECT USING (true);

-- Earnings Ledger policies
CREATE POLICY "Users can view own earnings" ON public.earnings_ledger
    FOR SELECT USING (auth.uid() = user_id);

-- Cashout Requests policies
CREATE POLICY "Users can create own cashout requests" ON public.cashout_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own cashout requests" ON public.cashout_requests
    FOR SELECT USING (auth.uid() = user_id);

-- User Account Settings policies
CREATE POLICY "Users can view own settings" ON public.user_account_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON public.user_account_settings
    FOR UPDATE USING (auth.uid() = user_id);

-- Captured Trends policies
CREATE POLICY "Users can create own captured trends" ON public.captured_trends
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own captured trends" ON public.captured_trends
    FOR SELECT USING (auth.uid() = user_id);

-- Scroll Sessions policies
CREATE POLICY "Users can create own scroll sessions" ON public.scroll_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own scroll sessions" ON public.scroll_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own scroll sessions" ON public.scroll_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- Submission Queue policies (allow all for failsafe)
CREATE POLICY "Anyone can add to submission queue" ON public.submission_queue
    FOR INSERT WITH CHECK (true);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_trend_submissions_spotter ON public.trend_submissions(spotter_id);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_status ON public.trend_submissions(status);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_created ON public.trend_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_validation ON public.trend_submissions(validation_status, status);
CREATE INDEX IF NOT EXISTS idx_trend_validations_trend ON public.trend_validations(trend_id);
CREATE INDEX IF NOT EXISTS idx_trend_validations_validator ON public.trend_validations(validator_id);
CREATE INDEX IF NOT EXISTS idx_earnings_ledger_user ON public.earnings_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_cashout_requests_user ON public.cashout_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_captured_trends_user ON public.captured_trends(user_id);
CREATE INDEX IF NOT EXISTS idx_scroll_sessions_user ON public.scroll_sessions(user_id);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to cast a vote on a trend
CREATE OR REPLACE FUNCTION cast_trend_vote(
    p_trend_id UUID,
    p_user_id UUID,
    p_vote TEXT
) RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_existing_vote RECORD;
BEGIN
    -- Check for existing vote
    SELECT * INTO v_existing_vote
    FROM trend_validations
    WHERE trend_id = p_trend_id AND validator_id = p_user_id;
    
    IF v_existing_vote IS NOT NULL THEN
        -- Update existing vote
        UPDATE trend_validations
        SET vote = p_vote,
            confirmed = true,
            created_at = NOW()
        WHERE trend_id = p_trend_id AND validator_id = p_user_id;
        
        v_result := jsonb_build_object(
            'success', true,
            'message', 'Vote updated',
            'action', 'updated'
        );
    ELSE
        -- Insert new vote
        INSERT INTO trend_validations (
            trend_id,
            validator_id,
            vote,
            confirmed,
            reward_amount,
            reward_status
        ) VALUES (
            p_trend_id,
            p_user_id,
            p_vote,
            true,
            0.02,
            'approved'
        );
        
        v_result := jsonb_build_object(
            'success', true,
            'message', 'Vote cast',
            'action', 'created'
        );
    END IF;
    
    -- Update trend submission counts
    UPDATE trend_submissions
    SET approve_count = (
            SELECT COUNT(*) FROM trend_validations 
            WHERE trend_id = p_trend_id AND vote = 'verify'
        ),
        reject_count = (
            SELECT COUNT(*) FROM trend_validations 
            WHERE trend_id = p_trend_id AND vote = 'reject'
        ),
        validation_count = (
            SELECT COUNT(*) FROM trend_validations 
            WHERE trend_id = p_trend_id
        )
    WHERE id = p_trend_id;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user dashboard stats
CREATE OR REPLACE FUNCTION get_user_dashboard_stats(p_user_id UUID)
RETURNS TABLE (
    total_earnings DECIMAL,
    pending_earnings DECIMAL,
    trends_spotted INTEGER,
    accuracy_score DECIMAL,
    validation_score DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(up.total_earnings, 0.00) as total_earnings,
        COALESCE(up.earnings_pending, 0.00) as pending_earnings,
        COALESCE(up.trends_spotted, 0) as trends_spotted,
        COALESCE(up.accuracy_score, 0.00) as accuracy_score,
        COALESCE(up.validation_score, 0.00) as validation_score
    FROM user_profiles up
    WHERE up.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;