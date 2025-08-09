-- COMPLETE IMPLEMENTATION OF VERIFY SYSTEM
-- Run this entire script in Supabase SQL Editor to fix everything

-- ============================================
-- STEP 1: ADD ALL MISSING COLUMNS
-- ============================================

-- Add validation_status column
ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS validation_status TEXT DEFAULT 'pending';

-- Add validation_count column
ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS validation_count INTEGER DEFAULT 0;

-- Add approve_count column
ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS approve_count INTEGER DEFAULT 0;

-- Add reject_count column
ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS reject_count INTEGER DEFAULT 0;

-- Add awaiting_verification to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS awaiting_verification DECIMAL(10,2) DEFAULT 0.00;

-- Add updated_at columns if missing
ALTER TABLE trend_submissions
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE earnings_ledger
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================
-- STEP 2: FIX ALL EXISTING TRENDS
-- ============================================

-- Set all recent trends to pending if they have no votes
UPDATE trend_submissions
SET 
    validation_status = 'pending',
    validation_count = COALESCE(validation_count, 0),
    approve_count = COALESCE(approve_count, 0),
    reject_count = COALESCE(reject_count, 0)
WHERE created_at > NOW() - INTERVAL '30 days'
  AND (validation_count IS NULL OR validation_count = 0);

-- Fix any null status values
UPDATE trend_submissions
SET status = 'submitted'
WHERE status IS NULL;

-- ============================================
-- STEP 3: FIX TREND_VALIDATIONS TABLE
-- ============================================

-- Ensure trend_validations has correct structure
ALTER TABLE trend_validations
ADD COLUMN IF NOT EXISTS vote TEXT;

ALTER TABLE trend_validations
ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2) DEFAULT 0.75;

-- If the column was named differently, migrate it
DO $$
BEGIN
    -- Check if 'confirmed' column exists and 'vote' doesn't
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trend_validations' 
        AND column_name = 'confirmed'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trend_validations' 
        AND column_name = 'vote'
    ) THEN
        -- Add vote column based on confirmed value
        ALTER TABLE trend_validations ADD COLUMN vote TEXT;
        UPDATE trend_validations SET vote = CASE WHEN confirmed = true THEN 'verify' ELSE 'reject' END;
        ALTER TABLE trend_validations DROP COLUMN confirmed;
    END IF;
END $$;

-- ============================================
-- STEP 4: FIX EARNINGS_LEDGER STATUS
-- ============================================

-- Update constraint to include awaiting_verification
ALTER TABLE earnings_ledger 
DROP CONSTRAINT IF EXISTS earnings_ledger_status_check;

ALTER TABLE earnings_ledger 
ADD CONSTRAINT earnings_ledger_status_check 
CHECK (status IN ('pending', 'awaiting_verification', 'approved', 'rejected', 'paid', 'cancelled'));

-- ============================================
-- STEP 5: CREATE RLS POLICIES
-- ============================================

-- Drop old restrictive policies
DROP POLICY IF EXISTS "Users can view approved trends" ON trend_submissions;
DROP POLICY IF EXISTS "Users can view their own submissions" ON trend_submissions;
DROP POLICY IF EXISTS "Anyone can view approved trends" ON trend_submissions;

-- Create new permissive policy
CREATE POLICY IF NOT EXISTS "Authenticated users can view all trends" 
ON trend_submissions
FOR SELECT
TO authenticated
USING (true);

-- Ensure RLS is enabled
ALTER TABLE trend_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE earnings_ledger ENABLE ROW LEVEL SECURITY;

-- Create validation policies
CREATE POLICY IF NOT EXISTS "Users can view all validations"
ON trend_validations
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY IF NOT EXISTS "Users can insert validations"
ON trend_validations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = validator_id);

-- ============================================
-- STEP 6: CREATE/UPDATE CAST_TREND_VOTE FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION public.cast_trend_vote(
    trend_id UUID,
    vote_type TEXT
) RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_validation_id UUID;
    v_approve_count INTEGER;
    v_reject_count INTEGER;
    v_trend_status TEXT;
    v_spotter_id UUID;
BEGIN
    -- Get the current user
    v_user_id := auth.uid();
    
    -- Validate authentication
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Not authenticated. Please log in.'
        );
    END IF;
    
    -- Validate vote type
    IF vote_type NOT IN ('verify', 'reject') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid vote type. Use "verify" or "reject".'
        );
    END IF;
    
    -- Check if trend exists and get spotter_id
    SELECT spotter_id INTO v_spotter_id
    FROM public.trend_submissions 
    WHERE id = trend_id;
    
    IF v_spotter_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Trend not found.'
        );
    END IF;
    
    -- USERS CAN VOTE ON THEIR OWN TRENDS - NO CHECK HERE
    
    -- Check for existing vote
    IF EXISTS (
        SELECT 1 FROM public.trend_validations 
        WHERE trend_submission_id = trend_id 
        AND validator_id = v_user_id
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'You have already voted on this trend.'
        );
    END IF;
    
    -- Insert the validation vote
    INSERT INTO public.trend_validations (
        id,
        trend_submission_id,
        validator_id,
        vote,
        confidence_score,
        created_at
    ) VALUES (
        gen_random_uuid(),
        trend_id,
        v_user_id,
        vote_type,
        0.75,
        NOW()
    ) RETURNING id INTO v_validation_id;
    
    -- Get updated counts
    SELECT 
        COUNT(*) FILTER (WHERE vote = 'verify'),
        COUNT(*) FILTER (WHERE vote = 'reject')
    INTO v_approve_count, v_reject_count
    FROM public.trend_validations
    WHERE trend_submission_id = trend_id;
    
    -- Determine status based on 2-vote requirement
    IF v_approve_count >= 2 THEN
        v_trend_status := 'approved';
        
        -- Move money from awaiting to approved
        UPDATE profiles
        SET 
            awaiting_verification = GREATEST(0, awaiting_verification - 1.00),
            total_earnings = total_earnings + 1.00
        WHERE id = v_spotter_id;
        
        -- Update earnings ledger
        UPDATE earnings_ledger
        SET status = 'approved'
        WHERE trend_submission_id = trend_id 
        AND type = 'submission';
        
    ELSIF v_reject_count >= 2 THEN
        v_trend_status := 'rejected';
        
        -- Remove money from awaiting
        UPDATE profiles
        SET awaiting_verification = GREATEST(0, awaiting_verification - 1.00)
        WHERE id = v_spotter_id;
        
        -- Update earnings ledger
        UPDATE earnings_ledger
        SET status = 'rejected'
        WHERE trend_submission_id = trend_id 
        AND type = 'submission';
    ELSE
        v_trend_status := 'pending';
    END IF;
    
    -- Update trend submission
    UPDATE public.trend_submissions
    SET 
        approve_count = v_approve_count,
        reject_count = v_reject_count,
        validation_status = v_trend_status,
        validation_count = v_approve_count + v_reject_count,
        updated_at = NOW()
    WHERE id = trend_id;
    
    -- Give validator their reward
    INSERT INTO public.earnings_ledger (
        user_id,
        amount,
        type,
        description,
        trend_submission_id,
        status
    ) VALUES (
        v_user_id,
        0.01,
        'validation',
        'Trend validation reward',
        trend_id,
        'approved'
    ) ON CONFLICT DO NOTHING;
    
    -- Update validator's earnings
    UPDATE public.profiles
    SET total_earnings = total_earnings + 0.01
    WHERE id = v_user_id;
    
    -- Return success
    RETURN jsonb_build_object(
        'success', true,
        'id', v_validation_id,
        'message', 'Vote recorded successfully',
        'vote_type', vote_type,
        'approve_count', v_approve_count,
        'reject_count', v_reject_count,
        'status', v_trend_status,
        'is_decided', v_trend_status != 'pending'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Error: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 7: CREATE TRIGGER FOR NEW SUBMISSIONS
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_trend_submission()
RETURNS TRIGGER AS $$
BEGIN
    -- Set default values
    NEW.validation_status := COALESCE(NEW.validation_status, 'pending');
    NEW.validation_count := COALESCE(NEW.validation_count, 0);
    NEW.approve_count := COALESCE(NEW.approve_count, 0);
    NEW.reject_count := COALESCE(NEW.reject_count, 0);
    
    -- Add to earnings ledger
    INSERT INTO earnings_ledger (
        user_id,
        amount,
        type,
        description,
        trend_submission_id,
        status
    ) VALUES (
        NEW.spotter_id,
        1.00,
        'submission',
        'Trend submission - awaiting verification',
        NEW.id,
        'awaiting_verification'
    );
    
    -- Update user's awaiting_verification
    UPDATE profiles
    SET 
        awaiting_verification = awaiting_verification + 1.00,
        trends_spotted = trends_spotted + 1
    WHERE id = NEW.spotter_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS on_new_trend_submission ON trend_submissions;
CREATE TRIGGER on_new_trend_submission
    AFTER INSERT ON trend_submissions
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_trend_submission();

-- ============================================
-- STEP 8: GRANT PERMISSIONS
-- ============================================

GRANT SELECT ON trend_submissions TO authenticated;
GRANT INSERT ON trend_submissions TO authenticated;
GRANT UPDATE ON trend_submissions TO authenticated;

GRANT SELECT ON trend_validations TO authenticated;
GRANT INSERT ON trend_validations TO authenticated;

GRANT SELECT ON earnings_ledger TO authenticated;
GRANT INSERT ON earnings_ledger TO authenticated;

GRANT SELECT ON profiles TO authenticated;
GRANT UPDATE ON profiles TO authenticated;

GRANT EXECUTE ON FUNCTION cast_trend_vote TO authenticated;

-- ============================================
-- STEP 9: VERIFY IMPLEMENTATION
-- ============================================

DO $$
DECLARE
    v_total_trends INTEGER;
    v_pending_trends INTEGER;
    v_can_vote INTEGER;
BEGIN
    -- Count total trends
    SELECT COUNT(*) INTO v_total_trends FROM trend_submissions;
    
    -- Count pending trends
    SELECT COUNT(*) INTO v_pending_trends
    FROM trend_submissions
    WHERE validation_status = 'pending' OR validation_count < 2;
    
    -- Count trends available for voting
    SELECT COUNT(*) INTO v_can_vote
    FROM trend_submissions
    WHERE validation_status = 'pending' 
       OR validation_count < 2
       OR status = 'submitted';
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ VERIFY SYSTEM IMPLEMENTATION COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Statistics:';
    RAISE NOTICE '  Total trends: %', v_total_trends;
    RAISE NOTICE '  Pending validation: %', v_pending_trends;
    RAISE NOTICE '  Available to vote on: %', v_can_vote;
    RAISE NOTICE '';
    RAISE NOTICE 'System Rules:';
    RAISE NOTICE '  ✅ Users CAN vote on their own trends';
    RAISE NOTICE '  ✅ 2 verify votes = APPROVED ($1.00 earned)';
    RAISE NOTICE '  ✅ 2 reject votes = REJECTED (no earnings)';
    RAISE NOTICE '  ✅ Each vote earns validator $0.01';
    RAISE NOTICE '';
    RAISE NOTICE 'The verify page should now show ALL trends!';
    RAISE NOTICE '========================================';
END $$;

-- ============================================
-- STEP 10: TEST QUERY
-- ============================================

-- This is what the verify page will see
SELECT 
    id,
    description,
    status,
    validation_status,
    validation_count,
    approve_count,
    reject_count,
    created_at
FROM trend_submissions
WHERE (
    status = 'submitted' 
    OR validation_status = 'pending'
    OR validation_count < 2
)
ORDER BY created_at DESC
LIMIT 5;