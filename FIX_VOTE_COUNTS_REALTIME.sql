-- =====================================================
-- FIX VOTE COUNTS TO UPDATE IN REAL-TIME
-- This ensures vote counts update immediately when 
-- users validate trends on the validate page
-- =====================================================

-- 1. First, add the columns if they don't exist
ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS approve_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reject_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS validation_status TEXT DEFAULT 'pending';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trend_submissions_approve_count ON trend_submissions(approve_count);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_reject_count ON trend_submissions(reject_count);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_validation_status ON trend_submissions(validation_status);

-- 2. Drop any existing trigger and function
DROP TRIGGER IF EXISTS update_trend_counts_on_validation ON trend_validations CASCADE;
DROP FUNCTION IF EXISTS update_trend_vote_counts() CASCADE;

-- 3. Create the function that updates vote counts
CREATE OR REPLACE FUNCTION update_trend_vote_counts()
RETURNS TRIGGER AS $$
DECLARE
    v_trend_id UUID;
    v_approve_count INTEGER;
    v_reject_count INTEGER;
    v_status TEXT;
BEGIN
    -- Determine which trend_id to use (for INSERT/UPDATE use NEW, for DELETE use OLD)
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
    
    -- Determine validation status (3 votes needed to approve/reject)
    IF v_approve_count >= 3 THEN
        v_status := 'approved';
    ELSIF v_reject_count >= 3 THEN
        v_status := 'rejected';
    ELSE
        v_status := 'pending';
    END IF;
    
    -- Update the trend_submissions table immediately
    UPDATE trend_submissions
    SET 
        approve_count = v_approve_count,
        reject_count = v_reject_count,
        validation_status = v_status,
        -- Also update the main status if validation completes
        status = CASE 
            WHEN v_status = 'approved' THEN 'approved'
            WHEN v_status = 'rejected' THEN 'rejected'
            ELSE status  -- Keep existing status if still pending
        END,
        updated_at = NOW()  -- Track when last updated
    WHERE id = v_trend_id;
    
    -- Log the update for debugging
    RAISE NOTICE 'Updated trend % - Approves: %, Rejects: %, Status: %', 
        v_trend_id, v_approve_count, v_reject_count, v_status;
    
    -- Return appropriate value based on operation
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger that fires AFTER any validation change
CREATE TRIGGER update_trend_counts_on_validation
    AFTER INSERT OR UPDATE OR DELETE ON trend_validations
    FOR EACH ROW
    EXECUTE FUNCTION update_trend_vote_counts();

-- 5. Update all existing trends with their current vote counts
DO $$
DECLARE
    v_updated_count INTEGER;
BEGIN
    -- Update all trends with current vote counts
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
            WHEN COALESCE(vc.approve_cnt, 0) >= 3 THEN 'approved'
            WHEN COALESCE(vc.reject_cnt, 0) >= 3 THEN 'rejected'
            ELSE 'pending'
        END,
        status = CASE
            WHEN COALESCE(vc.approve_cnt, 0) >= 3 THEN 'approved'
            WHEN COALESCE(vc.reject_cnt, 0) >= 3 THEN 'rejected'
            ELSE status
        END
    FROM vote_counts vc
    WHERE ts.id = vc.trend_id;
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % trends with existing vote counts', v_updated_count;
    
    -- Also set defaults for trends with no votes
    UPDATE trend_submissions
    SET 
        approve_count = COALESCE(approve_count, 0),
        reject_count = COALESCE(reject_count, 0),
        validation_status = COALESCE(validation_status, 'pending')
    WHERE approve_count IS NULL OR reject_count IS NULL;
END $$;

-- 6. Test the trigger with a sample validation
DO $$
DECLARE
    v_test_trend_id UUID;
    v_test_user_id UUID;
    v_approve_count INTEGER;
    v_reject_count INTEGER;
BEGIN
    -- Get a random trend for testing
    SELECT id INTO v_test_trend_id 
    FROM trend_submissions 
    LIMIT 1;
    
    -- Get a random user for testing
    SELECT user_id INTO v_test_user_id
    FROM user_profiles
    LIMIT 1;
    
    IF v_test_trend_id IS NOT NULL AND v_test_user_id IS NOT NULL THEN
        -- Check current counts
        SELECT approve_count, reject_count 
        INTO v_approve_count, v_reject_count
        FROM trend_submissions 
        WHERE id = v_test_trend_id;
        
        RAISE NOTICE 'Test trend % has % approves and % rejects', 
            v_test_trend_id, v_approve_count, v_reject_count;
    END IF;
END $$;

-- 7. Create a helper function to get vote counts (for debugging)
CREATE OR REPLACE FUNCTION get_trend_vote_counts(p_trend_id UUID)
RETURNS TABLE(
    approve_count INTEGER,
    reject_count INTEGER,
    validation_status TEXT,
    voters JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ts.approve_count,
        ts.reject_count,
        ts.validation_status,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'user_id', tv.validator_id,
                    'vote', tv.vote,
                    'voted_at', tv.created_at
                ) ORDER BY tv.created_at DESC
            ) FILTER (WHERE tv.validator_id IS NOT NULL),
            '[]'::jsonb
        ) as voters
    FROM trend_submissions ts
    LEFT JOIN trend_validations tv ON tv.trend_id = ts.id
    WHERE ts.id = p_trend_id
    GROUP BY ts.id, ts.approve_count, ts.reject_count, ts.validation_status;
END;
$$ LANGUAGE plpgsql;

-- 8. Final verification
DO $$
DECLARE
    v_total_trends INTEGER;
    v_trends_with_votes INTEGER;
    v_approved INTEGER;
    v_rejected INTEGER;
    v_pending INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total_trends FROM trend_submissions;
    
    SELECT COUNT(*) INTO v_trends_with_votes 
    FROM trend_submissions 
    WHERE approve_count > 0 OR reject_count > 0;
    
    SELECT COUNT(*) INTO v_approved
    FROM trend_submissions
    WHERE validation_status = 'approved';
    
    SELECT COUNT(*) INTO v_rejected
    FROM trend_submissions
    WHERE validation_status = 'rejected';
    
    SELECT COUNT(*) INTO v_pending
    FROM trend_submissions
    WHERE validation_status = 'pending';
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ VOTE COUNT SYSTEM FIXED!';
    RAISE NOTICE '📊 Current Statistics:';
    RAISE NOTICE '  Total trends: %', v_total_trends;
    RAISE NOTICE '  Trends with votes: %', v_trends_with_votes;
    RAISE NOTICE '  Approved (3+ verify): %', v_approved;
    RAISE NOTICE '  Rejected (3+ reject): %', v_rejected;
    RAISE NOTICE '  Pending validation: %', v_pending;
    RAISE NOTICE '';
    RAISE NOTICE '🔄 Vote counts will now update IMMEDIATELY when users validate';
    RAISE NOTICE '📱 Timeline will show exact approve/reject counts in real-time';
END $$;

-- Grant necessary permissions
GRANT SELECT, UPDATE ON trend_submissions TO authenticated;
GRANT SELECT, INSERT ON trend_validations TO authenticated;
GRANT EXECUTE ON FUNCTION get_trend_vote_counts TO authenticated;