-- DIAGNOSTIC AND FIX SCRIPT
-- Run this to find and fix ALL sources of the ambiguous column error

-- STEP 1: Find ALL functions that reference reject_count
SELECT 
    'FUNCTIONS REFERENCING reject_count:' as check_type,
    proname as object_name,
    pronamespace::regnamespace as schema
FROM pg_proc
WHERE prosrc LIKE '%reject_count%'
AND pronamespace = 'public'::regnamespace;

-- STEP 2: Find ALL triggers on relevant tables
SELECT 
    'TRIGGERS ON trend_submissions:' as check_type,
    tgname as trigger_name,
    proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE t.tgrelid = 'public.trend_submissions'::regclass
AND tgname NOT LIKE 'RI_%';

SELECT 
    'TRIGGERS ON trend_validations:' as check_type,
    tgname as trigger_name,
    proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE t.tgrelid = 'public.trend_validations'::regclass
AND tgname NOT LIKE 'RI_%';

-- STEP 3: Check function definitions for problematic JOINs
SELECT 
    'FUNCTION DEFINITIONS WITH POTENTIAL ISSUES:' as check_type,
    proname,
    CASE 
        WHEN prosrc LIKE '%FROM%trend_submissions%,%' THEN 'Has implicit JOIN'
        WHEN prosrc LIKE '%JOIN%' AND prosrc LIKE '%reject_count%' THEN 'Has JOIN with reject_count'
        WHEN prosrc LIKE '%reject_count%' AND prosrc NOT LIKE '%ts.reject_count%' 
             AND prosrc NOT LIKE '%trend_submissions.reject_count%' THEN 'Unqualified reject_count'
        ELSE 'Might be OK'
    END as issue
FROM pg_proc
WHERE prosrc LIKE '%reject_count%'
AND pronamespace = 'public'::regnamespace;

-- STEP 4: NOW FIX EVERYTHING
-- Drop ALL functions that might be problematic
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop functions with reject_count that aren't cast_trend_vote
    FOR r IN 
        SELECT proname 
        FROM pg_proc 
        WHERE prosrc LIKE '%reject_count%' 
        AND pronamespace = 'public'::regnamespace
        AND proname NOT IN ('cast_trend_vote')
    LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS public.%I CASCADE', r.proname);
        RAISE NOTICE 'Dropped function: %', r.proname;
    END LOOP;
    
    -- Drop ALL triggers on trend tables
    FOR r IN 
        SELECT DISTINCT tgname, tgrelid::regclass as tbl
        FROM pg_trigger 
        WHERE tgrelid IN ('public.trend_submissions'::regclass, 'public.trend_validations'::regclass)
        AND tgname NOT LIKE 'RI_%'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON %s CASCADE', r.tgname, r.tbl);
        RAISE NOTICE 'Dropped trigger: % on %', r.tgname, r.tbl;
    END LOOP;
END $$;

-- STEP 5: Recreate ONLY the cast_trend_vote function
DROP FUNCTION IF EXISTS public.cast_trend_vote(UUID, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.cast_trend_vote(
    p_trend_id UUID,
    p_vote TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_approve_cnt INTEGER := 0;
    v_reject_cnt INTEGER := 0;
BEGIN
    -- Get user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    -- Check trend exists
    PERFORM 1 FROM trend_submissions WHERE id = p_trend_id;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Trend not found');
    END IF;
    
    -- Check already voted
    PERFORM 1 FROM trend_validations 
    WHERE validator_id = v_user_id
    AND (trend_submission_id = p_trend_id OR trend_id = p_trend_id);
    IF FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Already voted on this trend');
    END IF;
    
    -- Insert vote
    INSERT INTO trend_validations (
        trend_submission_id, trend_id, validator_id, vote, confirmed, created_at
    ) VALUES (
        p_trend_id, p_trend_id, v_user_id, p_vote,
        CASE WHEN p_vote = 'verify' THEN true ELSE false END,
        NOW()
    );
    
    -- Count all votes for this trend
    SELECT 
        COUNT(*) FILTER (WHERE vote = 'verify' OR confirmed = true),
        COUNT(*) FILTER (WHERE vote = 'reject' OR confirmed = false)
    INTO v_approve_cnt, v_reject_cnt
    FROM trend_validations
    WHERE trend_submission_id = p_trend_id OR trend_id = p_trend_id;
    
    -- Update trend
    UPDATE trend_submissions
    SET 
        approve_count = v_approve_cnt,
        reject_count = v_reject_cnt,
        validation_count = v_approve_cnt + v_reject_cnt,
        validation_status = CASE
            WHEN v_approve_cnt >= 2 THEN 'approved'
            WHEN v_reject_cnt >= 2 THEN 'rejected'
            ELSE 'pending'
        END,
        updated_at = NOW()
    WHERE id = p_trend_id;
    
    -- Update earnings
    PERFORM 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'profiles';
    IF FOUND THEN
        UPDATE profiles
        SET 
            earnings_approved = COALESCE(earnings_approved, 0) + 0.01,
            total_earnings = COALESCE(total_earnings, 0) + 0.01
        WHERE id = v_user_id;
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'vote', p_vote,
        'approve_count', v_approve_cnt,
        'reject_count', v_reject_cnt
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'detail', SQLSTATE
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.cast_trend_vote(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cast_trend_vote(UUID, TEXT) TO anon;

-- STEP 6: Final verification
SELECT 
    'CHECK COMPLETE' as status,
    COUNT(*) as functions_with_reject_count
FROM pg_proc
WHERE prosrc LIKE '%reject_count%'
AND pronamespace = 'public'::regnamespace;

SELECT 
    'TRIGGERS REMAINING' as status,
    COUNT(*) as trigger_count
FROM pg_trigger
WHERE tgrelid IN ('public.trend_submissions'::regclass, 'public.trend_validations'::regclass)
AND tgname NOT LIKE 'RI_%';