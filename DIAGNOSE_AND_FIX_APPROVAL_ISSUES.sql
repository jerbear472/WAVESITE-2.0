-- DIAGNOSE AND FIX APPROVAL ISSUES
-- This script identifies and fixes problems with the approval system

-- ============================================
-- PART 1: DIAGNOSTIC QUERIES
-- ============================================

-- Check the specific problematic trend
SELECT 
    'Trend Details' as check_type,
    ts.id,
    ts.description,
    ts.status,
    ts.approve_count,
    ts.reject_count,
    ts.validation_status,
    ts.spotter_id,
    ts.created_at,
    ts.updated_at
FROM trend_submissions ts
WHERE ts.id = 'eaf97d24-ce55-4a56-a381-225455f2a564';

-- Check actual validation votes for this trend
SELECT 
    'Actual Validations' as check_type,
    tv.id,
    tv.validator_id,
    tv.vote,
    tv.created_at,
    u.username as validator_username
FROM trend_validations tv
LEFT JOIN user_profiles u ON u.id = tv.validator_id
WHERE tv.trend_id = 'eaf97d24-ce55-4a56-a381-225455f2a564'
ORDER BY tv.created_at;

-- Check earnings for this trend
SELECT 
    'Earnings for Trend' as check_type,
    el.id,
    el.user_id,
    el.type,
    el.amount,
    el.status,
    el.created_at,
    u.username
FROM earnings_ledger el
LEFT JOIN user_profiles u ON u.id = el.user_id
WHERE el.reference_id = 'eaf97d24-ce55-4a56-a381-225455f2a564'
   OR el.reference_id IN (
       SELECT id FROM trend_validations 
       WHERE trend_id = 'eaf97d24-ce55-4a56-a381-225455f2a564'
   )
ORDER BY el.created_at;

-- Check for trends approved with less than 3 votes
SELECT 
    'Incorrectly Approved Trends' as check_type,
    COUNT(*) as count,
    MIN(approve_count) as min_approvals,
    MAX(approve_count) as max_approvals
FROM trend_submissions
WHERE status = 'approved'
AND approve_count < 3;

-- List all incorrectly approved trends
SELECT 
    id,
    description,
    status,
    approve_count,
    reject_count,
    spotter_id,
    created_at
FROM trend_submissions
WHERE status = 'approved'
AND approve_count < 3
ORDER BY created_at DESC;

-- ============================================
-- PART 2: FIX THE VOTE COUNT THRESHOLD
-- ============================================

BEGIN;

-- First, let's check if the vote counting function has wrong threshold
-- Drop and recreate with correct threshold
DROP FUNCTION IF EXISTS update_trend_vote_counts() CASCADE;

CREATE OR REPLACE FUNCTION update_trend_vote_counts()
RETURNS TRIGGER AS $$
DECLARE
    v_trend_id UUID;
    v_approve_count INTEGER;
    v_reject_count INTEGER;
    v_status TEXT;
    v_old_status TEXT;
BEGIN
    -- Determine which trend_id to use
    IF TG_OP = 'DELETE' THEN
        v_trend_id := OLD.trend_id;
    ELSE
        v_trend_id := NEW.trend_id;
    END IF;
    
    -- Get the old status before update
    SELECT status INTO v_old_status
    FROM trend_submissions
    WHERE id = v_trend_id;
    
    -- Count approve votes (both 'verify' and 'approve' count as approvals)
    SELECT COUNT(*) INTO v_approve_count
    FROM trend_validations
    WHERE trend_id = v_trend_id
    AND vote IN ('verify', 'approve');
    
    -- Count reject votes
    SELECT COUNT(*) INTO v_reject_count
    FROM trend_validations
    WHERE trend_id = v_trend_id
    AND vote = 'reject';
    
    -- Determine validation status (MUST BE 3 votes to approve/reject)
    IF v_approve_count >= 3 THEN
        v_status := 'approved';
    ELSIF v_reject_count >= 3 THEN
        v_status := 'rejected';
    ELSE
        v_status := 'pending';
    END IF;
    
    -- Update the trend_submissions table
    UPDATE trend_submissions
    SET 
        approve_count = v_approve_count,
        reject_count = v_reject_count,
        validation_status = v_status,
        -- Only update main status if threshold is met
        status = CASE 
            WHEN v_status = 'approved' AND v_approve_count >= 3 THEN 'approved'
            WHEN v_status = 'rejected' AND v_reject_count >= 3 THEN 'rejected'
            ELSE CASE 
                WHEN status IN ('approved', 'rejected') AND v_old_status = status THEN 'pending'
                ELSE status
            END
        END,
        updated_at = NOW()
    WHERE id = v_trend_id;
    
    -- Log the update
    RAISE NOTICE 'Updated trend % - Approves: %, Rejects: %, Status: %', 
        v_trend_id, v_approve_count, v_reject_count, v_status;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER update_trend_counts_on_validation
    AFTER INSERT OR UPDATE OR DELETE ON trend_validations
    FOR EACH ROW
    EXECUTE FUNCTION update_trend_vote_counts();

-- ============================================
-- PART 3: FIX INCORRECTLY APPROVED TRENDS
-- ============================================

-- Reset trends that were approved with less than 3 votes
UPDATE trend_submissions
SET 
    status = 'pending',
    validation_status = 'pending'
WHERE status = 'approved'
AND approve_count < 3;

-- Remove approval bonuses for incorrectly approved trends
DELETE FROM earnings_ledger
WHERE type = 'approval_bonus'
AND reference_id IN (
    SELECT id FROM trend_submissions
    WHERE approve_count < 3
);

-- ============================================
-- PART 4: CREATE MISSING SUBMISSION EARNINGS
-- ============================================

-- Create missing trend submission earnings
DO $$
DECLARE
    v_trend RECORD;
    v_earning_exists BOOLEAN;
BEGIN
    FOR v_trend IN 
        SELECT id, spotter_id, description, created_at
        FROM trend_submissions
        WHERE spotter_id IS NOT NULL
    LOOP
        -- Check if submission earning exists
        SELECT EXISTS(
            SELECT 1 FROM earnings_ledger
            WHERE reference_id = v_trend.id
            AND type = 'trend_submission'
        ) INTO v_earning_exists;
        
        IF NOT v_earning_exists THEN
            -- Create the missing submission earning
            INSERT INTO earnings_ledger (
                user_id,
                type,
                amount,
                status,
                reference_id,
                reference_type,
                description,
                created_at,
                metadata
            ) VALUES (
                v_trend.spotter_id,
                'trend_submission',
                0.25,
                'pending', -- Start as pending
                v_trend.id,
                'trend',
                format('Trend submission: %s', COALESCE(v_trend.description, 'Untitled')),
                v_trend.created_at,
                jsonb_build_object(
                    'retroactive', true,
                    'fixed_at', NOW()
                )
            );
            
            RAISE NOTICE 'Created missing submission earning for trend %', v_trend.id;
        END IF;
    END LOOP;
END $$;

-- ============================================
-- PART 5: CREATE MISSING VALIDATION EARNINGS
-- ============================================

-- Create missing validation earnings
DO $$
DECLARE
    v_validation RECORD;
    v_earning_exists BOOLEAN;
BEGIN
    FOR v_validation IN 
        SELECT id, validator_id, trend_id, vote, created_at
        FROM trend_validations
        WHERE validator_id IS NOT NULL
    LOOP
        -- Check if validation earning exists
        SELECT EXISTS(
            SELECT 1 FROM earnings_ledger
            WHERE reference_id = v_validation.id
            AND type = 'validation'
        ) INTO v_earning_exists;
        
        IF NOT v_earning_exists THEN
            -- Create the missing validation earning
            INSERT INTO earnings_ledger (
                user_id,
                type,
                amount,
                status,
                reference_id,
                reference_type,
                description,
                created_at,
                metadata
            ) VALUES (
                v_validation.validator_id,
                'validation',
                0.02,
                'pending', -- Start as pending
                v_validation.id,
                'validation',
                format('Validation vote: %s', v_validation.vote),
                v_validation.created_at,
                jsonb_build_object(
                    'trend_id', v_validation.trend_id,
                    'vote', v_validation.vote,
                    'retroactive', true,
                    'fixed_at', NOW()
                )
            );
            
            RAISE NOTICE 'Created missing validation earning for %', v_validation.id;
        END IF;
    END LOOP;
END $$;

-- ============================================
-- PART 6: RECALCULATE ALL VOTE COUNTS
-- ============================================

-- Force recalculation of all vote counts
WITH actual_counts AS (
    SELECT 
        tv.trend_id,
        COUNT(CASE WHEN tv.vote IN ('verify', 'approve') THEN 1 END) as approve_cnt,
        COUNT(CASE WHEN tv.vote = 'reject' THEN 1 END) as reject_cnt
    FROM trend_validations tv
    GROUP BY tv.trend_id
)
UPDATE trend_submissions ts
SET 
    approve_count = COALESCE(ac.approve_cnt, 0),
    reject_count = COALESCE(ac.reject_cnt, 0),
    validation_status = CASE
        WHEN COALESCE(ac.approve_cnt, 0) >= 3 THEN 'approved'
        WHEN COALESCE(ac.reject_cnt, 0) >= 3 THEN 'rejected'
        ELSE 'pending'
    END,
    status = CASE
        WHEN COALESCE(ac.approve_cnt, 0) >= 3 THEN 'approved'
        WHEN COALESCE(ac.reject_cnt, 0) >= 3 THEN 'rejected'
        ELSE CASE 
            WHEN ts.status IN ('submitted', 'validating', 'pending') THEN ts.status
            ELSE 'pending'
        END
    END
FROM actual_counts ac
WHERE ts.id = ac.trend_id;

-- Set proper defaults for trends with no validations
UPDATE trend_submissions
SET 
    approve_count = COALESCE(approve_count, 0),
    reject_count = COALESCE(reject_count, 0),
    validation_status = COALESCE(validation_status, 'pending')
WHERE approve_count IS NULL OR reject_count IS NULL;

COMMIT;

-- ============================================
-- PART 7: FINAL VERIFICATION
-- ============================================

-- Check the specific trend again
SELECT 
    'After Fix - Trend Status' as report,
    ts.id,
    ts.status,
    ts.approve_count,
    ts.reject_count,
    COUNT(DISTINCT tv.id) as actual_validations,
    COUNT(DISTINCT el_sub.id) as submission_earnings,
    COUNT(DISTINCT el_val.id) as validation_earnings,
    COUNT(DISTINCT el_bonus.id) as bonus_count
FROM trend_submissions ts
LEFT JOIN trend_validations tv ON tv.trend_id = ts.id
LEFT JOIN earnings_ledger el_sub ON el_sub.reference_id = ts.id AND el_sub.type = 'trend_submission'
LEFT JOIN earnings_ledger el_val ON el_val.reference_id = tv.id AND el_val.type = 'validation'
LEFT JOIN earnings_ledger el_bonus ON el_bonus.reference_id = ts.id AND el_bonus.type = 'approval_bonus'
WHERE ts.id = 'eaf97d24-ce55-4a56-a381-225455f2a564'
GROUP BY ts.id, ts.status, ts.approve_count, ts.reject_count;

-- Summary of all fixes
SELECT 
    'Fix Summary' as report,
    COUNT(CASE WHEN status = 'approved' AND approve_count >= 3 THEN 1 END) as correctly_approved,
    COUNT(CASE WHEN status = 'approved' AND approve_count < 3 THEN 1 END) as still_incorrect,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_trends,
    COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_trends
FROM trend_submissions;

-- Check earnings totals
SELECT 
    'Earnings Summary' as report,
    type,
    COUNT(*) as count,
    SUM(amount) as total_amount,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count
FROM earnings_ledger
GROUP BY type
ORDER BY type;