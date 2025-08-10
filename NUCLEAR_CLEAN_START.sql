-- NUCLEAR OPTION: DROP EVERYTHING AND START FRESH

-- 1. Drop ALL custom triggers (keep foreign keys)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT DISTINCT tgname, tgrelid::regclass as tbl
        FROM pg_trigger 
        WHERE tgrelid IN ('public.trend_submissions'::regclass, 'public.trend_validations'::regclass)
        AND tgname NOT LIKE 'RI_ConstraintTrigger%'
        AND NOT tgisinternal
    LOOP
        BEGIN
            EXECUTE format('DROP TRIGGER %I ON %s CASCADE', r.tgname, r.tbl);
            RAISE NOTICE 'Dropped trigger: % on %', r.tgname, r.tbl;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not drop trigger % on %: %', r.tgname, r.tbl, SQLERRM;
        END;
    END LOOP;
END $$;

-- 2. Drop ALL functions that touch reject_count (except cast_trend_vote)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT proname, oid
        FROM pg_proc
        WHERE prosrc LIKE '%reject_count%'
        AND pronamespace = 'public'::regnamespace
        AND proname != 'cast_trend_vote'
    LOOP
        BEGIN
            EXECUTE format('DROP FUNCTION %s CASCADE', r.oid::regprocedure);
            RAISE NOTICE 'Dropped function: %', r.proname;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not drop function %: %', r.proname, SQLERRM;
        END;
    END LOOP;
END $$;

-- 3. Make sure columns exist
ALTER TABLE public.trend_submissions
ADD COLUMN IF NOT EXISTS approve_count INTEGER DEFAULT 0;

ALTER TABLE public.trend_submissions
ADD COLUMN IF NOT EXISTS reject_count INTEGER DEFAULT 0;

ALTER TABLE public.trend_submissions
ADD COLUMN IF NOT EXISTS validation_status TEXT DEFAULT 'pending';

ALTER TABLE public.trend_validations
ADD COLUMN IF NOT EXISTS trend_submission_id UUID;

ALTER TABLE public.trend_validations
ADD COLUMN IF NOT EXISTS vote TEXT;

-- 4. Create the ONLY function we need
DROP FUNCTION IF EXISTS public.cast_trend_vote(UUID, TEXT);

CREATE FUNCTION public.cast_trend_vote(
    p_trend_id UUID,
    p_vote TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_id UUID;
    new_approve_count INT;
    new_reject_count INT;
BEGIN
    user_id := auth.uid();
    
    IF user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    -- Check already voted
    PERFORM 1 FROM trend_validations 
    WHERE validator_id = user_id 
    AND trend_submission_id = p_trend_id;
    
    IF FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Already voted');
    END IF;
    
    -- Insert vote
    INSERT INTO trend_validations (
        trend_submission_id, validator_id, vote, created_at
    ) VALUES (
        p_trend_id, user_id, p_vote, NOW()
    );
    
    -- Update counts directly
    IF p_vote = 'verify' THEN
        UPDATE trend_submissions 
        SET approve_count = approve_count + 1
        WHERE id = p_trend_id
        RETURNING approve_count INTO new_approve_count;
        
        SELECT reject_count INTO new_reject_count
        FROM trend_submissions WHERE id = p_trend_id;
    ELSE
        UPDATE trend_submissions 
        SET reject_count = reject_count + 1
        WHERE id = p_trend_id
        RETURNING reject_count INTO new_reject_count;
        
        SELECT approve_count INTO new_approve_count
        FROM trend_submissions WHERE id = p_trend_id;
    END IF;
    
    -- Update status
    UPDATE trend_submissions 
    SET validation_status = CASE
        WHEN approve_count >= 2 THEN 'approved'
        WHEN reject_count >= 2 THEN 'rejected'  
        ELSE 'pending'
    END
    WHERE id = p_trend_id;
    
    RETURN json_build_object(
        'success', true,
        'vote', p_vote,
        'approve_count', new_approve_count,
        'reject_count', new_reject_count
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.cast_trend_vote TO authenticated;

-- 5. Verify clean state
SELECT 'Functions with reject_count:', count(*)
FROM pg_proc
WHERE prosrc LIKE '%reject_count%'
AND pronamespace = 'public'::regnamespace;

SELECT 'Custom triggers on trend_submissions:', count(*)
FROM pg_trigger
WHERE tgrelid = 'public.trend_submissions'::regclass
AND tgname NOT LIKE 'RI_ConstraintTrigger%'
AND NOT tgisinternal;

SELECT 'Custom triggers on trend_validations:', count(*)
FROM pg_trigger
WHERE tgrelid = 'public.trend_validations'::regclass
AND tgname NOT LIKE 'RI_ConstraintTrigger%'
AND NOT tgisinternal;