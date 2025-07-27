-- Fix Vote Counting System
-- This ensures votes are properly saved and counted

-- First, ensure we have all the necessary columns
ALTER TABLE public.trend_submissions 
ADD COLUMN IF NOT EXISTS positive_validations INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS negative_validations INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS validation_ratio DECIMAL(3,2) DEFAULT 0.00;

-- Create or replace the function that updates counts when a vote is cast
CREATE OR REPLACE FUNCTION public.update_trend_vote_counts()
RETURNS TRIGGER AS $$
DECLARE
    v_positive_count INTEGER;
    v_negative_count INTEGER;
    v_total_count INTEGER;
    v_ratio DECIMAL(3,2);
BEGIN
    -- Count positive and negative validations
    SELECT 
        COUNT(CASE WHEN confirmed = TRUE THEN 1 END),
        COUNT(CASE WHEN confirmed = FALSE THEN 1 END),
        COUNT(*)
    INTO v_positive_count, v_negative_count, v_total_count
    FROM public.trend_validations
    WHERE trend_id = NEW.trend_id;
    
    -- Calculate ratio
    v_ratio := CASE 
        WHEN v_total_count > 0 THEN v_positive_count::DECIMAL / v_total_count::DECIMAL
        ELSE 0
    END;
    
    -- Update the trend submission
    UPDATE public.trend_submissions
    SET 
        validation_count = v_total_count,
        positive_validations = v_positive_count,
        negative_validations = v_negative_count,
        validation_ratio = v_ratio
    WHERE id = NEW.trend_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create or replace the trigger
DROP TRIGGER IF EXISTS update_trend_counts_on_vote ON public.trend_validations;
CREATE TRIGGER update_trend_counts_on_vote
    AFTER INSERT OR UPDATE ON public.trend_validations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_trend_vote_counts();

-- Create a view for easy trend statistics
CREATE OR REPLACE VIEW public.trend_vote_stats AS
SELECT 
    ts.id,
    ts.description,
    ts.category,
    ts.status,
    ts.validation_count as total_votes,
    ts.positive_validations as yes_votes,
    ts.negative_validations as no_votes,
    ts.validation_ratio,
    CASE 
        WHEN ts.validation_count > 0 THEN 
            ROUND((ts.positive_validations::DECIMAL / ts.validation_count::DECIMAL * 100)::NUMERIC, 1)
        ELSE 0 
    END as yes_percentage,
    CASE 
        WHEN ts.validation_count > 0 THEN 
            ROUND((ts.negative_validations::DECIMAL / ts.validation_count::DECIMAL * 100)::NUMERIC, 1)
        ELSE 0 
    END as no_percentage,
    ts.created_at,
    ts.spotter_id
FROM public.trend_submissions ts;

-- Grant permissions
GRANT SELECT ON public.trend_vote_stats TO authenticated;

-- Fix any existing trends that might have incorrect counts
UPDATE public.trend_submissions ts
SET 
    positive_validations = COALESCE(counts.positive_count, 0),
    negative_validations = COALESCE(counts.negative_count, 0),
    validation_count = COALESCE(counts.total_count, 0),
    validation_ratio = CASE 
        WHEN COALESCE(counts.total_count, 0) > 0 
        THEN COALESCE(counts.positive_count, 0)::DECIMAL / counts.total_count::DECIMAL
        ELSE 0 
    END
FROM (
    SELECT 
        tv.trend_id,
        COUNT(CASE WHEN tv.confirmed = TRUE THEN 1 END) as positive_count,
        COUNT(CASE WHEN tv.confirmed = FALSE THEN 1 END) as negative_count,
        COUNT(*) as total_count
    FROM public.trend_validations tv
    GROUP BY tv.trend_id
) counts
WHERE ts.id = counts.trend_id;

-- Create a function to get detailed vote information for a trend
CREATE OR REPLACE FUNCTION public.get_trend_vote_details(p_trend_id UUID)
RETURNS TABLE (
    total_votes INTEGER,
    yes_votes INTEGER,
    no_votes INTEGER,
    yes_percentage DECIMAL(5,2),
    no_percentage DECIMAL(5,2),
    recent_votes JSONB,
    voter_breakdown JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH vote_stats AS (
        SELECT 
            COUNT(*)::INTEGER as total,
            COUNT(CASE WHEN confirmed THEN 1 END)::INTEGER as yes,
            COUNT(CASE WHEN confirmed = FALSE THEN 1 END)::INTEGER as no
        FROM public.trend_validations
        WHERE trend_id = p_trend_id
    ),
    recent AS (
        SELECT jsonb_agg(
            jsonb_build_object(
                'voter_id', tv.validator_id,
                'vote', CASE WHEN tv.confirmed THEN 'yes' ELSE 'no' END,
                'confidence', tv.confidence_score,
                'voted_at', tv.created_at,
                'username', up.username
            ) ORDER BY tv.created_at DESC
        ) as recent_votes
        FROM public.trend_validations tv
        LEFT JOIN public.user_profiles up ON tv.validator_id = up.id
        WHERE tv.trend_id = p_trend_id
        LIMIT 10
    ),
    breakdown AS (
        SELECT jsonb_build_object(
            'by_confidence', jsonb_agg(DISTINCT jsonb_build_object(
                'confidence_range', 
                CASE 
                    WHEN confidence_score >= 0.8 THEN 'high'
                    WHEN confidence_score >= 0.5 THEN 'medium'
                    ELSE 'low'
                END,
                'count', COUNT(*)
            )),
            'by_time', jsonb_agg(DISTINCT jsonb_build_object(
                'hour', DATE_TRUNC('hour', created_at),
                'count', COUNT(*)
            ))
        ) as voter_breakdown
        FROM public.trend_validations
        WHERE trend_id = p_trend_id
    )
    SELECT 
        vs.total,
        vs.yes,
        vs.no,
        CASE WHEN vs.total > 0 THEN ROUND((vs.yes::DECIMAL / vs.total::DECIMAL * 100)::NUMERIC, 2) ELSE 0 END,
        CASE WHEN vs.total > 0 THEN ROUND((vs.no::DECIMAL / vs.total::DECIMAL * 100)::NUMERIC, 2) ELSE 0 END,
        r.recent_votes,
        b.voter_breakdown
    FROM vote_stats vs, recent r, breakdown b;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission
GRANT EXECUTE ON FUNCTION public.get_trend_vote_details(UUID) TO authenticated;

-- Add helpful indexes
CREATE INDEX IF NOT EXISTS idx_trend_validations_trend_confirmed ON public.trend_validations(trend_id, confirmed);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_vote_counts ON public.trend_submissions(positive_validations, negative_validations);

-- Create a simple function to check if a user has already voted
CREATE OR REPLACE FUNCTION public.has_user_voted(p_user_id UUID, p_trend_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.trend_validations 
        WHERE validator_id = p_user_id 
        AND trend_id = p_trend_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission
GRANT EXECUTE ON FUNCTION public.has_user_voted(UUID, UUID) TO authenticated;