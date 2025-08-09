-- COMPLETE FIX FOR VERIFY PAGE AND EARNINGS
-- This will make trends visible and fix earnings display
-- Run this entire script in Supabase SQL Editor

-- ============================================
-- PART 1: FIX RLS POLICIES FOR TREND_SUBMISSIONS
-- ============================================

-- First, ensure RLS is enabled
ALTER TABLE trend_submissions ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'trend_submissions' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON trend_submissions', pol.policyname);
    END LOOP;
END $$;

-- Create permissive policies for viewing
CREATE POLICY "Anyone can view all trends" 
ON trend_submissions
FOR SELECT
USING (true);

-- Allow authenticated users to insert their own trends
CREATE POLICY "Users can insert own trends" 
ON trend_submissions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = spotter_id);

-- Allow authenticated users to update trends (for validation counts)
CREATE POLICY "Users can update trends for validation" 
ON trend_submissions
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================
-- PART 2: FIX RLS FOR TREND_VALIDATIONS
-- ============================================

ALTER TABLE trend_validations ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Users can view all validations" ON trend_validations;
DROP POLICY IF EXISTS "Users can insert validations" ON trend_validations;
DROP POLICY IF EXISTS "Authenticated users can validate trends" ON trend_validations;
DROP POLICY IF EXISTS "Anyone can view validations" ON trend_validations;
DROP POLICY IF EXISTS "Authenticated can create validations" ON trend_validations;

-- Create new permissive policies
CREATE POLICY "Anyone can view validations" 
ON trend_validations
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create validations" 
ON trend_validations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = validator_id);

-- ============================================
-- PART 3: FIX RLS FOR EARNINGS_LEDGER
-- ============================================

ALTER TABLE earnings_ledger ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'earnings_ledger' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON earnings_ledger', pol.policyname);
    END LOOP;
END $$;

-- Users can view their own earnings
CREATE POLICY "Users can view own earnings" 
ON earnings_ledger
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- System can insert earnings (via triggers/functions)
CREATE POLICY "System can manage earnings" 
ON earnings_ledger
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- PART 4: FIX RLS FOR PROFILES
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
    END LOOP;
END $$;

-- Users can view all profiles (for leaderboards, etc)
CREATE POLICY "Anyone can view profiles" 
ON profiles
FOR SELECT
USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" 
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ============================================
-- PART 5: ENSURE ALL COLUMNS EXIST
-- ============================================

DO $$
BEGIN
    -- Add columns to trend_submissions if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'trend_submissions'
        AND column_name = 'validation_status'
    ) THEN
        ALTER TABLE public.trend_submissions 
        ADD COLUMN validation_status TEXT DEFAULT 'pending';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'trend_submissions'
        AND column_name = 'validation_count'
    ) THEN
        ALTER TABLE public.trend_submissions 
        ADD COLUMN validation_count INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'trend_submissions'
        AND column_name = 'approve_count'
    ) THEN
        ALTER TABLE public.trend_submissions 
        ADD COLUMN approve_count INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'trend_submissions'
        AND column_name = 'reject_count'
    ) THEN
        ALTER TABLE public.trend_submissions 
        ADD COLUMN reject_count INTEGER DEFAULT 0;
    END IF;

    -- Add awaiting_verification to profiles if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles'
        AND column_name = 'awaiting_verification'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN awaiting_verification DECIMAL(10,2) DEFAULT 0;
    END IF;
END $$;

-- ============================================
-- PART 6: FIX EXISTING DATA
-- ============================================

-- Set proper defaults for all trends
UPDATE trend_submissions 
SET 
    validation_status = COALESCE(validation_status, 'pending'),
    validation_count = COALESCE(validation_count, 0),
    approve_count = COALESCE(approve_count, 0),
    reject_count = COALESCE(reject_count, 0),
    status = COALESCE(status, 'submitted')
WHERE 
    validation_status IS NULL 
    OR validation_count IS NULL 
    OR approve_count IS NULL 
    OR reject_count IS NULL
    OR status IS NULL;

-- Make all recent trends available for validation
UPDATE trend_submissions 
SET validation_status = 'pending'
WHERE created_at > NOW() - INTERVAL '30 days'
  AND validation_count < 2;

-- ============================================
-- PART 7: GRANT PERMISSIONS
-- ============================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT ON trend_submissions TO authenticated;
GRANT UPDATE (validation_count, approve_count, reject_count, validation_status, status) ON trend_submissions TO authenticated;
GRANT SELECT, INSERT ON trend_validations TO authenticated;
GRANT SELECT ON earnings_ledger TO authenticated;
GRANT SELECT, UPDATE ON profiles TO authenticated;

-- Grant SELECT to anonymous users
GRANT SELECT ON trend_submissions TO anon;
GRANT SELECT ON trend_validations TO anon;
GRANT SELECT ON profiles TO anon;

-- Grant USAGE on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

-- ============================================
-- PART 8: CREATE/UPDATE CAST_TREND_VOTE FUNCTION
-- ============================================

-- Drop the existing function first (if it exists with different return type)
DROP FUNCTION IF EXISTS public.cast_trend_vote(UUID, TEXT);

-- Now create the function fresh
CREATE FUNCTION public.cast_trend_vote(
    p_trend_id UUID,
    p_vote TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_validator_id UUID;
    v_existing_vote TEXT;
    v_approve_count INT;
    v_reject_count INT;
    v_status TEXT;
    v_validation_status TEXT;
    v_reward DECIMAL(10,2);
BEGIN
    -- Get the current user ID
    v_validator_id := auth.uid();
    
    IF v_validator_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'User not authenticated');
    END IF;

    -- Check if user already voted (allowing users to vote on their own trends)
    SELECT vote INTO v_existing_vote
    FROM public.trend_validations
    WHERE trend_submission_id = p_trend_id
    AND validator_id = v_validator_id;

    IF v_existing_vote IS NOT NULL THEN
        RETURN json_build_object('success', false, 'error', 'Already voted on this trend');
    END IF;

    -- Insert the vote
    INSERT INTO public.trend_validations (
        trend_submission_id,
        validator_id,
        vote,
        created_at
    ) VALUES (
        p_trend_id,
        v_validator_id,
        p_vote,
        NOW()
    );

    -- Update vote counts
    IF p_vote = 'verify' THEN
        UPDATE public.trend_submissions
        SET 
            approve_count = COALESCE(approve_count, 0) + 1,
            validation_count = COALESCE(validation_count, 0) + 1
        WHERE id = p_trend_id;
    ELSE
        UPDATE public.trend_submissions
        SET 
            reject_count = COALESCE(reject_count, 0) + 1,
            validation_count = COALESCE(validation_count, 0) + 1
        WHERE id = p_trend_id;
    END IF;

    -- Get updated counts
    SELECT approve_count, reject_count
    INTO v_approve_count, v_reject_count
    FROM public.trend_submissions
    WHERE id = p_trend_id;

    -- Check if trend is now approved or rejected (2 votes needed)
    IF v_approve_count >= 2 THEN
        v_status := 'approved';
        v_validation_status := 'approved';
        
        -- Move earnings from awaiting_verification to approved
        UPDATE public.earnings_ledger
        SET status = 'approved'
        WHERE trend_submission_id = p_trend_id
        AND status = 'awaiting_verification';
        
        -- Update user's earnings
        UPDATE public.profiles p
        SET 
            awaiting_verification = GREATEST(0, awaiting_verification - 1.00),
            earnings_approved = earnings_approved + 1.00
        FROM trend_submissions t
        WHERE t.id = p_trend_id
        AND p.id = t.spotter_id;
        
    ELSIF v_reject_count >= 2 THEN
        v_status := 'rejected';
        v_validation_status := 'rejected';
        
        -- Mark earnings as rejected
        UPDATE public.earnings_ledger
        SET status = 'rejected'
        WHERE trend_submission_id = p_trend_id
        AND status = 'awaiting_verification';
        
        -- Remove from awaiting_verification
        UPDATE public.profiles p
        SET awaiting_verification = GREATEST(0, awaiting_verification - 1.00)
        FROM trend_submissions t
        WHERE t.id = p_trend_id
        AND p.id = t.spotter_id;
    ELSE
        v_status := 'submitted';
        v_validation_status := 'pending';
    END IF;

    -- Update trend status
    UPDATE public.trend_submissions
    SET 
        status = v_status,
        validation_status = v_validation_status
    WHERE id = p_trend_id;

    -- Give validator their reward ($0.01)
    INSERT INTO public.earnings_ledger (
        user_id,
        amount,
        type,
        status,
        description,
        trend_submission_id
    ) VALUES (
        v_validator_id,
        0.01,
        'validation',
        'pending',
        'Trend validation reward',
        p_trend_id
    );

    -- Update validator's pending earnings
    UPDATE public.profiles
    SET 
        pending_earnings = pending_earnings + 0.01,
        total_earnings = total_earnings + 0.01
    WHERE id = v_validator_id;

    RETURN json_build_object(
        'success', true,
        'vote', p_vote,
        'approve_count', v_approve_count,
        'reject_count', v_reject_count,
        'status', v_status
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.cast_trend_vote TO authenticated;

-- ============================================
-- PART 9: CREATE TRIGGER FOR NEW SUBMISSIONS
-- ============================================

-- Create function to handle new trend submissions
CREATE OR REPLACE FUNCTION handle_trend_submission_earnings()
RETURNS TRIGGER AS $$
BEGIN
    -- Add to awaiting_verification earnings
    INSERT INTO public.earnings_ledger (
        user_id,
        amount,
        type,
        status,
        description,
        trend_submission_id
    ) VALUES (
        NEW.spotter_id,
        1.00,
        'submission',
        'awaiting_verification',
        'Trend submission - awaiting verification',
        NEW.id
    );
    
    -- Update user's awaiting_verification balance
    UPDATE public.profiles
    SET awaiting_verification = COALESCE(awaiting_verification, 0) + 1.00
    WHERE id = NEW.spotter_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_trend_submission_earnings ON trend_submissions;

-- Create trigger
CREATE TRIGGER on_trend_submission_earnings
AFTER INSERT ON trend_submissions
FOR EACH ROW
EXECUTE FUNCTION handle_trend_submission_earnings();

-- ============================================
-- PART 10: VERIFICATION QUERY
-- ============================================

-- Test what trends are available
SELECT 
    'Total trends' as metric,
    COUNT(*) as count
FROM trend_submissions
UNION ALL
SELECT 
    'Pending validation',
    COUNT(*)
FROM trend_submissions
WHERE validation_status = 'pending' OR validation_count < 2
UNION ALL
SELECT 
    'Recent trends (7 days)',
    COUNT(*)
FROM trend_submissions
WHERE created_at > NOW() - INTERVAL '7 days';

-- Show sample of trends
SELECT 
    id,
    LEFT(description, 50) as description_preview,
    status,
    validation_status,
    validation_count,
    approve_count,
    reject_count,
    created_at
FROM trend_submissions
WHERE validation_status = 'pending' OR validation_count < 2
ORDER BY created_at DESC
LIMIT 5;

-- ============================================
-- FINAL MESSAGE
-- ============================================
DO $$
DECLARE
    v_total INTEGER;
    v_pending INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total FROM trend_submissions;
    SELECT COUNT(*) INTO v_pending 
    FROM trend_submissions 
    WHERE validation_status = 'pending' OR validation_count < 2;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ VERIFY & EARNINGS FIX COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total trends: %', v_total;
    RAISE NOTICE 'Available for validation: %', v_pending;
    RAISE NOTICE '';
    RAISE NOTICE 'What was fixed:';
    RAISE NOTICE '  ✅ RLS policies now allow viewing trends';
    RAISE NOTICE '  ✅ Users can vote on ALL trends';
    RAISE NOTICE '  ✅ 2-vote threshold implemented';
    RAISE NOTICE '  ✅ Awaiting verification tracking added';
    RAISE NOTICE '  ✅ Earnings flow connected';
    RAISE NOTICE '';
    RAISE NOTICE 'The /verify page will now show trends!';
    RAISE NOTICE 'The /earnings page will show pending amounts!';
    RAISE NOTICE '========================================';
END $$;