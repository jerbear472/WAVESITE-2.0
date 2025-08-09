-- SAFELY KILL ONLY NON-CONSTRAINT TRIGGERS

-- Step 1: Drop only non-constraint triggers on trend_submissions
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT tgname 
        FROM pg_trigger 
        WHERE tgrelid = 'public.trend_submissions'::regclass
        AND tgname NOT LIKE 'RI_ConstraintTrigger%'  -- Skip foreign key triggers
        AND tgname NOT LIKE '%fkey%'  -- Skip foreign key triggers
        AND NOT tgisinternal  -- Skip internal triggers
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.tgname) || ' ON public.trend_submissions CASCADE';
        RAISE NOTICE 'Dropped trigger: %', r.tgname;
    END LOOP;
END $$;

-- Step 2: Drop only non-constraint triggers on trend_validations
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT tgname 
        FROM pg_trigger 
        WHERE tgrelid = 'public.trend_validations'::regclass
        AND tgname NOT LIKE 'RI_ConstraintTrigger%'  -- Skip foreign key triggers
        AND tgname NOT LIKE '%fkey%'  -- Skip foreign key triggers
        AND NOT tgisinternal  -- Skip internal triggers
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.tgname) || ' ON public.trend_validations CASCADE';
        RAISE NOTICE 'Dropped trigger: %', r.tgname;
    END LOOP;
END $$;

-- Step 3: List what triggers remain (should only be constraint triggers)
SELECT 
    'Remaining triggers on trend_submissions:' as info,
    tgname,
    CASE 
        WHEN tgname LIKE 'RI_ConstraintTrigger%' THEN 'Foreign Key Constraint (OK)'
        WHEN tgisinternal THEN 'Internal (OK)'
        ELSE 'Custom Trigger (PROBLEM)'
    END as type
FROM pg_trigger 
WHERE tgrelid = 'public.trend_submissions'::regclass;

SELECT 
    'Remaining triggers on trend_validations:' as info,
    tgname,
    CASE 
        WHEN tgname LIKE 'RI_ConstraintTrigger%' THEN 'Foreign Key Constraint (OK)'
        WHEN tgisinternal THEN 'Internal (OK)'
        ELSE 'Custom Trigger (PROBLEM)'
    END as type
FROM pg_trigger 
WHERE tgrelid = 'public.trend_validations'::regclass;

-- Step 4: Drop problematic functions
DROP FUNCTION IF EXISTS update_trend_vote_counts() CASCADE;
DROP FUNCTION IF EXISTS update_trend_stage() CASCADE;
DROP FUNCTION IF EXISTS update_vote_counts() CASCADE;
DROP FUNCTION IF EXISTS sync_trend_counts() CASCADE;
DROP FUNCTION IF EXISTS recalculate_counts() CASCADE;
DROP FUNCTION IF EXISTS update_trend_counts() CASCADE;
DROP FUNCTION IF EXISTS handle_vote_insert() CASCADE;
DROP FUNCTION IF EXISTS handle_vote_update() CASCADE;
DROP FUNCTION IF EXISTS handle_vote_delete() CASCADE;

-- Step 5: Create SUPER SIMPLE vote function
DROP FUNCTION IF EXISTS public.cast_trend_vote(UUID, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.cast_trend_vote(
    p_trend_id UUID,
    p_vote TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user UUID;
    v_approve INT;
    v_reject INT;
BEGIN
    v_user := auth.uid();
    
    -- Basic checks
    IF v_user IS NULL THEN
        RETURN '{"success": false, "error": "Not authenticated"}'::json;
    END IF;
    
    -- Already voted check - be very specific
    IF EXISTS (
        SELECT 1 
        FROM trend_validations tv
        WHERE tv.validator_id = v_user
        AND tv.trend_submission_id = p_trend_id
    ) THEN
        RETURN '{"success": false, "error": "Already voted"}'::json;
    END IF;
    
    -- Insert vote
    INSERT INTO trend_validations (
        trend_submission_id, 
        trend_id,
        validator_id, 
        vote,
        confirmed,
        created_at
    ) VALUES (
        p_trend_id,
        p_trend_id,
        v_user,
        p_vote,
        (p_vote = 'verify'),
        NOW()
    );
    
    -- Count votes - be super explicit
    SELECT 
        COUNT(CASE WHEN tv.vote = 'verify' THEN 1 END),
        COUNT(CASE WHEN tv.vote = 'reject' THEN 1 END)
    INTO v_approve, v_reject
    FROM trend_validations tv
    WHERE tv.trend_submission_id = p_trend_id;
    
    -- Update the trend - be super explicit
    UPDATE trend_submissions ts
    SET 
        approve_count = v_approve,
        reject_count = v_reject,
        validation_status = CASE
            WHEN v_approve >= 2 THEN 'approved'
            WHEN v_reject >= 2 THEN 'rejected'
            ELSE 'pending'
        END
    WHERE ts.id = p_trend_id;
    
    RETURN json_build_object(
        'success', true,
        'vote', p_vote,
        'approve_count', v_approve,
        'reject_count', v_reject
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION public.cast_trend_vote(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cast_trend_vote(UUID, TEXT) TO anon;

-- Step 6: Show what functions still exist with reject_count
SELECT 
    'Functions with reject_count:' as check,
    proname as function_name
FROM pg_proc
WHERE prosrc LIKE '%reject_count%'
AND pronamespace = 'public'::regnamespace;