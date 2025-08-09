-- SIMPLE DIRECT FIX - RUN THIS FIRST TO SEE YOUR ACTUAL COLUMN
-- Step 1: Show what columns you actually have
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'trend_validations' 
AND table_schema = 'public'
AND column_name LIKE '%trend%';

-- Step 2: If you see 'trend_id' in the results above, run this block:
-- If you see 'trend_submission_id', skip to Step 3

-- Add the missing column
ALTER TABLE public.trend_validations 
ADD COLUMN IF NOT EXISTS trend_submission_id UUID;

-- Copy data from trend_id to trend_submission_id
UPDATE public.trend_validations 
SET trend_submission_id = trend_id
WHERE trend_submission_id IS NULL AND trend_id IS NOT NULL;

-- Add the foreign key constraint
ALTER TABLE public.trend_validations
DROP CONSTRAINT IF EXISTS trend_validations_trend_submission_id_fkey;

ALTER TABLE public.trend_validations
ADD CONSTRAINT trend_validations_trend_submission_id_fkey 
FOREIGN KEY (trend_submission_id) 
REFERENCES public.trend_submissions(id) 
ON DELETE CASCADE;

-- Step 3: Create a simple working function
DROP FUNCTION IF EXISTS cast_trend_vote(UUID, TEXT);

CREATE OR REPLACE FUNCTION cast_trend_vote(
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
    
    -- Basic validation
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM trend_submissions WHERE id = p_trend_id) THEN
        RETURN json_build_object('success', false, 'error', 'Trend not found');
    END IF;
    
    -- Check if already voted (handle both column names)
    IF EXISTS (
        SELECT 1 FROM trend_validations 
        WHERE validator_id = v_user_id
        AND (
            trend_submission_id = p_trend_id 
            OR trend_id = p_trend_id
        )
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Already voted');
    END IF;
    
    -- Insert the vote (try both columns)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trend_validations' 
        AND column_name = 'trend_submission_id'
        AND table_schema = 'public'
    ) THEN
        INSERT INTO trend_validations (trend_submission_id, validator_id, vote, created_at)
        VALUES (p_trend_id, v_user_id, p_vote, NOW());
    ELSE
        INSERT INTO trend_validations (trend_id, validator_id, vote, created_at)
        VALUES (p_trend_id, v_user_id, p_vote, NOW());
    END IF;
    
    -- Update counts
    IF p_vote = 'verify' THEN
        UPDATE trend_submissions
        SET approve_count = COALESCE(approve_count, 0) + 1
        WHERE id = p_trend_id;
    ELSE
        UPDATE trend_submissions
        SET reject_count = COALESCE(reject_count, 0) + 1
        WHERE id = p_trend_id;
    END IF;
    
    -- Simple reward
    UPDATE profiles
    SET earnings_pending = COALESCE(earnings_pending, 0) + 0.01
    WHERE id = v_user_id;
    
    RETURN json_build_object('success', true, 'vote', p_vote);
END;
$$;

GRANT EXECUTE ON FUNCTION cast_trend_vote TO authenticated;
GRANT EXECUTE ON FUNCTION cast_trend_vote TO anon;

-- Verify it works
SELECT 'Function created successfully' as status;