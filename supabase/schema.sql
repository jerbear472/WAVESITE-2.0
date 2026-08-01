-- WAVESIGHT SIMPLIFIED SCHEMA
-- Run this in your Supabase SQL Editor to set up the database

-- ============================================
-- ENABLE EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- DROP EXISTING TABLES/VIEWS (clean slate)
-- ============================================
DROP TABLE IF EXISTS public.upvotes CASCADE;
DROP TABLE IF EXISTS public.trends CASCADE;

-- profiles might be a view or table, drop both
DROP VIEW IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop old tables if they exist
DROP TABLE IF EXISTS public.user_profiles CASCADE;
DROP TABLE IF EXISTS public.trend_submissions CASCADE;
DROP TABLE IF EXISTS public.trend_validations CASCADE;
DROP TABLE IF EXISTS public.earnings_ledger CASCADE;
DROP TABLE IF EXISTS public.cashout_requests CASCADE;
DROP TABLE IF EXISTS public.user_account_settings CASCADE;
DROP TABLE IF EXISTS public.captured_trends CASCADE;
DROP TABLE IF EXISTS public.scroll_sessions CASCADE;
DROP TABLE IF EXISTS public.submission_queue CASCADE;

-- Drop old types
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS trend_category CASCADE;
DROP TYPE IF EXISTS trend_status CASCADE;
DROP TYPE IF EXISTS spotter_tier CASCADE;
DROP TYPE IF EXISTS earning_status CASCADE;

-- ============================================
-- CREATE ENUMS
-- ============================================
CREATE TYPE platform_type AS ENUM ('tiktok', 'instagram', 'twitter', 'youtube', 'other');
CREATE TYPE category_type AS ENUM ('music', 'fashion', 'meme', 'food', 'tech', 'other');

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    avatar_url TEXT,
    xp_total INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TRENDS TABLE
-- ============================================
CREATE TABLE public.trends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    link TEXT NOT NULL,
    platform platform_type NOT NULL DEFAULT 'other',
    description TEXT NOT NULL CHECK (char_length(description) <= 140),
    category category_type NOT NULL DEFAULT 'other',
    thumbnail_url TEXT,
    upvote_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- UPVOTES TABLE
-- ============================================
CREATE TABLE public.upvotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    trend_id UUID NOT NULL REFERENCES public.trends(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, trend_id)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_trends_user_id ON public.trends(user_id);
CREATE INDEX idx_trends_created_at ON public.trends(created_at DESC);
CREATE INDEX idx_trends_category ON public.trends(category);
CREATE INDEX idx_upvotes_trend_id ON public.upvotes(trend_id);
CREATE INDEX idx_upvotes_user_id ON public.upvotes(user_id);
CREATE INDEX idx_profiles_xp ON public.profiles(xp_total DESC);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, username, created_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at on profiles
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Function to handle upvote (awards XP to trend owner)
CREATE OR REPLACE FUNCTION public.handle_upvote()
RETURNS TRIGGER AS $$
DECLARE
    trend_owner_id UUID;
BEGIN
    -- Get the trend owner
    SELECT user_id INTO trend_owner_id FROM public.trends WHERE id = NEW.trend_id;

    -- Increment upvote count on trend
    UPDATE public.trends
    SET upvote_count = upvote_count + 1
    WHERE id = NEW.trend_id;

    -- Award 5 XP to trend owner (not self-upvotes)
    IF trend_owner_id != NEW.user_id THEN
        UPDATE public.profiles
        SET xp_total = xp_total + 5
        WHERE id = trend_owner_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for upvotes
CREATE TRIGGER on_upvote_created
    AFTER INSERT ON public.upvotes
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_upvote();

-- Function to handle upvote removal
CREATE OR REPLACE FUNCTION public.handle_upvote_removal()
RETURNS TRIGGER AS $$
DECLARE
    trend_owner_id UUID;
BEGIN
    -- Get the trend owner
    SELECT user_id INTO trend_owner_id FROM public.trends WHERE id = OLD.trend_id;

    -- Decrement upvote count on trend
    UPDATE public.trends
    SET upvote_count = GREATEST(0, upvote_count - 1)
    WHERE id = OLD.trend_id;

    -- Remove 5 XP from trend owner (not self-upvotes)
    IF trend_owner_id != OLD.user_id THEN
        UPDATE public.profiles
        SET xp_total = GREATEST(0, xp_total - 5)
        WHERE id = trend_owner_id;
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for upvote removal
CREATE TRIGGER on_upvote_removed
    AFTER DELETE ON public.upvotes
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_upvote_removal();

-- Function to submit trend (awards 10 XP to submitter)
CREATE OR REPLACE FUNCTION public.submit_trend(
    p_user_id UUID,
    p_link TEXT,
    p_platform platform_type,
    p_description TEXT,
    p_category category_type,
    p_thumbnail_url TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_trend_id UUID;
BEGIN
    -- Insert the trend
    INSERT INTO public.trends (user_id, link, platform, description, category, thumbnail_url)
    VALUES (p_user_id, p_link, p_platform, p_description, p_category, p_thumbnail_url)
    RETURNING id INTO new_trend_id;

    -- Award 10 XP to submitter
    UPDATE public.profiles
    SET xp_total = xp_total + 10
    WHERE id = p_user_id;

    RETURN new_trend_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get leaderboard
CREATE OR REPLACE FUNCTION public.get_leaderboard(
    p_period TEXT DEFAULT 'all', -- 'weekly' or 'all'
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    rank BIGINT,
    user_id UUID,
    username TEXT,
    avatar_url TEXT,
    xp_total INTEGER
) AS $$
BEGIN
    IF p_period = 'weekly' THEN
        -- Weekly leaderboard based on XP earned this week
        -- For simplicity, we'll use total XP but in production you'd track weekly XP separately
        RETURN QUERY
        SELECT
            ROW_NUMBER() OVER (ORDER BY p.xp_total DESC) as rank,
            p.id as user_id,
            p.username,
            p.avatar_url,
            p.xp_total
        FROM public.profiles p
        ORDER BY p.xp_total DESC, p.created_at ASC
        LIMIT p_limit;
    ELSE
        -- All-time leaderboard (includes all users)
        RETURN QUERY
        SELECT
            ROW_NUMBER() OVER (ORDER BY p.xp_total DESC, p.created_at ASC) as rank,
            p.id as user_id,
            p.username,
            p.avatar_url,
            p.xp_total
        FROM public.profiles p
        ORDER BY p.xp_total DESC, p.created_at ASC
        LIMIT p_limit;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upvotes ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone"
    ON public.profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- Trends policies
CREATE POLICY "Trends are viewable by everyone"
    ON public.trends FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can create trends"
    ON public.trends FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trends"
    ON public.trends FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trends"
    ON public.trends FOR DELETE
    USING (auth.uid() = user_id);

-- Upvotes policies
CREATE POLICY "Upvotes are viewable by everyone"
    ON public.upvotes FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can create upvotes"
    ON public.upvotes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own upvotes"
    ON public.upvotes FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- GRANTS
-- ============================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
