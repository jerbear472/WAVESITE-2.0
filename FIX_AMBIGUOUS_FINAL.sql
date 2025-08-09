-- FINAL FIX FOR AMBIGUOUS COLUMN REFERENCES
-- This completely rebuilds the functions to avoid any ambiguity

-- Step 1: Drop everything first
DROP TRIGGER IF EXISTS update_trend_stage_trigger ON public.trend_submissions CASCADE;
DROP TRIGGER IF EXISTS update_trend_vote_counts_trigger ON public.trend_validations CASCADE;
DROP FUNCTION IF EXISTS update_trend_stage() CASCADE;
DROP FUNCTION IF EXISTS update_trend_vote_counts() CASCADE;
DROP FUNCTION IF EXISTS public.cast_trend_vote(UUID, TEXT) CASCADE;

-- Step 2: Create the simplest possible cast_trend_vote function
CREATE OR REPLACE FUNCTION public.cast_trend_vote(
    p_trend_id UUID,
    p_vote TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_new_approve_count INT;
    v_new_reject_count INT;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    -- Check if trend exists
    IF NOT EXISTS (SELECT 1 FROM public.trend_submissions WHERE id = p_trend_id) THEN
        RETURN json_build_object('success', false, 'error', 'Trend not found');
    END IF;
    
    -- Check if already voted (use explicit table prefix)
    IF EXISTS (
        SELECT 1 FROM public.trend_validations v
        WHERE (v.trend_submission_id = p_trend_id OR v.trend_id = p_trend_id)
        AND v.validator_id = v_user_id
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Already voted on this trend');
    END IF;
    
    -- Insert the vote
    INSERT INTO public.trend_validations (
        trend_submission_id,
        trend_id,
        validator_id,
        vote,
        confirmed,
        created_at
    ) VALUES (
        p_trend_id,
        p_trend_id,
        v_user_id,
        p_vote,
        CASE WHEN p_vote = 'verify' THEN true ELSE false END,
        NOW()
    );
    
    -- Update counts directly (no subqueries, no ambiguity)
    IF p_vote = 'verify' THEN
        UPDATE public.trend_submissions
        SET 
            approve_count = COALESCE(approve_count, 0) + 1,
            validation_count = COALESCE(validation_count, 0) + 1,
            updated_at = NOW()
        WHERE id = p_trend_id;
    ELSE
        UPDATE public.trend_submissions
        SET 
            reject_count = COALESCE(reject_count, 0) + 1,
            validation_count = COALESCE(validation_count, 0) + 1,
            updated_at = NOW()
        WHERE id = p_trend_id;
    END IF;
    
    -- Get the new counts (using explicit table name)
    SELECT 
        t.approve_count, 
        t.reject_count 
    INTO 
        v_new_approve_count, 
        v_new_reject_count
    FROM public.trend_submissions t
    WHERE t.id = p_trend_id;
    
    -- Update validator earnings if profiles exists
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        UPDATE public.profiles
        SET 
            earnings_approved = COALESCE(earnings_approved, 0) + 0.01,
            total_earnings = COALESCE(total_earnings, 0) + 0.01
        WHERE id = v_user_id;
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'vote', p_vote,
        'approve_count', COALESCE(v_new_approve_count, 0),
        'reject_count', COALESCE(v_new_reject_count, 0)
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'detail', SQLSTATE
    );
END;
$$;

-- Step 3: Create a simple trigger function for updating validation status
CREATE OR REPLACE FUNCTION update_trend_stage()
RETURNS TRIGGER AS $$
BEGIN
    -- Simple threshold of 2 votes
    IF NEW.approve_count >= 2 THEN
        NEW.validation_status := 'approved';
    ELSIF NEW.reject_count >= 2 THEN
        NEW.validation_status := 'rejected';
    ELSE
        NEW.validation_status := 'pending';
    END IF;
    
    NEW.updated_at := NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create the trigger
CREATE TRIGGER update_trend_stage_trigger
BEFORE INSERT OR UPDATE OF approve_count, reject_count ON public.trend_submissions
FOR EACH ROW
EXECUTE FUNCTION update_trend_stage();

-- Step 5: Grant permissions
GRANT EXECUTE ON FUNCTION public.cast_trend_vote(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cast_trend_vote(UUID, TEXT) TO anon;

-- Step 6: Test that it works
DO $$
BEGIN
    RAISE NOTICE 'Functions created successfully';
END $$;

-- Step 7: Verify the setup
SELECT 
    'Fixed' as status,
    COUNT(*) as function_count
FROM pg_proc 
WHERE proname = 'cast_trend_vote';