-- Minimal fix - just the essentials to get verify page working

-- 1. Add the missing updated_at column
ALTER TABLE public.trend_submissions
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Add vote counting columns
ALTER TABLE public.trend_submissions
ADD COLUMN IF NOT EXISTS approve_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reject_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS validation_count INTEGER DEFAULT 0;

-- 3. Add trend_submission_id to trend_validations if missing
ALTER TABLE public.trend_validations
ADD COLUMN IF NOT EXISTS trend_submission_id UUID;

-- 4. Add trend_id to trend_validations if missing  
ALTER TABLE public.trend_validations
ADD COLUMN IF NOT EXISTS trend_id UUID;

-- 5. Add vote column if missing
ALTER TABLE public.trend_validations
ADD COLUMN IF NOT EXISTS vote TEXT;

-- 6. Sync the columns
UPDATE public.trend_validations
SET trend_submission_id = trend_id
WHERE trend_submission_id IS NULL AND trend_id IS NOT NULL;

UPDATE public.trend_validations
SET trend_id = trend_submission_id
WHERE trend_id IS NULL AND trend_submission_id IS NOT NULL;

-- 7. Simple cast_trend_vote function
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
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    -- Check if already voted
    IF EXISTS (
        SELECT 1 FROM trend_validations 
        WHERE (trend_submission_id = p_trend_id OR trend_id = p_trend_id)
        AND validator_id = v_user_id
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Already voted on this trend');
    END IF;
    
    -- Insert vote
    INSERT INTO trend_validations (
        trend_submission_id,
        trend_id,
        validator_id,
        vote
    ) VALUES (
        p_trend_id,
        p_trend_id,
        v_user_id,
        p_vote
    );
    
    -- Update counts
    UPDATE trend_submissions
    SET 
        approve_count = (
            SELECT COUNT(*) FROM trend_validations 
            WHERE (trend_submission_id = p_trend_id OR trend_id = p_trend_id)
            AND vote = 'verify'
        ),
        reject_count = (
            SELECT COUNT(*) FROM trend_validations 
            WHERE (trend_submission_id = p_trend_id OR trend_id = p_trend_id)
            AND vote = 'reject'
        ),
        updated_at = NOW()
    WHERE id = p_trend_id;
    
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

-- 8. Grant permissions
GRANT EXECUTE ON FUNCTION public.cast_trend_vote(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cast_trend_vote(UUID, TEXT) TO anon;

SELECT 'Minimal fix applied successfully!' as status;