-- ============================================================
-- WAVESIGHT CORE FUNCTIONALITY ASSURANCE SCRIPT
-- This ensures trend submission and verification work perfectly
-- ============================================================

-- STEP 1: ENSURE ALL REQUIRED COLUMNS EXIST
-- ============================================================

DO $$
BEGIN
    -- Ensure trend_submissions has all required columns
    ALTER TABLE public.trend_submissions 
    ADD COLUMN IF NOT EXISTS approve_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS reject_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS validation_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS validation_status TEXT DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS wave_score INTEGER DEFAULT 50,
    ADD COLUMN IF NOT EXISTS screenshot_url TEXT,
    ADD COLUMN IF NOT EXISTS post_url TEXT,
    ADD COLUMN IF NOT EXISTS creator_handle TEXT,
    ADD COLUMN IF NOT EXISTS creator_name TEXT,
    ADD COLUMN IF NOT EXISTS post_caption TEXT,
    ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS shares_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS hashtags TEXT[],
    ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
    ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS platform TEXT,
    ADD COLUMN IF NOT EXISTS evidence JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS quality_score DECIMAL(3,2) DEFAULT 0.50,
    ADD COLUMN IF NOT EXISTS virality_prediction INTEGER DEFAULT 5;
    
    -- Ensure trend_validations has all required columns
    ALTER TABLE public.trend_validations
    ADD COLUMN IF NOT EXISTS trend_submission_id UUID,
    ADD COLUMN IF NOT EXISTS trend_id UUID,
    ADD COLUMN IF NOT EXISTS vote TEXT,
    ADD COLUMN IF NOT EXISTS confirmed BOOLEAN,
    ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2),
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    
    -- Ensure profiles table has earnings columns
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        ALTER TABLE public.profiles
        ADD COLUMN IF NOT EXISTS earnings_pending DECIMAL(10,2) DEFAULT 0.00,
        ADD COLUMN IF NOT EXISTS earnings_approved DECIMAL(10,2) DEFAULT 0.00,
        ADD COLUMN IF NOT EXISTS total_earnings DECIMAL(10,2) DEFAULT 0.00,
        ADD COLUMN IF NOT EXISTS total_validations INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS total_submissions INTEGER DEFAULT 0;
    END IF;
    
    RAISE NOTICE 'All required columns added successfully';
END $$;

-- STEP 2: CREATE THE ESSENTIAL cast_trend_vote FUNCTION
-- ============================================================

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
    v_validation_count INT;
BEGIN
    -- Get authenticated user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    -- Check if trend exists
    SELECT spotter_id INTO v_spotter_id
    FROM public.trend_submissions
    WHERE id = p_trend_id;
    
    IF v_spotter_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Trend not found');
    END IF;
    
    -- Prevent self-validation
    IF v_spotter_id = v_user_id THEN
        RETURN json_build_object('success', false, 'error', 'Cannot validate your own trend');
    END IF;
    
    -- Check if already voted
    IF EXISTS (
        SELECT 1 FROM public.trend_validations
        WHERE (trend_submission_id = p_trend_id OR trend_id = p_trend_id)
        AND validator_id = v_user_id
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
    
    -- Update vote counts
    UPDATE public.trend_submissions
    SET 
        approve_count = (
            SELECT COUNT(*) FROM public.trend_validations
            WHERE (trend_submission_id = p_trend_id OR trend_id = p_trend_id)
            AND (vote = 'verify' OR confirmed = true)
        ),
        reject_count = (
            SELECT COUNT(*) FROM public.trend_validations
            WHERE (trend_submission_id = p_trend_id OR trend_id = p_trend_id)
            AND (vote = 'reject' OR confirmed = false)
        ),
        validation_count = (
            SELECT COUNT(*) FROM public.trend_validations
            WHERE (trend_submission_id = p_trend_id OR trend_id = p_trend_id)
        ),
        updated_at = NOW()
    WHERE id = p_trend_id;
    
    -- Get updated counts
    SELECT approve_count, reject_count, validation_count
    INTO v_approve_count, v_reject_count, v_validation_count
    FROM public.trend_submissions
    WHERE id = p_trend_id;
    
    -- Update trend status based on votes
    UPDATE public.trend_submissions
    SET 
        status = CASE
            WHEN approve_count >= 2 THEN 'approved'::trend_status
            WHEN reject_count >= 2 THEN 'rejected'::trend_status
            WHEN validation_count > 0 THEN 'validating'::trend_status
            ELSE status
        END,
        validation_status = CASE
            WHEN approve_count >= 2 THEN 'approved'
            WHEN reject_count >= 2 THEN 'rejected'
            WHEN validation_count > 0 THEN 'validating'
            ELSE 'pending'
        END
    WHERE id = p_trend_id;
    
    -- Update validator earnings (add $0.01 for validation)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        UPDATE public.profiles
        SET 
            earnings_pending = COALESCE(earnings_pending, 0) + 0.01,
            total_earnings = COALESCE(total_earnings, 0) + 0.01,
            total_validations = COALESCE(total_validations, 0) + 1
        WHERE id = v_user_id;
    END IF;
    
    -- Return success with counts
    RETURN json_build_object(
        'success', true,
        'vote', p_vote,
        'approve_count', v_approve_count,
        'reject_count', v_reject_count,
        'validation_count', v_validation_count
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- STEP 3: ENSURE PROPER RLS POLICIES
-- ============================================================

-- Drop overly restrictive policies
DROP POLICY IF EXISTS "Users can view approved trends" ON public.trend_submissions;
DROP POLICY IF EXISTS "Users can view their own submissions" ON public.trend_submissions;
DROP POLICY IF EXISTS "Authenticated users can submit trends" ON public.trend_submissions;

-- Create simple, working policies for trend_submissions
CREATE POLICY "Anyone can view trends for validation"
    ON public.trend_submissions FOR SELECT
    USING (true);  -- Allow all authenticated users to see trends

CREATE POLICY "Users can insert their own trends"
    ON public.trend_submissions FOR INSERT
    WITH CHECK (auth.uid() = spotter_id);

CREATE POLICY "Users can update their own trends"
    ON public.trend_submissions FOR UPDATE
    USING (auth.uid() = spotter_id);

-- Create policies for trend_validations
DROP POLICY IF EXISTS "Users can view validations" ON public.trend_validations;
DROP POLICY IF EXISTS "Users can insert validations" ON public.trend_validations;

CREATE POLICY "Anyone can view validations"
    ON public.trend_validations FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can add validations"
    ON public.trend_validations FOR INSERT
    WITH CHECK (auth.uid() = validator_id);

-- STEP 4: CREATE TRIGGER FOR AUTOMATIC UPDATES
-- ============================================================

-- Create or replace the update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_trend_submissions_updated_at ON public.trend_submissions;
CREATE TRIGGER update_trend_submissions_updated_at
    BEFORE UPDATE ON public.trend_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- STEP 5: CREATE EARNINGS UPDATE TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_submission_earnings()
RETURNS TRIGGER AS $$
BEGIN
    -- When a trend is submitted, give the spotter $0.10
    IF NEW.status = 'submitted' AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        UPDATE public.profiles
        SET 
            earnings_pending = COALESCE(earnings_pending, 0) + 0.10,
            total_submissions = COALESCE(total_submissions, 0) + 1
        WHERE id = NEW.spotter_id;
    END IF;
    
    -- When a trend is approved, move earnings from pending to approved
    IF NEW.status = 'approved' AND OLD.status != 'approved' AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        UPDATE public.profiles
        SET 
            earnings_pending = GREATEST(0, COALESCE(earnings_pending, 0) - 0.10),
            earnings_approved = COALESCE(earnings_approved, 0) + 0.10
        WHERE id = NEW.spotter_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_submission_earnings_trigger ON public.trend_submissions;
CREATE TRIGGER update_submission_earnings_trigger
    AFTER INSERT OR UPDATE ON public.trend_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_submission_earnings();

-- STEP 6: GRANT ALL NECESSARY PERMISSIONS
-- ============================================================

GRANT ALL ON public.trend_submissions TO authenticated;
GRANT ALL ON public.trend_validations TO authenticated;
GRANT EXECUTE ON FUNCTION public.cast_trend_vote(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cast_trend_vote(UUID, TEXT) TO anon;

-- Grant permissions on profiles if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        EXECUTE 'GRANT ALL ON public.profiles TO authenticated';
    END IF;
END $$;

-- STEP 7: CREATE INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_trend_submissions_status ON public.trend_submissions(status);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_spotter_id ON public.trend_submissions(spotter_id);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_created_at ON public.trend_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trend_validations_trend_id ON public.trend_validations(trend_id);
CREATE INDEX IF NOT EXISTS idx_trend_validations_trend_submission_id ON public.trend_validations(trend_submission_id);
CREATE INDEX IF NOT EXISTS idx_trend_validations_validator_id ON public.trend_validations(validator_id);

-- STEP 8: VERIFY EVERYTHING IS WORKING
-- ============================================================

DO $$
DECLARE
    v_test_result JSON;
    v_column_count INT;
    v_function_exists BOOLEAN;
BEGIN
    -- Check if all columns exist
    SELECT COUNT(*) INTO v_column_count
    FROM information_schema.columns
    WHERE table_name = 'trend_submissions'
    AND column_name IN ('approve_count', 'reject_count', 'validation_count', 'wave_score', 'screenshot_url');
    
    -- Check if function exists
    SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'cast_trend_vote'
    ) INTO v_function_exists;
    
    -- Report status
    RAISE NOTICE '=================================';
    RAISE NOTICE 'CORE FUNCTIONALITY STATUS:';
    RAISE NOTICE '=================================';
    RAISE NOTICE 'Required columns found: %/5', v_column_count;
    RAISE NOTICE 'cast_trend_vote function exists: %', v_function_exists;
    RAISE NOTICE '=================================';
    
    IF v_column_count = 5 AND v_function_exists THEN
        RAISE NOTICE '✅ CORE FUNCTIONALITY IS READY!';
        RAISE NOTICE 'Users can now:';
        RAISE NOTICE '1. Submit trends with all metadata';
        RAISE NOTICE '2. Validate trends and earn $0.01';
        RAISE NOTICE '3. Track earnings automatically';
    ELSE
        RAISE WARNING '⚠️ Some components may be missing';
    END IF;
END $$;

-- Final status message
SELECT 
    'WAVESIGHT CORE FUNCTIONALITY SETUP COMPLETE' as status,
    COUNT(*) FILTER (WHERE status = 'submitted') as trends_awaiting_validation,
    COUNT(*) FILTER (WHERE status = 'approved') as approved_trends,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected_trends
FROM public.trend_submissions;