-- COMPLETE TREND APPROVAL AND EARNINGS SYSTEM
-- This handles the entire workflow from validation to earnings approval
-- Run this to enable automatic approval bonuses and earnings transitions

BEGIN;

-- ============================================
-- PART 1: CREATE APPROVAL HANDLER FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION handle_trend_approval()
RETURNS TRIGGER AS $$
DECLARE
    v_spotter_id UUID;
    v_submission_earning NUMERIC;
    v_approval_bonus NUMERIC := 0.50; -- $0.50 approval bonus
BEGIN
    -- Only process when trend becomes approved
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        
        -- Get the spotter (submitter) ID
        v_spotter_id := NEW.spotter_id;
        
        -- 1. Create approval bonus in earnings_ledger
        INSERT INTO earnings_ledger (
            user_id,
            type,
            amount,
            status,
            reference_id,
            reference_type,
            description,
            metadata
        ) VALUES (
            v_spotter_id,
            'approval_bonus',
            v_approval_bonus,
            'approved', -- Bonus is immediately approved
            NEW.id,
            'trend',
            format('Approval bonus for trend: %s', COALESCE(NEW.description, 'Untitled')),
            jsonb_build_object(
                'trend_id', NEW.id,
                'approved_at', NOW(),
                'approve_count', NEW.approve_count
            )
        );
        
        -- 2. Update original submission earning from pending to approved
        UPDATE earnings_ledger
        SET 
            status = 'approved',
            metadata = COALESCE(earnings_ledger.metadata, '{}'::jsonb) || 
                      jsonb_build_object('approved_at', NOW())
        WHERE reference_id = NEW.id
        AND type = 'trend_submission'
        AND status = 'pending';
        
        -- 3. Update user_profiles with new earnings
        UPDATE user_profiles
        SET 
            -- Move submission earning from pending to approved
            pending_earnings = GREATEST(0, 
                COALESCE(pending_earnings, 0) - 0.25),
            approved_earnings = COALESCE(approved_earnings, 0) + 0.25 + v_approval_bonus,
            -- Add bonus to total
            total_earned = COALESCE(total_earned, 0) + v_approval_bonus,
            -- Increment approved trends counter
            trends_spotted = COALESCE(trends_spotted, 0) + 1
        WHERE id = v_spotter_id;
        
        RAISE NOTICE 'Trend % approved. Bonus paid to user %', NEW.id, v_spotter_id;
        
    ELSIF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
        
        -- Handle rejection: Remove from pending but don't add to approved
        v_spotter_id := NEW.spotter_id;
        
        -- Update submission earning to rejected status
        UPDATE earnings_ledger
        SET 
            status = 'rejected',
            metadata = COALESCE(earnings_ledger.metadata, '{}'::jsonb) || 
                      jsonb_build_object('rejected_at', NOW())
        WHERE reference_id = NEW.id
        AND type = 'trend_submission'
        AND status = 'pending';
        
        -- Remove from pending earnings in user_profiles
        UPDATE user_profiles
        SET 
            pending_earnings = GREATEST(0, 
                COALESCE(pending_earnings, 0) - 0.25)
        WHERE id = v_spotter_id;
        
        RAISE NOTICE 'Trend % rejected. Earnings removed for user %', NEW.id, v_spotter_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for trend approval
DROP TRIGGER IF EXISTS handle_trend_approval_trigger ON trend_submissions;
CREATE TRIGGER handle_trend_approval_trigger
    AFTER UPDATE OF status ON trend_submissions
    FOR EACH ROW
    EXECUTE FUNCTION handle_trend_approval();

-- ============================================
-- PART 2: CREATE VALIDATION EARNINGS APPROVER
-- ============================================

CREATE OR REPLACE FUNCTION approve_validation_earnings()
RETURNS TRIGGER AS $$
BEGIN
    -- When a trend is finalized (approved or rejected),
    -- approve all validation earnings for that trend
    IF (NEW.status IN ('approved', 'rejected')) AND 
       (OLD.status NOT IN ('approved', 'rejected')) THEN
        
        -- Update all validation earnings for this trend to approved
        UPDATE earnings_ledger el
        SET 
            status = 'approved',
            metadata = COALESCE(el.metadata, '{}'::jsonb) || 
                      jsonb_build_object(
                          'trend_outcome', NEW.status,
                          'finalized_at', NOW()
                      )
        FROM trend_validations tv
        WHERE el.reference_id = tv.id
        AND el.type = 'validation'
        AND el.status = 'pending'
        AND tv.trend_id = NEW.id;
        
        -- Update user_profiles for all validators
        WITH validator_earnings AS (
            SELECT 
                tv.validator_id,
                COUNT(*) * 0.02 as total_validation_earnings
            FROM trend_validations tv
            WHERE tv.trend_id = NEW.id
            GROUP BY tv.validator_id
        )
        UPDATE user_profiles up
        SET 
            pending_earnings = GREATEST(0, 
                COALESCE(pending_earnings, 0) - ve.total_validation_earnings),
            approved_earnings = COALESCE(approved_earnings, 0) + ve.total_validation_earnings
        FROM validator_earnings ve
        WHERE up.id = ve.validator_id;
        
        RAISE NOTICE 'Approved validation earnings for trend %', NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for validation earnings approval
DROP TRIGGER IF EXISTS approve_validation_earnings_trigger ON trend_submissions;
CREATE TRIGGER approve_validation_earnings_trigger
    AFTER UPDATE OF status ON trend_submissions
    FOR EACH ROW
    EXECUTE FUNCTION approve_validation_earnings();

-- ============================================
-- PART 3: FIX EXISTING DATA
-- ============================================

-- Fix already approved trends that didn't get bonuses
DO $$
DECLARE
    v_trend RECORD;
    v_bonus_exists BOOLEAN;
    v_fixed_count INTEGER := 0;
BEGIN
    FOR v_trend IN 
        SELECT id, spotter_id, description, approve_count
        FROM trend_submissions
        WHERE status = 'approved'
    LOOP
        -- Check if bonus already exists
        SELECT EXISTS(
            SELECT 1 FROM earnings_ledger
            WHERE reference_id = v_trend.id
            AND type = 'approval_bonus'
        ) INTO v_bonus_exists;
        
        IF NOT v_bonus_exists THEN
            -- Create the missing bonus
            INSERT INTO earnings_ledger (
                user_id,
                type,
                amount,
                status,
                reference_id,
                reference_type,
                description,
                metadata
            ) VALUES (
                v_trend.spotter_id,
                'approval_bonus',
                0.50,
                'approved',
                v_trend.id,
                'trend',
                format('Approval bonus for trend: %s', COALESCE(v_trend.description, 'Untitled')),
                jsonb_build_object(
                    'trend_id', v_trend.id,
                    'retroactive', true,
                    'fixed_at', NOW()
                )
            );
            
            v_fixed_count := v_fixed_count + 1;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Created % missing approval bonuses', v_fixed_count;
END $$;

-- Update all pending validation earnings for already finalized trends
UPDATE earnings_ledger el
SET 
    status = 'approved',
    metadata = COALESCE(el.metadata, '{}'::jsonb) || 
              jsonb_build_object('retroactive_approval', true)
FROM trend_validations tv
JOIN trend_submissions ts ON tv.trend_id = ts.id
WHERE el.reference_id = tv.id
AND el.type = 'validation'
AND el.status = 'pending'
AND ts.status IN ('approved', 'rejected');

-- Update trend submission earnings that should be approved
UPDATE earnings_ledger el
SET 
    status = 'approved',
    metadata = COALESCE(el.metadata, '{}'::jsonb) || 
              jsonb_build_object('retroactive_approval', true)
FROM trend_submissions ts
WHERE el.reference_id = ts.id
AND el.type = 'trend_submission'
AND el.status = 'pending'
AND ts.status = 'approved';

-- Recalculate user_profiles based on earnings_ledger
WITH user_earnings AS (
    SELECT 
        user_id,
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_total,
        SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as approved_total,
        SUM(CASE WHEN status IN ('pending', 'approved') THEN amount ELSE 0 END) as total
    FROM earnings_ledger
    GROUP BY user_id
)
UPDATE user_profiles up
SET 
    pending_earnings = ue.pending_total,
    approved_earnings = ue.approved_total,
    total_earned = ue.total
FROM user_earnings ue
WHERE up.id = ue.user_id;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Summary of fixes applied
SELECT 
    'Approval System Status' as report_type,
    COUNT(DISTINCT CASE WHEN type = 'approval_bonus' THEN reference_id END) as trends_with_bonus,
    COUNT(CASE WHEN type = 'approval_bonus' THEN 1 END) as total_bonuses,
    SUM(CASE WHEN type = 'approval_bonus' THEN amount ELSE 0 END) as total_bonus_amount,
    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_earnings,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_earnings
FROM earnings_ledger;

-- Check if triggers are active
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name IN ('handle_trend_approval_trigger', 'approve_validation_earnings_trigger');

-- Show recent trend approvals and their earnings
SELECT 
    ts.id,
    ts.description,
    ts.status,
    ts.approve_count,
    ts.updated_at,
    COALESCE(el.bonus_amount, 0) as approval_bonus,
    COALESCE(el.submission_amount, 0) as submission_earning,
    COALESCE(el.validation_count, 0) as validations_paid
FROM trend_submissions ts
LEFT JOIN LATERAL (
    SELECT 
        SUM(CASE WHEN type = 'approval_bonus' THEN amount ELSE 0 END) as bonus_amount,
        SUM(CASE WHEN type = 'trend_submission' THEN amount ELSE 0 END) as submission_amount,
        COUNT(CASE WHEN type = 'validation' THEN 1 END) as validation_count
    FROM earnings_ledger
    WHERE reference_id = ts.id 
       OR reference_id IN (SELECT id FROM trend_validations WHERE trend_id = ts.id)
) el ON true
WHERE ts.status = 'approved'
ORDER BY ts.updated_at DESC
LIMIT 10;