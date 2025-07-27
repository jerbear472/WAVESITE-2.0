-- Migration: Convert from time-based to performance-based payment system
-- This removes scroll session earnings and implements trend-spotting rewards

-- Drop scroll sessions table as we no longer track time-based earnings
DROP TABLE IF EXISTS public.scroll_sessions CASCADE;

-- Update user_profiles to track performance metrics
ALTER TABLE public.user_profiles 
DROP COLUMN IF EXISTS total_earnings,
DROP COLUMN IF EXISTS pending_earnings,
ADD COLUMN IF NOT EXISTS trend_earnings DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS pending_payouts DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS viral_trends_spotted INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS validated_trends INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS quality_submissions INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS first_spotter_bonus_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS trend_accuracy_rate DECIMAL(3,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS last_quality_submission TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS streak_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS streak_multiplier DECIMAL(3,2) DEFAULT 1.00;

-- Create new payment tiers table
CREATE TABLE IF NOT EXISTS public.payment_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tier_name TEXT NOT NULL,
    tier_type TEXT NOT NULL CHECK (tier_type IN ('viral', 'validated', 'quality', 'first_spotter')),
    payout_amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    requirements JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default payment tiers
INSERT INTO public.payment_tiers (tier_name, tier_type, payout_amount, description, requirements) VALUES
('Viral Trend - 7 Day', 'viral', 5.00, 'Trend goes viral within 7 days', '{"viral_within_days": 7, "min_engagement": 100000}'),
('Viral Trend - 3 Day', 'viral', 3.00, 'Trend goes viral within 3-7 days', '{"viral_within_days": 3, "min_engagement": 100000}'),
('Viral Trend - Late', 'viral', 1.00, 'Trend goes viral after 7 days', '{"viral_after_days": 7, "min_engagement": 100000}'),
('Validated Trend', 'validated', 0.50, 'Trend validated but not viral', '{"min_validations": 10, "validation_score": 0.7}'),
('Quality Submission', 'quality', 0.25, 'High-quality trend submission', '{"has_all_metadata": true, "proper_categorization": true}'),
('First Spotter Bonus', 'first_spotter', 2.00, '2x multiplier for being first', '{"is_first": true, "multiplier": 2.0}');

-- Drop dependent views first
DROP VIEW IF EXISTS public.trend_insights CASCADE;

-- Update trend_submissions table for new payment model
ALTER TABLE public.trend_submissions
ADD COLUMN IF NOT EXISTS payment_tier_id UUID REFERENCES public.payment_tiers(id),
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'qualified', 'paid', 'rejected')),
ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_first_spotter BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS viral_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS quality_score_v2 DECIMAL(3,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS metadata_completeness DECIMAL(3,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS validation_velocity DECIMAL(10,2) DEFAULT 0.00,
DROP COLUMN IF EXISTS bounty_amount,
DROP COLUMN IF EXISTS bounty_paid;

-- Recreate trend_insights view with new payment structure
CREATE OR REPLACE VIEW public.trend_insights AS
SELECT 
    ts.id,
    ts.spotter_id,
    ts.category,
    ts.description,
    ts.virality_prediction,
    ts.status,
    ts.quality_score,
    ts.quality_score_v2,
    ts.validation_count,
    ts.payment_amount as earning_amount,
    ts.payment_status,
    ts.created_at,
    ts.validated_at,
    ts.mainstream_at,
    up.username as spotter_username,
    up.trend_accuracy_rate,
    COUNT(tv.id) as total_validations,
    SUM(CASE WHEN tv.confirmed THEN 1 ELSE 0 END) as positive_validations
FROM public.trend_submissions ts
LEFT JOIN public.user_profiles up ON ts.spotter_id = up.id
LEFT JOIN public.trend_validations tv ON ts.id = tv.trend_id
GROUP BY 
    ts.id, ts.spotter_id, ts.category, ts.description, 
    ts.virality_prediction, ts.status, ts.quality_score,
    ts.quality_score_v2, ts.validation_count, ts.payment_amount,
    ts.payment_status, ts.created_at, ts.validated_at, 
    ts.mainstream_at, up.username, up.trend_accuracy_rate;

-- Create earnings ledger for detailed payment tracking
CREATE TABLE IF NOT EXISTS public.earnings_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    trend_id UUID REFERENCES public.trend_submissions(id) ON DELETE SET NULL,
    payment_tier_id UUID REFERENCES public.payment_tiers(id),
    amount DECIMAL(10,2) NOT NULL,
    multiplier DECIMAL(3,2) DEFAULT 1.00,
    final_amount DECIMAL(10,2) NOT NULL,
    payment_type TEXT NOT NULL CHECK (payment_type IN ('trend_reward', 'streak_bonus', 'challenge_reward', 'achievement_bonus')),
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'paid', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ
);

-- Create quality metrics table
CREATE TABLE IF NOT EXISTS public.trend_quality_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trend_id UUID REFERENCES public.trend_submissions(id) ON DELETE CASCADE,
    has_title BOOLEAN DEFAULT FALSE,
    has_description BOOLEAN DEFAULT FALSE,
    has_category BOOLEAN DEFAULT FALSE,
    has_platform BOOLEAN DEFAULT FALSE,
    has_creator_info BOOLEAN DEFAULT FALSE,
    has_hashtags BOOLEAN DEFAULT FALSE,
    has_engagement_metrics BOOLEAN DEFAULT FALSE,
    has_media_preview BOOLEAN DEFAULT FALSE,
    description_length INTEGER DEFAULT 0,
    hashtag_count INTEGER DEFAULT 0,
    media_quality_score DECIMAL(3,2) DEFAULT 0.00,
    overall_quality_score DECIMAL(3,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create achievement system for quality-based gamification
CREATE TABLE IF NOT EXISTS public.achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    icon_emoji TEXT,
    requirement_type TEXT NOT NULL CHECK (requirement_type IN ('viral_count', 'accuracy_rate', 'streak_days', 'category_specialist', 'first_spotter_count')),
    requirement_value INTEGER NOT NULL,
    reward_amount DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default achievements
INSERT INTO public.achievements (name, description, icon_emoji, requirement_type, requirement_value, reward_amount) VALUES
('Trend Scout', 'Spot 10 viral trends', '🔍', 'viral_count', 10, 10.00),
('Viral Hunter', 'Spot 50 viral trends', '🎯', 'viral_count', 50, 50.00),
('Trend Master', 'Spot 100 viral trends', '👑', 'viral_count', 100, 100.00),
('Sharp Eye', 'Maintain 80% accuracy rate', '👁️', 'accuracy_rate', 80, 20.00),
('Early Bird', 'Be first to spot 5 trends', '🐦', 'first_spotter_count', 5, 25.00),
('Consistency King', '30 day quality submission streak', '🔥', 'streak_days', 30, 30.00),
('Fashion Guru', 'Spot 20 viral fashion trends', '👗', 'category_specialist', 20, 15.00),
('Music Maven', 'Spot 20 viral music trends', '🎵', 'category_specialist', 20, 15.00);

-- Create user achievements tracking
CREATE TABLE IF NOT EXISTS public.user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    achievement_id UUID REFERENCES public.achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    reward_paid BOOLEAN DEFAULT FALSE,
    UNIQUE(user_id, achievement_id)
);

-- Create weekly challenges for engagement
CREATE TABLE IF NOT EXISTS public.weekly_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    challenge_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    requirement JSONB NOT NULL,
    reward_amount DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user challenge progress
CREATE TABLE IF NOT EXISTS public.user_challenge_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    challenge_id UUID REFERENCES public.weekly_challenges(id) ON DELETE CASCADE,
    progress INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    reward_paid BOOLEAN DEFAULT FALSE,
    UNIQUE(user_id, challenge_id)
);

-- Drop old challenge_completions table
DROP TABLE IF EXISTS public.challenge_completions CASCADE;

-- Create indexes for performance
CREATE INDEX idx_trend_submissions_payment_status ON public.trend_submissions(payment_status);
CREATE INDEX idx_trend_submissions_viral_date ON public.trend_submissions(viral_date);
CREATE INDEX idx_trend_submissions_quality_score ON public.trend_submissions(quality_score_v2);
CREATE INDEX idx_earnings_ledger_user_id ON public.earnings_ledger(user_id);
CREATE INDEX idx_earnings_ledger_status ON public.earnings_ledger(status);
CREATE INDEX idx_user_achievements_user_id ON public.user_achievements(user_id);

-- Enable RLS for new tables
ALTER TABLE public.payment_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.earnings_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trend_quality_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_challenge_progress ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Payment tiers are public" ON public.payment_tiers
    FOR SELECT USING (true);

CREATE POLICY "Users can view their own earnings" ON public.earnings_ledger
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view trend quality metrics" ON public.trend_quality_metrics
    FOR SELECT USING (true);

CREATE POLICY "Achievements are public" ON public.achievements
    FOR SELECT USING (true);

CREATE POLICY "Users can view their own achievements" ON public.user_achievements
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Active challenges are public" ON public.weekly_challenges
    FOR SELECT USING (is_active = true);

CREATE POLICY "Users can view their own challenge progress" ON public.user_challenge_progress
    FOR SELECT USING (auth.uid() = user_id);

-- Create function to calculate trend quality score
CREATE OR REPLACE FUNCTION calculate_trend_quality_score(trend_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    quality_score DECIMAL(3,2);
    metrics RECORD;
BEGIN
    SELECT * INTO metrics
    FROM public.trend_quality_metrics
    WHERE trend_quality_metrics.trend_id = calculate_trend_quality_score.trend_id;
    
    IF NOT FOUND THEN
        RETURN 0.00;
    END IF;
    
    quality_score := 0.00;
    
    -- Calculate score based on completeness
    IF metrics.has_title THEN quality_score := quality_score + 0.10; END IF;
    IF metrics.has_description AND metrics.description_length >= 50 THEN quality_score := quality_score + 0.20; END IF;
    IF metrics.has_category THEN quality_score := quality_score + 0.10; END IF;
    IF metrics.has_platform THEN quality_score := quality_score + 0.10; END IF;
    IF metrics.has_creator_info THEN quality_score := quality_score + 0.10; END IF;
    IF metrics.has_hashtags AND metrics.hashtag_count >= 3 THEN quality_score := quality_score + 0.15; END IF;
    IF metrics.has_engagement_metrics THEN quality_score := quality_score + 0.15; END IF;
    IF metrics.has_media_preview THEN quality_score := quality_score + 0.10; END IF;
    
    RETURN LEAST(quality_score, 1.00);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update user streak
CREATE OR REPLACE FUNCTION update_user_streak()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if this is a quality submission
    IF NEW.quality_score_v2 >= 0.70 THEN
        UPDATE public.user_profiles
        SET 
            last_quality_submission = NOW(),
            quality_submissions = quality_submissions + 1,
            -- Update streak if submission is within 24 hours of last
            streak_days = CASE 
                WHEN last_quality_submission IS NULL THEN 1
                WHEN last_quality_submission::date = (NOW() - INTERVAL '1 day')::date THEN streak_days + 1
                WHEN last_quality_submission::date < (NOW() - INTERVAL '1 day')::date THEN 1
                ELSE streak_days
            END,
            -- Calculate streak multiplier (max 2x at 30 days)
            streak_multiplier = LEAST(1.00 + (streak_days * 0.033), 2.00)
        WHERE id = NEW.spotter_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_streak_on_submission
AFTER INSERT OR UPDATE ON public.trend_submissions
FOR EACH ROW
EXECUTE FUNCTION update_user_streak();