-- KILL ALL TRIGGERS AND FUNCTIONS THAT COULD CAUSE AMBIGUITY

-- Step 1: Find and drop ALL triggers on these tables
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Kill all triggers on trend_submissions
    FOR r IN 
        SELECT tgname 
        FROM pg_trigger 
        WHERE tgrelid = 'public.trend_submissions'::regclass
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.tgname) || ' ON public.trend_submissions CASCADE';
        RAISE NOTICE 'Dropped trigger: %', r.tgname;
    END LOOP;
    
    -- Kill all triggers on trend_validations  
    FOR r IN 
        SELECT tgname 
        FROM pg_trigger 
        WHERE tgrelid = 'public.trend_validations'::regclass
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.tgname) || ' ON public.trend_validations CASCADE';
        RAISE NOTICE 'Dropped trigger: %', r.tgname;
    END LOOP;
END $$;

-- Step 2: Drop ALL functions that might update vote counts
DROP FUNCTION IF EXISTS update_trend_vote_counts() CASCADE;
DROP FUNCTION IF EXISTS update_trend_stage() CASCADE;
DROP FUNCTION IF EXISTS update_vote_counts() CASCADE;
DROP FUNCTION IF EXISTS sync_trend_counts() CASCADE;
DROP FUNCTION IF EXISTS recalculate_counts() CASCADE;

-- Step 3: Create the SIMPLEST possible vote function
CREATE OR REPLACE FUNCTION public.cast_trend_vote(
    p_trend_id UUID,
    p_vote TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check user
    IF auth.uid() IS NULL THEN
        RETURN '{"success": false, "error": "Not authenticated"}'::json;
    END IF;
    
    -- Check if already voted (simple, no ambiguity)
    IF EXISTS (
        SELECT 1 FROM trend_validations 
        WHERE validator_id = auth.uid()
        AND trend_submission_id = p_trend_id
    ) THEN
        RETURN '{"success": false, "error": "Already voted"}'::json;
    END IF;
    
    -- Insert vote
    INSERT INTO trend_validations (
        trend_submission_id, 
        validator_id, 
        vote
    ) VALUES (
        p_trend_id,
        auth.uid(),
        p_vote
    );
    
    -- Update counts with NO ambiguity - fully qualified
    IF p_vote = 'verify' THEN
        UPDATE trend_submissions 
        SET approve_count = COALESCE(trend_submissions.approve_count, 0) + 1
        WHERE trend_submissions.id = p_trend_id;
    ELSE
        UPDATE trend_submissions 
        SET reject_count = COALESCE(trend_submissions.reject_count, 0) + 1
        WHERE trend_submissions.id = p_trend_id;
    END IF;
    
    RETURN '{"success": true}'::json;
END;
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION public.cast_trend_vote(UUID, TEXT) TO authenticated;

-- Step 4: Verify no triggers remain
SELECT 'Triggers on trend_submissions:', count(*) 
FROM pg_trigger 
WHERE tgrelid = 'public.trend_submissions'::regclass;

SELECT 'Triggers on trend_validations:', count(*) 
FROM pg_trigger 
WHERE tgrelid = 'public.trend_validations'::regclass;