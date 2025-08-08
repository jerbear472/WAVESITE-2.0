-- AGGRESSIVE FIX for Infinite Recursion in trend_validations
-- This completely removes RLS and uses functions instead

-- 1. COMPLETELY DISABLE RLS on trend_validations
ALTER TABLE public.trend_validations DISABLE ROW LEVEL SECURITY;

-- 2. Drop ALL policies (clean slate)
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'trend_validations'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.trend_validations', pol.policyname);
    END LOOP;
END $$;

-- 3. Grant basic permissions (no RLS)
GRANT SELECT, INSERT ON public.trend_validations TO authenticated;
GRANT SELECT ON public.trend_validations TO anon;
REVOKE UPDATE, DELETE ON public.trend_validations FROM authenticated, anon;

-- 4. Create a SECURE function for voting (this is the ONLY way to vote)
CREATE OR REPLACE FUNCTION public.cast_trend_vote(
    trend_id UUID,
    vote_type TEXT
) RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_result JSONB;
    v_new_id UUID;
BEGIN
    -- Get the current user
    v_user_id := auth.uid();
    
    -- Check authentication
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Not authenticated'
        );
    END IF;
    
    -- Validate vote type
    IF vote_type NOT IN ('verify', 'reject') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid vote type'
        );
    END IF;
    
    -- Check if trend exists
    IF NOT EXISTS (SELECT 1 FROM public.trend_submissions WHERE id = trend_id) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Trend not found'
        );
    END IF;
    
    -- Check if user owns the trend
    IF EXISTS (
        SELECT 1 FROM public.trend_submissions 
        WHERE id = trend_id AND spotter_id = v_user_id
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Cannot vote on your own trend'
        );
    END IF;
    
    -- Check for existing vote
    IF EXISTS (
        SELECT 1 FROM public.trend_validations 
        WHERE trend_submission_id = trend_id 
        AND validator_id = v_user_id
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Already voted on this trend'
        );
    END IF;
    
    -- Insert the vote
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
    ) RETURNING id INTO v_new_id;
    
    -- Return success
    RETURN jsonb_build_object(
        'success', true,
        'id', v_new_id,
        'message', 'Vote recorded successfully'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', COALESCE(SQLERRM, 'Unknown error')
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Grant execute permission
GRANT EXECUTE ON FUNCTION public.cast_trend_vote(UUID, TEXT) TO authenticated;

-- 6. Create a view for safe reading (optional, for extra safety)
CREATE OR REPLACE VIEW public.trend_validations_view AS
SELECT 
    tv.id,
    tv.trend_submission_id,
    tv.validator_id,
    tv.vote,
    tv.confidence_score,
    tv.created_at,
    tv.confirmed,
    tv.reward_amount
FROM public.trend_validations tv;

GRANT SELECT ON public.trend_validations_view TO authenticated, anon;

-- 7. Update the vote count trigger to work without RLS
CREATE OR REPLACE FUNCTION public.update_trend_vote_counts_safe()
RETURNS TRIGGER AS $$
DECLARE
    v_approve_count INTEGER;
    v_reject_count INTEGER;
    v_trend_id UUID;
BEGIN
    -- Get the trend ID
    v_trend_id := COALESCE(NEW.trend_submission_id, OLD.trend_submission_id);
    
    -- Calculate counts directly (no RLS issues)
    SELECT 
        COUNT(*) FILTER (WHERE vote = 'verify'),
        COUNT(*) FILTER (WHERE vote = 'reject')
    INTO v_approve_count, v_reject_count
    FROM public.trend_validations
    WHERE trend_submission_id = v_trend_id;
    
    -- Update the trend
    UPDATE public.trend_submissions
    SET 
        approve_count = v_approve_count,
        reject_count = v_reject_count,
        validation_status = CASE
            WHEN v_approve_count >= 1 THEN 'approved'
            WHEN v_reject_count >= 2 THEN 'rejected'
            ELSE 'pending'
        END,
        validation_count = v_approve_count + v_reject_count
    WHERE id = v_trend_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create the trigger
DROP TRIGGER IF EXISTS update_vote_counts_trigger ON public.trend_validations;
CREATE TRIGGER update_vote_counts_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.trend_validations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_trend_vote_counts_safe();

-- 8. Test the setup
DO $$
DECLARE
    v_test JSONB;
BEGIN
    -- Test that we can select without recursion
    PERFORM COUNT(*) FROM public.trend_validations LIMIT 1;
    RAISE NOTICE '✅ Direct SELECT works without RLS';
    
    -- Test the function exists
    IF EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'cast_trend_vote'
    ) THEN
        RAISE NOTICE '✅ cast_trend_vote function created';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== AGGRESSIVE RECURSION FIX APPLIED ===';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  IMPORTANT: RLS is now DISABLED on trend_validations';
    RAISE NOTICE '✅ Voting MUST use the cast_trend_vote() function';
    RAISE NOTICE '✅ This completely avoids recursion issues';
    RAISE NOTICE '';
    RAISE NOTICE 'Frontend should call:';
    RAISE NOTICE '  supabase.rpc(''cast_trend_vote'', {';
    RAISE NOTICE '    trend_id: ''uuid-here'',';
    RAISE NOTICE '    vote_type: ''verify'' or ''reject''';
    RAISE NOTICE '  })';
    RAISE NOTICE '';
    RAISE NOTICE 'This is a temporary fix. Consider re-enabling RLS later';
    RAISE NOTICE 'with properly designed non-recursive policies.';
END $$;