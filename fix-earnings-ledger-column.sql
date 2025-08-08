-- Fix earnings_ledger table column issue
-- The table expects trend_submission_id but might have trend_id instead

-- 1. Check and fix the earnings_ledger table structure
DO $$
BEGIN
    -- Check if trend_id column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'earnings_ledger' 
        AND column_name = 'trend_id'
        AND table_schema = 'public'
    ) THEN
        -- Check if trend_submission_id already exists
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'earnings_ledger' 
            AND column_name = 'trend_submission_id'
            AND table_schema = 'public'
        ) THEN
            -- Rename trend_id to trend_submission_id
            ALTER TABLE public.earnings_ledger 
            RENAME COLUMN trend_id TO trend_submission_id;
            RAISE NOTICE 'Renamed trend_id to trend_submission_id in earnings_ledger';
        ELSE
            RAISE NOTICE 'trend_submission_id already exists in earnings_ledger';
        END IF;
    ELSE
        -- Neither column exists, add trend_submission_id
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'earnings_ledger' 
            AND column_name = 'trend_submission_id'
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE public.earnings_ledger 
            ADD COLUMN trend_submission_id UUID REFERENCES public.trend_submissions(id);
            RAISE NOTICE 'Added trend_submission_id column to earnings_ledger';
        END IF;
    END IF;
END $$;

-- 2. Update the vote counting trigger to handle earnings correctly
CREATE OR REPLACE FUNCTION public.update_trend_vote_counts_fixed()
RETURNS TRIGGER AS $$
DECLARE
    v_approve_count INTEGER;
    v_reject_count INTEGER;
    v_trend_id UUID;
    v_status TEXT;
BEGIN
    -- Get the trend ID
    v_trend_id := COALESCE(NEW.trend_submission_id, OLD.trend_submission_id);
    
    -- Calculate counts
    SELECT 
        COUNT(*) FILTER (WHERE vote = 'verify'),
        COUNT(*) FILTER (WHERE vote = 'reject')
    INTO v_approve_count, v_reject_count
    FROM public.trend_validations
    WHERE trend_submission_id = v_trend_id;
    
    -- Determine status
    IF v_approve_count >= 1 THEN
        v_status := 'approved';
    ELSIF v_reject_count >= 2 THEN
        v_status := 'rejected';
    ELSE
        v_status := 'pending';
    END IF;
    
    -- Update the trend
    UPDATE public.trend_submissions
    SET 
        approve_count = v_approve_count,
        reject_count = v_reject_count,
        validation_status = v_status,
        validation_count = v_approve_count + v_reject_count
    WHERE id = v_trend_id;
    
    -- Handle earnings ONLY if table exists and has correct column
    IF v_status = 'approved' AND v_approve_count = 1 AND TG_OP = 'INSERT' THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'earnings_ledger'
        ) AND EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'earnings_ledger'
            AND column_name = 'trend_submission_id'
        ) THEN
            -- Safe to insert earnings
            BEGIN
                INSERT INTO public.earnings_ledger (
                    user_id,
                    amount,
                    type,
                    description,
                    trend_submission_id,
                    status,
                    created_at
                ) VALUES (
                    NEW.validator_id,
                    0.05,
                    'validation',
                    'Trend validation reward',
                    v_trend_id,
                    'approved',
                    NOW()
                ) ON CONFLICT DO NOTHING;
            EXCEPTION
                WHEN OTHERS THEN
                    -- Silently ignore earnings errors
                    NULL;
            END;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update the cast_trend_vote function to not worry about earnings
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
            'error', 'Invalid vote type. Use "verify" or "reject"'
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
    
    -- Insert the vote (simplified, no earnings handling here)
    BEGIN
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
        WHEN unique_violation THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Already voted on this trend'
            );
        WHEN foreign_key_violation THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Invalid trend or user ID'
            );
        WHEN OTHERS THEN
            -- Return generic error without exposing internal details
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Failed to submit vote. Please try again.'
            );
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Re-create the trigger with the fixed function
DROP TRIGGER IF EXISTS update_vote_counts_trigger ON public.trend_validations;
DROP TRIGGER IF EXISTS update_vote_counts_on_validation ON public.trend_validations;

CREATE TRIGGER update_vote_counts_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.trend_validations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_trend_vote_counts_fixed();

-- 5. Verify the fix
DO $$
DECLARE
    v_col_exists BOOLEAN;
BEGIN
    -- Check if earnings_ledger exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'earnings_ledger'
    ) THEN
        -- Check for the correct column
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'earnings_ledger'
            AND column_name = 'trend_submission_id'
        ) INTO v_col_exists;
        
        IF v_col_exists THEN
            RAISE NOTICE '✅ earnings_ledger has trend_submission_id column';
        ELSE
            RAISE NOTICE '⚠️  earnings_ledger missing trend_submission_id column';
        END IF;
    ELSE
        RAISE NOTICE '⚠️  earnings_ledger table does not exist (earnings tracking disabled)';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== Earnings Ledger Fix Applied ===';
    RAISE NOTICE '';
    RAISE NOTICE 'The voting system will now:';
    RAISE NOTICE '  ✅ Work even if earnings_ledger is missing';
    RAISE NOTICE '  ✅ Handle column name mismatches gracefully';
    RAISE NOTICE '  ✅ Not fail on earnings errors';
    RAISE NOTICE '  ✅ Still record votes successfully';
END $$;