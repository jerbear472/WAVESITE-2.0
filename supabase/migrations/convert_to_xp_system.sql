-- Migration: Convert from monetized to XP-based system
-- This migration removes all payment/earnings references and adds XP tracking

-- 1. Add XP columns to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS total_xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS prediction_accuracy_xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS trends_spotted_xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS evolution_tracking_xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS predictions_verified INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS perfect_predictions INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS xp_to_next_level INTEGER DEFAULT 100,
DROP COLUMN IF EXISTS current_balance CASCADE,
DROP COLUMN IF EXISTS total_earned CASCADE,
DROP COLUMN IF EXISTS payment_threshold CASCADE,
DROP COLUMN IF EXISTS payment_method CASCADE,
DROP COLUMN IF EXISTS stripe_customer_id CASCADE,
DROP COLUMN IF EXISTS stripe_account_id CASCADE;

-- 2. Create XP transactions table
CREATE TABLE IF NOT EXISTS public.xp_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN (
        'trend_submission',
        'peak_prediction',
        'evolution_tracking',
        'perfect_prediction',
        'daily_bonus',
        'streak_bonus',
        'level_up_bonus'
    )),
    description TEXT,
    trend_id UUID REFERENCES public.trend_submissions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create peak predictions verification table
CREATE TABLE IF NOT EXISTS public.peak_predictions_verified (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trend_id UUID REFERENCES public.trend_submissions(id) ON DELETE CASCADE,
    predicted_peak_date DATE NOT NULL,
    actual_peak_date DATE,
    accuracy_days INTEGER,
    xp_earned INTEGER DEFAULT 0,
    google_trends_data JSONB,
    verified_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(trend_id)
);

-- 4. Create XP levels configuration
CREATE TABLE IF NOT EXISTS public.xp_levels (
    level INTEGER PRIMARY KEY,
    xp_required INTEGER NOT NULL,
    title TEXT NOT NULL,
    badge_url TEXT,
    perks JSONB
);

-- Insert default levels
INSERT INTO public.xp_levels (level, xp_required, title, perks) VALUES
(1, 0, 'Trend Novice', '{"max_submissions_per_day": 5}'),
(2, 100, 'Trend Scout', '{"max_submissions_per_day": 7}'),
(3, 500, 'Trend Hunter', '{"max_submissions_per_day": 10}'),
(4, 1000, 'Trend Analyst', '{"max_submissions_per_day": 15}'),
(5, 2500, 'Trend Expert', '{"max_submissions_per_day": 20}'),
(6, 5000, 'Trend Master', '{"max_submissions_per_day": 25}'),
(7, 10000, 'Trend Guru', '{"max_submissions_per_day": 30}'),
(8, 20000, 'Trend Oracle', '{"max_submissions_per_day": 50}'),
(9, 50000, 'Trend Sage', '{"max_submissions_per_day": 100}'),
(10, 100000, 'Trend Legend', '{"max_submissions_per_day": -1}')
ON CONFLICT (level) DO NOTHING;

-- 5. Create leaderboard view
CREATE OR REPLACE VIEW public.xp_leaderboard AS
SELECT 
    u.id,
    u.username,
    u.avatar_url,
    u.total_xp,
    u.current_level,
    u.predictions_verified,
    u.perfect_predictions,
    u.trends_submitted,
    l.title as level_title,
    RANK() OVER (ORDER BY u.total_xp DESC) as global_rank,
    RANK() OVER (PARTITION BY DATE_TRUNC('week', NOW()) ORDER BY u.total_xp DESC) as weekly_rank,
    RANK() OVER (PARTITION BY DATE_TRUNC('month', NOW()) ORDER BY u.total_xp DESC) as monthly_rank
FROM 
    public.user_profiles u
    LEFT JOIN public.xp_levels l ON u.current_level = l.level
WHERE 
    u.total_xp > 0
ORDER BY 
    u.total_xp DESC;

-- 6. Update trend_submissions table
ALTER TABLE public.trend_submissions
ADD COLUMN IF NOT EXISTS peak_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS xp_awarded INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS trend_keywords TEXT[], -- For Google Trends tracking
DROP COLUMN IF EXISTS bounty_amount CASCADE,
DROP COLUMN IF EXISTS bounty_paid CASCADE,
DROP COLUMN IF EXISTS payment_amount CASCADE,
DROP COLUMN IF EXISTS base_amount CASCADE,
DROP COLUMN IF EXISTS bonus_amount CASCADE,
DROP COLUMN IF EXISTS total_earned CASCADE;

-- 7. Drop monetization-related tables
DROP TABLE IF EXISTS public.earnings CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.withdrawal_requests CASCADE;
DROP TABLE IF EXISTS public.validation_earnings CASCADE;

-- 8. Create function to calculate user level
CREATE OR REPLACE FUNCTION calculate_user_level(p_total_xp INTEGER)
RETURNS INTEGER AS $$
DECLARE
    v_level INTEGER;
BEGIN
    SELECT level INTO v_level
    FROM public.xp_levels
    WHERE xp_required <= p_total_xp
    ORDER BY level DESC
    LIMIT 1;
    
    RETURN COALESCE(v_level, 1);
END;
$$ LANGUAGE plpgsql;

-- 9. Create function to award XP
CREATE OR REPLACE FUNCTION award_xp(
    p_user_id UUID,
    p_amount INTEGER,
    p_type TEXT,
    p_description TEXT DEFAULT NULL,
    p_trend_id UUID DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_new_total INTEGER;
    v_new_level INTEGER;
    v_old_level INTEGER;
BEGIN
    -- Insert transaction
    INSERT INTO public.xp_transactions (user_id, amount, type, description, trend_id)
    VALUES (p_user_id, p_amount, p_type, p_description, p_trend_id);
    
    -- Update user profile
    UPDATE public.user_profiles
    SET 
        total_xp = total_xp + p_amount,
        current_level = calculate_user_level(total_xp + p_amount)
    WHERE id = p_user_id
    RETURNING total_xp, current_level INTO v_new_total, v_new_level;
    
    -- Check for level up
    SELECT current_level INTO v_old_level
    FROM public.user_profiles
    WHERE id = p_user_id;
    
    IF v_new_level > v_old_level THEN
        -- Award level up bonus
        INSERT INTO public.xp_transactions (user_id, amount, type, description)
        VALUES (p_user_id, v_new_level * 50, 'level_up_bonus', 
                'Level up bonus! Now level ' || v_new_level);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 10. Create scheduled job to verify predictions (run daily)
CREATE OR REPLACE FUNCTION verify_pending_predictions()
RETURNS VOID AS $$
DECLARE
    v_prediction RECORD;
BEGIN
    -- Get predictions that need verification
    FOR v_prediction IN 
        SELECT 
            id, 
            peak_date, 
            title,
            spotter_id,
            trend_keywords
        FROM public.trend_submissions
        WHERE 
            peak_date IS NOT NULL
            AND peak_verified = FALSE
            AND peak_date <= CURRENT_DATE
        LIMIT 50
    LOOP
        -- This would call the Google Trends API
        -- For now, we'll simulate verification
        DECLARE
            v_accuracy_days INTEGER;
            v_xp_earned INTEGER;
        BEGIN
            -- Simulate accuracy (in production, call Google Trends API)
            v_accuracy_days := FLOOR(RANDOM() * 14);
            
            -- Calculate XP based on accuracy
            IF v_accuracy_days = 0 THEN
                v_xp_earned := 1000; -- Perfect!
            ELSIF v_accuracy_days <= 3 THEN
                v_xp_earned := 500;
            ELSIF v_accuracy_days <= 7 THEN
                v_xp_earned := 250;
            ELSIF v_accuracy_days <= 14 THEN
                v_xp_earned := 100;
            ELSE
                v_xp_earned := 25;
            END IF;
            
            -- Store verification
            INSERT INTO public.peak_predictions_verified (
                trend_id,
                predicted_peak_date,
                actual_peak_date,
                accuracy_days,
                xp_earned
            ) VALUES (
                v_prediction.id,
                v_prediction.peak_date,
                v_prediction.peak_date + (v_accuracy_days || ' days')::INTERVAL,
                v_accuracy_days,
                v_xp_earned
            );
            
            -- Award XP
            PERFORM award_xp(
                v_prediction.spotter_id,
                v_xp_earned,
                'peak_prediction',
                'Peak prediction accuracy: ' || v_accuracy_days || ' days off',
                v_prediction.id
            );
            
            -- Mark as verified
            UPDATE public.trend_submissions
            SET peak_verified = TRUE, xp_awarded = xp_awarded + v_xp_earned
            WHERE id = v_prediction.id;
            
            -- Update user stats
            UPDATE public.user_profiles
            SET 
                predictions_verified = predictions_verified + 1,
                perfect_predictions = perfect_predictions + CASE WHEN v_accuracy_days = 0 THEN 1 ELSE 0 END,
                prediction_accuracy_xp = prediction_accuracy_xp + v_xp_earned
            WHERE id = v_prediction.spotter_id;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 11. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_xp_transactions_user_id ON public.xp_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_created_at ON public.xp_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_peak_predictions_trend_id ON public.peak_predictions_verified(trend_id);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_peak_verified ON public.trend_submissions(peak_verified) WHERE peak_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_profiles_total_xp ON public.user_profiles(total_xp DESC);

-- 12. Grant permissions
GRANT SELECT ON public.xp_leaderboard TO authenticated, anon;
GRANT SELECT ON public.xp_levels TO authenticated, anon;
GRANT SELECT, INSERT ON public.xp_transactions TO authenticated;
GRANT SELECT, INSERT ON public.peak_predictions_verified TO authenticated;

-- 13. RLS policies for new tables
ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peak_predictions_verified ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own XP transactions"
    ON public.xp_transactions
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view all verified predictions"
    ON public.peak_predictions_verified
    FOR SELECT
    USING (true);

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Successfully converted to XP-based system. All monetization features removed.';
END$$;