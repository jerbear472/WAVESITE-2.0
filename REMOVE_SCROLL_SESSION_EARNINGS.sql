-- Remove scroll session earnings - scroll sessions are now only for streak multipliers
-- This script removes all scroll session earning functionality while keeping the sessions for streak tracking

-- 1. Drop the trigger that adds earnings when scroll sessions end
DROP TRIGGER IF EXISTS on_scroll_session_update ON public.scroll_sessions;
DROP FUNCTION IF EXISTS handle_scroll_session_earnings();

-- 2. Remove scroll session earnings columns if they exist
ALTER TABLE public.scroll_sessions 
DROP COLUMN IF EXISTS base_earnings,
DROP COLUMN IF EXISTS bonus_earnings,
DROP COLUMN IF EXISTS total_earnings;

-- 3. Remove any existing scroll session earnings from the earnings ledger
DELETE FROM public.earnings_ledger 
WHERE type = 'scroll_session';

-- 4. Update the earnings ledger check constraint to remove scroll_session type
ALTER TABLE public.earnings_ledger 
DROP CONSTRAINT IF EXISTS earnings_ledger_type_check;

ALTER TABLE public.earnings_ledger 
ADD CONSTRAINT earnings_ledger_type_check 
CHECK (type IN ('trend_submission', 'trend_validation', 'challenge_completion', 'bonus', 'referral'));

-- 5. Update the add_earnings function to reject scroll_session type
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
    -- Reject scroll_session type
    IF p_type = 'scroll_session' THEN
        RAISE EXCEPTION 'Scroll sessions no longer generate direct earnings. They only provide streak multipliers.';
    END IF;
    
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

-- 6. Update the dashboard stats function to remove scroll session earnings
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
        AND type != 'scroll_session' -- Exclude any legacy scroll session earnings
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

-- 7. Add comment explaining scroll sessions are now only for streaks
COMMENT ON TABLE public.scroll_sessions IS 'Scroll sessions track user scrolling activity for streak multipliers only. They do not generate direct earnings.';

-- 8. Clean up any user profiles that may have inflated earnings from scroll sessions
-- This recalculates earnings based only on trend submissions and validations
UPDATE public.profiles p
SET 
    total_earnings = COALESCE((
        SELECT SUM(amount) 
        FROM public.earnings_ledger 
        WHERE user_id = p.id 
        AND type IN ('trend_submission', 'trend_validation', 'challenge_completion', 'bonus', 'referral')
        AND status IN ('confirmed', 'paid')
    ), 0),
    earnings_approved = COALESCE((
        SELECT SUM(amount) 
        FROM public.earnings_ledger 
        WHERE user_id = p.id 
        AND type IN ('trend_submission', 'trend_validation', 'challenge_completion', 'bonus', 'referral')
        AND status = 'confirmed'
    ), 0),
    earnings_paid = COALESCE((
        SELECT SUM(amount) 
        FROM public.earnings_ledger 
        WHERE user_id = p.id 
        AND type IN ('trend_submission', 'trend_validation', 'challenge_completion', 'bonus', 'referral')
        AND status = 'paid'
    ), 0);

-- Scroll session earnings have been removed. Scroll sessions now only provide streak multipliers for trend submissions.