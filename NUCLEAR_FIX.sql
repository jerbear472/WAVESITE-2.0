-- NUCLEAR OPTION: Complete removal and rebuild of ALL voting-related database objects
-- Run this to completely fix the ambiguous column error

-- Step 1: Drop EVERYTHING related to voting
DROP TRIGGER IF EXISTS update_trend_stage_trigger ON public.trend_submissions CASCADE;
DROP TRIGGER IF EXISTS update_trend_vote_counts_trigger ON public.trend_validations CASCADE;
DROP TRIGGER IF EXISTS trend_vote_counts_trigger ON public.trend_validations CASCADE;
DROP TRIGGER IF EXISTS trend_stage_trigger ON public.trend_submissions CASCADE;
DROP TRIGGER IF EXISTS after_vote_trigger ON public.trend_validations CASCADE;
DROP TRIGGER IF EXISTS before_vote_trigger ON public.trend_validations CASCADE;

DROP FUNCTION IF EXISTS update_trend_stage() CASCADE;
DROP FUNCTION IF EXISTS update_trend_vote_counts() CASCADE;
DROP FUNCTION IF EXISTS update_vote_counts() CASCADE;
DROP FUNCTION IF EXISTS recalculate_vote_counts() CASCADE;
DROP FUNCTION IF EXISTS public.cast_trend_vote(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_consensus_threshold(text, integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_consensus_threshold(trend_category, integer) CASCADE;

DROP VIEW IF EXISTS public.trend_vote_stats CASCADE;
DROP VIEW IF EXISTS public.trend_vote_summary CASCADE;

-- Step 2: Make sure columns exist
ALTER TABLE public.trend_submissions
ADD COLUMN IF NOT EXISTS approve_count INTEGER DEFAULT 0;

ALTER TABLE public.trend_submissions
ADD COLUMN IF NOT EXISTS reject_count INTEGER DEFAULT 0;

ALTER TABLE public.trend_submissions
ADD COLUMN IF NOT EXISTS validation_count INTEGER DEFAULT 0;

ALTER TABLE public.trend_submissions
ADD COLUMN IF NOT EXISTS validation_status TEXT DEFAULT 'pending';

ALTER TABLE public.trend_submissions
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.trend_validations
ADD COLUMN IF NOT EXISTS trend_submission_id UUID;

ALTER TABLE public.trend_validations
ADD COLUMN IF NOT EXISTS trend_id UUID;

ALTER TABLE public.trend_validations
ADD COLUMN IF NOT EXISTS vote TEXT;

ALTER TABLE public.trend_validations
ADD COLUMN IF NOT EXISTS confirmed BOOLEAN;

-- Step 3: ONE function to rule them all - no triggers needed
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
    final_approve_count INT;
    final_reject_count INT;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    -- Check trend exists
    IF NOT EXISTS (SELECT 1 FROM public.trend_submissions WHERE id = p_trend_id) THEN
        RETURN json_build_object('success', false, 'error', 'Trend not found');
    END IF;
    
    -- Check if already voted
    IF EXISTS (
        SELECT 1 FROM public.trend_validations 
        WHERE validator_id = v_user_id
        AND (trend_submission_id = p_trend_id OR trend_id = p_trend_id)
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
    
    -- Recalculate ALL counts from scratch (no ambiguity possible)
    UPDATE public.trend_submissions
    SET 
        approve_count = (
            SELECT COUNT(*) 
            FROM public.trend_validations 
            WHERE (trend_submission_id = p_trend_id OR trend_id = p_trend_id)
            AND (vote = 'verify' OR confirmed = true)
        ),
        reject_count = (
            SELECT COUNT(*) 
            FROM public.trend_validations 
            WHERE (trend_submission_id = p_trend_id OR trend_id = p_trend_id)
            AND (vote = 'reject' OR confirmed = false)
        ),
        validation_count = (
            SELECT COUNT(*) 
            FROM public.trend_validations 
            WHERE (trend_submission_id = p_trend_id OR trend_id = p_trend_id)
        ),
        updated_at = NOW()
    WHERE id = p_trend_id
    RETURNING approve_count, reject_count INTO final_approve_count, final_reject_count;
    
    -- Update status
    UPDATE public.trend_submissions
    SET validation_status = CASE
        WHEN approve_count >= 2 THEN 'approved'
        WHEN reject_count >= 2 THEN 'rejected'
        ELSE 'pending'
    END
    WHERE id = p_trend_id;
    
    -- Update earnings if profiles table exists
    PERFORM 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'profiles';
    
    IF FOUND THEN
        UPDATE public.profiles
        SET 
            earnings_approved = COALESCE(earnings_approved, 0) + 0.01,
            total_earnings = COALESCE(total_earnings, 0) + 0.01
        WHERE id = v_user_id;
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'vote', p_vote,
        'approve_count', COALESCE(final_approve_count, 0),
        'reject_count', COALESCE(final_reject_count, 0)
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'detail', SQLSTATE,
        'hint', 'Check server logs for details'
    );
END;
$$;

-- Step 4: Grant permissions
GRANT EXECUTE ON FUNCTION public.cast_trend_vote(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cast_trend_vote(UUID, TEXT) TO anon;
GRANT ALL ON public.trend_validations TO authenticated;
GRANT ALL ON public.trend_submissions TO authenticated;

-- Step 5: Fix existing data
UPDATE public.trend_validations
SET trend_submission_id = trend_id
WHERE trend_submission_id IS NULL AND trend_id IS NOT NULL;

UPDATE public.trend_validations
SET trend_id = trend_submission_id  
WHERE trend_id IS NULL AND trend_submission_id IS NOT NULL;

-- Step 6: Recalculate all counts
UPDATE public.trend_submissions ts
SET 
    approve_count = (
        SELECT COUNT(*) 
        FROM public.trend_validations tv
        WHERE (tv.trend_submission_id = ts.id OR tv.trend_id = ts.id)
        AND (tv.vote = 'verify' OR tv.confirmed = true)
    ),
    reject_count = (
        SELECT COUNT(*) 
        FROM public.trend_validations tv
        WHERE (tv.trend_submission_id = ts.id OR tv.trend_id = ts.id)
        AND (tv.vote = 'reject' OR tv.confirmed = false)
    ),
    validation_count = (
        SELECT COUNT(*) 
        FROM public.trend_validations tv
        WHERE (tv.trend_submission_id = ts.id OR tv.trend_id = ts.id)
    );

-- Step 7: Update all statuses
UPDATE public.trend_submissions
SET validation_status = CASE
    WHEN approve_count >= 2 THEN 'approved'
    WHEN reject_count >= 2 THEN 'rejected'
    ELSE 'pending'
END;

-- Step 8: Create indexes
CREATE INDEX IF NOT EXISTS idx_tv_trend_submission_id ON public.trend_validations(trend_submission_id);
CREATE INDEX IF NOT EXISTS idx_tv_trend_id ON public.trend_validations(trend_id);
CREATE INDEX IF NOT EXISTS idx_tv_validator_id ON public.trend_validations(validator_id);
CREATE INDEX IF NOT EXISTS idx_tv_vote ON public.trend_validations(vote);
CREATE INDEX IF NOT EXISTS idx_ts_validation_status ON public.trend_submissions(validation_status);

-- Final message
DO $$
BEGIN
    RAISE NOTICE '====================================';
    RAISE NOTICE 'NUCLEAR FIX COMPLETE';
    RAISE NOTICE '====================================';
    RAISE NOTICE 'All triggers removed';
    RAISE NOTICE 'All functions rebuilt';
    RAISE NOTICE 'No more ambiguous columns possible';
    RAISE NOTICE 'cast_trend_vote now handles everything';
    RAISE NOTICE '====================================';
END $$;

-- Verify
SELECT 
    'FIXED' as status,
    COUNT(*) as function_count
FROM pg_proc 
WHERE proname = 'cast_trend_vote';