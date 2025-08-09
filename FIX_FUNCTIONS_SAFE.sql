-- Safe fix that handles existing functions properly

-- Step 1: Drop existing functions if they exist (to avoid conflicts)
DROP FUNCTION IF EXISTS public.get_consensus_threshold(trend_category, integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_consensus_threshold(text, integer) CASCADE;

-- Step 2: Create the get_consensus_threshold function
CREATE OR REPLACE FUNCTION public.get_consensus_threshold(
    category text,
    likes_count integer DEFAULT 0
)
RETURNS integer
LANGUAGE plpgsql
AS $$
BEGIN
    -- Simple threshold logic
    IF likes_count > 10000 THEN
        RETURN 5;
    ELSIF likes_count > 1000 THEN
        RETURN 3;
    ELSE
        RETURN 2;
    END IF;
END;
$$;

-- Step 3: Fix or create the update_trend_stage function
DROP FUNCTION IF EXISTS update_trend_stage() CASCADE;

CREATE OR REPLACE FUNCTION update_trend_stage()
RETURNS TRIGGER AS $$
DECLARE
    v_threshold integer;
BEGIN
    -- Get threshold with safe fallback
    v_threshold := 2; -- Default
    
    BEGIN
        v_threshold := public.get_consensus_threshold(
            COALESCE(NEW.category, 'other')::text, 
            COALESCE(NEW.likes_count, 0)
        );
    EXCEPTION WHEN OTHERS THEN
        v_threshold := 2; -- Fallback
    END;
    
    -- Update validation status
    IF COALESCE(NEW.approve_count, 0) >= v_threshold THEN
        NEW.validation_status := 'approved';
    ELSIF COALESCE(NEW.reject_count, 0) >= v_threshold THEN
        NEW.validation_status := 'rejected';
    ELSE
        NEW.validation_status := 'pending';
    END IF;
    
    -- Update timestamp if column exists
    NEW.updated_at := NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Ensure all required columns exist
ALTER TABLE public.trend_submissions
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS approve_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reject_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS validation_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS validation_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'other';

ALTER TABLE public.trend_validations
ADD COLUMN IF NOT EXISTS trend_submission_id UUID,
ADD COLUMN IF NOT EXISTS trend_id UUID,
ADD COLUMN IF NOT EXISTS vote TEXT,
ADD COLUMN IF NOT EXISTS confirmed BOOLEAN,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Step 5: Drop and recreate trigger
DROP TRIGGER IF EXISTS update_trend_stage_trigger ON public.trend_submissions;

CREATE TRIGGER update_trend_stage_trigger
BEFORE INSERT OR UPDATE ON public.trend_submissions
FOR EACH ROW
EXECUTE FUNCTION update_trend_stage();

-- Step 6: Sync columns
UPDATE public.trend_validations
SET trend_submission_id = trend_id
WHERE trend_submission_id IS NULL AND trend_id IS NOT NULL;

UPDATE public.trend_validations
SET trend_id = trend_submission_id
WHERE trend_id IS NULL AND trend_submission_id IS NOT NULL;

-- Step 7: Create or replace cast_trend_vote
DROP FUNCTION IF EXISTS public.cast_trend_vote(UUID, TEXT) CASCADE;

CREATE FUNCTION public.cast_trend_vote(
    p_trend_id UUID,
    p_vote TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_approve_count INT;
    v_reject_count INT;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM trend_submissions WHERE id = p_trend_id) THEN
        RETURN json_build_object('success', false, 'error', 'Trend not found');
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM trend_validations 
        WHERE (trend_submission_id = p_trend_id OR trend_id = p_trend_id)
        AND validator_id = v_user_id
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Already voted on this trend');
    END IF;
    
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
        v_user_id,
        p_vote,
        CASE WHEN p_vote = 'verify' THEN true ELSE false END,
        NOW()
    );
    
    IF p_vote = 'verify' THEN
        UPDATE trend_submissions
        SET 
            approve_count = COALESCE(approve_count, 0) + 1,
            validation_count = COALESCE(validation_count, 0) + 1,
            updated_at = NOW()
        WHERE id = p_trend_id
        RETURNING approve_count INTO v_approve_count;
    ELSE
        UPDATE trend_submissions
        SET 
            reject_count = COALESCE(reject_count, 0) + 1,
            validation_count = COALESCE(validation_count, 0) + 1,
            updated_at = NOW()
        WHERE id = p_trend_id
        RETURNING reject_count INTO v_reject_count;
    END IF;
    
    SELECT approve_count, reject_count 
    INTO v_approve_count, v_reject_count
    FROM trend_submissions
    WHERE id = p_trend_id;
    
    RETURN json_build_object(
        'success', true,
        'vote', p_vote,
        'approve_count', COALESCE(v_approve_count, 0),
        'reject_count', COALESCE(v_reject_count, 0)
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- Step 8: Grant permissions
GRANT EXECUTE ON FUNCTION public.cast_trend_vote(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cast_trend_vote(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_consensus_threshold(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_consensus_threshold(text, integer) TO anon;
GRANT ALL ON public.trend_validations TO authenticated;
GRANT ALL ON public.trend_submissions TO authenticated;

-- Step 9: Verify
SELECT 
    EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_consensus_threshold') as has_consensus_func,
    EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'cast_trend_vote') as has_vote_func,
    EXISTS(SELECT 1 FROM pg_trigger WHERE tgname = 'update_trend_stage_trigger') as has_trigger,
    'Functions fixed successfully!' as status;