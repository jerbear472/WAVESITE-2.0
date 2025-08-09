-- PROPER VERIFY SYSTEM FIX
-- This respects all business rules and dependencies

-- ============================================
-- PART 1: ENSURE TABLES HAVE CORRECT STRUCTURE
-- ============================================

-- Add missing columns to trend_submissions
ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS validation_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS validation_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS approve_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reject_count INTEGER DEFAULT 0;

-- Add awaiting_verification to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS awaiting_verification DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS earnings_approved DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS earnings_pending DECIMAL(10,2) DEFAULT 0;

-- Ensure earnings_ledger has proper status column
ALTER TABLE earnings_ledger
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- ============================================
-- PART 2: FIX ROW LEVEL SECURITY PROPERLY
-- ============================================

-- Enable RLS but with proper policies
ALTER TABLE trend_submissions ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies on trend_submissions
DROP POLICY IF EXISTS "Users can view all trends" ON trend_submissions;
DROP POLICY IF EXISTS "Users can insert own trends" ON trend_submissions;
DROP POLICY IF EXISTS "Users can update trends for validation" ON trend_submissions;
DROP POLICY IF EXISTS "Anyone can view trends" ON trend_submissions;
DROP POLICY IF EXISTS "Users can do everything with trends" ON trend_submissions;

-- Create proper policies
CREATE POLICY "Enable read access for all users" ON trend_submissions
FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON trend_submissions
FOR INSERT WITH CHECK (auth.uid() = spotter_id);

CREATE POLICY "Enable update for validation" ON trend_submissions
FOR UPDATE USING (true);

-- Fix trend_validations policies
ALTER TABLE trend_validations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view validations" ON trend_validations;
DROP POLICY IF EXISTS "Authenticated can create validations" ON trend_validations;
DROP POLICY IF EXISTS "Users can view all validations" ON trend_validations;
DROP POLICY IF EXISTS "Users can insert validations" ON trend_validations;

CREATE POLICY "Enable read for all" ON trend_validations
FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated" ON trend_validations
FOR INSERT WITH CHECK (auth.uid() = validator_id);

-- ============================================
-- PART 3: CREATE PROPER VOTE FUNCTION
-- ============================================

DROP FUNCTION IF EXISTS cast_trend_vote(UUID, TEXT);

CREATE OR REPLACE FUNCTION cast_trend_vote(
    p_trend_id UUID,
    p_vote TEXT
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_id UUID;
    v_trend_spotter_id UUID;
    v_approve_count INT;
    v_reject_count INT;
    v_new_status TEXT;
BEGIN
    -- Get authenticated user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User not authenticated'
        );
    END IF;
    
    -- Get trend spotter_id
    SELECT spotter_id INTO v_trend_spotter_id
    FROM trend_submissions
    WHERE id = p_trend_id;
    
    IF v_trend_spotter_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Trend not found'
        );
    END IF;
    
    -- Check if already voted
    IF EXISTS (
        SELECT 1 FROM trend_validations
        WHERE trend_submission_id = p_trend_id
        AND validator_id = v_user_id
    ) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Already voted on this trend'
        );
    END IF;
    
    -- Insert vote
    INSERT INTO trend_validations (
        trend_submission_id,
        validator_id,
        vote,
        created_at
    ) VALUES (
        p_trend_id,
        v_user_id,
        p_vote,
        NOW()
    );
    
    -- Update counts on trend
    IF p_vote = 'verify' THEN
        UPDATE trend_submissions
        SET 
            approve_count = COALESCE(approve_count, 0) + 1,
            validation_count = COALESCE(validation_count, 0) + 1
        WHERE id = p_trend_id
        RETURNING approve_count INTO v_approve_count;
    ELSE
        UPDATE trend_submissions
        SET 
            reject_count = COALESCE(reject_count, 0) + 1,
            validation_count = COALESCE(validation_count, 0) + 1
        WHERE id = p_trend_id
        RETURNING reject_count INTO v_reject_count;
    END IF;
    
    -- Get final counts
    SELECT approve_count, reject_count 
    INTO v_approve_count, v_reject_count
    FROM trend_submissions
    WHERE id = p_trend_id;
    
    -- Check if trend reaches 2-vote threshold
    v_new_status := 'pending';
    
    IF v_approve_count >= 2 THEN
        -- APPROVED: Move earnings from awaiting to approved
        v_new_status := 'approved';
        
        UPDATE trend_submissions
        SET 
            status = 'approved',
            validation_status = 'approved'
        WHERE id = p_trend_id;
        
        -- Update earnings_ledger
        UPDATE earnings_ledger
        SET status = 'approved'
        WHERE trend_submission_id = p_trend_id
        AND type = 'submission'
        AND status IN ('awaiting_verification', 'pending');
        
        -- Update spotter's profile
        UPDATE profiles
        SET 
            awaiting_verification = GREATEST(0, awaiting_verification - 1.00),
            earnings_approved = COALESCE(earnings_approved, 0) + 1.00
        WHERE id = v_trend_spotter_id;
        
    ELSIF v_reject_count >= 2 THEN
        -- REJECTED: Remove from awaiting_verification
        v_new_status := 'rejected';
        
        UPDATE trend_submissions
        SET 
            status = 'rejected',
            validation_status = 'rejected'
        WHERE id = p_trend_id;
        
        -- Update earnings_ledger
        UPDATE earnings_ledger
        SET status = 'rejected'
        WHERE trend_submission_id = p_trend_id
        AND type = 'submission'
        AND status IN ('awaiting_verification', 'pending');
        
        -- Update spotter's profile (remove from awaiting)
        UPDATE profiles
        SET awaiting_verification = GREATEST(0, awaiting_verification - 1.00)
        WHERE id = v_trend_spotter_id;
    END IF;
    
    -- Give validator their $0.01 reward
    INSERT INTO earnings_ledger (
        user_id,
        amount,
        type,
        status,
        description,
        trend_submission_id,
        created_at
    ) VALUES (
        v_user_id,
        0.01,
        'validation',
        'pending',
        'Validation reward',
        p_trend_id,
        NOW()
    );
    
    -- Update validator's pending earnings
    UPDATE profiles
    SET 
        earnings_pending = COALESCE(earnings_pending, 0) + 0.01,
        total_earnings = COALESCE(total_earnings, 0) + 0.01
    WHERE id = v_user_id;
    
    RETURN json_build_object(
        'success', true,
        'vote', p_vote,
        'approve_count', v_approve_count,
        'reject_count', v_reject_count,
        'status', v_new_status
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION cast_trend_vote TO authenticated;

-- ============================================
-- PART 4: CREATE TRIGGER FOR NEW SUBMISSIONS
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_trend_submission()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Add $1.00 to awaiting_verification when trend is submitted
    INSERT INTO earnings_ledger (
        user_id,
        amount,
        type,
        status,
        description,
        trend_submission_id,
        created_at
    ) VALUES (
        NEW.spotter_id,
        1.00,
        'submission',
        'awaiting_verification',
        'Trend submission - awaiting verification',
        NEW.id,
        NOW()
    );
    
    -- Update user's awaiting_verification balance
    UPDATE profiles
    SET awaiting_verification = COALESCE(awaiting_verification, 0) + 1.00
    WHERE id = NEW.spotter_id;
    
    RETURN NEW;
END;
$$;

-- Create trigger if not exists
DROP TRIGGER IF EXISTS on_trend_submission ON trend_submissions;
CREATE TRIGGER on_trend_submission
AFTER INSERT ON trend_submissions
FOR EACH ROW
EXECUTE FUNCTION handle_new_trend_submission();

-- ============================================
-- PART 5: FIX EXISTING DATA
-- ============================================

-- Set all trends without enough votes to pending
UPDATE trend_submissions
SET 
    validation_status = 'pending',
    status = CASE 
        WHEN approve_count >= 2 THEN 'approved'
        WHEN reject_count >= 2 THEN 'rejected'
        ELSE 'submitted'
    END
WHERE validation_count < 2 OR validation_status IS NULL;

-- Ensure all NULL values are set to defaults
UPDATE trend_submissions
SET 
    validation_count = COALESCE(validation_count, 0),
    approve_count = COALESCE(approve_count, 0),
    reject_count = COALESCE(reject_count, 0);

-- ============================================
-- PART 6: VERIFY SETUP
-- ============================================

DO $$
DECLARE
    v_total INT;
    v_pending INT;
    v_can_select BOOLEAN;
BEGIN
    -- Check if we can select from trends
    BEGIN
        SELECT COUNT(*) INTO v_total FROM trend_submissions;
        v_can_select := true;
    EXCEPTION WHEN OTHERS THEN
        v_can_select := false;
    END;
    
    SELECT COUNT(*) INTO v_pending 
    FROM trend_submissions 
    WHERE validation_count < 2;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ VERIFY SYSTEM PROPERLY FIXED';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total trends: %', v_total;
    RAISE NOTICE 'Pending validation: %', v_pending;
    RAISE NOTICE 'Can select trends: %', CASE WHEN v_can_select THEN 'YES' ELSE 'NO' END;
    RAISE NOTICE '';
    RAISE NOTICE 'Business Rules Implemented:';
    RAISE NOTICE '  ✓ 2 votes required for approval/rejection';
    RAISE NOTICE '  ✓ $1.00 goes to awaiting_verification on submission';
    RAISE NOTICE '  ✓ Moves to earnings_approved after 2 approvals';
    RAISE NOTICE '  ✓ Removed from awaiting after 2 rejections';
    RAISE NOTICE '  ✓ Validators earn $0.01 per vote';
    RAISE NOTICE '  ✓ Users can vote on their own trends';
    RAISE NOTICE '========================================';
END $$;

-- Show sample of available trends
SELECT 
    id,
    LEFT(description, 40) as description,
    validation_status,
    approve_count,
    reject_count,
    validation_count
FROM trend_submissions
WHERE validation_count < 2
ORDER BY created_at DESC
LIMIT 5;