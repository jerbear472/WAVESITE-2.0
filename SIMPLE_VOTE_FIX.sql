-- SIMPLE FIX: Just make voting work
-- Goal: Vote on trends, count the votes, update the trend

-- Step 1: Make sure columns exist
ALTER TABLE public.trend_submissions
ADD COLUMN IF NOT EXISTS approve_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reject_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS validation_status TEXT DEFAULT 'pending';

-- Step 2: Create a simple vote function
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
BEGIN
    -- Get user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    -- Check if already voted
    IF EXISTS (
        SELECT 1 FROM public.trend_validations 
        WHERE validator_id = v_user_id
        AND (trend_submission_id = p_trend_id OR trend_id = p_trend_id)
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Already voted');
    END IF;
    
    -- Insert the vote
    INSERT INTO public.trend_validations (
        trend_submission_id,
        trend_id,
        validator_id,
        vote,
        confirmed
    ) VALUES (
        p_trend_id,
        p_trend_id,
        v_user_id,
        p_vote,
        CASE WHEN p_vote = 'verify' THEN true ELSE false END
    );
    
    -- Update the counts directly on trend_submissions
    IF p_vote = 'verify' THEN
        UPDATE public.trend_submissions
        SET approve_count = approve_count + 1
        WHERE id = p_trend_id;
    ELSE
        UPDATE public.trend_submissions
        SET reject_count = reject_count + 1
        WHERE id = p_trend_id;
    END IF;
    
    -- Update status if threshold reached
    UPDATE public.trend_submissions
    SET validation_status = CASE
        WHEN approve_count >= 2 THEN 'approved'
        WHEN reject_count >= 2 THEN 'rejected'
        ELSE 'pending'
    END
    WHERE id = p_trend_id;
    
    -- Return current counts
    RETURN json_build_object(
        'success', true,
        'vote', p_vote
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- Step 3: Grant permission
GRANT EXECUTE ON FUNCTION public.cast_trend_vote(UUID, TEXT) TO authenticated;

-- That's it. Simple and working.