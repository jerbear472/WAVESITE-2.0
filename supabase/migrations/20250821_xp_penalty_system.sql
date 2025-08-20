-- =============================================
-- XP PENALTY SYSTEM FOR REJECTED TRENDS
-- =============================================
-- Implements risk/reward balance:
-- - Base XP for submissions (reduced to 10)
-- - Bonus XP for validated trends (50)
-- - Penalty for rejected trends (-15)
-- - Grace period for new users
-- - Escalating penalties for repeat offenders
-- =============================================

-- Add tracking columns to user_xp table
ALTER TABLE user_xp 
ADD COLUMN IF NOT EXISTS rejection_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS daily_xp_lost INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_xp_loss_date DATE,
ADD COLUMN IF NOT EXISTS grace_submissions_used INTEGER DEFAULT 0;

-- Add rejection tracking to trend_submissions
ALTER TABLE trend_submissions
ADD COLUMN IF NOT EXISTS rejection_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS final_verdict VARCHAR(20) DEFAULT 'pending'; -- 'validated', 'rejected', 'pending'

-- Configuration table for XP penalties
CREATE TABLE IF NOT EXISTS xp_penalty_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  penalty_type VARCHAR(50) NOT NULL,
  base_penalty INTEGER NOT NULL,
  escalation_factor DECIMAL(3,2) DEFAULT 1.0,
  max_penalty INTEGER,
  grace_period_submissions INTEGER DEFAULT 10,
  grace_period_level INTEGER DEFAULT 3,
  daily_loss_cap INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default penalty configuration
INSERT INTO xp_penalty_config (
  penalty_type,
  base_penalty,
  escalation_factor,
  max_penalty,
  grace_period_submissions,
  grace_period_level,
  daily_loss_cap
) VALUES (
  'trend_rejection',
  15,
  1.5,
  50,
  10,
  3,
  100
) ON CONFLICT DO NOTHING;

-- Function to calculate XP penalty with escalation
CREATE OR REPLACE FUNCTION calculate_xp_penalty(
  p_user_id UUID,
  p_penalty_type VARCHAR(50) DEFAULT 'trend_rejection'
)
RETURNS INTEGER AS $$
DECLARE
  v_penalty INTEGER;
  v_user_level INTEGER;
  v_rejection_count INTEGER;
  v_grace_submissions INTEGER;
  v_config RECORD;
  v_daily_lost INTEGER;
  v_last_loss_date DATE;
BEGIN
  -- Get penalty configuration
  SELECT * INTO v_config
  FROM xp_penalty_config
  WHERE penalty_type = p_penalty_type
  LIMIT 1;
  
  IF v_config IS NULL THEN
    RETURN 15; -- Default penalty if config not found
  END IF;
  
  -- Get user's current level and stats
  SELECT 
    current_level,
    rejection_count,
    grace_submissions_used,
    daily_xp_lost,
    last_xp_loss_date
  INTO 
    v_user_level,
    v_rejection_count,
    v_grace_submissions,
    v_daily_lost,
    v_last_loss_date
  FROM user_xp
  WHERE user_id = p_user_id;
  
  -- Check if user is in grace period (new users)
  IF v_user_level < v_config.grace_period_level THEN
    RETURN 0; -- No penalty for new users
  END IF;
  
  -- Check if user still has grace submissions
  IF v_grace_submissions < v_config.grace_period_submissions THEN
    -- Use a grace submission but no penalty
    UPDATE user_xp 
    SET grace_submissions_used = grace_submissions_used + 1
    WHERE user_id = p_user_id;
    RETURN 0;
  END IF;
  
  -- Calculate escalating penalty based on rejection count
  v_penalty := v_config.base_penalty;
  
  -- Escalate penalty for repeat offenders
  IF v_rejection_count > 0 THEN
    v_penalty := LEAST(
      v_penalty * POWER(v_config.escalation_factor, LEAST(v_rejection_count, 5)),
      v_config.max_penalty
    );
  END IF;
  
  -- Check daily loss cap
  IF v_last_loss_date = CURRENT_DATE THEN
    IF v_daily_lost >= v_config.daily_loss_cap THEN
      RETURN 0; -- Daily cap reached
    END IF;
    -- Adjust penalty if it would exceed daily cap
    v_penalty := LEAST(v_penalty, v_config.daily_loss_cap - v_daily_lost);
  END IF;
  
  RETURN v_penalty;
END;
$$ LANGUAGE plpgsql;

-- Function to handle trend validation outcome
CREATE OR REPLACE FUNCTION process_trend_validation_outcome()
RETURNS TRIGGER AS $$
DECLARE
  v_validation_count INTEGER;
  v_positive_votes INTEGER;
  v_negative_votes INTEGER;
  v_threshold INTEGER := 3;
  v_spotter_id UUID;
  v_xp_penalty INTEGER;
  v_trend_title TEXT;
BEGIN
  -- Only process when a new validation is added
  IF TG_OP != 'INSERT' THEN
    RETURN NEW;
  END IF;
  
  -- Count validations for this trend
  SELECT 
    COUNT(*),
    SUM(CASE WHEN is_valid THEN 1 ELSE 0 END),
    SUM(CASE WHEN NOT is_valid THEN 1 ELSE 0 END)
  INTO v_validation_count, v_positive_votes, v_negative_votes
  FROM trend_validations
  WHERE trend_id = NEW.trend_id;
  
  -- Get spotter ID and trend info
  SELECT spotter_id, title
  INTO v_spotter_id, v_trend_title
  FROM trend_submissions
  WHERE id = NEW.trend_id;
  
  -- Check if we've reached the threshold
  IF v_validation_count >= v_threshold THEN
    
    -- Trend is VALIDATED (majority positive)
    IF v_positive_votes > v_negative_votes THEN
      UPDATE trend_submissions
      SET 
        status = 'validated',
        final_verdict = 'validated',
        validation_count = v_validation_count
      WHERE id = NEW.trend_id;
      
      -- Award bonus XP for validated trend
      INSERT INTO xp_transactions (
        user_id,
        amount,
        transaction_type,
        description,
        trend_id
      ) VALUES (
        v_spotter_id,
        50,
        'trend_validated',
        'Trend validated by community: ' || v_trend_title,
        NEW.trend_id
      );
      
      -- Update user's total XP
      UPDATE user_xp
      SET total_xp = total_xp + 50
      WHERE user_id = v_spotter_id;
      
    -- Trend is REJECTED (majority negative)
    ELSIF v_negative_votes > v_positive_votes THEN
      UPDATE trend_submissions
      SET 
        status = 'rejected',
        final_verdict = 'rejected',
        validation_count = v_validation_count,
        rejection_count = rejection_count + 1
      WHERE id = NEW.trend_id;
      
      -- Calculate XP penalty
      v_xp_penalty := calculate_xp_penalty(v_spotter_id);
      
      IF v_xp_penalty > 0 THEN
        -- Deduct XP for rejected trend
        INSERT INTO xp_transactions (
          user_id,
          amount,
          transaction_type,
          description,
          trend_id
        ) VALUES (
          v_spotter_id,
          -v_xp_penalty,
          'trend_rejected',
          'Trend rejected by community: ' || v_trend_title,
          NEW.trend_id
        );
        
        -- Update user's XP and rejection tracking
        UPDATE user_xp
        SET 
          total_xp = GREATEST(0, total_xp - v_xp_penalty), -- Never go below 0
          rejection_count = rejection_count + 1,
          daily_xp_lost = CASE 
            WHEN last_xp_loss_date = CURRENT_DATE 
            THEN daily_xp_lost + v_xp_penalty
            ELSE v_xp_penalty
          END,
          last_xp_loss_date = CURRENT_DATE
        WHERE user_id = v_spotter_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for validation outcomes
DROP TRIGGER IF EXISTS process_validation_outcome ON trend_validations;
CREATE TRIGGER process_validation_outcome
AFTER INSERT ON trend_validations
FOR EACH ROW
EXECUTE FUNCTION process_trend_validation_outcome();

-- Update XP rates for submissions (reduce base XP)
UPDATE xp_config 
SET base_amount = 10
WHERE action_type = 'trend_submission';

-- If config doesn't exist, insert it
INSERT INTO xp_config (
  action_type,
  base_amount,
  description
) VALUES (
  'trend_submission',
  10,
  'Base XP for submitting a trend (reduced from 25)'
) ON CONFLICT (action_type) DO UPDATE
SET base_amount = 10;

-- Function to get user's XP penalty status
CREATE OR REPLACE FUNCTION get_user_xp_penalty_status(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'current_level', current_level,
    'rejection_count', rejection_count,
    'grace_submissions_remaining', GREATEST(0, 10 - grace_submissions_used),
    'daily_xp_lost', CASE 
      WHEN last_xp_loss_date = CURRENT_DATE 
      THEN daily_xp_lost 
      ELSE 0 
    END,
    'daily_loss_remaining', CASE
      WHEN last_xp_loss_date = CURRENT_DATE
      THEN GREATEST(0, 100 - daily_xp_lost)
      ELSE 100
    END,
    'next_penalty', calculate_xp_penalty(p_user_id),
    'in_grace_period', current_level < 3
  ) INTO v_result
  FROM user_xp
  WHERE user_id = p_user_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_trend_submissions_final_verdict 
ON trend_submissions(final_verdict, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_xp_rejection_tracking
ON user_xp(user_id, rejection_count, last_xp_loss_date);

-- Grant permissions
GRANT SELECT ON xp_penalty_config TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_xp_penalty TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_xp_penalty_status TO authenticated;

COMMENT ON TABLE xp_penalty_config IS 'Configuration for XP penalty system with escalating penalties';
COMMENT ON FUNCTION calculate_xp_penalty IS 'Calculates XP penalty with grace period and escalation logic';
COMMENT ON FUNCTION process_trend_validation_outcome IS 'Handles validation outcomes and applies XP rewards/penalties';