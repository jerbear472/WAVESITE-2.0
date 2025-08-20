-- =============================================
-- COMPLETE XP SYSTEM OVERHAUL
-- =============================================
-- Removes all payment/earnings vestiges
-- Establishes pure XP gamification model:
-- - Submit trend: +10 XP immediately
-- - Trend validated: +50 XP bonus
-- - Trend rejected: -15 XP penalty
-- - No "pending" XP concept
-- =============================================

-- 1. Clean up XP transactions table
-- Remove any 'pending' status - XP is either awarded or not
ALTER TABLE xp_transactions 
DROP COLUMN IF EXISTS status CASCADE;

ALTER TABLE xp_transactions
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('completed', 'reversed'));

-- 2. Update XP ledger to remove pending concept
ALTER TABLE xp_ledger
DROP COLUMN IF EXISTS status CASCADE;

-- XP is immediately applied, no pending state
ALTER TABLE xp_ledger
ADD COLUMN IF NOT EXISTS applied BOOLEAN DEFAULT true;

-- 3. Clean up user_xp table - remove earnings vestiges
ALTER TABLE user_xp
DROP COLUMN IF EXISTS pending_xp CASCADE,
DROP COLUMN IF EXISTS pending_earnings CASCADE,
DROP COLUMN IF EXISTS total_earnings CASCADE,
DROP COLUMN IF EXISTS current_balance CASCADE;

-- 4. Update trend_submissions to track validation state clearly
ALTER TABLE trend_submissions
ADD COLUMN IF NOT EXISTS validation_state VARCHAR(20) DEFAULT 'pending_validation' 
  CHECK (validation_state IN ('pending_validation', 'validated', 'rejected', 'expired'));

-- 5. Create a cleaner XP events table
CREATE TABLE IF NOT EXISTS xp_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  xp_change INTEGER NOT NULL, -- Positive or negative
  description TEXT,
  metadata JSONB,
  trend_id UUID REFERENCES trend_submissions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_xp_events_user (user_id, created_at DESC),
  INDEX idx_xp_events_type (event_type, created_at DESC)
);

-- 6. Simplified XP calculation function
CREATE OR REPLACE FUNCTION calculate_user_xp(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_total_xp INTEGER;
BEGIN
  -- Simply sum all XP events for the user
  SELECT COALESCE(SUM(xp_change), 0)
  INTO v_total_xp
  FROM xp_events
  WHERE user_id = p_user_id;
  
  RETURN GREATEST(0, v_total_xp); -- Never go below 0
END;
$$ LANGUAGE plpgsql;

-- 7. Function to handle trend submission (immediate XP)
CREATE OR REPLACE FUNCTION award_submission_xp()
RETURNS TRIGGER AS $$
BEGIN
  -- Award base XP immediately when trend is submitted
  INSERT INTO xp_events (
    user_id,
    event_type,
    xp_change,
    description,
    trend_id
  ) VALUES (
    NEW.spotter_id,
    'trend_submitted',
    10,
    'Submitted trend: ' || COALESCE(NEW.title, 'Untitled'),
    NEW.id
  );
  
  -- Update user's total XP
  UPDATE user_xp
  SET 
    total_xp = calculate_user_xp(NEW.spotter_id),
    last_xp_update = NOW()
  WHERE user_id = NEW.spotter_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Function to handle validation outcome (bonus or penalty)
CREATE OR REPLACE FUNCTION process_validation_outcome()
RETURNS TRIGGER AS $$
DECLARE
  v_positive_votes INTEGER;
  v_negative_votes INTEGER;
  v_threshold INTEGER := 3;
  v_spotter_id UUID;
  v_trend_title TEXT;
  v_xp_change INTEGER;
  v_event_type VARCHAR(50);
BEGIN
  -- Only process on INSERT
  IF TG_OP != 'INSERT' THEN
    RETURN NEW;
  END IF;
  
  -- Count votes
  SELECT 
    COUNT(CASE WHEN is_valid THEN 1 END),
    COUNT(CASE WHEN NOT is_valid THEN 1 END)
  INTO v_positive_votes, v_negative_votes
  FROM trend_validations
  WHERE trend_id = NEW.trend_id;
  
  -- Check if threshold reached
  IF (v_positive_votes + v_negative_votes) >= v_threshold THEN
    
    SELECT spotter_id, title
    INTO v_spotter_id, v_trend_title
    FROM trend_submissions
    WHERE id = NEW.trend_id;
    
    -- VALIDATED: Majority positive
    IF v_positive_votes > v_negative_votes THEN
      UPDATE trend_submissions
      SET 
        validation_state = 'validated',
        status = 'validated',
        validated_at = NOW()
      WHERE id = NEW.trend_id;
      
      v_xp_change := 50;
      v_event_type := 'trend_validated';
      
    -- REJECTED: Majority negative
    ELSIF v_negative_votes > v_positive_votes THEN
      UPDATE trend_submissions
      SET 
        validation_state = 'rejected',
        status = 'rejected',
        rejected_at = NOW()
      WHERE id = NEW.trend_id;
      
      -- Calculate penalty (use existing penalty function)
      v_xp_change := -calculate_xp_penalty(v_spotter_id);
      v_event_type := 'trend_rejected';
    ELSE
      -- Tie - needs more votes
      RETURN NEW;
    END IF;
    
    -- Record XP event
    IF v_xp_change != 0 THEN
      INSERT INTO xp_events (
        user_id,
        event_type,
        xp_change,
        description,
        trend_id
      ) VALUES (
        v_spotter_id,
        v_event_type,
        v_xp_change,
        CASE 
          WHEN v_xp_change > 0 THEN 'Trend validated: ' || v_trend_title
          ELSE 'Trend rejected: ' || v_trend_title
        END,
        NEW.trend_id
      );
      
      -- Update user's total XP
      UPDATE user_xp
      SET 
        total_xp = calculate_user_xp(v_spotter_id),
        last_xp_update = NOW(),
        rejection_count = CASE 
          WHEN v_xp_change < 0 THEN rejection_count + 1 
          ELSE rejection_count 
        END
      WHERE user_id = v_spotter_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Create triggers
DROP TRIGGER IF EXISTS award_submission_xp_trigger ON trend_submissions;
CREATE TRIGGER award_submission_xp_trigger
AFTER INSERT ON trend_submissions
FOR EACH ROW
EXECUTE FUNCTION award_submission_xp();

DROP TRIGGER IF EXISTS process_validation_outcome_trigger ON trend_validations;
CREATE TRIGGER process_validation_outcome_trigger
AFTER INSERT ON trend_validations
FOR EACH ROW
EXECUTE FUNCTION process_validation_outcome();

-- 10. Add columns for better tracking
ALTER TABLE trend_submissions
ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS xp_awarded INTEGER DEFAULT 0;

-- 11. View for user's pending trends
CREATE OR REPLACE VIEW user_pending_trends AS
SELECT 
  ts.id,
  ts.spotter_id,
  ts.title,
  ts.description,
  ts.created_at,
  ts.validation_state,
  ts.validation_count,
  COUNT(tv.id) as total_votes,
  COUNT(CASE WHEN tv.is_valid THEN 1 END) as positive_votes,
  COUNT(CASE WHEN tv.is_valid = false THEN 1 END) as negative_votes
FROM trend_submissions ts
LEFT JOIN trend_validations tv ON tv.trend_id = ts.id
WHERE ts.validation_state = 'pending_validation'
GROUP BY ts.id;

-- 12. View for user XP summary
CREATE OR REPLACE VIEW user_xp_summary AS
SELECT 
  u.id as user_id,
  u.username,
  COALESCE(ux.total_xp, 0) as total_xp,
  COALESCE(ux.current_level, 1) as level,
  COALESCE(xl.title, 'Observer') as level_title,
  COUNT(DISTINCT ts.id) as total_trends_submitted,
  COUNT(DISTINCT CASE WHEN ts.validation_state = 'validated' THEN ts.id END) as validated_trends,
  COUNT(DISTINCT CASE WHEN ts.validation_state = 'rejected' THEN ts.id END) as rejected_trends,
  COUNT(DISTINCT CASE WHEN ts.validation_state = 'pending_validation' THEN ts.id END) as pending_trends
FROM users u
LEFT JOIN user_xp ux ON ux.user_id = u.id
LEFT JOIN xp_levels xl ON xl.level = ux.current_level
LEFT JOIN trend_submissions ts ON ts.spotter_id = u.id
GROUP BY u.id, u.username, ux.total_xp, ux.current_level, xl.title;

-- 13. Function to get user's XP history
CREATE OR REPLACE FUNCTION get_user_xp_history(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  event_type VARCHAR(50),
  xp_change INTEGER,
  description TEXT,
  created_at TIMESTAMPTZ,
  running_total INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.event_type,
    e.xp_change,
    e.description,
    e.created_at,
    SUM(e.xp_change) OVER (ORDER BY e.created_at) as running_total
  FROM xp_events e
  WHERE e.user_id = p_user_id
  ORDER BY e.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 14. Clean up old payment-related columns from profiles
ALTER TABLE profiles
DROP COLUMN IF EXISTS pending_earnings CASCADE,
DROP COLUMN IF EXISTS total_earnings CASCADE,
DROP COLUMN IF EXISTS current_balance CASCADE,
DROP COLUMN IF EXISTS stripe_customer_id CASCADE,
DROP COLUMN IF EXISTS stripe_account_id CASCADE,
DROP COLUMN IF EXISTS payment_method CASCADE;

-- 15. Update XP config for new system
DELETE FROM xp_config WHERE action_type IN ('payment', 'withdrawal', 'pending_approval');

INSERT INTO xp_config (action_type, base_amount, description) VALUES
  ('trend_submitted', 10, 'Base XP for submitting a trend'),
  ('trend_validated', 50, 'Bonus XP when trend is validated'),
  ('trend_rejected', -15, 'Penalty for rejected trend (base)'),
  ('perfect_validation', 10, 'Bonus for 100% validation accuracy'),
  ('daily_login', 10, 'Daily login bonus'),
  ('achievement_unlocked', 25, 'Unlocking an achievement')
ON CONFLICT (action_type) DO UPDATE
SET base_amount = EXCLUDED.base_amount,
    description = EXCLUDED.description;

-- 16. Grant permissions
GRANT SELECT ON user_pending_trends TO authenticated;
GRANT SELECT ON user_xp_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_xp_history TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_user_xp TO authenticated;

-- 17. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_xp_events_user_created 
ON xp_events(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_trend_submissions_validation_state 
ON trend_submissions(validation_state, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_trend_submissions_spotter_state 
ON trend_submissions(spotter_id, validation_state);

COMMENT ON TABLE xp_events IS 'Clean XP event tracking - no pending states, immediate application';
COMMENT ON VIEW user_pending_trends IS 'Shows trends awaiting validation with vote counts';
COMMENT ON VIEW user_xp_summary IS 'Complete XP and trend statistics for users';