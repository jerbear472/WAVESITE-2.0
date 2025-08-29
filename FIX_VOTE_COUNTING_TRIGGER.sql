-- =====================================================
-- FIX VOTE COUNTING TRIGGER
-- Ensures votes are properly counted and status updated
-- =====================================================

BEGIN;

-- 1. Drop existing trigger and function
DROP TRIGGER IF EXISTS update_trend_counts_on_validation ON trend_validations CASCADE;
DROP FUNCTION IF EXISTS update_trend_vote_counts() CASCADE;

-- 2. Create improved vote counting function
CREATE OR REPLACE FUNCTION update_trend_vote_counts()
RETURNS TRIGGER AS $$
DECLARE
    v_trend_id UUID;
    v_approve_count INTEGER;
    v_reject_count INTEGER;
    v_total_count INTEGER;
    v_status TEXT;
    v_old_status TEXT;
BEGIN
    -- Determine which trend_id to use
    IF TG_OP = 'DELETE' THEN
        v_trend_id := OLD.trend_id;
    ELSE
        v_trend_id := NEW.trend_id;
    END IF;
    
    -- Get current status before update
    SELECT status INTO v_old_status
    FROM trend_submissions
    WHERE id = v_trend_id;
    
    -- Count approve votes (both 'verify' and 'approve' count as approvals)
    -- Also check is_valid field for backwards compatibility
    SELECT COUNT(*) INTO v_approve_count
    FROM trend_validations
    WHERE trend_id = v_trend_id
    AND (vote IN ('verify', 'approve') OR (vote IS NULL AND is_valid = true));
    
    -- Count reject votes
    SELECT COUNT(*) INTO v_reject_count
    FROM trend_validations
    WHERE trend_id = v_trend_id
    AND (vote = 'reject' OR (vote IS NULL AND is_valid = false));
    
    -- Count total validations
    v_total_count := v_approve_count + v_reject_count;
    
    -- Determine validation status (3 votes needed to validate/reject)
    IF v_approve_count >= 3 THEN
        v_status := 'validated';
    ELSIF v_reject_count >= 3 THEN
        v_status := 'rejected';
    ELSIF v_total_count > 0 THEN
        v_status := 'validating';
    ELSE
        v_status := 'submitted';
    END IF;
    
    -- Update the trend_submissions table
    UPDATE trend_submissions
    SET 
        approve_count = v_approve_count,
        reject_count = v_reject_count,
        validation_count = v_total_count,
        validation_status = v_status,
        status = v_status,
        updated_at = NOW()
    WHERE id = v_trend_id;
    
    -- Log the update for debugging
    RAISE NOTICE 'Updated trend % - Approves: %, Rejects: %, Total: %, Status: % -> %', 
        v_trend_id, v_approve_count, v_reject_count, v_total_count, v_old_status, v_status;
    
    -- Award XP bonus when trend is validated (50 XP to submitter)
    IF v_status = 'validated' AND v_old_status != 'validated' THEN
        PERFORM award_validation_bonus_xp(v_trend_id);
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 3. Create XP bonus function
CREATE OR REPLACE FUNCTION award_validation_bonus_xp(p_trend_id UUID)
RETURNS VOID AS $$
DECLARE
    v_spotter_id UUID;
    v_trend_title TEXT;
BEGIN
    -- Get trend details
    SELECT spotter_id, description INTO v_spotter_id, v_trend_title
    FROM trend_submissions
    WHERE id = p_trend_id;
    
    -- Check if bonus already exists
    IF NOT EXISTS (
        SELECT 1 FROM xp_transactions
        WHERE reference_id = p_trend_id
        AND type = 'validation_bonus'
        AND user_id = v_spotter_id
    ) THEN
        -- Award 50 XP bonus
        INSERT INTO xp_transactions (
            user_id,
            amount,
            type,
            description,
            reference_id,
            reference_type,
            created_at
        ) VALUES (
            v_spotter_id,
            50,
            'validation_bonus',
            format('Trend validated: %s', COALESCE(v_trend_title, 'Untitled')),
            p_trend_id,
            'trend',
            NOW()
        );
        
        -- Update user_xp total
        UPDATE user_xp
        SET 
            total_xp = total_xp + 50,
            updated_at = NOW()
        WHERE user_id = v_spotter_id;
        
        RAISE NOTICE 'Awarded 50 XP validation bonus to user % for trend %', v_spotter_id, p_trend_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger
CREATE TRIGGER update_trend_counts_on_validation
    AFTER INSERT OR UPDATE OR DELETE ON trend_validations
    FOR EACH ROW
    EXECUTE FUNCTION update_trend_vote_counts();

-- 5. Fix existing data - recalculate all vote counts
WITH vote_counts AS (
    SELECT 
        tv.trend_id,
        COUNT(CASE WHEN tv.vote IN ('verify', 'approve') OR (tv.vote IS NULL AND tv.is_valid = true) THEN 1 END) as approve_cnt,
        COUNT(CASE WHEN tv.vote = 'reject' OR (tv.vote IS NULL AND tv.is_valid = false) THEN 1 END) as reject_cnt,
        COUNT(*) as total_cnt
    FROM trend_validations tv
    GROUP BY tv.trend_id
)
UPDATE trend_submissions ts
SET 
    approve_count = COALESCE(vc.approve_cnt, 0),
    reject_count = COALESCE(vc.reject_cnt, 0),
    validation_count = COALESCE(vc.total_cnt, 0),
    validation_status = CASE
        WHEN COALESCE(vc.approve_cnt, 0) >= 3 THEN 'validated'
        WHEN COALESCE(vc.reject_cnt, 0) >= 3 THEN 'rejected'
        WHEN COALESCE(vc.total_cnt, 0) > 0 THEN 'validating'
        ELSE 'submitted'
    END,
    status = CASE
        WHEN COALESCE(vc.approve_cnt, 0) >= 3 THEN 'validated'
        WHEN COALESCE(vc.reject_cnt, 0) >= 3 THEN 'rejected'
        WHEN COALESCE(vc.total_cnt, 0) > 0 THEN 'validating'
        ELSE 'submitted'
    END
FROM vote_counts vc
WHERE ts.id = vc.trend_id;

-- Set defaults for trends with no votes
UPDATE trend_submissions
SET 
    approve_count = COALESCE(approve_count, 0),
    reject_count = COALESCE(reject_count, 0),
    validation_count = COALESCE(validation_count, 0),
    status = COALESCE(status, 'submitted'),
    validation_status = COALESCE(validation_status, 'submitted')
WHERE status IS NULL OR validation_status IS NULL;

-- 6. Award retroactive XP bonuses for validated trends
DO $$
DECLARE
    v_trend RECORD;
BEGIN
    FOR v_trend IN 
        SELECT id, spotter_id, description
        FROM trend_submissions
        WHERE status = 'validated'
    LOOP
        PERFORM award_validation_bonus_xp(v_trend.id);
    END LOOP;
END $$;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check vote counts
SELECT 
    status,
    COUNT(*) as count,
    AVG(approve_count) as avg_approves,
    AVG(reject_count) as avg_rejects,
    AVG(validation_count) as avg_total
FROM trend_submissions
GROUP BY status
ORDER BY count DESC;

-- Check recent validations
SELECT 
    ts.id,
    ts.description,
    ts.status,
    ts.approve_count,
    ts.reject_count,
    ts.validation_count,
    ts.updated_at
FROM trend_submissions ts
WHERE ts.validation_count > 0
ORDER BY ts.updated_at DESC
LIMIT 20;

-- Check XP bonuses
SELECT 
    COUNT(*) as bonus_count,
    SUM(amount) as total_bonus_xp
FROM xp_transactions
WHERE type = 'validation_bonus';

-- Check trigger status
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'update_trend_counts_on_validation';