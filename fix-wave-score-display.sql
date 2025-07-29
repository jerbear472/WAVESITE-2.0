-- Fix Wave Score Display - Complete Solution
-- This updates the wave score calculation to include velocity (stage) and vote counts

-- First, ensure we have all necessary columns
ALTER TABLE public.trend_submissions
ADD COLUMN IF NOT EXISTS stage trend_stage DEFAULT 'submitted',
ADD COLUMN IF NOT EXISTS positive_validations INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS negative_validations INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS wave_score INTEGER DEFAULT 5;

-- Create or replace function to calculate wave score based on multiple factors
CREATE OR REPLACE FUNCTION public.calculate_wave_score(
    p_trend_id UUID
) RETURNS INTEGER AS $$
DECLARE
    v_stage trend_stage;
    v_positive_votes INTEGER;
    v_negative_votes INTEGER;
    v_total_votes INTEGER;
    v_validation_ratio DECIMAL;
    v_virality_prediction INTEGER;
    v_engagement_score INTEGER;
    v_likes INTEGER;
    v_shares INTEGER;
    v_comments INTEGER;
    v_views INTEGER;
    v_wave_score INTEGER;
    v_stage_multiplier DECIMAL;
    v_vote_score INTEGER;
    v_engagement_multiplier DECIMAL;
BEGIN
    -- Get trend data
    SELECT 
        stage,
        positive_validations,
        negative_validations,
        validation_count,
        COALESCE(virality_prediction, 5),
        COALESCE(likes_count, 0),
        COALESCE(shares_count, 0),
        COALESCE(comments_count, 0),
        COALESCE(views_count, 0)
    INTO 
        v_stage,
        v_positive_votes,
        v_negative_votes,
        v_total_votes,
        v_virality_prediction,
        v_likes,
        v_shares,
        v_comments,
        v_views
    FROM trend_submissions
    WHERE id = p_trend_id;

    -- Calculate validation ratio
    IF v_total_votes > 0 THEN
        v_validation_ratio := v_positive_votes::DECIMAL / v_total_votes::DECIMAL;
    ELSE
        v_validation_ratio := 0.5; -- Default to neutral
    END IF;

    -- Stage multiplier (velocity indicator)
    v_stage_multiplier := CASE v_stage
        WHEN 'submitted' THEN 0.5
        WHEN 'validating' THEN 0.7
        WHEN 'trending' THEN 1.0
        WHEN 'viral' THEN 1.3
        WHEN 'peaked' THEN 0.9
        WHEN 'declining' THEN 0.6
        WHEN 'auto_rejected' THEN 0.2
        ELSE 0.5
    END;

    -- Vote-based score (0-3 points)
    IF v_total_votes >= 10 THEN
        v_vote_score := ROUND(v_validation_ratio * 3);
    ELSIF v_total_votes >= 5 THEN
        v_vote_score := ROUND(v_validation_ratio * 2);
    ELSIF v_total_votes > 0 THEN
        v_vote_score := ROUND(v_validation_ratio * 1);
    ELSE
        v_vote_score := 0;
    END IF;

    -- Calculate engagement score
    v_engagement_score := 
        LEAST(100000, v_likes) / 10000 +           -- Up to 10 points from likes
        LEAST(10000, v_shares) / 1000 * 2 +        -- Up to 20 points from shares (weighted higher)
        LEAST(10000, v_comments) / 1000 +          -- Up to 10 points from comments
        LEAST(1000000, v_views) / 100000 * 0.5;    -- Up to 5 points from views

    -- Engagement multiplier based on total engagement
    IF v_engagement_score > 20 THEN
        v_engagement_multiplier := 1.5;
    ELSIF v_engagement_score > 10 THEN
        v_engagement_multiplier := 1.3;
    ELSIF v_engagement_score > 5 THEN
        v_engagement_multiplier := 1.1;
    ELSE
        v_engagement_multiplier := 1.0;
    END IF;

    -- Calculate final wave score (1-10 scale)
    v_wave_score := GREATEST(1, LEAST(10, ROUND(
        (
            v_virality_prediction * 0.3 +              -- 30% from initial prediction
            v_vote_score * 2 +                         -- Up to 6 points from votes
            LEAST(4, v_engagement_score / 10)          -- Up to 4 points from engagement
        ) * v_stage_multiplier * v_engagement_multiplier
    )));

    -- Special case: if heavily downvoted, cap at 3
    IF v_total_votes >= 5 AND v_validation_ratio < 0.3 THEN
        v_wave_score := LEAST(3, v_wave_score);
    END IF;

    -- Special case: if viral stage with good votes, minimum 8
    IF v_stage = 'viral' AND v_validation_ratio >= 0.7 THEN
        v_wave_score := GREATEST(8, v_wave_score);
    END IF;

    RETURN v_wave_score;
END;
$$ LANGUAGE plpgsql;

-- Update all existing trends with calculated wave scores
UPDATE trend_submissions
SET wave_score = calculate_wave_score(id);

-- Create trigger to update wave score when relevant fields change
CREATE OR REPLACE FUNCTION public.update_wave_score_trigger()
RETURNS TRIGGER AS $$
BEGIN
    NEW.wave_score := calculate_wave_score(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS update_wave_score ON trend_submissions;

-- Create trigger
CREATE TRIGGER update_wave_score
    BEFORE INSERT OR UPDATE OF 
        stage, 
        positive_validations, 
        negative_validations, 
        validation_count,
        likes_count,
        shares_count,
        comments_count,
        views_count,
        virality_prediction
    ON trend_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_wave_score_trigger();

-- Create a view for easy trend data access with all calculations
CREATE OR REPLACE VIEW trend_timeline_view AS
SELECT 
    ts.id,
    ts.spotter_id,
    ts.category,
    ts.description,
    ts.screenshot_url,
    ts.thumbnail_url,
    ts.evidence,
    ts.status,
    ts.stage,
    ts.wave_score,
    ts.virality_prediction,
    ts.validation_count,
    ts.positive_validations,
    ts.negative_validations,
    CASE 
        WHEN ts.validation_count > 0 THEN 
            ROUND((ts.positive_validations::DECIMAL / ts.validation_count * 100), 0)
        ELSE 0
    END as approval_percentage,
    ts.quality_score,
    ts.bounty_amount,
    ts.bounty_paid,
    ts.created_at,
    ts.validated_at,
    ts.mainstream_at,
    -- Social media fields
    ts.creator_handle,
    ts.creator_name,
    ts.post_caption,
    ts.likes_count,
    ts.comments_count,
    ts.shares_count,
    ts.views_count,
    ts.hashtags,
    ts.post_url,
    ts.posted_at,
    ts.platform,
    -- Stage display
    CASE ts.stage
        WHEN 'submitted' THEN 'Just Starting'
        WHEN 'validating' THEN 'Gaining Traction'
        WHEN 'trending' THEN 'Trending'
        WHEN 'viral' THEN 'Going Viral'
        WHEN 'peaked' THEN 'At Peak'
        WHEN 'declining' THEN 'Declining'
        WHEN 'auto_rejected' THEN 'Rejected'
        ELSE 'Unknown'
    END as stage_display,
    -- Stage color for UI
    CASE ts.stage
        WHEN 'submitted' THEN 'gray'
        WHEN 'validating' THEN 'blue'
        WHEN 'trending' THEN 'green'
        WHEN 'viral' THEN 'red'
        WHEN 'peaked' THEN 'yellow'
        WHEN 'declining' THEN 'orange'
        WHEN 'auto_rejected' THEN 'gray'
        ELSE 'gray'
    END as stage_color,
    -- Profile info
    p.username as spotter_username,
    p.email as spotter_email
FROM trend_submissions ts
LEFT JOIN profiles p ON ts.spotter_id = p.id;

-- Grant permissions
GRANT SELECT ON trend_timeline_view TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_wave_score(UUID) TO authenticated;

-- Create helpful function to get trend stats
CREATE OR REPLACE FUNCTION public.get_trend_stats(p_trend_id UUID)
RETURNS TABLE (
    wave_score INTEGER,
    stage TEXT,
    stage_display TEXT,
    yes_votes INTEGER,
    no_votes INTEGER,
    total_votes INTEGER,
    approval_percentage INTEGER,
    engagement_total BIGINT,
    last_updated TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ts.wave_score,
        ts.stage::TEXT,
        CASE ts.stage
            WHEN 'submitted' THEN 'Just Starting'
            WHEN 'validating' THEN 'Gaining Traction'
            WHEN 'trending' THEN 'Trending'
            WHEN 'viral' THEN 'Going Viral'
            WHEN 'peaked' THEN 'At Peak'
            WHEN 'declining' THEN 'Declining'
            WHEN 'auto_rejected' THEN 'Rejected'
            ELSE 'Unknown'
        END as stage_display,
        ts.positive_validations as yes_votes,
        ts.negative_validations as no_votes,
        ts.validation_count as total_votes,
        CASE 
            WHEN ts.validation_count > 0 THEN 
                ROUND((ts.positive_validations::DECIMAL / ts.validation_count * 100), 0)::INTEGER
            ELSE 0
        END as approval_percentage,
        (COALESCE(ts.likes_count, 0) + 
         COALESCE(ts.comments_count, 0) + 
         COALESCE(ts.shares_count, 0))::BIGINT as engagement_total,
        ts.updated_at as last_updated
    FROM trend_submissions ts
    WHERE ts.id = p_trend_id;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_trend_stats(UUID) TO authenticated;