-- =====================================================
-- UPDATE VALIDATION THRESHOLD TO 3 VOTES
-- Changes the approval/rejection threshold from 2 to 3 votes
-- =====================================================

-- Update the validation vote handler function
CREATE OR REPLACE FUNCTION handle_validation_vote()
RETURNS TRIGGER AS $$
DECLARE
    v_yes_votes INTEGER;
    v_no_votes INTEGER;
    v_trend_earnings DECIMAL(10,2);
    v_spotter_id UUID;
    v_approval_bonus DECIMAL(10,2);
    v_user_tier TEXT;
BEGIN
    -- Update vote counts on the trend
    IF NEW.is_genuine = true OR NEW.vote = 'verify' THEN
        UPDATE captured_trends
        SET yes_votes = COALESCE(yes_votes, 0) + 1
        WHERE id = NEW.trend_id
        RETURNING yes_votes, no_votes, earnings, spotter_id
        INTO v_yes_votes, v_no_votes, v_trend_earnings, v_spotter_id;
    ELSE
        UPDATE captured_trends
        SET no_votes = COALESCE(no_votes, 0) + 1
        WHERE id = NEW.trend_id
        RETURNING yes_votes, no_votes, earnings, spotter_id
        INTO v_yes_votes, v_no_votes, v_trend_earnings, v_spotter_id;
    END IF;
    
    -- Check if trend should be APPROVED (3+ YES votes) - CHANGED FROM 2 TO 3
    IF v_yes_votes >= 3 AND (SELECT earnings_status FROM captured_trends WHERE id = NEW.trend_id) = 'pending' THEN
        
        -- Mark trend as approved
        UPDATE captured_trends
        SET 
            earnings_status = 'approved',
            status = 'approved'
        WHERE id = NEW.trend_id;
        
        -- Move earnings from pending to approved
        UPDATE user_profiles
        SET 
            pending_earnings = GREATEST(0, COALESCE(pending_earnings, 0) - v_trend_earnings),
            approved_earnings = COALESCE(approved_earnings, 0) + v_trend_earnings
        WHERE id = v_spotter_id;
        
        -- Update earnings ledger
        UPDATE earnings_ledger
        SET status = 'approved'
        WHERE reference_id = NEW.trend_id
        AND reference_type = 'captured_trends'
        AND status = 'pending';
        
        -- Calculate and add approval bonus
        SELECT performance_tier INTO v_user_tier
        FROM user_profiles WHERE id = v_spotter_id;
        
        v_approval_bonus := ROUND(0.50 * get_tier_multiplier(v_user_tier), 2);
        
        -- Add approval bonus to approved earnings
        UPDATE user_profiles
        SET 
            approved_earnings = COALESCE(approved_earnings, 0) + v_approval_bonus,
            total_earned = COALESCE(total_earned, 0) + v_approval_bonus
        WHERE id = v_spotter_id;
        
        -- Record approval bonus in ledger
        INSERT INTO earnings_ledger (
            user_id,
            amount,
            type,
            status,
            description,
            reference_id,
            reference_type
        ) VALUES (
            v_spotter_id,
            v_approval_bonus,
            'approval_bonus',
            'approved',
            format('Approval bonus for trend: $0.50 × %s tier', v_user_tier),
            NEW.trend_id,
            'captured_trends'
        );
        
    -- Check if trend should be REJECTED (3+ NO votes) - CHANGED FROM 2 TO 3
    ELSIF v_no_votes >= 3 AND (SELECT earnings_status FROM captured_trends WHERE id = NEW.trend_id) = 'pending' THEN
        
        -- Mark trend as rejected
        UPDATE captured_trends
        SET 
            earnings_status = 'cancelled',
            status = 'rejected'
        WHERE id = NEW.trend_id;
        
        -- Remove pending earnings
        UPDATE user_profiles
        SET 
            pending_earnings = GREATEST(0, COALESCE(pending_earnings, 0) - v_trend_earnings)
        WHERE id = v_spotter_id;
        
        -- Cancel earnings in ledger
        UPDATE earnings_ledger
        SET 
            status = 'cancelled',
            description = description || ' [CANCELLED: Trend rejected]'
        WHERE reference_id = NEW.trend_id
        AND reference_type = 'captured_trends'
        AND status = 'pending';
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Also update for trend_submissions table (if using that table)
CREATE OR REPLACE FUNCTION handle_trend_submission_validation()
RETURNS TRIGGER AS $$
DECLARE
    v_yes_votes INTEGER;
    v_no_votes INTEGER;
    v_payment_amount DECIMAL(10,2);
    v_spotter_id UUID;
    v_approval_bonus DECIMAL(10,2);
    v_user_tier TEXT;
BEGIN
    -- Update vote counts
    IF NEW.vote = 'verify' THEN
        UPDATE trend_submissions
        SET approve_count = COALESCE(approve_count, 0) + 1
        WHERE id = NEW.trend_id
        RETURNING approve_count, reject_count, payment_amount, spotter_id
        INTO v_yes_votes, v_no_votes, v_payment_amount, v_spotter_id;
    ELSE
        UPDATE trend_submissions
        SET reject_count = COALESCE(reject_count, 0) + 1
        WHERE id = NEW.trend_id
        RETURNING approve_count, reject_count, payment_amount, spotter_id
        INTO v_yes_votes, v_no_votes, v_payment_amount, v_spotter_id;
    END IF;
    
    -- Check for APPROVAL (3 votes) - CHANGED FROM 2 TO 3
    IF v_yes_votes >= 3 AND (SELECT earnings_status FROM trend_submissions WHERE id = NEW.trend_id) = 'pending' THEN
        
        -- Mark as approved
        UPDATE trend_submissions
        SET 
            earnings_status = 'approved',
            status = 'approved',
            validation_status = 'approved'
        WHERE id = NEW.trend_id;
        
        -- Move earnings from pending to approved
        UPDATE user_profiles
        SET 
            earnings_pending = GREATEST(0, COALESCE(earnings_pending, 0) - v_payment_amount),
            earnings_approved = COALESCE(earnings_approved, 0) + v_payment_amount
        WHERE id = v_spotter_id;
        
        -- Update earnings ledger
        UPDATE earnings_ledger
        SET status = 'approved'
        WHERE reference_id = NEW.trend_id
        AND status = 'pending';
        
        -- Add approval bonus
        SELECT performance_tier INTO v_user_tier
        FROM user_profiles WHERE id = v_spotter_id;
        
        v_approval_bonus := ROUND(0.50 * COALESCE(get_tier_multiplier(v_user_tier), 1.0), 2);
        
        UPDATE user_profiles
        SET 
            earnings_approved = COALESCE(earnings_approved, 0) + v_approval_bonus,
            total_earnings = COALESCE(total_earnings, 0) + v_approval_bonus
        WHERE id = v_spotter_id;
        
        -- Record bonus
        INSERT INTO earnings_ledger (
            user_id,
            amount,
            type,
            transaction_type,
            status,
            description,
            reference_id,
            reference_type
        ) VALUES (
            v_spotter_id,
            v_approval_bonus,
            'approval_bonus',
            'approval_bonus',
            'approved',
            format('Approval bonus (3 votes): $0.50 × %s tier', COALESCE(v_user_tier, 'learning')),
            NEW.trend_id,
            'trend_submissions'
        );
        
    -- Check for REJECTION (3 votes) - CHANGED FROM 2 TO 3
    ELSIF v_no_votes >= 3 AND (SELECT earnings_status FROM trend_submissions WHERE id = NEW.trend_id) = 'pending' THEN
        
        -- Mark as rejected
        UPDATE trend_submissions
        SET 
            earnings_status = 'cancelled',
            status = 'rejected',
            validation_status = 'rejected'
        WHERE id = NEW.trend_id;
        
        -- Remove pending earnings
        UPDATE user_profiles
        SET 
            earnings_pending = GREATEST(0, COALESCE(earnings_pending, 0) - v_payment_amount)
        WHERE id = v_spotter_id;
        
        -- Cancel in ledger
        UPDATE earnings_ledger
        SET 
            status = 'cancelled',
            description = description || ' [CANCELLED: 3 reject votes]'
        WHERE reference_id = NEW.trend_id
        AND status = 'pending';
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update the SUSTAINABLE_EARNINGS configuration comment
COMMENT ON FUNCTION handle_validation_vote IS 'Handles trend validation votes - requires 3 votes to approve or reject';
COMMENT ON FUNCTION handle_trend_submission_validation IS 'Handles trend submission validation - requires 3 votes to approve or reject';

-- Verify the change
DO $$
BEGIN
    RAISE NOTICE '✅ VALIDATION THRESHOLD UPDATED TO 3 VOTES';
    RAISE NOTICE '';
    RAISE NOTICE '📊 New Validation Rules:';
    RAISE NOTICE '  • 3 VERIFY votes → Trend APPROVED → Earnings unlocked + $0.50 bonus';
    RAISE NOTICE '  • 3 REJECT votes → Trend CANCELLED → Earnings removed';
    RAISE NOTICE '  • Validators still earn $0.02 per vote instantly';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  IMPORTANT: Update UI to show "3 votes needed" instead of "2 votes needed"';
END $$;