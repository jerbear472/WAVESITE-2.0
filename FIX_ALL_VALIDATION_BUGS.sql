-- ============================================
-- FIX ALL VALIDATION AND EARNINGS BUGS
-- ============================================

BEGIN;

-- ============================================
-- PART 1: FIX VALIDATION_STATUS FIELD TYPE
-- ============================================

-- The validation_status field should be TEXT, not earning_status enum
-- Check current type and fix if needed
DO $$
BEGIN
    -- Check if validation_status is using wrong enum type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'trend_submissions'
        AND column_name = 'validation_status'
        AND udt_name = 'earning_status'
    ) THEN
        -- Convert to TEXT type
        ALTER TABLE trend_submissions 
        ALTER COLUMN validation_status TYPE TEXT 
        USING validation_status::TEXT;
        
        RAISE NOTICE 'Fixed validation_status column type from earning_status to TEXT';
    END IF;
END $$;

-- ============================================
-- PART 2: DROP AND RECREATE VOTE COUNTING TRIGGER
-- ============================================

DROP TRIGGER IF EXISTS update_trend_counts_on_validation ON trend_validations CASCADE;
DROP FUNCTION IF EXISTS update_trend_vote_counts() CASCADE;

CREATE OR REPLACE FUNCTION update_trend_vote_counts()
RETURNS TRIGGER AS $$
DECLARE
    v_trend_id UUID;
    v_approve_count INTEGER;
    v_reject_count INTEGER;
    v_old_status TEXT;
    v_new_status TEXT;
    v_validation_status TEXT;
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
    
    -- Determine new status based on vote counts (3 votes required)
    IF v_approve_count >= 3 THEN
        v_new_status := 'approved';
        v_validation_status := 'approved';
    ELSIF v_reject_count >= 3 THEN
        v_new_status := 'rejected';
        v_validation_status := 'rejected';
    ELSIF v_approve_count > 0 OR v_reject_count > 0 THEN
        v_new_status := 'validating';
        v_validation_status := 'validating';
    ELSE
        v_new_status := 'submitted';
        v_validation_status := 'pending';
    END IF;
    
    -- Update the trend_submissions table
    UPDATE trend_submissions
    SET 
        approve_count = v_approve_count,
        reject_count = v_reject_count,
        validation_status = v_validation_status,
        status = v_new_status::trend_status,
        updated_at = NOW()
    WHERE id = v_trend_id;
    
    RAISE NOTICE 'Trend % updated: Approves=%, Rejects=%, Status=% -> %', 
        v_trend_id, v_approve_count, v_reject_count, v_old_status, v_new_status;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_trend_counts_on_validation
    AFTER INSERT OR UPDATE OR DELETE ON trend_validations
    FOR EACH ROW
    EXECUTE FUNCTION update_trend_vote_counts();

-- ============================================
-- PART 3: FIX VALIDATION EARNINGS CREATION
-- ============================================

-- Drop old validation earnings triggers
DROP TRIGGER IF EXISTS on_trend_validation_create ON trend_validations CASCADE;
DROP FUNCTION IF EXISTS handle_validation_earnings() CASCADE;

-- Create proper validation earnings trigger
CREATE OR REPLACE FUNCTION create_validation_earning()
RETURNS TRIGGER AS $$
DECLARE
    v_existing_earning UUID;
BEGIN
    -- Check if earning already exists
    SELECT id INTO v_existing_earning
    FROM earnings_ledger
    WHERE reference_id = NEW.id
    AND type IN ('validation', 'trend_validation');
    
    -- Only create if doesn't exist
    IF v_existing_earning IS NULL THEN
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
            NEW.validator_id,
            'validation',
            0.02,  -- MUST BE $0.02
            'pending',
            NEW.id,
            'validation',
            format('Validation vote: %s', NEW.vote),
            jsonb_build_object(
                'trend_id', NEW.trend_id,
                'vote', NEW.vote,
                'created_at', NEW.created_at
            )
        );
        
        RAISE NOTICE 'Created validation earning for user % on trend %', 
            NEW.validator_id, NEW.trend_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_validation_earning_trigger
    AFTER INSERT ON trend_validations
    FOR EACH ROW
    EXECUTE FUNCTION create_validation_earning();

-- ============================================
-- PART 4: FIX SUBMISSION EARNINGS CREATION
-- ============================================

-- Drop old submission earnings triggers
DROP TRIGGER IF EXISTS on_trend_submission_create ON trend_submissions CASCADE;
DROP FUNCTION IF EXISTS handle_trend_submission_earnings() CASCADE;

-- Create proper submission earnings trigger
CREATE OR REPLACE FUNCTION create_submission_earning()
RETURNS TRIGGER AS $$
DECLARE
    v_existing_earning UUID;
BEGIN
    -- Check if earning already exists
    SELECT id INTO v_existing_earning
    FROM earnings_ledger
    WHERE reference_id = NEW.id
    AND type = 'trend_submission';
    
    -- Only create if doesn't exist and spotter_id is set
    IF v_existing_earning IS NULL AND NEW.spotter_id IS NOT NULL THEN
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
            NEW.spotter_id,
            'trend_submission',
            0.25,  -- Base submission earning
            'pending',
            NEW.id,
            'trend',
            format('Trend submission: %s', LEFT(COALESCE(NEW.description, 'Untitled'), 100)),
            jsonb_build_object(
                'trend_id', NEW.id,
                'created_at', NEW.created_at
            )
        );
        
        RAISE NOTICE 'Created submission earning for user % on trend %', 
            NEW.spotter_id, NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_submission_earning_trigger
    AFTER INSERT ON trend_submissions
    FOR EACH ROW
    EXECUTE FUNCTION create_submission_earning();

-- ============================================
-- PART 5: REINSTALL APPROVAL SYSTEM
-- ============================================

-- Drop and recreate approval handler
DROP TRIGGER IF EXISTS handle_trend_approval_trigger ON trend_submissions CASCADE;
DROP FUNCTION IF EXISTS handle_trend_approval() CASCADE;

CREATE OR REPLACE FUNCTION handle_trend_approval()
RETURNS TRIGGER AS $$
DECLARE
    v_spotter_id UUID;
    v_bonus_exists BOOLEAN;
BEGIN
    -- Only process status changes
    IF NEW.status = OLD.status THEN
        RETURN NEW;
    END IF;
    
    -- Handle approval
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        v_spotter_id := NEW.spotter_id;
        
        -- Check if bonus already exists
        SELECT EXISTS(
            SELECT 1 FROM earnings_ledger
            WHERE reference_id = NEW.id
            AND type = 'approval_bonus'
        ) INTO v_bonus_exists;
        
        -- Create approval bonus if doesn't exist
        IF NOT v_bonus_exists AND v_spotter_id IS NOT NULL THEN
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
                0.50,
                'approved',
                NEW.id,
                'trend',
                format('Approval bonus for trend: %s', LEFT(COALESCE(NEW.description, 'Untitled'), 100)),
                jsonb_build_object(
                    'trend_id', NEW.id,
                    'approved_at', NOW(),
                    'approve_count', NEW.approve_count
                )
            );
        END IF;
        
        -- Approve submission earning
        UPDATE earnings_ledger
        SET 
            status = 'approved',
            metadata = COALESCE(metadata, '{}'::jsonb) || 
                      jsonb_build_object('approved_at', NOW())
        WHERE reference_id = NEW.id
        AND type = 'trend_submission'
        AND status = 'pending';
        
        -- Approve all validation earnings for this trend
        UPDATE earnings_ledger el
        SET 
            status = 'approved',
            metadata = COALESCE(el.metadata, '{}'::jsonb) || 
                      jsonb_build_object(
                          'trend_outcome', 'approved',
                          'approved_at', NOW()
                      )
        FROM trend_validations tv
        WHERE el.reference_id = tv.id
        AND el.type = 'validation'
        AND el.status = 'pending'
        AND tv.trend_id = NEW.id;
        
        RAISE NOTICE 'Trend % approved. Earnings updated for spotter %', NEW.id, v_spotter_id;
        
    -- Handle rejection
    ELSIF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
        v_spotter_id := NEW.spotter_id;
        
        -- Cancel submission earning
        UPDATE earnings_ledger
        SET 
            status = 'cancelled',
            metadata = COALESCE(metadata, '{}'::jsonb) || 
                      jsonb_build_object('rejected_at', NOW())
        WHERE reference_id = NEW.id
        AND type = 'trend_submission'
        AND status = 'pending';
        
        -- Still approve validation earnings (validators get paid regardless)
        UPDATE earnings_ledger el
        SET 
            status = 'approved',
            metadata = COALESCE(el.metadata, '{}'::jsonb) || 
                      jsonb_build_object(
                          'trend_outcome', 'rejected',
                          'approved_at', NOW()
                      )
        FROM trend_validations tv
        WHERE el.reference_id = tv.id
        AND el.type = 'validation'
        AND el.status = 'pending'
        AND tv.trend_id = NEW.id;
        
        RAISE NOTICE 'Trend % rejected. Submission cancelled for user %', NEW.id, v_spotter_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_trend_approval_trigger
    AFTER UPDATE OF status ON trend_submissions
    FOR EACH ROW
    EXECUTE FUNCTION handle_trend_approval();

-- ============================================
-- PART 6: FIX EXISTING DATA
-- ============================================

-- Fix validation amounts that are wrong
UPDATE earnings_ledger
SET amount = 0.02
WHERE type IN ('validation', 'trend_validation')
AND amount != 0.02;

-- Remove duplicate validation earnings
WITH duplicates AS (
    SELECT 
        reference_id,
        MIN(id) as keep_id
    FROM earnings_ledger
    WHERE type IN ('validation', 'trend_validation')
    GROUP BY reference_id
    HAVING COUNT(*) > 1
)
DELETE FROM earnings_ledger el
USING duplicates d
WHERE el.reference_id = d.reference_id
AND el.type IN ('validation', 'trend_validation')
AND el.id != d.keep_id;

-- Remove duplicate submission earnings
WITH duplicates AS (
    SELECT 
        reference_id,
        MIN(id) as keep_id
    FROM earnings_ledger
    WHERE type = 'trend_submission'
    GROUP BY reference_id
    HAVING COUNT(*) > 1
)
DELETE FROM earnings_ledger el
USING duplicates d
WHERE el.reference_id = d.reference_id
AND el.type = 'trend_submission'
AND el.id != d.keep_id;

-- Fix vote counts for all trends
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
        WHEN COALESCE(ac.approve_cnt, 0) > 0 OR COALESCE(ac.reject_cnt, 0) > 0 THEN 'validating'
        ELSE 'pending'
    END,
    status = CASE
        WHEN COALESCE(ac.approve_cnt, 0) >= 3 THEN 'approved'::trend_status
        WHEN COALESCE(ac.reject_cnt, 0) >= 3 THEN 'rejected'::trend_status
        WHEN COALESCE(ac.approve_cnt, 0) > 0 OR COALESCE(ac.reject_cnt, 0) > 0 THEN 'validating'::trend_status
        ELSE 'submitted'::trend_status
    END
FROM actual_counts ac
WHERE ts.id = ac.trend_id;

-- Set defaults for trends with no votes
UPDATE trend_submissions
SET 
    approve_count = COALESCE(approve_count, 0),
    reject_count = COALESCE(reject_count, 0),
    validation_status = COALESCE(validation_status, 'pending'),
    status = COALESCE(status, 'submitted')
WHERE approve_count IS NULL OR reject_count IS NULL;

-- ============================================
-- PART 7: RECALCULATE USER PROFILES
-- ============================================

WITH user_totals AS (
    SELECT 
        user_id,
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_total,
        SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as approved_total,
        SUM(CASE WHEN status IN ('pending', 'approved') THEN amount ELSE 0 END) as total_earned
    FROM earnings_ledger
    GROUP BY user_id
)
UPDATE user_profiles up
SET 
    pending_earnings = ut.pending_total,
    approved_earnings = ut.approved_total,
    total_earned = ut.total_earned
FROM user_totals ut
WHERE up.id = ut.user_id;

COMMIT;

-- ============================================
-- VERIFICATION
-- ============================================

-- Summary of fixes
SELECT 'FIXES APPLIED' as report;

SELECT 
    'Trigger Status' as check,
    trigger_name,
    event_object_table,
    action_timing || ' ' || event_manipulation as when_fires
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name IN (
    'update_trend_counts_on_validation',
    'create_validation_earning_trigger',
    'create_submission_earning_trigger',
    'handle_trend_approval_trigger'
)
ORDER BY trigger_name;

SELECT 
    'Vote Thresholds' as check,
    COUNT(CASE WHEN status = 'approved' AND approve_count >= 3 THEN 1 END) as correctly_approved,
    COUNT(CASE WHEN status = 'approved' AND approve_count < 3 THEN 1 END) as wrongly_approved,
    COUNT(CASE WHEN status = 'rejected' AND reject_count >= 3 THEN 1 END) as correctly_rejected,
    COUNT(CASE WHEN status = 'rejected' AND reject_count < 3 THEN 1 END) as wrongly_rejected
FROM trend_submissions;

SELECT 
    'Earnings Status' as check,
    type,
    status,
    COUNT(*) as count,
    SUM(amount) as total_amount
FROM earnings_ledger
GROUP BY type, status
ORDER BY type, status;

SELECT 
    'System Health' as check,
    (SELECT COUNT(*) FROM trend_submissions WHERE status = 'approved') as approved_trends,
    (SELECT COUNT(*) FROM earnings_ledger WHERE type = 'approval_bonus') as approval_bonuses,
    (SELECT COUNT(*) FROM earnings_ledger WHERE type = 'validation' AND amount = 0.02) as correct_validations,
    (SELECT COUNT(*) FROM earnings_ledger WHERE type = 'validation' AND amount != 0.02) as wrong_validations;