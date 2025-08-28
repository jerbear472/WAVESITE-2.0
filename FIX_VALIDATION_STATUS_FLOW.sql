-- =====================================================
-- FIX VALIDATION STATUS FLOW
-- Changes status from approved/rejected to validated/rejected
-- Removes all money/earnings references
-- =====================================================

BEGIN;

-- 1. Drop old triggers and functions
DROP TRIGGER IF EXISTS update_trend_counts_on_validation ON trend_validations CASCADE;
DROP TRIGGER IF EXISTS handle_trend_approval_trigger ON trend_submissions CASCADE;
DROP TRIGGER IF EXISTS approve_validation_earnings_trigger ON trend_submissions CASCADE;
DROP FUNCTION IF EXISTS update_trend_vote_counts() CASCADE;
DROP FUNCTION IF EXISTS handle_trend_approval() CASCADE;
DROP FUNCTION IF EXISTS approve_validation_earnings() CASCADE;

-- 2. Create new vote counting function with correct status values
CREATE OR REPLACE FUNCTION update_trend_vote_counts()
RETURNS TRIGGER AS $$
DECLARE
    v_trend_id UUID;
    v_approve_count INTEGER;
    v_reject_count INTEGER;
    v_status TEXT;
BEGIN
    -- Determine which trend_id to use
    IF TG_OP = 'DELETE' THEN
        v_trend_id := OLD.trend_id;
    ELSE
        v_trend_id := NEW.trend_id;
    END IF;
    
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
    
    -- Determine validation status (3 votes needed to validate/reject)
    IF v_approve_count >= 3 THEN
        v_status := 'validated';  -- Changed from 'approved' to 'validated'
    ELSIF v_reject_count >= 3 THEN
        v_status := 'rejected';
    ELSIF v_approve_count > 0 OR v_reject_count > 0 THEN
        v_status := 'validating';  -- In progress
    ELSE
        v_status := 'submitted';  -- Initial state
    END IF;
    
    -- Update the trend_submissions table
    UPDATE trend_submissions
    SET 
        approve_count = v_approve_count,
        reject_count = v_reject_count,
        validation_status = v_status,
        status = v_status,  -- Update main status field
        updated_at = NOW()
    WHERE id = v_trend_id;
    
    -- Log the update
    RAISE NOTICE 'Updated trend % - Approves: %, Rejects: %, Status: %', 
        v_trend_id, v_approve_count, v_reject_count, v_status;
    
    -- Award XP bonus when trend is validated (handled by application now)
    -- No earnings or money involved anymore
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 3. Create trigger for vote counting
CREATE TRIGGER update_trend_counts_on_validation
    AFTER INSERT OR UPDATE OR DELETE ON trend_validations
    FOR EACH ROW
    EXECUTE FUNCTION update_trend_vote_counts();

-- 4. Fix existing data - update statuses
UPDATE trend_submissions
SET status = 'validated'
WHERE status = 'approved';

-- Update validation_status to match
UPDATE trend_submissions
SET validation_status = status
WHERE validation_status IS DISTINCT FROM status;

-- 5. Recalculate all vote counts and statuses
WITH vote_counts AS (
    SELECT 
        tv.trend_id,
        COUNT(CASE WHEN tv.vote IN ('verify', 'approve') THEN 1 END) as approve_cnt,
        COUNT(CASE WHEN tv.vote = 'reject' THEN 1 END) as reject_cnt
    FROM trend_validations tv
    GROUP BY tv.trend_id
)
UPDATE trend_submissions ts
SET 
    approve_count = COALESCE(vc.approve_cnt, 0),
    reject_count = COALESCE(vc.reject_cnt, 0),
    validation_status = CASE
        WHEN COALESCE(vc.approve_cnt, 0) >= 3 THEN 'validated'
        WHEN COALESCE(vc.reject_cnt, 0) >= 3 THEN 'rejected'
        WHEN COALESCE(vc.approve_cnt, 0) > 0 OR COALESCE(vc.reject_cnt, 0) > 0 THEN 'validating'
        ELSE 'submitted'
    END,
    status = CASE
        WHEN COALESCE(vc.approve_cnt, 0) >= 3 THEN 'validated'
        WHEN COALESCE(vc.reject_cnt, 0) >= 3 THEN 'rejected'
        WHEN COALESCE(vc.approve_cnt, 0) > 0 OR COALESCE(vc.reject_cnt, 0) > 0 THEN 'validating'
        ELSE 'submitted'
    END
FROM vote_counts vc
WHERE ts.id = vc.trend_id;

-- Set default status for trends with no votes
UPDATE trend_submissions
SET 
    status = COALESCE(status, 'submitted'),
    validation_status = COALESCE(validation_status, 'submitted'),
    approve_count = COALESCE(approve_count, 0),
    reject_count = COALESCE(reject_count, 0)
WHERE status IS NULL OR validation_status IS NULL;

-- 6. Create XP bonus function for validated trends
CREATE OR REPLACE FUNCTION award_validation_xp_bonus()
RETURNS TRIGGER AS $$
BEGIN
    -- When a trend becomes validated, award bonus XP to submitter
    IF NEW.status = 'validated' AND OLD.status != 'validated' THEN
        -- Insert XP transaction for validation bonus
        INSERT INTO xp_transactions (
            user_id,
            amount,
            type,
            description,
            reference_id,
            reference_type,
            created_at
        ) VALUES (
            NEW.spotter_id,
            50,  -- 50 XP bonus for validated trend
            'validation_bonus',
            format('Trend validated: %s', COALESCE(NEW.description, 'Untitled')),
            NEW.id,
            'trend',
            NOW()
        );
        
        -- Update user_xp total
        UPDATE user_xp
        SET 
            total_xp = total_xp + 50,
            updated_at = NOW()
        WHERE user_id = NEW.spotter_id;
        
        RAISE NOTICE 'Awarded 50 XP validation bonus to user % for trend %', NEW.spotter_id, NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger for XP bonus
CREATE TRIGGER award_validation_xp_bonus_trigger
    AFTER UPDATE OF status ON trend_submissions
    FOR EACH ROW
    EXECUTE FUNCTION award_validation_xp_bonus();

-- 8. Award retroactive XP bonuses for already validated trends
DO $$
DECLARE
    v_trend RECORD;
    v_bonus_exists BOOLEAN;
BEGIN
    FOR v_trend IN 
        SELECT id, spotter_id, description
        FROM trend_submissions
        WHERE status = 'validated'
    LOOP
        -- Check if XP bonus already exists
        SELECT EXISTS(
            SELECT 1 FROM xp_transactions
            WHERE reference_id = v_trend.id
            AND type = 'validation_bonus'
        ) INTO v_bonus_exists;
        
        IF NOT v_bonus_exists THEN
            -- Create the missing XP bonus
            INSERT INTO xp_transactions (
                user_id,
                amount,
                type,
                description,
                reference_id,
                reference_type,
                created_at
            ) VALUES (
                v_trend.spotter_id,
                50,
                'validation_bonus',
                format('Trend validated: %s', COALESCE(v_trend.description, 'Untitled')),
                v_trend.id,
                'trend',
                NOW()
            );
            
            -- Update user XP
            UPDATE user_xp
            SET 
                total_xp = total_xp + 50,
                updated_at = NOW()
            WHERE user_id = v_trend.spotter_id;
        END IF;
    END LOOP;
END $$;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check status distribution
SELECT 
    status,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM trend_submissions
GROUP BY status
ORDER BY count DESC;

-- Check recent validations and their effect
SELECT 
    ts.id,
    ts.description,
    ts.status,
    ts.approve_count,
    ts.reject_count,
    ts.updated_at
FROM trend_submissions ts
WHERE ts.updated_at > NOW() - INTERVAL '24 hours'
ORDER BY ts.updated_at DESC
LIMIT 20;

-- Check XP bonuses awarded
SELECT 
    xt.user_id,
    up.username,
    COUNT(CASE WHEN xt.type = 'validation_bonus' THEN 1 END) as validation_bonuses,
    SUM(CASE WHEN xt.type = 'validation_bonus' THEN xt.amount ELSE 0 END) as total_bonus_xp
FROM xp_transactions xt
JOIN user_profiles up ON up.id = xt.user_id
WHERE xt.type = 'validation_bonus'
GROUP BY xt.user_id, up.username
ORDER BY total_bonus_xp DESC
LIMIT 20;

-- Check trigger status
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name IN ('update_trend_counts_on_validation', 'award_validation_xp_bonus_trigger');