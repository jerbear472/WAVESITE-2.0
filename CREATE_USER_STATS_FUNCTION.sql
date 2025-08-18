-- CREATE USER STATS FUNCTION
-- This function properly calculates user statistics from the database

BEGIN;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_user_stats(UUID);

-- Create comprehensive user stats function
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID)
RETURNS TABLE (
    trends_submitted INTEGER,
    trends_approved INTEGER,
    trends_rejected INTEGER,
    trends_pending INTEGER,
    validations_completed INTEGER,
    accuracy_score NUMERIC,
    validation_score NUMERIC,
    approval_rate NUMERIC,
    total_earned NUMERIC,
    pending_earnings NUMERIC,
    approved_earnings NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH trend_stats AS (
        -- Count all trends submitted by user
        SELECT 
            COUNT(*) AS total_submitted,
            COUNT(*) FILTER (WHERE status = 'approved') AS approved,
            COUNT(*) FILTER (WHERE status = 'rejected') AS rejected,
            COUNT(*) FILTER (WHERE status IN ('pending', 'under_review')) AS pending
        FROM trend_submissions
        WHERE spotter_id = p_user_id
    ),
    validation_stats AS (
        -- Count validations done by user
        SELECT 
            COUNT(*) AS total_validations,
            COUNT(*) FILTER (WHERE vote = 'approve') AS approve_votes,
            COUNT(*) FILTER (WHERE vote = 'reject') AS reject_votes
        FROM trend_validations
        WHERE validator_id = p_user_id
    ),
    validation_accuracy AS (
        -- Calculate validation accuracy (how often user agrees with final outcome)
        SELECT 
            COUNT(*) AS total_validated,
            COUNT(*) FILTER (
                WHERE (tv.vote = 'approve' AND ts.status = 'approved')
                   OR (tv.vote = 'reject' AND ts.status = 'rejected')
            ) AS correct_validations
        FROM trend_validations tv
        JOIN trend_submissions ts ON tv.trend_id = ts.id
        WHERE tv.validator_id = p_user_id
        AND ts.status IN ('approved', 'rejected')
    ),
    earnings_stats AS (
        -- Calculate earnings from earnings_ledger
        SELECT 
            COALESCE(SUM(amount), 0) AS total_earned,
            COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) AS pending_earnings,
            COALESCE(SUM(amount) FILTER (WHERE status = 'approved'), 0) AS approved_earnings
        FROM earnings_ledger
        WHERE user_id = p_user_id
    )
    SELECT 
        COALESCE(trend_stats.total_submitted, 0)::INTEGER AS trends_submitted,
        COALESCE(trend_stats.approved, 0)::INTEGER AS trends_approved,
        COALESCE(trend_stats.rejected, 0)::INTEGER AS trends_rejected,
        COALESCE(trend_stats.pending, 0)::INTEGER AS trends_pending,
        COALESCE(validation_stats.total_validations, 0)::INTEGER AS validations_completed,
        -- Accuracy score: percentage of correct validations
        CASE 
            WHEN validation_accuracy.total_validated > 0 
            THEN ROUND((validation_accuracy.correct_validations::NUMERIC / validation_accuracy.total_validated) * 100, 1)
            ELSE 0
        END AS accuracy_score,
        -- Validation score: total number of validations (could be weighted)
        COALESCE(validation_stats.total_validations, 0)::NUMERIC AS validation_score,
        -- Approval rate: percentage of submitted trends that were approved
        CASE 
            WHEN trend_stats.total_submitted > 0 
            THEN ROUND((trend_stats.approved::NUMERIC / trend_stats.total_submitted) * 100, 1)
            ELSE 0
        END AS approval_rate,
        earnings_stats.total_earned,
        earnings_stats.pending_earnings,
        earnings_stats.approved_earnings
    FROM trend_stats
    CROSS JOIN validation_stats
    CROSS JOIN validation_accuracy
    CROSS JOIN earnings_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_stats(UUID) TO authenticated;

-- Test the function (replace with actual user ID)
-- SELECT * FROM get_user_stats('your-user-id-here');

COMMIT;

-- Create a view for easier access
CREATE OR REPLACE VIEW user_stats_view AS
SELECT 
    u.id AS user_id,
    u.email,
    u.username,
    stats.*
FROM auth.users u
CROSS JOIN LATERAL get_user_stats(u.id) stats;

-- Grant access to the view
GRANT SELECT ON user_stats_view TO authenticated;

-- Example usage:
-- SELECT * FROM user_stats_view WHERE user_id = auth.uid();