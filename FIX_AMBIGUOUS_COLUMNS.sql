-- Fix ambiguous column references in triggers and functions
-- The error "column reference 'reject_count' is ambiguous" happens when there's a JOIN

-- Step 1: Drop problematic triggers first
DROP TRIGGER IF EXISTS update_trend_stage_trigger ON public.trend_submissions CASCADE;
DROP TRIGGER IF EXISTS update_trend_vote_counts_trigger ON public.trend_validations CASCADE;

-- Step 2: Drop and recreate functions with properly qualified column names
DROP FUNCTION IF EXISTS update_trend_stage() CASCADE;
DROP FUNCTION IF EXISTS update_trend_vote_counts() CASCADE;

-- Step 3: Create a clean update_trend_vote_counts function
CREATE OR REPLACE FUNCTION update_trend_vote_counts()
RETURNS TRIGGER AS $$
DECLARE
    v_trend_id UUID;
    v_approve_count INTEGER;
    v_reject_count INTEGER;
    v_status TEXT;
BEGIN
    -- Get the trend_id
    v_trend_id := COALESCE(NEW.trend_submission_id, NEW.trend_id);
    
    IF v_trend_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Count votes with proper table qualification
    SELECT 
        COUNT(CASE WHEN tv.vote = 'verify' OR tv.confirmed = true THEN 1 END),
        COUNT(CASE WHEN tv.vote = 'reject' OR tv.confirmed = false THEN 1 END)
    INTO v_approve_count, v_reject_count
    FROM public.trend_validations tv
    WHERE (tv.trend_submission_id = v_trend_id OR tv.trend_id = v_trend_id);
    
    -- Determine status
    IF v_approve_count >= 2 THEN
        v_status := 'approved';
    ELSIF v_reject_count >= 2 THEN
        v_status := 'rejected';
    ELSE
        v_status := 'pending';
    END IF;
    
    -- Update trend_submissions with qualified column names
    UPDATE public.trend_submissions ts
    SET 
        approve_count = v_approve_count,
        reject_count = v_reject_count,
        validation_status = v_status,
        validation_count = v_approve_count + v_reject_count,
        updated_at = NOW()
    WHERE ts.id = v_trend_id;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error in update_trend_vote_counts: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create a clean update_trend_stage function
CREATE OR REPLACE FUNCTION update_trend_stage()
RETURNS TRIGGER AS $$
DECLARE
    v_threshold integer;
BEGIN
    -- Default threshold
    v_threshold := 2;
    
    -- Try to get dynamic threshold
    BEGIN
        IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_consensus_threshold') THEN
            v_threshold := public.get_consensus_threshold(
                COALESCE(NEW.category, 'other')::text, 
                COALESCE(NEW.likes_count, 0)
            );
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_threshold := 2;
    END;
    
    -- Update validation status with qualified column references
    IF COALESCE(NEW.approve_count, 0) >= v_threshold THEN
        NEW.validation_status := 'approved';
    ELSIF COALESCE(NEW.reject_count, 0) >= v_threshold THEN
        NEW.validation_status := 'rejected';
    ELSE
        NEW.validation_status := 'pending';
    END IF;
    
    NEW.updated_at := NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Recreate triggers
CREATE TRIGGER update_trend_vote_counts_trigger
AFTER INSERT OR UPDATE ON public.trend_validations
FOR EACH ROW
EXECUTE FUNCTION update_trend_vote_counts();

CREATE TRIGGER update_trend_stage_trigger
BEFORE INSERT OR UPDATE ON public.trend_submissions
FOR EACH ROW
EXECUTE FUNCTION update_trend_stage();

-- Step 6: Fix any existing views that might have ambiguous columns
-- Drop and recreate trend_vote_stats view if it exists
DROP VIEW IF EXISTS public.trend_vote_stats CASCADE;

CREATE OR REPLACE VIEW public.trend_vote_stats AS
SELECT 
    ts.id,
    ts.description,
    ts.category,
    ts.status,
    ts.validation_count as total_votes,
    ts.approve_count as yes_votes,
    ts.reject_count as no_votes,
    CASE 
        WHEN ts.validation_count > 0 
        THEN ROUND((ts.approve_count::DECIMAL / ts.validation_count) * 100, 2)
        ELSE 0 
    END as approval_percentage,
    ts.created_at,
    ts.updated_at
FROM public.trend_submissions ts;

-- Step 7: Update the cast_trend_vote function to use qualified names
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
    v_spotter_id UUID;
    v_approve_count INT;
    v_reject_count INT;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    -- Check if trend exists with qualified table name
    SELECT ts.spotter_id INTO v_spotter_id
    FROM public.trend_submissions ts
    WHERE ts.id = p_trend_id;
    
    IF v_spotter_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Trend not found');
    END IF;
    
    -- Check if already voted with qualified columns
    IF EXISTS (
        SELECT 1 FROM public.trend_validations tv
        WHERE (tv.trend_submission_id = p_trend_id OR tv.trend_id = p_trend_id)
        AND tv.validator_id = v_user_id
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Already voted on this trend');
    END IF;
    
    -- Insert vote
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
    
    -- Get updated counts with qualified columns
    SELECT ts.approve_count, ts.reject_count 
    INTO v_approve_count, v_reject_count
    FROM public.trend_submissions ts
    WHERE ts.id = p_trend_id;
    
    -- Update validator earnings if profiles table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        UPDATE public.profiles p
        SET 
            earnings_approved = COALESCE(p.earnings_approved, 0) + 0.01,
            total_earnings = COALESCE(p.total_earnings, 0) + 0.01
        WHERE p.id = v_user_id;
    END IF;
    
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

-- Final verification
SELECT 
    'Fixed ambiguous column references' as status,
    'All functions and triggers now use fully qualified column names' as details;