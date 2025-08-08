-- Fix verify page persistence and status filtering
-- This ensures users only see trends they haven't voted on, and only pending/validating trends

-- First, ensure we have proper indexes for performance
CREATE INDEX IF NOT EXISTS idx_trend_validations_validator_trend 
ON trend_validations(validator_id, trend_submission_id);

CREATE INDEX IF NOT EXISTS idx_trend_submissions_status 
ON trend_submissions(status);

-- Create a function to get available trends for verification
CREATE OR REPLACE FUNCTION get_available_trends_for_verification(
    p_user_id UUID,
    p_limit INT DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    created_at TIMESTAMPTZ,
    category TEXT,
    description TEXT,
    screenshot_url TEXT,
    thumbnail_url TEXT,
    platform TEXT,
    creator_handle TEXT,
    post_caption TEXT,
    likes_count INT,
    comments_count INT,
    shares_count INT,
    views_count INT,
    validation_count INT,
    spotter_id UUID,
    evidence JSONB,
    virality_prediction FLOAT,
    quality_score FLOAT,
    status TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ts.id,
        ts.created_at,
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
        ts.validation_count,
        ts.spotter_id,
        ts.evidence,
        ts.virality_prediction,
        ts.quality_score,
        ts.status
    FROM trend_submissions ts
    WHERE 
        -- Only show trends with these statuses (valid enum values only)
        ts.status IN ('submitted', 'validating')
        -- Don't show user's own trends
        AND ts.spotter_id != p_user_id
        -- Don't show trends the user has already voted on
        AND NOT EXISTS (
            SELECT 1 
            FROM trend_validations tv 
            WHERE tv.trend_submission_id = ts.id 
            AND tv.validator_id = p_user_id
        )
    ORDER BY ts.created_at DESC
    LIMIT p_limit;
END;
$$;

-- Create a function to track user's verification session
CREATE OR REPLACE FUNCTION track_user_verification(
    p_user_id UUID,
    p_trend_id UUID,
    p_vote TEXT,
    p_confidence_score DECIMAL DEFAULT 0.75
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
    v_existing_vote RECORD;
BEGIN
    -- Check if user already voted on this trend
    SELECT * INTO v_existing_vote
    FROM trend_validations
    WHERE validator_id = p_user_id
    AND trend_submission_id = p_trend_id;
    
    IF v_existing_vote.id IS NOT NULL THEN
        -- User already voted on this trend
        v_result := jsonb_build_object(
            'success', false,
            'error', 'already_voted',
            'message', 'You have already voted on this trend'
        );
        RETURN v_result;
    END IF;
    
    -- Insert the new validation
    INSERT INTO trend_validations (
        trend_submission_id,
        validator_id,
        vote,
        confidence_score,
        created_at
    ) VALUES (
        p_trend_id,
        p_user_id,
        p_vote,
        p_confidence_score,
        NOW()
    );
    
    -- Update the validation count on the trend
    UPDATE trend_submissions
    SET validation_count = validation_count + 1
    WHERE id = p_trend_id;
    
    -- Check if trend should be auto-approved or rejected based on validation threshold
    -- (e.g., if 5+ people vote the same way, auto-update status)
    PERFORM update_trend_status_from_validations(p_trend_id);
    
    v_result := jsonb_build_object(
        'success', true,
        'message', 'Vote recorded successfully'
    );
    
    RETURN v_result;
END;
$$;

-- Function to update trend status based on validations
CREATE OR REPLACE FUNCTION update_trend_status_from_validations(p_trend_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_verify_count INT;
    v_reject_count INT;
    v_total_count INT;
    v_threshold INT := 5; -- Number of votes needed to auto-approve/reject
BEGIN
    -- Count votes
    SELECT 
        COUNT(*) FILTER (WHERE vote = 'verify') AS verify_count,
        COUNT(*) FILTER (WHERE vote = 'reject') AS reject_count,
        COUNT(*) AS total_count
    INTO v_verify_count, v_reject_count, v_total_count
    FROM trend_validations
    WHERE trend_submission_id = p_trend_id;
    
    -- Auto-approve if enough verify votes
    IF v_verify_count >= v_threshold THEN
        UPDATE trend_submissions
        SET status = 'approved',
            validation_status = 'approved',
            updated_at = NOW()
        WHERE id = p_trend_id
        AND status IN ('submitted', 'validating');
    
    -- Auto-reject if enough reject votes
    ELSIF v_reject_count >= v_threshold THEN
        UPDATE trend_submissions
        SET status = 'rejected',
            validation_status = 'rejected',
            updated_at = NOW()
        WHERE id = p_trend_id
        AND status IN ('submitted', 'validating');
    
    -- Set to validating if it has some votes but not enough to decide
    ELSIF v_total_count > 0 THEN
        UPDATE trend_submissions
        SET status = 'validating'
        WHERE id = p_trend_id
        AND status = 'submitted';
    END IF;
END;
$$;

-- Add a cleanup function to reset stuck trends
CREATE OR REPLACE FUNCTION cleanup_stuck_trends()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    -- Reset trends that have been in 'validating' status for over 24 hours
    -- back to 'submitted' so they can be re-evaluated
    UPDATE trend_submissions
    SET status = 'submitted'
    WHERE status = 'validating'
    AND created_at < NOW() - INTERVAL '24 hours'
    AND validation_count < 5;
    
    -- Auto-reject trends that are over 48 hours old with no validations
    UPDATE trend_submissions
    SET status = 'rejected',
        validation_status = 'rejected'
    WHERE status = 'submitted'
    AND created_at < NOW() - INTERVAL '48 hours'
    AND validation_count = 0;
END;
$$;

-- Create a view to make it easier to query available trends
CREATE OR REPLACE VIEW available_trends_for_verification AS
SELECT 
    ts.*,
    p.username as spotter_username,
    p.email as spotter_email
FROM trend_submissions ts
LEFT JOIN profiles p ON ts.spotter_id = p.id
WHERE ts.status IN ('submitted', 'validating');

-- Grant appropriate permissions
GRANT SELECT ON available_trends_for_verification TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_trends_for_verification TO authenticated;
GRANT EXECUTE ON FUNCTION track_user_verification TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_available_trends_for_verification IS 'Gets trends available for a user to verify, excluding their own trends and those they have already voted on';
COMMENT ON FUNCTION track_user_verification IS 'Records a user verification vote and prevents duplicate voting';
COMMENT ON FUNCTION update_trend_status_from_validations IS 'Auto-approves or rejects trends based on validation threshold';