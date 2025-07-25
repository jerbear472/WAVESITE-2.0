-- Create earnings ledger table for accurate tracking of all earnings
CREATE TABLE IF NOT EXISTS public.earnings_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('trend_submission', 'trend_validation', 'scroll_session', 'challenge_completion', 'bonus', 'referral')),
    description TEXT,
    reference_id UUID, -- Links to trend_id, session_id, etc.
    reference_table TEXT, -- Name of the table the reference_id points to
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'paid', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.earnings_ledger ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own earnings" ON public.earnings_ledger
    FOR SELECT USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_earnings_ledger_user_id ON public.earnings_ledger(user_id);
CREATE INDEX idx_earnings_ledger_type ON public.earnings_ledger(type);
CREATE INDEX idx_earnings_ledger_status ON public.earnings_ledger(status);
CREATE INDEX idx_earnings_ledger_created_at ON public.earnings_ledger(created_at);

-- Function to calculate user stats
CREATE OR REPLACE FUNCTION get_user_dashboard_stats(p_user_id UUID)
RETURNS TABLE (
    total_earnings DECIMAL,
    pending_earnings DECIMAL,
    trends_spotted BIGINT,
    trends_verified BIGINT,
    scroll_sessions_count BIGINT,
    accuracy_score DECIMAL,
    current_streak INTEGER,
    earnings_today DECIMAL,
    earnings_this_week DECIMAL,
    earnings_this_month DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH earnings_summary AS (
        SELECT 
            COALESCE(SUM(CASE WHEN status IN ('confirmed', 'paid') THEN amount ELSE 0 END), 0) as total_earned,
            COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_earned,
            COALESCE(SUM(CASE WHEN status IN ('confirmed', 'paid') AND created_at >= CURRENT_DATE THEN amount ELSE 0 END), 0) as today_earned,
            COALESCE(SUM(CASE WHEN status IN ('confirmed', 'paid') AND created_at >= date_trunc('week', CURRENT_DATE) THEN amount ELSE 0 END), 0) as week_earned,
            COALESCE(SUM(CASE WHEN status IN ('confirmed', 'paid') AND created_at >= date_trunc('month', CURRENT_DATE) THEN amount ELSE 0 END), 0) as month_earned
        FROM public.earnings_ledger
        WHERE user_id = p_user_id
    ),
    trends_summary AS (
        SELECT 
            COUNT(*) as total_trends
        FROM public.trend_submissions
        WHERE spotter_id = p_user_id
    ),
    validations_summary AS (
        SELECT 
            COUNT(*) as total_validations,
            COUNT(CASE WHEN tv.confirmed = (ts.status = 'approved') THEN 1 END) as correct_validations
        FROM public.trend_validations tv
        JOIN public.trend_submissions ts ON tv.trend_id = ts.id
        WHERE tv.validator_id = p_user_id
        AND ts.status IN ('approved', 'rejected')
    ),
    sessions_summary AS (
        SELECT 
            COUNT(*) as total_sessions
        FROM public.scroll_sessions
        WHERE user_id = p_user_id
    ),
    streak_summary AS (
        SELECT 
            COALESCE(current_streak, 0) as current_streak_days
        FROM public.user_streaks
        WHERE user_id = p_user_id
    )
    SELECT 
        es.total_earned,
        es.pending_earned,
        ts.total_trends,
        vs.total_validations,
        ss.total_sessions,
        CASE 
            WHEN vs.total_validations > 0 
            THEN ROUND((vs.correct_validations::DECIMAL / vs.total_validations) * 100, 2)
            ELSE 0
        END as accuracy,
        COALESCE(st.current_streak_days, 0),
        es.today_earned,
        es.week_earned,
        es.month_earned
    FROM earnings_summary es
    CROSS JOIN trends_summary ts
    CROSS JOIN validations_summary vs
    CROSS JOIN sessions_summary ss
    LEFT JOIN streak_summary st ON true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add earnings entry
CREATE OR REPLACE FUNCTION add_earnings(
    p_user_id UUID,
    p_amount DECIMAL,
    p_type TEXT,
    p_description TEXT,
    p_reference_id UUID DEFAULT NULL,
    p_reference_table TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_earning_id UUID;
BEGIN
    INSERT INTO public.earnings_ledger (
        user_id, amount, type, description, reference_id, reference_table, status
    ) VALUES (
        p_user_id, p_amount, p_type, p_description, p_reference_id, p_reference_table, 'confirmed'
    ) RETURNING id INTO v_earning_id;
    
    -- Update user profile totals
    UPDATE public.user_profiles
    SET 
        total_earnings = total_earnings + p_amount,
        trends_spotted = CASE 
            WHEN p_type = 'trend_submission' THEN trends_spotted + 1 
            ELSE trends_spotted 
        END
    WHERE id = p_user_id;
    
    RETURN v_earning_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically add earnings when trends are submitted
CREATE OR REPLACE FUNCTION handle_trend_submission_earnings()
RETURNS TRIGGER AS $$
BEGIN
    -- Award $1.00 for trend submission
    PERFORM add_earnings(
        NEW.spotter_id,
        1.00,
        'trend_submission',
        'Reward for submitting a trend',
        NEW.id,
        'trend_submissions'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_trend_submission_create
    AFTER INSERT ON public.trend_submissions
    FOR EACH ROW EXECUTE FUNCTION handle_trend_submission_earnings();

-- Trigger to automatically add earnings when validations are made
CREATE OR REPLACE FUNCTION handle_validation_earnings()
RETURNS TRIGGER AS $$
BEGIN
    -- Award $0.10 for validation
    PERFORM add_earnings(
        NEW.validator_id,
        0.10,
        'trend_validation',
        'Reward for validating a trend',
        NEW.id,
        'trend_validations'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_trend_validation_create
    AFTER INSERT ON public.trend_validations
    FOR EACH ROW EXECUTE FUNCTION handle_validation_earnings();

-- Trigger to automatically add earnings when scroll sessions end
CREATE OR REPLACE FUNCTION handle_scroll_session_earnings()
RETURNS TRIGGER AS $$
DECLARE
    v_base_rate DECIMAL := 0.01; -- $0.01 per minute
    v_bonus_rate DECIMAL := 0.50; -- $0.50 per trend logged
    v_minutes DECIMAL;
    v_base_amount DECIMAL;
    v_bonus_amount DECIMAL;
    v_total_amount DECIMAL;
BEGIN
    -- Only process if session is ending (ended_at is being set)
    IF NEW.ended_at IS NOT NULL AND OLD.ended_at IS NULL THEN
        v_minutes := NEW.duration_seconds / 60.0;
        v_base_amount := ROUND(v_minutes * v_base_rate, 2);
        v_bonus_amount := NEW.trends_logged * v_bonus_rate;
        v_total_amount := v_base_amount + v_bonus_amount;
        
        -- Update the session with earnings
        NEW.base_earnings := v_base_amount;
        NEW.bonus_earnings := v_bonus_amount;
        NEW.total_earnings := v_total_amount;
        
        -- Add to earnings ledger
        PERFORM add_earnings(
            NEW.user_id,
            v_total_amount,
            'scroll_session',
            FORMAT('Scroll session: %s minutes, %s trends logged', ROUND(v_minutes, 1), NEW.trends_logged),
            NEW.id,
            'scroll_sessions'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_scroll_session_update
    BEFORE UPDATE ON public.scroll_sessions
    FOR EACH ROW EXECUTE FUNCTION handle_scroll_session_earnings();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_dashboard_stats TO authenticated;
GRANT EXECUTE ON FUNCTION add_earnings TO authenticated;