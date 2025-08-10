-- UNIFIED EARNINGS SYSTEM
-- This SQL unifies ALL earnings across the platform to be consistent
-- Base: $1.00 per trend submission, $0.10 per validation
-- Plus bonuses as defined in earningsConfig.ts

-- ============================================
-- STEP 1: Ensure all columns exist
-- ============================================

-- Ensure user_profiles has all earnings columns
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS earnings_pending DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS earnings_approved DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS earnings_paid DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_earnings DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS spotter_tier TEXT DEFAULT 'learning';

-- Ensure trend_submissions has bounty columns
ALTER TABLE public.trend_submissions
ADD COLUMN IF NOT EXISTS bounty_amount DECIMAL(10,2) DEFAULT 1.00,
ADD COLUMN IF NOT EXISTS bounty_paid BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS bonus_amount DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_earned DECIMAL(10,2) DEFAULT 0.00;

-- Ensure trend_validations has reward column
ALTER TABLE public.trend_validations
ADD COLUMN IF NOT EXISTS reward_amount DECIMAL(10,2) DEFAULT 0.10,
ADD COLUMN IF NOT EXISTS reward_paid BOOLEAN DEFAULT FALSE;

-- ============================================
-- STEP 2: Drop old triggers and functions
-- ============================================

DROP TRIGGER IF EXISTS update_user_earnings_on_submission ON public.trend_submissions;
DROP TRIGGER IF EXISTS update_user_earnings_on_validation ON public.trend_validations;
DROP TRIGGER IF EXISTS update_spotter_earnings ON public.trend_submissions;
DROP TRIGGER IF EXISTS update_validator_earnings ON public.trend_validations;
DROP FUNCTION IF EXISTS public.update_user_earnings_on_submission() CASCADE;
DROP FUNCTION IF EXISTS public.update_user_earnings_on_validation() CASCADE;
DROP FUNCTION IF EXISTS public.update_spotter_earnings() CASCADE;
DROP FUNCTION IF EXISTS public.update_validator_earnings() CASCADE;

-- ============================================
-- STEP 3: Create unified earnings function for submissions
-- ============================================

CREATE OR REPLACE FUNCTION public.calculate_submission_earnings()
RETURNS TRIGGER AS $$
DECLARE
    v_base_amount DECIMAL(10,2) := 1.00;  -- $1.00 base payment
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

    -- Calculate bonuses based on content quality
    -- Screenshot bonus
    IF NEW.screenshot_url IS NOT NULL THEN
        v_bonus_amount := v_bonus_amount + 0.15;
    END IF;

    -- Complete info bonus (has description)
    IF NEW.description IS NOT NULL AND LENGTH(NEW.description) > 20 THEN
        v_bonus_amount := v_bonus_amount + 0.10;
    END IF;

    -- Platform bonus (if platform specified)
    IF NEW.platform IS NOT NULL THEN
        v_bonus_amount := v_bonus_amount + 0.05;
    END IF;

    -- Creator info bonus
    IF NEW.creator_handle IS NOT NULL THEN
        v_bonus_amount := v_bonus_amount + 0.05;
    END IF;

    -- Hashtags bonus (3+)
    IF NEW.hashtags IS NOT NULL AND array_length(NEW.hashtags, 1) >= 3 THEN
        v_bonus_amount := v_bonus_amount + 0.05;
    END IF;

    -- Caption bonus
    IF NEW.post_caption IS NOT NULL AND LENGTH(NEW.post_caption) > 10 THEN
        v_bonus_amount := v_bonus_amount + 0.05;
    END IF;

    -- Views-based bonuses
    IF NEW.views_count > 1000000 THEN
        v_bonus_amount := v_bonus_amount + 0.50;  -- Viral bonus
    ELSIF NEW.views_count > 100000 THEN
        v_bonus_amount := v_bonus_amount + 0.25;  -- High views bonus
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
    
    -- Cap at maximum ($3.00)
    v_final_amount := LEAST(v_final_amount, 3.00);

    -- Update the submission record
    NEW.bounty_amount := v_base_amount;
    NEW.bonus_amount := v_bonus_amount;
    NEW.total_earned := v_final_amount;

    -- Update user's pending earnings
    UPDATE user_profiles
    SET 
        earnings_pending = COALESCE(earnings_pending, 0) + v_final_amount,
        total_earnings = COALESCE(total_earnings, 0) + v_final_amount,
        trends_spotted = COALESCE(trends_spotted, 0) + 1
    WHERE id = NEW.spotter_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 4: Create unified validation earnings function
-- ============================================

CREATE OR REPLACE FUNCTION public.calculate_validation_earnings()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process on INSERT
    IF TG_OP != 'INSERT' THEN
        RETURN NEW;
    END IF;

    -- Set validation reward
    NEW.reward_amount := 0.10;  -- $0.10 per validation

    -- Add directly to approved earnings (validations don't need approval)
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
-- STEP 5: Handle trend approval bonus
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_trend_status_change()
RETURNS TRIGGER AS $$
DECLARE
    v_approval_bonus DECIMAL(10,2) := 0.50;  -- $0.50 bonus for approved trends
BEGIN
    -- Only process status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        
        -- When trend is approved
        IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
            -- Move pending to approved for the spotter
            UPDATE user_profiles
            SET 
                earnings_pending = GREATEST(0, COALESCE(earnings_pending, 0) - NEW.total_earned),
                earnings_approved = COALESCE(earnings_approved, 0) + NEW.total_earned + v_approval_bonus
            WHERE id = NEW.spotter_id;
            
            -- Mark bounty as paid
            NEW.bounty_paid := TRUE;
            
        -- When trend is rejected
        ELSIF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
            -- Remove from pending (no payment)
            UPDATE user_profiles
            SET 
                earnings_pending = GREATEST(0, COALESCE(earnings_pending, 0) - NEW.total_earned),
                total_earnings = GREATEST(0, COALESCE(total_earnings, 0) - NEW.total_earned)
            WHERE id = NEW.spotter_id;
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
-- STEP 7: Update cast_trend_vote function
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
    v_validation_count INTEGER;
    v_verify_count INTEGER;
    v_reject_count INTEGER;
    v_result JSONB;
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
            'error', 'Invalid vote type. Must be verify, reject, or skip'
        );
    END IF;
    
    -- Get trend status
    SELECT status INTO v_trend_status
    FROM trend_submissions
    WHERE id = p_trend_id;
    
    IF v_trend_status IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Trend not found'
        );
    END IF;
    
    IF v_trend_status NOT IN ('submitted', 'validating') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Trend is not available for validation'
        );
    END IF;
    
    -- Check if user already voted
    SELECT id, vote INTO v_validation_id, v_existing_vote
    FROM trend_validations
    WHERE trend_id = p_trend_id 
    AND validator_id = v_user_id;
    
    IF v_existing_vote IS NOT NULL THEN
        -- Update existing vote (no additional payment)
        UPDATE trend_validations
        SET 
            vote = p_vote,
            confirmed = (p_vote = 'verify'),
            updated_at = NOW()
        WHERE id = v_validation_id;
    ELSE
        -- Create new validation record (earnings handled by trigger)
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
    END IF;
    
    -- Skip means no status update needed
    IF p_vote = 'skip' THEN
        RETURN jsonb_build_object(
            'success', true,
            'validation_id', v_validation_id,
            'vote', p_vote,
            'message', 'Skipped trend'
        );
    END IF;
    
    -- Count votes for this trend
    SELECT 
        COUNT(*) FILTER (WHERE vote = 'verify') as verify_count,
        COUNT(*) FILTER (WHERE vote = 'reject') as reject_count,
        COUNT(*) as total_count
    INTO v_verify_count, v_reject_count, v_validation_count
    FROM trend_validations
    WHERE trend_id = p_trend_id;
    
    -- Update trend status based on votes (3 votes needed for decision)
    IF v_verify_count >= 3 THEN
        -- Trend approved (approval bonus handled by trigger)
        UPDATE trend_submissions
        SET 
            status = 'approved',
            validated_at = NOW(),
            validation_count = v_validation_count,
            quality_score = (v_verify_count::FLOAT / v_validation_count::FLOAT * 100)::INTEGER
        WHERE id = p_trend_id;
        
    ELSIF v_reject_count >= 3 THEN
        -- Trend rejected (earnings removal handled by trigger)
        UPDATE trend_submissions
        SET 
            status = 'rejected',
            validated_at = NOW(),
            validation_count = v_validation_count,
            quality_score = 0
        WHERE id = p_trend_id;
        
    ELSIF v_validation_count >= 1 AND v_trend_status = 'submitted' THEN
        -- Start validation process
        UPDATE trend_submissions
        SET status = 'validating'
        WHERE id = p_trend_id;
    END IF;
    
    -- Return success
    RETURN jsonb_build_object(
        'success', true,
        'validation_id', v_validation_id,
        'vote', p_vote,
        'verify_count', v_verify_count,
        'reject_count', v_reject_count,
        'total_votes', v_validation_count
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
-- STEP 8: Add helper view for earnings dashboard
-- ============================================

CREATE OR REPLACE VIEW public.user_earnings_summary AS
SELECT 
    up.id,
    up.username,
    up.spotter_tier,
    up.earnings_pending,
    up.earnings_approved,
    up.earnings_paid,
    up.total_earnings,
    COUNT(DISTINCT ts.id) as trends_submitted,
    COUNT(DISTINCT tv.id) as trends_validated,
    AVG(ts.total_earned) as avg_submission_earnings,
    MAX(ts.total_earned) as max_submission_earnings,
    SUM(ts.total_earned) as total_submission_earnings,
    COUNT(DISTINCT ts.id) FILTER (WHERE ts.status = 'approved') as approved_trends,
    COUNT(DISTINCT ts.id) FILTER (WHERE ts.status = 'rejected') as rejected_trends
FROM user_profiles up
LEFT JOIN trend_submissions ts ON ts.spotter_id = up.id
LEFT JOIN trend_validations tv ON tv.validator_id = up.id
GROUP BY up.id, up.username, up.spotter_tier, up.earnings_pending, 
         up.earnings_approved, up.earnings_paid, up.total_earnings;

-- Grant access
GRANT SELECT ON public.user_earnings_summary TO authenticated;

-- ============================================
-- STEP 9: Summary message
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ UNIFIED EARNINGS SYSTEM IMPLEMENTED';
    RAISE NOTICE '';
    RAISE NOTICE '💰 EARNINGS STRUCTURE:';
    RAISE NOTICE '  • Trend Submission: $1.00 base + bonuses';
    RAISE NOTICE '  • Validation: $0.10 per vote';
    RAISE NOTICE '  • Approval Bonus: $0.50 for spotter';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 BONUSES AVAILABLE:';
    RAISE NOTICE '  • Screenshot: +$0.15';
    RAISE NOTICE '  • Complete info: +$0.10';
    RAISE NOTICE '  • Viral content (1M+ views): +$0.50';
    RAISE NOTICE '  • High views (100k+): +$0.25';
    RAISE NOTICE '  • High engagement: +$0.20';
    RAISE NOTICE '  • High wave score: +$0.20';
    RAISE NOTICE '  • Finance trend: +$0.10';
    RAISE NOTICE '';
    RAISE NOTICE '🏆 TIER MULTIPLIERS:';
    RAISE NOTICE '  • Elite: 1.5x';
    RAISE NOTICE '  • Verified: 1.0x';
    RAISE NOTICE '  • Learning: 0.7x';
    RAISE NOTICE '  • Restricted: 0.3x';
    RAISE NOTICE '';
    RAISE NOTICE '📊 MAXIMUM CAPS:';
    RAISE NOTICE '  • Single submission: $3.00';
    RAISE NOTICE '  • Daily earnings: $50.00 (enforce in frontend)';
END $$;