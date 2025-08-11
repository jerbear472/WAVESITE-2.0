-- ============================================
-- FINAL FIX: Create the cast_trend_vote function
-- This is the ONLY thing missing from your database
-- Run this in Supabase SQL Editor
-- ============================================

CREATE OR REPLACE FUNCTION cast_trend_vote(
    p_trend_id UUID,
    p_validator_id UUID,
    p_vote BOOLEAN,
    p_quality_score DECIMAL DEFAULT NULL,
    p_feedback TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_spotter_id UUID;
    v_validation_count INTEGER;
    v_approve_count INTEGER;
    v_reject_count INTEGER;
BEGIN
    -- Get trend info
    SELECT 
        spotter_id,
        COALESCE(validation_count, 0),
        COALESCE(approve_count, 0),
        COALESCE(reject_count, 0)
    INTO 
        v_spotter_id,
        v_validation_count,
        v_approve_count,
        v_reject_count
    FROM trend_submissions
    WHERE id = p_trend_id;
    
    -- Check if trend exists
    IF v_spotter_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Trend not found');
    END IF;
    
    -- Prevent self-validation
    IF v_spotter_id = p_validator_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot validate your own trend');
    END IF;
    
    -- Check if already voted
    IF EXISTS (SELECT 1 FROM trend_validations WHERE trend_id = p_trend_id AND validator_id = p_validator_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Already voted on this trend');
    END IF;
    
    -- Insert vote
    INSERT INTO trend_validations (trend_id, validator_id, vote, quality_score, feedback)
    VALUES (p_trend_id, p_validator_id, p_vote, p_quality_score, p_feedback);
    
    -- Update counts
    IF p_vote THEN
        v_approve_count := v_approve_count + 1;
    ELSE
        v_reject_count := v_reject_count + 1;
    END IF;
    v_validation_count := v_validation_count + 1;
    
    -- Update trend
    UPDATE trend_submissions
    SET 
        validation_count = v_validation_count,
        approve_count = v_approve_count,
        reject_count = v_reject_count,
        status = CASE 
            WHEN v_validation_count >= 5 THEN
                CASE WHEN v_approve_count > v_reject_count THEN 'approved' ELSE 'rejected' END
            ELSE 'validating'
        END,
        updated_at = NOW()
    WHERE id = p_trend_id;
    
    -- Update validator earnings
    UPDATE user_profiles
    SET 
        earnings_pending = COALESCE(earnings_pending, 0) + 0.10,
        validation_score = LEAST(COALESCE(validation_score, 0) + 0.5, 100),
        updated_at = NOW()
    WHERE id = p_validator_id;
    
    -- If trend is approved, give bonus to spotter
    IF v_validation_count >= 5 AND v_approve_count > v_reject_count THEN
        UPDATE user_profiles
        SET 
            earnings_pending = COALESCE(earnings_pending, 0) + 0.50,
            accuracy_score = LEAST(COALESCE(accuracy_score, 0) + 1, 100),
            updated_at = NOW()
        WHERE id = v_spotter_id;
    END IF;
    
    -- Return success
    RETURN jsonb_build_object(
        'success', true,
        'trend_status', CASE 
            WHEN v_validation_count >= 5 THEN
                CASE WHEN v_approve_count > v_reject_count THEN 'approved' ELSE 'rejected' END
            ELSE 'validating'
        END,
        'validation_count', v_validation_count,
        'approve_count', v_approve_count,
        'reject_count', v_reject_count,
        'validator_earned', 0.10,
        'approval_bonus', CASE 
            WHEN v_validation_count >= 5 AND v_approve_count > v_reject_count THEN 0.50 
            ELSE 0 
        END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION cast_trend_vote TO authenticated;
GRANT EXECUTE ON FUNCTION cast_trend_vote TO anon;

-- Test that it was created
SELECT 'Function created successfully!' as status;