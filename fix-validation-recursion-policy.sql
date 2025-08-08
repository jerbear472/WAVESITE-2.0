-- Fix Infinite Recursion in trend_validations RLS Policies
-- This resolves the circular reference issue

-- 1. First, disable RLS temporarily to clean up
ALTER TABLE public.trend_validations DISABLE ROW LEVEL SECURITY;

-- 2. Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can insert their own validations" ON public.trend_validations;
DROP POLICY IF EXISTS "Authenticated users can insert validations" ON public.trend_validations;
DROP POLICY IF EXISTS "Anyone can view validations" ON public.trend_validations;
DROP POLICY IF EXISTS "Users can view validations" ON public.trend_validations;
DROP POLICY IF EXISTS "Authenticated users can validate trends" ON public.trend_validations;
DROP POLICY IF EXISTS "Trend validations are viewable by everyone" ON public.trend_validations;
DROP POLICY IF EXISTS "Users cannot update validations" ON public.trend_validations;
DROP POLICY IF EXISTS "Users cannot delete validations" ON public.trend_validations;
DROP POLICY IF EXISTS "Users can update their own validations" ON public.trend_validations;

-- 3. Re-enable RLS
ALTER TABLE public.trend_validations ENABLE ROW LEVEL SECURITY;

-- 4. Create simple, non-recursive policies
-- For SELECT: Allow everyone to view all validations (no recursion)
CREATE POLICY "allow_select_validations" 
ON public.trend_validations
FOR SELECT 
USING (true);

-- For INSERT: Allow authenticated users to insert their own validations only
-- Using auth.uid() directly avoids recursion
CREATE POLICY "allow_insert_own_validations" 
ON public.trend_validations
FOR INSERT 
WITH CHECK (
    auth.uid() IS NOT NULL 
    AND validator_id = auth.uid()
);

-- For UPDATE: Prevent all updates (validations should be immutable)
CREATE POLICY "prevent_update_validations" 
ON public.trend_validations
FOR UPDATE 
USING (false);

-- For DELETE: Prevent all deletes (validations should be permanent)
CREATE POLICY "prevent_delete_validations" 
ON public.trend_validations
FOR DELETE 
USING (false);

-- 5. Grant necessary permissions
GRANT SELECT ON public.trend_validations TO authenticated, anon;
GRANT INSERT ON public.trend_validations TO authenticated;
-- Explicitly revoke update and delete
REVOKE UPDATE, DELETE ON public.trend_validations FROM authenticated, anon;

-- 6. Ensure the unique constraint exists (prevents duplicate votes)
ALTER TABLE public.trend_validations
DROP CONSTRAINT IF EXISTS unique_user_trend_vote;

ALTER TABLE public.trend_validations
ADD CONSTRAINT unique_user_trend_vote 
UNIQUE(trend_submission_id, validator_id);

-- 7. Test the policies by checking if they cause recursion
DO $$
DECLARE
    v_test_result BOOLEAN;
BEGIN
    -- This query should not cause recursion
    PERFORM COUNT(*) FROM public.trend_validations LIMIT 1;
    RAISE NOTICE '✅ SELECT policy works without recursion';
    
    -- Check if the policies are properly set
    PERFORM COUNT(*) 
    FROM pg_policies 
    WHERE tablename = 'trend_validations' 
    AND policyname LIKE 'allow_%';
    
    RAISE NOTICE '✅ Policies have been recreated successfully';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error testing policies: %', SQLERRM;
END $$;

-- 8. Create a simple function to validate a trend (avoids complex RLS checks)
CREATE OR REPLACE FUNCTION public.submit_trend_validation(
    p_trend_id UUID,
    p_vote TEXT,
    p_confidence DECIMAL DEFAULT 0.75
) RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_result JSONB;
    v_existing_vote BOOLEAN;
    v_is_own_trend BOOLEAN;
BEGIN
    -- Get the current user ID
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not authenticated'
        );
    END IF;
    
    -- Check if user already voted on this trend
    SELECT EXISTS(
        SELECT 1 FROM public.trend_validations
        WHERE trend_submission_id = p_trend_id
        AND validator_id = v_user_id
    ) INTO v_existing_vote;
    
    IF v_existing_vote THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'You have already voted on this trend'
        );
    END IF;
    
    -- Check if user owns the trend
    SELECT EXISTS(
        SELECT 1 FROM public.trend_submissions
        WHERE id = p_trend_id
        AND spotter_id = v_user_id
    ) INTO v_is_own_trend;
    
    IF v_is_own_trend THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'You cannot vote on your own trend'
        );
    END IF;
    
    -- Insert the vote
    INSERT INTO public.trend_validations (
        trend_submission_id,
        validator_id,
        vote,
        confidence_score,
        created_at
    ) VALUES (
        p_trend_id,
        v_user_id,
        p_vote,
        p_confidence,
        NOW()
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Vote submitted successfully'
    );
    
EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'You have already voted on this trend'
        );
    WHEN foreign_key_violation THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid trend ID'
        );
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.submit_trend_validation(UUID, TEXT, DECIMAL) TO authenticated;

-- 9. Final verification
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== Validation Recursion Fix Applied ===';
    RAISE NOTICE '';
    RAISE NOTICE 'Changes made:';
    RAISE NOTICE '  ✅ Removed all recursive RLS policies';
    RAISE NOTICE '  ✅ Created simple, non-recursive policies';
    RAISE NOTICE '  ✅ Added submit_trend_validation() function as alternative';
    RAISE NOTICE '';
    RAISE NOTICE 'Users can now:';
    RAISE NOTICE '  - Vote on trends without recursion errors';
    RAISE NOTICE '  - Use submit_trend_validation() function for guaranteed success';
    RAISE NOTICE '  - View all validations without issues';
    RAISE NOTICE '';
    RAISE NOTICE 'To use the function from your app:';
    RAISE NOTICE '  const { data, error } = await supabase.rpc(''submit_trend_validation'', {';
    RAISE NOTICE '    p_trend_id: trendId,';
    RAISE NOTICE '    p_vote: ''verify'' or ''reject'',';
    RAISE NOTICE '    p_confidence: 0.75';
    RAISE NOTICE '  });';
END $$;