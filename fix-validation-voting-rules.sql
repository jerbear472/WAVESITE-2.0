-- Fix validation voting rules: Allow self-voting and require 2 votes for approval/rejection

-- 1. Update the cast_trend_vote function to allow self-voting and require 2 votes
CREATE OR REPLACE FUNCTION public.cast_trend_vote(
    trend_id UUID,
    vote_type TEXT
) RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_validation_id UUID;
    v_approve_count INTEGER;
    v_reject_count INTEGER;
    v_trend_status TEXT;
BEGIN
    -- Get the current user
    v_user_id := auth.uid();
    
    -- Validate authentication
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Not authenticated. Please log in.'
        );
    END IF;
    
    -- Validate vote type
    IF vote_type NOT IN ('verify', 'reject') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid vote type. Use "verify" or "reject".'
        );
    END IF;
    
    -- Check if trend exists
    IF NOT EXISTS (
        SELECT 1 FROM public.trend_submissions 
        WHERE id = trend_id
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Trend not found.'
        );
    END IF;
    
    -- REMOVED: Check if user owns the trend (users CAN vote on their own trends)
    
    -- Check for existing vote
    IF EXISTS (
        SELECT 1 FROM public.trend_validations 
        WHERE trend_submission_id = trend_id 
        AND validator_id = v_user_id
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'You have already voted on this trend.'
        );
    END IF;
    
    -- Insert the validation vote
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
    ) RETURNING id INTO v_validation_id;
    
    -- Get updated counts for response
    SELECT 
        COUNT(*) FILTER (WHERE vote = 'verify'),
        COUNT(*) FILTER (WHERE vote = 'reject')
    INTO v_approve_count, v_reject_count
    FROM public.trend_validations
    WHERE trend_submission_id = trend_id;
    
    -- Determine status based on 2-vote requirement
    IF v_approve_count >= 2 THEN
        v_trend_status := 'approved';
    ELSIF v_reject_count >= 2 THEN
        v_trend_status := 'rejected';
    ELSE
        v_trend_status := 'pending';
    END IF;
    
    -- Update trend submission status
    UPDATE public.trend_submissions
    SET 
        approve_count = v_approve_count,
        reject_count = v_reject_count,
        validation_status = v_trend_status,
        validation_count = v_approve_count + v_reject_count,
        updated_at = NOW()
    WHERE id = trend_id;
    
    -- Handle earnings for validation
    BEGIN
        -- Validator always gets rewarded for participating
        INSERT INTO public.earnings_ledger (
            user_id,
            amount,
            type,
            description,
            trend_submission_id,
            status
        ) VALUES (
            v_user_id,
            0.01, -- $0.01 per validation
            'validation',
            'Trend validation reward',
            trend_id,
            'approved'
        ) ON CONFLICT DO NOTHING;
        
        -- Update validator's earnings
        UPDATE public.profiles
        SET total_earnings = total_earnings + 0.01
        WHERE id = v_user_id;
    EXCEPTION
        WHEN OTHERS THEN
            -- Silently handle earnings errors
            NULL;
    END;
    
    -- Return success with updated counts
    RETURN jsonb_build_object(
        'success', true,
        'id', v_validation_id,
        'message', 'Vote recorded successfully',
        'vote_type', vote_type,
        'approve_count', v_approve_count,
        'reject_count', v_reject_count,
        'status', v_trend_status,
        'needs_more_votes', CASE 
            WHEN v_trend_status = 'pending' THEN true 
            ELSE false 
        END
    );
    
EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'You have already voted on this trend.'
        );
    WHEN foreign_key_violation THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid trend or user reference.'
        );
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Failed to submit vote: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update the vote counting trigger to use 2-vote threshold
CREATE OR REPLACE FUNCTION public.update_trend_vote_counts()
RETURNS TRIGGER AS $$
DECLARE
    v_trend_id UUID;
    v_approve_count INTEGER;
    v_reject_count INTEGER;
    v_status TEXT;
    v_spotter_id UUID;
BEGIN
    -- Get the trend ID from the validation record
    v_trend_id := COALESCE(NEW.trend_submission_id, OLD.trend_submission_id);
    
    -- Calculate current vote counts
    SELECT 
        COUNT(*) FILTER (WHERE vote = 'verify'),
        COUNT(*) FILTER (WHERE vote = 'reject')
    INTO v_approve_count, v_reject_count
    FROM public.trend_validations
    WHERE trend_submission_id = v_trend_id;
    
    -- Determine validation status based on 2-vote threshold
    IF v_approve_count >= 2 THEN
        v_status := 'approved';
    ELSIF v_reject_count >= 2 THEN
        v_status := 'rejected';
    ELSE
        v_status := 'pending';
    END IF;
    
    -- Update the trend submission with new counts
    UPDATE public.trend_submissions
    SET 
        approve_count = v_approve_count,
        reject_count = v_reject_count,
        validation_status = v_status,
        validation_count = v_approve_count + v_reject_count,
        updated_at = NOW()
    WHERE id = v_trend_id;
    
    -- Handle earnings when trend is approved (2 votes)
    IF v_status = 'approved' AND v_approve_count = 2 AND TG_OP = 'INSERT' AND NEW.vote = 'verify' THEN
        -- Get the trend spotter
        SELECT spotter_id INTO v_spotter_id
        FROM public.trend_submissions
        WHERE id = v_trend_id;
        
        -- Move earnings from awaiting_verification to approved
        UPDATE public.earnings_ledger
        SET status = 'approved',
            updated_at = NOW()
        WHERE trend_submission_id = v_trend_id
          AND type = 'submission'
          AND status = 'awaiting_verification';
        
        -- Update spotter's profile
        UPDATE public.profiles
        SET 
            awaiting_verification = GREATEST(0, awaiting_verification - 1.00),
            total_earnings = total_earnings + 1.00
        WHERE id = v_spotter_id;
    END IF;
    
    -- Handle rejection (2 reject votes)
    IF v_status = 'rejected' AND v_reject_count = 2 AND TG_OP = 'INSERT' AND NEW.vote = 'reject' THEN
        -- Get the trend spotter
        SELECT spotter_id INTO v_spotter_id
        FROM public.trend_submissions
        WHERE id = v_trend_id;
        
        -- Mark earnings as rejected
        UPDATE public.earnings_ledger
        SET status = 'rejected',
            updated_at = NOW()
        WHERE trend_submission_id = v_trend_id
          AND type = 'submission'
          AND status = 'awaiting_verification';
        
        -- Remove from awaiting_verification
        UPDATE public.profiles
        SET awaiting_verification = GREATEST(0, awaiting_verification - 1.00)
        WHERE id = v_spotter_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Recreate the trigger
DROP TRIGGER IF EXISTS update_vote_counts_trigger ON public.trend_validations;
CREATE TRIGGER update_vote_counts_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.trend_validations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_trend_vote_counts();

-- 4. Update the get_trends_for_validation function to include ALL trends
CREATE OR REPLACE FUNCTION get_trends_for_validation(
    user_id UUID,
    limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    spotter_id UUID,
    category TEXT,
    description TEXT,
    screenshot_url TEXT,
    thumbnail_url TEXT,
    platform TEXT,
    creator_handle TEXT,
    post_caption TEXT,
    likes_count BIGINT,
    comments_count BIGINT,
    shares_count BIGINT,
    views_count BIGINT,
    validation_count INTEGER,
    hours_since_post INTEGER,
    status TEXT,
    validation_status TEXT,
    created_at TIMESTAMPTZ,
    is_own_trend BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ts.id,
        ts.spotter_id,
        ts.category,
        ts.description,
        ts.screenshot_url,
        ts.thumbnail_url,
        ts.platform,
        ts.creator_handle,
        ts.post_caption,
        ts.likes_count,
        ts.comments_count,
        ts.shares_count,
        ts.views_count,
        COALESCE(ts.validation_count, 0) as validation_count,
        EXTRACT(HOUR FROM (NOW() - ts.created_at))::INTEGER as hours_since_post,
        ts.status,
        COALESCE(ts.validation_status, 'pending') as validation_status,
        ts.created_at,
        (ts.spotter_id = user_id) as is_own_trend
    FROM trend_submissions ts
    WHERE (
        ts.status IN ('submitted', 'validating')
        OR ts.validation_status = 'pending'
        OR ts.validation_status IS NULL
        OR ts.validation_count < 2  -- Need at least 2 votes
    )
    AND NOT EXISTS (
        -- Exclude already validated by this user
        SELECT 1 FROM trend_validations tv
        WHERE tv.trend_submission_id = ts.id
        AND tv.validator_id = user_id
    )
    ORDER BY ts.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION public.cast_trend_vote TO authenticated;
GRANT EXECUTE ON FUNCTION get_trends_for_validation TO authenticated;

-- 6. Update validation config constants
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== VALIDATION RULES UPDATED ===';
    RAISE NOTICE '';
    RAISE NOTICE 'New Rules:';
    RAISE NOTICE '  ✅ Users CAN vote on their own trends';
    RAISE NOTICE '  ✅ 2 "verify" votes = APPROVED';
    RAISE NOTICE '  ✅ 2 "reject" votes = REJECTED';
    RAISE NOTICE '  ✅ Each validator earns $0.01 per vote';
    RAISE NOTICE '  ✅ Trend submitter earns $1.00 when approved';
    RAISE NOTICE '';
    RAISE NOTICE 'The verify page will now show ALL trends including your own!';
END $$;