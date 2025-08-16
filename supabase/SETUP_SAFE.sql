-- SAFE SETUP SCRIPT - Handles existing objects gracefully
-- Run this in Supabase SQL Editor

-- ============================================
-- ENABLE EXTENSIONS (safe to run multiple times)
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- CREATE TYPES (only if they don't exist)
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('participant', 'validator', 'manager', 'admin');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trend_category') THEN
        CREATE TYPE trend_category AS ENUM ('visual_style', 'audio_music', 'creator_technique', 'meme_format', 'product_brand', 'behavior_pattern');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trend_status') THEN
        CREATE TYPE trend_status AS ENUM ('submitted', 'validating', 'approved', 'rejected', 'viral');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'spotter_tier') THEN
        CREATE TYPE spotter_tier AS ENUM ('elite', 'verified', 'learning', 'restricted');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'earning_status') THEN
        CREATE TYPE earning_status AS ENUM ('pending', 'approved', 'paid', 'cancelled');
    END IF;
END $$;

-- ============================================
-- ADD MISSING COLUMNS TO EXISTING TABLES
-- ============================================

-- Check and add columns to user_profiles if it exists
DO $$ 
BEGIN
    -- First ensure the table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
        -- Add missing columns one by one
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'birthday') THEN
            ALTER TABLE user_profiles ADD COLUMN birthday DATE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'age_verified') THEN
            ALTER TABLE user_profiles ADD COLUMN age_verified BOOLEAN DEFAULT FALSE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'avatar_url') THEN
            ALTER TABLE user_profiles ADD COLUMN avatar_url TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'bio') THEN
            ALTER TABLE user_profiles ADD COLUMN bio TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'subscription_tier') THEN
            ALTER TABLE user_profiles ADD COLUMN subscription_tier TEXT DEFAULT 'starter';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'is_admin') THEN
            ALTER TABLE user_profiles ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
        END IF;
        
        -- Add all earnings columns
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'earnings_pending') THEN
            ALTER TABLE user_profiles ADD COLUMN earnings_pending DECIMAL(10,2) DEFAULT 0.00;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'earnings_approved') THEN
            ALTER TABLE user_profiles ADD COLUMN earnings_approved DECIMAL(10,2) DEFAULT 0.00;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'earnings_paid') THEN
            ALTER TABLE user_profiles ADD COLUMN earnings_paid DECIMAL(10,2) DEFAULT 0.00;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'pending_earnings') THEN
            ALTER TABLE user_profiles ADD COLUMN pending_earnings DECIMAL(10,2) DEFAULT 0.00;
        END IF;
    END IF;
END $$;

-- ============================================
-- CREATE PROFILES VIEW (for frontend compatibility)
-- ============================================
DROP VIEW IF EXISTS public.profiles CASCADE;
CREATE OR REPLACE VIEW public.profiles AS 
SELECT 
    id,
    username,
    email,
    role,
    spotter_tier,
    birthday,
    age_verified,
    avatar_url,
    bio,
    COALESCE(earnings_pending, pending_earnings, 0.00) as pending_earnings,
    COALESCE(earnings_approved, 0.00) as earnings_approved,
    COALESCE(earnings_paid, 0.00) as earnings_paid,
    COALESCE(total_earnings, 0.00) as total_earnings,
    trends_spotted,
    accuracy_score,
    validation_score,
    subscription_tier,
    is_admin,
    demographics,
    interests,
    created_at,
    updated_at,
    is_active
FROM public.user_profiles;

-- Grant permissions on the view
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT UPDATE ON public.profiles TO authenticated;

-- ============================================
-- ADD MISSING COLUMNS TO TREND_SUBMISSIONS
-- ============================================
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trend_submissions') THEN
        -- Add alternative naming columns
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trend_submissions' AND column_name = 'trend_name') THEN
            ALTER TABLE trend_submissions ADD COLUMN trend_name TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trend_submissions' AND column_name = 'image_url') THEN
            ALTER TABLE trend_submissions ADD COLUMN image_url TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trend_submissions' AND column_name = 'metadata') THEN
            ALTER TABLE trend_submissions ADD COLUMN metadata JSONB DEFAULT '{}';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trend_submissions' AND column_name = 'confidence_score') THEN
            ALTER TABLE trend_submissions ADD COLUMN confidence_score DECIMAL(5,2) DEFAULT 0.50;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trend_submissions' AND column_name = 'platform') THEN
            ALTER TABLE trend_submissions ADD COLUMN platform TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trend_submissions' AND column_name = 'post_url') THEN
            ALTER TABLE trend_submissions ADD COLUMN post_url TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trend_submissions' AND column_name = 'thumbnail_url') THEN
            ALTER TABLE trend_submissions ADD COLUMN thumbnail_url TEXT;
        END IF;
        
        -- Social media columns
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trend_submissions' AND column_name = 'views_count') THEN
            ALTER TABLE trend_submissions ADD COLUMN views_count BIGINT DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trend_submissions' AND column_name = 'likes_count') THEN
            ALTER TABLE trend_submissions ADD COLUMN likes_count BIGINT DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trend_submissions' AND column_name = 'comments_count') THEN
            ALTER TABLE trend_submissions ADD COLUMN comments_count BIGINT DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trend_submissions' AND column_name = 'shares_count') THEN
            ALTER TABLE trend_submissions ADD COLUMN shares_count BIGINT DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trend_submissions' AND column_name = 'follower_count') THEN
            ALTER TABLE trend_submissions ADD COLUMN follower_count BIGINT DEFAULT 0;
        END IF;
        
        -- Creator info
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trend_submissions' AND column_name = 'creator_handle') THEN
            ALTER TABLE trend_submissions ADD COLUMN creator_handle TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trend_submissions' AND column_name = 'creator_name') THEN
            ALTER TABLE trend_submissions ADD COLUMN creator_name TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trend_submissions' AND column_name = 'post_caption') THEN
            ALTER TABLE trend_submissions ADD COLUMN post_caption TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trend_submissions' AND column_name = 'hashtags') THEN
            ALTER TABLE trend_submissions ADD COLUMN hashtags TEXT[] DEFAULT '{}';
        END IF;
        
        -- Add user_id as computed column if not exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trend_submissions' AND column_name = 'user_id') THEN
            ALTER TABLE trend_submissions ADD COLUMN user_id UUID GENERATED ALWAYS AS (spotter_id) STORED;
        END IF;
    END IF;
END $$;

-- ============================================
-- CREATE MISSING TABLES
-- ============================================

-- User Account Settings
CREATE TABLE IF NOT EXISTS public.user_account_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE UNIQUE,
    account_type TEXT DEFAULT 'user',
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Captured Trends (for mobile)
CREATE TABLE IF NOT EXISTS public.captured_trends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    content_url TEXT,
    thumbnail_url TEXT,
    title TEXT,
    description TEXT,
    creator_username TEXT,
    creator_display_name TEXT,
    views_count BIGINT DEFAULT 0,
    likes_count BIGINT DEFAULT 0,
    comments_count BIGINT DEFAULT 0,
    shares_count BIGINT DEFAULT 0,
    processed BOOLEAN DEFAULT FALSE,
    submitted_as_trend BOOLEAN DEFAULT FALSE,
    trend_submission_id UUID REFERENCES public.trend_submissions(id),
    captured_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scroll Sessions
CREATE TABLE IF NOT EXISTS public.scroll_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    session_id TEXT UNIQUE NOT NULL,
    platform TEXT NOT NULL,
    start_time TIMESTAMPTZ DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    duration_seconds INTEGER DEFAULT 0,
    videos_viewed INTEGER DEFAULT 0,
    trends_captured INTEGER DEFAULT 0,
    base_earnings DECIMAL(10,2) DEFAULT 0.00,
    bonus_earnings DECIMAL(10,2) DEFAULT 0.00,
    total_earnings DECIMAL(10,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Submission Queue (failsafe)
CREATE TABLE IF NOT EXISTS public.submission_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_data JSONB NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CREATE OR REPLACE TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if profile already exists
    IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = NEW.id) THEN
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
    END IF;
    
    -- Also create account settings if not exists
    IF NOT EXISTS (SELECT 1 FROM public.user_account_settings WHERE user_id = NEW.id) THEN
        INSERT INTO public.user_account_settings (
            user_id,
            account_type,
            created_at
        ) VALUES (
            NEW.id,
            'user',
            NOW()
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- CREATE OR REPLACE FUNCTIONS
-- ============================================

-- Cast vote function
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

-- Dashboard stats function
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
        COALESCE(up.earnings_pending, up.pending_earnings, 0.00) as pending_earnings,
        COALESCE(up.trends_spotted, 0) as trends_spotted,
        COALESCE(up.accuracy_score, 0.00) as accuracy_score,
        COALESCE(up.validation_score, 0.00) as validation_score
    FROM user_profiles up
    WHERE up.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ENABLE RLS (safe to run multiple times)
-- ============================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trend_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trend_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.earnings_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_account_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.captured_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scroll_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_queue ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RECREATE RLS POLICIES (drop first to avoid conflicts)
-- ============================================

-- User Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Public profiles are viewable" ON public.user_profiles;

CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Public profiles are viewable" ON public.user_profiles
    FOR SELECT USING (true);

-- Trend Submissions policies
DROP POLICY IF EXISTS "Users can create trend submissions" ON public.trend_submissions;
DROP POLICY IF EXISTS "Users can view all trend submissions" ON public.trend_submissions;
DROP POLICY IF EXISTS "Users can update own trend submissions" ON public.trend_submissions;

CREATE POLICY "Users can create trend submissions" ON public.trend_submissions
    FOR INSERT WITH CHECK (auth.uid() = spotter_id);
CREATE POLICY "Users can view all trend submissions" ON public.trend_submissions
    FOR SELECT USING (true);
CREATE POLICY "Users can update own trend submissions" ON public.trend_submissions
    FOR UPDATE USING (auth.uid() = spotter_id);

-- Trend Validations policies
DROP POLICY IF EXISTS "Users can create validations" ON public.trend_validations;
DROP POLICY IF EXISTS "Users can view all validations" ON public.trend_validations;

CREATE POLICY "Users can create validations" ON public.trend_validations
    FOR INSERT WITH CHECK (auth.uid() = validator_id);
CREATE POLICY "Users can view all validations" ON public.trend_validations
    FOR SELECT USING (true);

-- User Account Settings policies
DROP POLICY IF EXISTS "Users can view own settings" ON public.user_account_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON public.user_account_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON public.user_account_settings;

CREATE POLICY "Users can view own settings" ON public.user_account_settings
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON public.user_account_settings
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON public.user_account_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Other policies
DROP POLICY IF EXISTS "Users can view own earnings" ON public.earnings_ledger;
CREATE POLICY "Users can view own earnings" ON public.earnings_ledger
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own cashout requests" ON public.cashout_requests;
DROP POLICY IF EXISTS "Users can view own cashout requests" ON public.cashout_requests;
CREATE POLICY "Users can create own cashout requests" ON public.cashout_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own cashout requests" ON public.cashout_requests
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own captured trends" ON public.captured_trends;
DROP POLICY IF EXISTS "Users can view own captured trends" ON public.captured_trends;
CREATE POLICY "Users can create own captured trends" ON public.captured_trends
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own captured trends" ON public.captured_trends
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own scroll sessions" ON public.scroll_sessions;
DROP POLICY IF EXISTS "Users can view own scroll sessions" ON public.scroll_sessions;
DROP POLICY IF EXISTS "Users can update own scroll sessions" ON public.scroll_sessions;
CREATE POLICY "Users can create own scroll sessions" ON public.scroll_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own scroll sessions" ON public.scroll_sessions
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own scroll sessions" ON public.scroll_sessions
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can add to submission queue" ON public.submission_queue;
CREATE POLICY "Anyone can add to submission queue" ON public.submission_queue
    FOR INSERT WITH CHECK (true);

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$ 
BEGIN
    RAISE NOTICE 'Database setup completed successfully!';
END $$;