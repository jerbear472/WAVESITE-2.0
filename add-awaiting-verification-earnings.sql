-- Add awaiting_verification earnings tracking to properly handle pending trend earnings
-- This separates earnings that are waiting for trend verification from other pending earnings

-- 1. Add awaiting_verification column to profiles table
DO $$
BEGIN
    -- Add awaiting_verification column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'awaiting_verification'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN awaiting_verification DECIMAL(10,2) DEFAULT 0.00;
        RAISE NOTICE 'Added awaiting_verification column to profiles table';
    ELSE
        RAISE NOTICE 'awaiting_verification column already exists';
    END IF;
END $$;

-- 2. Create or replace function to track earnings when trends are submitted
CREATE OR REPLACE FUNCTION handle_trend_submission_earnings()
RETURNS TRIGGER AS $$
DECLARE
    v_amount DECIMAL := 1.00; -- $1.00 per trend submission
BEGIN
    -- Add earnings to earnings_ledger with 'awaiting_verification' status
    INSERT INTO public.earnings_ledger (
        user_id,
        amount,
        type,
        description,
        trend_submission_id,
        status
    ) VALUES (
        NEW.spotter_id,
        v_amount,
        'submission',
        'Trend submission - awaiting verification',
        NEW.id,
        'awaiting_verification'
    );
    
    -- Update user's awaiting_verification balance
    UPDATE public.profiles
    SET 
        awaiting_verification = awaiting_verification + v_amount,
        trends_spotted = trends_spotted + 1,
        updated_at = NOW()
    WHERE id = NEW.spotter_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create or replace function to move earnings from awaiting to pending/approved when verified
CREATE OR REPLACE FUNCTION handle_trend_verification_earnings()
RETURNS TRIGGER AS $$
DECLARE
    v_trend_owner UUID;
    v_submission_amount DECIMAL;
    v_validation_reward DECIMAL := 0.01; -- $0.01 per validation
BEGIN
    -- Only process on first approval
    IF NEW.approve_count = 1 AND OLD.approve_count = 0 THEN
        -- Get the trend owner
        SELECT spotter_id INTO v_trend_owner FROM public.trend_submissions WHERE id = NEW.id;
        
        -- Get the submission amount from earnings_ledger
        SELECT amount INTO v_submission_amount 
        FROM public.earnings_ledger 
        WHERE trend_submission_id = NEW.id 
        AND type = 'submission' 
        AND status = 'awaiting_verification'
        LIMIT 1;
        
        IF v_submission_amount IS NOT NULL THEN
            -- Update earnings_ledger status from awaiting_verification to approved
            UPDATE public.earnings_ledger
            SET 
                status = 'approved',
                updated_at = NOW()
            WHERE trend_submission_id = NEW.id 
            AND type = 'submission' 
            AND status = 'awaiting_verification';
            
            -- Update user profile: move from awaiting_verification to total_earnings
            UPDATE public.profiles
            SET 
                awaiting_verification = GREATEST(0, awaiting_verification - v_submission_amount),
                total_earnings = total_earnings + v_submission_amount,
                updated_at = NOW()
            WHERE id = v_trend_owner;
        END IF;
    END IF;
    
    -- If trend is rejected (2 or more reject votes)
    IF NEW.reject_count >= 2 AND OLD.reject_count < 2 THEN
        -- Get the trend owner
        SELECT spotter_id INTO v_trend_owner FROM public.trend_submissions WHERE id = NEW.id;
        
        -- Get the submission amount
        SELECT amount INTO v_submission_amount 
        FROM public.earnings_ledger 
        WHERE trend_submission_id = NEW.id 
        AND type = 'submission' 
        AND status = 'awaiting_verification'
        LIMIT 1;
        
        IF v_submission_amount IS NOT NULL THEN
            -- Update earnings_ledger status to rejected
            UPDATE public.earnings_ledger
            SET 
                status = 'rejected',
                updated_at = NOW()
            WHERE trend_submission_id = NEW.id 
            AND type = 'submission' 
            AND status = 'awaiting_verification';
            
            -- Remove from awaiting_verification (trend was rejected)
            UPDATE public.profiles
            SET 
                awaiting_verification = GREATEST(0, awaiting_verification - v_submission_amount),
                updated_at = NOW()
            WHERE id = v_trend_owner;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update the earnings_ledger status check constraint to include awaiting_verification
DO $$
BEGIN
    -- Drop the old constraint if it exists
    ALTER TABLE public.earnings_ledger 
    DROP CONSTRAINT IF EXISTS earnings_ledger_status_check;
    
    -- Add the new constraint with awaiting_verification
    ALTER TABLE public.earnings_ledger 
    ADD CONSTRAINT earnings_ledger_status_check 
    CHECK (status IN ('pending', 'awaiting_verification', 'approved', 'rejected', 'paid', 'cancelled'));
    
    RAISE NOTICE 'Updated earnings_ledger status constraint';
END $$;

-- 5. Create trigger for trend submission earnings
DROP TRIGGER IF EXISTS on_trend_submission_earnings ON public.trend_submissions;
CREATE TRIGGER on_trend_submission_earnings
    AFTER INSERT ON public.trend_submissions
    FOR EACH ROW
    EXECUTE FUNCTION handle_trend_submission_earnings();

-- 6. Create trigger for trend verification earnings
DROP TRIGGER IF EXISTS on_trend_verification_earnings ON public.trend_submissions;
CREATE TRIGGER on_trend_verification_earnings
    AFTER UPDATE OF approve_count, reject_count ON public.trend_submissions
    FOR EACH ROW
    EXECUTE FUNCTION handle_trend_verification_earnings();

-- 7. Add earnings to validators when they validate
CREATE OR REPLACE FUNCTION handle_validation_reward()
RETURNS TRIGGER AS $$
DECLARE
    v_reward DECIMAL := 0.01; -- $0.01 per validation
BEGIN
    -- Award validator for their validation
    INSERT INTO public.earnings_ledger (
        user_id,
        amount,
        type,
        description,
        trend_submission_id,
        status
    ) VALUES (
        NEW.validator_id,
        v_reward,
        'validation',
        'Trend validation reward',
        NEW.trend_submission_id,
        'approved'
    );
    
    -- Update validator's total earnings immediately
    UPDATE public.profiles
    SET 
        total_earnings = total_earnings + v_reward,
        updated_at = NOW()
    WHERE id = NEW.validator_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create trigger for validation rewards
DROP TRIGGER IF EXISTS on_validation_reward ON public.trend_validations;
CREATE TRIGGER on_validation_reward
    AFTER INSERT ON public.trend_validations
    FOR EACH ROW
    EXECUTE FUNCTION handle_validation_reward();

-- 9. Create function to get user dashboard stats with awaiting_verification
CREATE OR REPLACE FUNCTION get_user_dashboard_stats(p_user_id UUID)
RETURNS TABLE (
    total_earnings DECIMAL,
    pending_earnings DECIMAL,
    awaiting_verification DECIMAL,
    trends_spotted BIGINT,
    trends_verified BIGINT,
    accuracy_score DECIMAL,
    current_streak INTEGER,
    earnings_today DECIMAL,
    earnings_this_week DECIMAL,
    earnings_this_month DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH profile_data AS (
        SELECT 
            p.total_earnings,
            p.pending_earnings,
            p.awaiting_verification,
            p.trends_spotted,
            p.accuracy_score
        FROM public.profiles p
        WHERE p.id = p_user_id
    ),
    earnings_summary AS (
        SELECT 
            COALESCE(SUM(CASE WHEN status IN ('approved', 'paid') AND created_at >= CURRENT_DATE THEN amount ELSE 0 END), 0) as today_earned,
            COALESCE(SUM(CASE WHEN status IN ('approved', 'paid') AND created_at >= date_trunc('week', CURRENT_DATE) THEN amount ELSE 0 END), 0) as week_earned,
            COALESCE(SUM(CASE WHEN status IN ('approved', 'paid') AND created_at >= date_trunc('month', CURRENT_DATE) THEN amount ELSE 0 END), 0) as month_earned
        FROM public.earnings_ledger
        WHERE user_id = p_user_id
    ),
    validations_summary AS (
        SELECT 
            COUNT(*) as total_validations
        FROM public.trend_validations
        WHERE validator_id = p_user_id
    ),
    streak_summary AS (
        SELECT 
            COALESCE(current_streak, 0) as current_streak_days
        FROM public.user_streaks
        WHERE user_id = p_user_id
    )
    SELECT 
        COALESCE(pd.total_earnings, 0),
        COALESCE(pd.pending_earnings, 0),
        COALESCE(pd.awaiting_verification, 0),
        COALESCE(pd.trends_spotted, 0),
        COALESCE(vs.total_validations, 0),
        COALESCE(pd.accuracy_score, 0),
        COALESCE(st.current_streak_days, 0),
        es.today_earned,
        es.week_earned,
        es.month_earned
    FROM profile_data pd
    CROSS JOIN earnings_summary es
    CROSS JOIN validations_summary vs
    LEFT JOIN streak_summary st ON true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Fix any existing earnings that should be awaiting_verification
UPDATE public.earnings_ledger
SET status = 'awaiting_verification'
WHERE type = 'submission' 
AND status = 'pending'
AND trend_submission_id IN (
    SELECT id FROM public.trend_submissions 
    WHERE validation_status = 'pending' OR validation_count = 0
);

-- 11. Recalculate awaiting_verification balances for all users
WITH awaiting_earnings AS (
    SELECT 
        user_id,
        SUM(amount) as total_awaiting
    FROM public.earnings_ledger
    WHERE status = 'awaiting_verification'
    GROUP BY user_id
)
UPDATE public.profiles p
SET awaiting_verification = COALESCE(ae.total_awaiting, 0)
FROM awaiting_earnings ae
WHERE p.id = ae.user_id;

-- 12. Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_user_dashboard_stats TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE ON public.profiles TO authenticated;

-- Verification
DO $$
DECLARE
    v_column_exists BOOLEAN;
    v_trigger_exists BOOLEAN;
BEGIN
    -- Check if column was added
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'awaiting_verification'
    ) INTO v_column_exists;
    
    -- Check if triggers exist
    SELECT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'on_trend_submission_earnings'
    ) INTO v_trigger_exists;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== Awaiting Verification Earnings Setup Complete ===';
    RAISE NOTICE '';
    RAISE NOTICE 'Status:';
    RAISE NOTICE '  ✅ awaiting_verification column: %', CASE WHEN v_column_exists THEN 'ADDED' ELSE 'ERROR' END;
    RAISE NOTICE '  ✅ Earnings triggers: %', CASE WHEN v_trigger_exists THEN 'CREATED' ELSE 'ERROR' END;
    RAISE NOTICE '';
    RAISE NOTICE 'How it works:';
    RAISE NOTICE '  1. When trends are submitted: $1.00 goes to awaiting_verification';
    RAISE NOTICE '  2. When trend gets first approval: money moves to total_earnings';
    RAISE NOTICE '  3. When trend is rejected: money is removed from awaiting_verification';
    RAISE NOTICE '  4. Validators earn $0.01 per validation immediately';
END $$;