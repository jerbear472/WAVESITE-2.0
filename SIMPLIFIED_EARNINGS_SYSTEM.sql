-- SIMPLIFIED EARNINGS SYSTEM
-- Trends earn pending_earnings on submission
-- 2 approve votes → earnings become approved
-- 2 reject votes → earnings removed, trend rejected

-- ============================================
-- STEP 1: Ensure all columns exist
-- ============================================

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS earnings_pending DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS earnings_approved DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS earnings_paid DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_earnings DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS spotter_tier TEXT DEFAULT 'learning';

ALTER TABLE public.trend_submissions
ADD COLUMN IF NOT EXISTS bounty_amount DECIMAL(10,2) DEFAULT 1.00,
ADD COLUMN IF NOT EXISTS bounty_paid BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS bonus_amount DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_earned DECIMAL(10,2) DEFAULT 0.00;

ALTER TABLE public.trend_validations
ADD COLUMN IF NOT EXISTS reward_amount DECIMAL(10,2) DEFAULT 0.10,
ADD COLUMN IF NOT EXISTS reward_paid BOOLEAN DEFAULT FALSE;

-- ============================================
-- STEP 2: Drop old functions and triggers
-- ============================================

DROP TRIGGER IF EXISTS calculate_submission_earnings_trigger ON public.trend_submissions;
DROP TRIGGER IF EXISTS calculate_validation_earnings_trigger ON public.trend_validations;
DROP TRIGGER IF EXISTS handle_trend_status_change_trigger ON public.trend_submissions;
DROP FUNCTION IF EXISTS public.calculate_submission_earnings() CASCADE;
DROP FUNCTION IF EXISTS public.calculate_validation_earnings() CASCADE;
DROP FUNCTION IF EXISTS public.handle_trend_status_change() CASCADE;

-- ============================================
-- STEP 3: Submission earnings (goes to PENDING)
-- ============================================

CREATE OR REPLACE FUNCTION public.calculate_submission_earnings()
RETURNS TRIGGER AS $$
DECLARE
    v_base_amount DECIMAL(10,2) := 1.00;
    v_bonus_amount DECIMAL(10,2) := 0.00;
    v_tier_multiplier DECIMAL(3,2);
    v_final_amount DECIMAL(10,2);
    v_spotter_tier TEXT;
BEGIN
    -- Only process on INSERT
    IF TG_OP != 'INSERT' THEN
        RETURN NEW;
    END IF;

    -- Get spotter tier
    SELECT spotter_tier INTO v_spotter_tier
    FROM user_profiles
    WHERE id = NEW.spotter_id;

    -- Calculate tier multiplier
    v_tier_multiplier := CASE v_spotter_tier
        WHEN 'elite' THEN 1.5
        WHEN 'verified' THEN 1.0
        WHEN 'learning' THEN 0.7
        WHEN 'restricted' THEN 0.3
        ELSE 0.7
    END;

    -- Calculate bonuses
    IF NEW.screenshot_url IS NOT NULL THEN
        v_bonus_amount := v_bonus_amount + 0.15;
    END IF;

    IF NEW.description IS NOT NULL AND LENGTH(NEW.description) > 20 THEN
        v_bonus_amount := v_bonus_amount + 0.10;
    END IF;

    IF NEW.platform IS NOT NULL THEN
        v_bonus_amount := v_bonus_amount + 0.05;
    END IF;

    IF NEW.creator_handle IS NOT NULL THEN
        v_bonus_amount := v_bonus_amount + 0.05;
    END IF;

    IF NEW.hashtags IS NOT NULL AND array_length(NEW.hashtags, 1) >= 3 THEN
        v_bonus_amount := v_bonus_amount + 0.05;
    END IF;

    IF NEW.post_caption IS NOT NULL AND LENGTH(NEW.post_caption) > 10 THEN
        v_bonus_amount := v_bonus_amount + 0.05;
    END IF;

    -- Views-based bonuses
    IF NEW.views_count > 1000000 THEN
        v_bonus_amount := v_bonus_amount + 0.50;  -- Viral
    ELSIF NEW.views_count > 100000 THEN
        v_bonus_amount := v_bonus_amount + 0.25;  -- High views
    END IF;

    -- High engagement bonus
    IF NEW.views_count > 0 AND NEW.likes_count > 0 THEN
        IF (NEW.likes_count::FLOAT / NEW.views_count::FLOAT) > 0.1 THEN
            v_bonus_amount := v_bonus_amount + 0.20;
        END IF;
    END IF;

    -- Finance category bonus
    IF NEW.category IN ('finance', 'crypto', 'stocks', 'trading') THEN
        v_bonus_amount := v_bonus_amount + 0.10;
    END IF;

    -- High wave score bonus
    IF NEW.wave_score > 70 THEN
        v_bonus_amount := v_bonus_amount + 0.20;
    END IF;

    -- Calculate final amount with tier multiplier
    v_final_amount := (v_base_amount + v_bonus_amount) * v_tier_multiplier;
    
    -- Cap at maximum
    v_final_amount := LEAST(v_final_amount, 3.00);

    -- Update the submission record
    NEW.bounty_amount := v_base_amount;
    NEW.bonus_amount := v_bonus_amount;
    NEW.total_earned := v_final_amount;

    -- Add to PENDING earnings (not approved yet!)
    UPDATE user_profiles
    SET 
        earnings_pending = COALESCE(earnings_pending, 0) + v_final_amount,
        trends_spotted = COALESCE(trends_spotted, 0) + 1
    WHERE id = NEW.spotter_id;

    -- Note: total_earnings only increases when approved

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 4: Validation earnings (DIRECTLY APPROVED)
-- ============================================

CREATE OR REPLACE FUNCTION public.calculate_validation_earnings()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process on INSERT
    IF TG_OP != 'INSERT' THEN
        RETURN NEW;
    END IF;

    -- Set validation reward
    NEW.reward_amount := 0.10;

    -- Validation earnings go directly to approved (no approval needed)
    UPDATE user_profiles
    SET 
        earnings_approved = COALESCE(earnings_approved, 0) + 0.10,
        total_earnings = COALESCE(total_earnings, 0) + 0.10,
        validation_score = LEAST(100, COALESCE(validation_score, 0) + 1)
    WHERE id = NEW.validator_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 5: Handle trend approval/rejection
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_trend_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        
        -- APPROVED: Move pending to approved
        IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
            UPDATE user_profiles
            SET 
                earnings_pending = GREATEST(0, COALESCE(earnings_pending, 0) - NEW.total_earned),
                earnings_approved = COALESCE(earnings_approved, 0) + NEW.total_earned,
                total_earnings = COALESCE(total_earnings, 0) + NEW.total_earned
            WHERE id = NEW.spotter_id;
            
            NEW.bounty_paid := TRUE;
            
        -- REJECTED: Remove from pending (no payment)
        ELSIF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
            UPDATE user_profiles
            SET 
                earnings_pending = GREATEST(0, COALESCE(earnings_pending, 0) - NEW.total_earned)
            WHERE id = NEW.spotter_id;
            
            -- Note: total_earnings stays the same (never added in first place)
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 6: Create triggers
-- ============================================

CREATE TRIGGER calculate_submission_earnings_trigger
    BEFORE INSERT ON public.trend_submissions
    FOR EACH ROW
    EXECUTE FUNCTION public.calculate_submission_earnings();

CREATE TRIGGER calculate_validation_earnings_trigger
    BEFORE INSERT ON public.trend_validations
    FOR EACH ROW
    EXECUTE FUNCTION public.calculate_validation_earnings();

CREATE TRIGGER handle_trend_status_change_trigger
    BEFORE UPDATE ON public.trend_submissions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_trend_status_change();

-- ============================================
-- STEP 7: Update cast_trend_vote function (2 votes decides)
-- ============================================

DROP FUNCTION IF EXISTS public.cast_trend_vote(UUID, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.cast_trend_vote(
    p_trend_id UUID,
    p_vote TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_validation_id UUID;
    v_existing_vote TEXT;
    v_trend_status TEXT;
    v_spotter_id UUID;
    v_verify_count INTEGER;
    v_reject_count INTEGER;
    v_total_count INTEGER;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Not authenticated'
        );
    END IF;
    
    -- Validate vote type
    IF p_vote NOT IN ('verify', 'reject', 'skip') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid vote type'
        );
    END IF;
    
    -- Get trend info
    SELECT status, spotter_id 
    INTO v_trend_status, v_spotter_id
    FROM trend_submissions
    WHERE id = p_trend_id;
    
    IF v_trend_status IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Trend not found'
        );
    END IF;
    
    -- Can't vote on your own trend
    IF v_spotter_id = v_user_id THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Cannot validate your own trend'
        );
    END IF;
    
    -- Check if already decided
    IF v_trend_status IN ('approved', 'rejected') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Trend already decided'
        );
    END IF;
    
    -- Check if user already voted
    SELECT id, vote INTO v_validation_id, v_existing_vote
    FROM trend_validations
    WHERE trend_id = p_trend_id 
    AND validator_id = v_user_id;
    
    IF v_existing_vote IS NOT NULL THEN
        -- Can't change vote once cast
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Already voted on this trend'
        );
    END IF;
    
    -- Skip doesn't create a validation record
    IF p_vote = 'skip' THEN
        RETURN jsonb_build_object(
            'success', true,
            'vote', 'skip',
            'message', 'Trend skipped'
        );
    END IF;
    
    -- Create validation record (earnings handled by trigger)
    INSERT INTO trend_validations (
        trend_id,
        validator_id,
        vote,
        confirmed
    ) VALUES (
        p_trend_id,
        v_user_id,
        p_vote,
        (p_vote = 'verify')
    )
    RETURNING id INTO v_validation_id;
    
    -- Count votes
    SELECT 
        COUNT(*) FILTER (WHERE vote = 'verify'),
        COUNT(*) FILTER (WHERE vote = 'reject'),
        COUNT(*)
    INTO v_verify_count, v_reject_count, v_total_count
    FROM trend_validations
    WHERE trend_id = p_trend_id;
    
    -- 2 VOTES DECIDES THE OUTCOME
    IF v_verify_count >= 2 AND v_trend_status != 'approved' THEN
        -- APPROVED - earnings move from pending to approved
        UPDATE trend_submissions
        SET 
            status = 'approved',
            validated_at = NOW(),
            validation_count = v_total_count,
            quality_score = (v_verify_count::FLOAT / v_total_count::FLOAT * 100)::INTEGER
        WHERE id = p_trend_id;
        
        -- Update accuracy score for spotter
        UPDATE user_profiles
        SET accuracy_score = LEAST(100, COALESCE(accuracy_score, 0) + 5)
        WHERE id = v_spotter_id;
        
    ELSIF v_reject_count >= 2 AND v_trend_status != 'rejected' THEN
        -- REJECTED - earnings removed from pending
        UPDATE trend_submissions
        SET 
            status = 'rejected',
            validated_at = NOW(),
            validation_count = v_total_count,
            quality_score = 0
        WHERE id = p_trend_id;
        
        -- Decrease accuracy score for spotter
        UPDATE user_profiles
        SET accuracy_score = GREATEST(0, COALESCE(accuracy_score, 0) - 5)
        WHERE id = v_spotter_id;
        
    ELSIF v_total_count = 1 AND v_trend_status = 'submitted' THEN
        -- First vote - set to validating
        UPDATE trend_submissions
        SET status = 'validating'
        WHERE id = p_trend_id;
    END IF;
    
    -- Return current vote counts
    RETURN jsonb_build_object(
        'success', true,
        'validation_id', v_validation_id,
        'vote', p_vote,
        'verify_count', v_verify_count,
        'reject_count', v_reject_count,
        'total_votes', v_total_count,
        'needs_for_decision', 2,
        'status', (
            SELECT status FROM trend_submissions WHERE id = p_trend_id
        )
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.cast_trend_vote(UUID, TEXT) TO authenticated;

-- ============================================
-- STEP 8: Create earnings summary view
-- ============================================

CREATE OR REPLACE VIEW public.earnings_summary AS
SELECT 
    up.id,
    up.username,
    up.spotter_tier,
    up.earnings_pending,
    up.earnings_approved,
    up.earnings_paid,
    (up.earnings_pending + up.earnings_approved) as earnings_available,
    up.total_earnings,
    COUNT(DISTINCT ts.id) as trends_submitted,
    COUNT(DISTINCT ts.id) FILTER (WHERE ts.status = 'submitted') as trends_pending,
    COUNT(DISTINCT ts.id) FILTER (WHERE ts.status = 'validating') as trends_validating,
    COUNT(DISTINCT ts.id) FILTER (WHERE ts.status = 'approved') as trends_approved,
    COUNT(DISTINCT ts.id) FILTER (WHERE ts.status = 'rejected') as trends_rejected,
    COUNT(DISTINCT tv.id) as validations_done,
    (COUNT(DISTINCT tv.id) * 0.10) as validation_earnings
FROM user_profiles up
LEFT JOIN trend_submissions ts ON ts.spotter_id = up.id
LEFT JOIN trend_validations tv ON tv.validator_id = up.id
GROUP BY up.id;

-- Grant access
GRANT SELECT ON public.earnings_summary TO authenticated;

-- ============================================
-- STEP 9: Summary
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ SIMPLIFIED EARNINGS SYSTEM ACTIVE';
    RAISE NOTICE '';
    RAISE NOTICE '📋 HOW IT WORKS:';
    RAISE NOTICE '  1. Submit trend → Earn $1.00 + bonuses (goes to PENDING)';
    RAISE NOTICE '  2. Get 2 approve votes → Earnings move to APPROVED';
    RAISE NOTICE '  3. Get 2 reject votes → Earnings REMOVED from pending';
    RAISE NOTICE '  4. Validate trends → Earn $0.10 instantly (APPROVED)';
    RAISE NOTICE '';
    RAISE NOTICE '💰 EARNINGS FLOW:';
    RAISE NOTICE '  • Submission: $1.00 base → PENDING';
    RAISE NOTICE '  • Bonuses: +$0.05 to +$0.50 → PENDING';
    RAISE NOTICE '  • Tier multiplier: 0.3x to 1.5x → PENDING';
    RAISE NOTICE '  • 2 approvals: PENDING → APPROVED';
    RAISE NOTICE '  • 2 rejections: PENDING → REMOVED';
    RAISE NOTICE '  • Validation: $0.10 → APPROVED';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 DECISION RULE:';
    RAISE NOTICE '  • 2 verify votes = APPROVED';
    RAISE NOTICE '  • 2 reject votes = REJECTED';
    RAISE NOTICE '  • First to 2 wins';
END $$;