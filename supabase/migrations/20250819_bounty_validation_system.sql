-- =============================================
-- BOUNTY VALIDATION SYSTEM
-- =============================================
-- Implements 3-vote threshold for bounty submissions

-- Add columns to track bounty validation status
ALTER TABLE trend_submissions ADD COLUMN IF NOT EXISTS 
    is_bounty_submission BOOLEAN DEFAULT FALSE;

ALTER TABLE trend_submissions ADD COLUMN IF NOT EXISTS 
    bounty_id UUID REFERENCES bounties(id) ON DELETE SET NULL;

ALTER TABLE trend_submissions ADD COLUMN IF NOT EXISTS 
    bounty_approve_count INTEGER DEFAULT 0;

ALTER TABLE trend_submissions ADD COLUMN IF NOT EXISTS 
    bounty_reject_count INTEGER DEFAULT 0;

ALTER TABLE trend_submissions ADD COLUMN IF NOT EXISTS 
    bounty_validation_status TEXT CHECK (bounty_validation_status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending';

ALTER TABLE trend_submissions ADD COLUMN IF NOT EXISTS 
    forwarded_to_enterprise BOOLEAN DEFAULT FALSE;

ALTER TABLE trend_submissions ADD COLUMN IF NOT EXISTS 
    forwarded_at TIMESTAMPTZ;

-- Create index for faster bounty queries
CREATE INDEX IF NOT EXISTS idx_trends_bounty ON trend_submissions(bounty_id) WHERE bounty_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trends_bounty_status ON trend_submissions(bounty_validation_status) WHERE is_bounty_submission = TRUE;

-- Function to handle bounty validation votes
CREATE OR REPLACE FUNCTION process_bounty_validation()
RETURNS TRIGGER AS $$
DECLARE
    v_trend trend_submissions%ROWTYPE;
    v_bounty bounties%ROWTYPE;
    v_vote_threshold INTEGER := 3;
BEGIN
    -- Get the trend being validated
    SELECT * INTO v_trend FROM trend_submissions WHERE id = NEW.trend_id;
    
    -- Only process if it's a bounty submission
    IF v_trend.is_bounty_submission = TRUE AND v_trend.bounty_id IS NOT NULL THEN
        -- Get the bounty details
        SELECT * INTO v_bounty FROM bounties WHERE id = v_trend.bounty_id;
        
        -- Update vote counts based on validation type
        IF NEW.vote = 'verify' THEN
            UPDATE trend_submissions 
            SET bounty_approve_count = bounty_approve_count + 1
            WHERE id = NEW.trend_id;
            
            -- Check if threshold reached
            IF v_trend.bounty_approve_count + 1 >= v_vote_threshold THEN
                -- Mark as approved and forward to enterprise
                UPDATE trend_submissions 
                SET 
                    bounty_validation_status = 'approved',
                    forwarded_to_enterprise = TRUE,
                    forwarded_at = NOW(),
                    status = 'approved'
                WHERE id = NEW.trend_id;
                
                -- Create bounty submission record
                INSERT INTO bounty_submissions (
                    bounty_id,
                    spotter_id,
                    trend_id,
                    headline,
                    description,
                    link,
                    screenshot_url,
                    platform,
                    status,
                    validation_score,
                    earned_amount,
                    multiplier,
                    submitted_at,
                    validated_at
                ) VALUES (
                    v_trend.bounty_id,
                    v_trend.spotter_id,
                    v_trend.id,
                    v_trend.description,
                    v_trend.ai_angle,
                    v_trend.source_url,
                    v_trend.screenshot_url,
                    v_trend.platform,
                    'approved',
                    1.0, -- Perfect validation score since community approved
                    v_bounty.price_per_spot,
                    1.0, -- Standard multiplier
                    v_trend.created_at,
                    NOW()
                );
                
                -- Award bonus to validators who approved
                UPDATE earnings_ledger 
                SET amount = amount * 3  -- 3x reward for bounty validations
                WHERE 
                    trend_id = NEW.trend_id 
                    AND user_id = NEW.validator_id
                    AND type = 'validation';
            END IF;
            
        ELSIF NEW.vote = 'reject' THEN
            UPDATE trend_submissions 
            SET bounty_reject_count = bounty_reject_count + 1
            WHERE id = NEW.trend_id;
            
            -- Check if rejection threshold reached
            IF v_trend.bounty_reject_count + 1 >= v_vote_threshold THEN
                -- Mark as rejected, do not forward
                UPDATE trend_submissions 
                SET 
                    bounty_validation_status = 'rejected',
                    status = 'rejected'
                WHERE id = NEW.trend_id;
            END IF;
        END IF;
        
        -- Notify enterprise via webhook if approved
        IF v_trend.bounty_approve_count + 1 >= v_vote_threshold AND v_bounty.webhook_url IS NOT NULL THEN
            -- This would typically trigger an async job to send webhook
            -- For now, we'll just log it
            PERFORM pg_notify('bounty_approved', json_build_object(
                'bounty_id', v_bounty.id,
                'trend_id', v_trend.id,
                'webhook_url', v_bounty.webhook_url
            )::text);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for bounty validation processing
DROP TRIGGER IF EXISTS process_bounty_validation_trigger ON trend_validations;
CREATE TRIGGER process_bounty_validation_trigger
    AFTER INSERT ON trend_validations
    FOR EACH ROW
    EXECUTE FUNCTION process_bounty_validation();

-- Function to get bounty info for trends
CREATE OR REPLACE FUNCTION get_trend_bounty_info(p_trend_id UUID)
RETURNS TABLE (
    bounty_id UUID,
    bounty_title TEXT,
    enterprise_name TEXT,
    price_per_spot DECIMAL,
    urgency_level TEXT,
    expires_at TIMESTAMPTZ,
    approve_votes INTEGER,
    reject_votes INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id as bounty_id,
        b.title as bounty_title,
        p.username as enterprise_name,
        b.price_per_spot,
        b.urgency_level,
        b.expires_at,
        t.bounty_approve_count as approve_votes,
        t.bounty_reject_count as reject_votes
    FROM trend_submissions t
    LEFT JOIN bounties b ON t.bounty_id = b.id
    LEFT JOIN profiles p ON b.enterprise_id = p.id
    WHERE t.id = p_trend_id
    AND t.is_bounty_submission = TRUE;
END;
$$ LANGUAGE plpgsql;

-- View for enterprise to see approved bounty submissions
CREATE OR REPLACE VIEW approved_bounty_submissions AS
SELECT 
    t.id as trend_id,
    t.description as headline,
    t.ai_angle as description,
    t.source_url as link,
    t.screenshot_url,
    t.platform,
    t.spotter_id,
    t.created_at as submitted_at,
    t.forwarded_at,
    t.bounty_approve_count,
    t.bounty_reject_count,
    b.id as bounty_id,
    b.title as bounty_title,
    b.enterprise_id,
    b.price_per_spot,
    p.username as spotter_username,
    p.email as spotter_email
FROM trend_submissions t
JOIN bounties b ON t.bounty_id = b.id
JOIN profiles p ON t.spotter_id = p.id
WHERE 
    t.is_bounty_submission = TRUE
    AND t.bounty_validation_status = 'approved'
    AND t.forwarded_to_enterprise = TRUE;

-- Grant permissions
GRANT SELECT ON approved_bounty_submissions TO authenticated;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_trend_validations_trend_vote ON trend_validations(trend_id, vote);