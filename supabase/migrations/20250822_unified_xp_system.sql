-- ==================================================
-- UNIFIED XP SYSTEM MIGRATION
-- Date: 2025-08-22
-- Purpose: Standardize XP values across all platforms
-- ==================================================

-- Update XP configuration constants to match unified values
DO $$
BEGIN
  -- Create XP configuration table if it doesn't exist
  CREATE TABLE IF NOT EXISTS xp_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Insert unified XP values
  INSERT INTO xp_config (key, value) VALUES
    ('base_xp', '{
      "trend_submission": 25,
      "validation_vote": 5,
      "approval_bonus": 50,
      "rejection_penalty": -10,
      "accurate_validation": 15,
      "daily_login": 10,
      "first_trend_of_day": 20,
      "scroll_per_minute": 2,
      "trend_shared": 5,
      "trend_viral_bonus": 100,
      "helpful_vote": 3
    }'::jsonb),
    ('validation_settings', '{
      "votes_to_approve": 3,
      "votes_to_reject": 3,
      "max_voting_hours": 72,
      "self_vote_allowed": false,
      "min_quality_for_approval": 50
    }'::jsonb),
    ('daily_caps', '{
      "max_submissions": 100,
      "max_validations": 200,
      "max_xp": 5000,
      "max_scroll_minutes": 300
    }'::jsonb)
  ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value,
      updated_at = NOW();
END $$;

-- Drop and recreate the cast_trend_vote function with unified XP values
DROP FUNCTION IF EXISTS cast_trend_vote CASCADE;

CREATE OR REPLACE FUNCTION cast_trend_vote(
  p_trend_id UUID,
  p_validator_id UUID,
  p_vote_value INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_trend_owner UUID;
  v_existing_vote INTEGER;
  v_yes_votes INTEGER;
  v_no_votes INTEGER;
  v_base_xp INTEGER := 5;  -- Base XP for validation vote
  v_accuracy_bonus INTEGER := 15;  -- Bonus for accurate validation
  v_approval_bonus INTEGER := 50;  -- Bonus when trend approved
  v_rejection_penalty INTEGER := -10;  -- Penalty when trend rejected
  v_user_level INTEGER;
  v_level_multiplier NUMERIC;
  v_final_xp INTEGER;
BEGIN
  -- Prevent self-voting
  SELECT user_id INTO v_trend_owner
  FROM captured_trends
  WHERE id = p_trend_id;
  
  IF v_trend_owner = p_validator_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot vote on your own trend'
    );
  END IF;

  -- Check for existing vote
  SELECT vote_value INTO v_existing_vote
  FROM trend_validations
  WHERE trend_id = p_trend_id AND validator_id = p_validator_id;

  IF v_existing_vote IS NOT NULL THEN
    -- Update existing vote
    UPDATE trend_validations
    SET vote_value = p_vote_value,
        updated_at = NOW()
    WHERE trend_id = p_trend_id AND validator_id = p_validator_id;
  ELSE
    -- Insert new vote
    INSERT INTO trend_validations (trend_id, validator_id, vote_value)
    VALUES (p_trend_id, p_validator_id, p_vote_value);
    
    -- Get user level for XP calculation
    SELECT COALESCE(
      (SELECT level FROM user_xp_summary WHERE user_id = p_validator_id),
      1
    ) INTO v_user_level;
    
    -- Calculate level multiplier (matching unified config)
    v_level_multiplier := CASE
      WHEN v_user_level = 1 THEN 1.0
      WHEN v_user_level = 2 THEN 1.1
      WHEN v_user_level = 3 THEN 1.2
      WHEN v_user_level = 4 THEN 1.3
      WHEN v_user_level = 5 THEN 1.4
      WHEN v_user_level = 6 THEN 1.5
      WHEN v_user_level = 7 THEN 1.6
      WHEN v_user_level = 8 THEN 1.7
      WHEN v_user_level = 9 THEN 1.8
      WHEN v_user_level = 10 THEN 2.0
      WHEN v_user_level = 11 THEN 2.2
      WHEN v_user_level = 12 THEN 2.4
      WHEN v_user_level = 13 THEN 2.6
      WHEN v_user_level = 14 THEN 2.8
      WHEN v_user_level >= 15 THEN 3.0
      ELSE 1.0
    END;
    
    -- Award base XP for validation
    v_final_xp := ROUND(v_base_xp * v_level_multiplier);
    
    INSERT INTO xp_transactions (user_id, amount, type, description, metadata)
    VALUES (
      p_validator_id,
      v_final_xp,
      'validation',
      'Voted on trend validation',
      jsonb_build_object(
        'trend_id', p_trend_id,
        'vote_value', p_vote_value,
        'level_multiplier', v_level_multiplier
      )
    );
  END IF;

  -- Count votes
  SELECT 
    COUNT(*) FILTER (WHERE vote_value = 1),
    COUNT(*) FILTER (WHERE vote_value = -1)
  INTO v_yes_votes, v_no_votes
  FROM trend_validations
  WHERE trend_id = p_trend_id;

  -- Check if trend is approved (3+ YES votes)
  IF v_yes_votes >= 3 AND NOT EXISTS (
    SELECT 1 FROM captured_trends 
    WHERE id = p_trend_id AND approval_status = 'approved'
  ) THEN
    -- Mark trend as approved
    UPDATE captured_trends
    SET approval_status = 'approved',
        approved_at = NOW()
    WHERE id = p_trend_id;
    
    -- Award approval bonus to trend owner
    INSERT INTO xp_transactions (user_id, amount, type, description, metadata)
    VALUES (
      v_trend_owner,
      v_approval_bonus,
      'approval_bonus',
      'Trend approved by community',
      jsonb_build_object('trend_id', p_trend_id)
    );
    
    -- Award accuracy bonus to validators who voted YES
    INSERT INTO xp_transactions (user_id, amount, type, description, metadata)
    SELECT 
      validator_id,
      v_accuracy_bonus,
      'accurate_validation',
      'Voted with majority consensus',
      jsonb_build_object('trend_id', p_trend_id)
    FROM trend_validations
    WHERE trend_id = p_trend_id AND vote_value = 1;
    
  -- Check if trend is rejected (3+ NO votes)
  ELSIF v_no_votes >= 3 AND NOT EXISTS (
    SELECT 1 FROM captured_trends 
    WHERE id = p_trend_id AND approval_status = 'rejected'
  ) THEN
    -- Mark trend as rejected
    UPDATE captured_trends
    SET approval_status = 'rejected'
    WHERE id = p_trend_id;
    
    -- Apply rejection penalty to trend owner
    INSERT INTO xp_transactions (user_id, amount, type, description, metadata)
    VALUES (
      v_trend_owner,
      v_rejection_penalty,
      'rejection_penalty',
      'Trend rejected by community',
      jsonb_build_object('trend_id', p_trend_id)
    );
    
    -- Award accuracy bonus to validators who voted NO
    INSERT INTO xp_transactions (user_id, amount, type, description, metadata)
    SELECT 
      validator_id,
      v_accuracy_bonus,
      'accurate_validation',
      'Voted with majority consensus',
      jsonb_build_object('trend_id', p_trend_id)
    FROM trend_validations
    WHERE trend_id = p_trend_id AND vote_value = -1;
  END IF;

  -- Return result
  RETURN jsonb_build_object(
    'success', true,
    'yes_votes', v_yes_votes,
    'no_votes', v_no_votes,
    'approval_status', (
      SELECT approval_status FROM captured_trends WHERE id = p_trend_id
    ),
    'xp_earned', v_final_xp
  );
END;
$$;

-- Create function to award XP for trend submission with unified values
CREATE OR REPLACE FUNCTION award_trend_submission_xp(
  p_user_id UUID,
  p_trend_id UUID,
  p_quality_score NUMERIC DEFAULT 0.7,
  p_is_first_of_day BOOLEAN DEFAULT FALSE
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_base_xp INTEGER := 25;  -- Unified base XP
  v_first_day_bonus INTEGER := 20;  -- First trend of day bonus
  v_quality_bonus INTEGER;
  v_user_level INTEGER;
  v_session_position INTEGER;
  v_daily_streak INTEGER;
  v_level_multiplier NUMERIC;
  v_session_multiplier NUMERIC;
  v_daily_multiplier NUMERIC;
  v_quality_multiplier NUMERIC;
  v_last_submission TIMESTAMPTZ;
  v_final_xp INTEGER;
BEGIN
  -- Get user's current stats
  SELECT 
    COALESCE(level, 1),
    COALESCE(daily_streak, 0)
  INTO v_user_level, v_daily_streak
  FROM user_xp_summary
  WHERE user_id = p_user_id;
  
  -- Get last submission time and calculate session position
  SELECT created_at INTO v_last_submission
  FROM captured_trends
  WHERE user_id = p_user_id
    AND created_at < NOW()
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Calculate session position (submissions within 5 minutes)
  IF v_last_submission IS NOT NULL AND 
     (EXTRACT(EPOCH FROM (NOW() - v_last_submission)) / 60) <= 5 THEN
    SELECT COUNT(*) + 1 INTO v_session_position
    FROM captured_trends
    WHERE user_id = p_user_id
      AND created_at >= NOW() - INTERVAL '5 minutes';
  ELSE
    v_session_position := 1;
  END IF;
  
  -- Calculate quality bonus based on unified config
  v_quality_bonus := CASE
    WHEN p_quality_score >= 0.95 THEN 50  -- exceptional
    WHEN p_quality_score >= 0.90 THEN 40  -- excellent
    WHEN p_quality_score >= 0.80 THEN 30  -- good
    WHEN p_quality_score >= 0.70 THEN 20  -- average
    WHEN p_quality_score >= 0.60 THEN 10  -- fair
    WHEN p_quality_score >= 0.50 THEN 5   -- poor
    ELSE 0  -- low
  END;
  
  -- Calculate level multiplier (matching unified config)
  v_level_multiplier := CASE
    WHEN v_user_level = 1 THEN 1.0
    WHEN v_user_level = 2 THEN 1.1
    WHEN v_user_level = 3 THEN 1.2
    WHEN v_user_level = 4 THEN 1.3
    WHEN v_user_level = 5 THEN 1.4
    WHEN v_user_level = 6 THEN 1.5
    WHEN v_user_level = 7 THEN 1.6
    WHEN v_user_level = 8 THEN 1.7
    WHEN v_user_level = 9 THEN 1.8
    WHEN v_user_level = 10 THEN 2.0
    WHEN v_user_level = 11 THEN 2.2
    WHEN v_user_level = 12 THEN 2.4
    WHEN v_user_level = 13 THEN 2.6
    WHEN v_user_level = 14 THEN 2.8
    WHEN v_user_level >= 15 THEN 3.0
    ELSE 1.0
  END;
  
  -- Calculate session multiplier
  v_session_multiplier := CASE
    WHEN v_session_position >= 5 THEN 2.5
    WHEN v_session_position = 4 THEN 2.0
    WHEN v_session_position = 3 THEN 1.5
    WHEN v_session_position = 2 THEN 1.2
    ELSE 1.0
  END;
  
  -- Calculate daily streak multiplier
  v_daily_multiplier := CASE
    WHEN v_daily_streak >= 30 THEN 3.0
    WHEN v_daily_streak >= 14 THEN 2.5
    WHEN v_daily_streak >= 7 THEN 2.0
    WHEN v_daily_streak >= 3 THEN 1.5
    WHEN v_daily_streak >= 1 THEN 1.2
    ELSE 1.0
  END;
  
  -- Calculate quality multiplier
  v_quality_multiplier := CASE
    WHEN p_quality_score >= 0.95 THEN 2.0
    WHEN p_quality_score >= 0.90 THEN 1.75
    WHEN p_quality_score >= 0.80 THEN 1.5
    WHEN p_quality_score >= 0.70 THEN 1.25
    WHEN p_quality_score >= 0.60 THEN 1.0
    WHEN p_quality_score >= 0.50 THEN 0.75
    ELSE 0.5
  END;
  
  -- Calculate final XP
  v_final_xp := ROUND(
    (v_base_xp + v_quality_bonus + 
     CASE WHEN p_is_first_of_day THEN v_first_day_bonus ELSE 0 END) *
    v_level_multiplier * 
    v_session_multiplier * 
    v_daily_multiplier * 
    v_quality_multiplier
  );
  
  -- Apply daily cap
  IF (SELECT COALESCE(SUM(amount), 0) FROM xp_transactions 
      WHERE user_id = p_user_id 
      AND created_at >= CURRENT_DATE) + v_final_xp > 5000 THEN
    v_final_xp := GREATEST(0, 5000 - (
      SELECT COALESCE(SUM(amount), 0) FROM xp_transactions 
      WHERE user_id = p_user_id 
      AND created_at >= CURRENT_DATE
    ));
  END IF;
  
  -- Award XP
  IF v_final_xp > 0 THEN
    INSERT INTO xp_transactions (user_id, amount, type, description, metadata)
    VALUES (
      p_user_id,
      v_final_xp,
      'trend_submission',
      'Submitted a trend',
      jsonb_build_object(
        'trend_id', p_trend_id,
        'quality_score', p_quality_score,
        'level', v_user_level,
        'session_position', v_session_position,
        'daily_streak', v_daily_streak,
        'multipliers', jsonb_build_object(
          'level', v_level_multiplier,
          'session', v_session_multiplier,
          'daily', v_daily_multiplier,
          'quality', v_quality_multiplier
        )
      )
    );
  END IF;
  
  RETURN v_final_xp;
END;
$$;

-- Create function to calculate scroll session XP
CREATE OR REPLACE FUNCTION calculate_scroll_session_xp(
  p_user_id UUID,
  p_minutes INTEGER,
  p_trends_logged INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_scroll_xp INTEGER;
  v_trend_xp INTEGER;
  v_user_level INTEGER;
  v_level_multiplier NUMERIC;
  v_final_xp INTEGER;
BEGIN
  -- Get user level
  SELECT COALESCE(level, 1) INTO v_user_level
  FROM user_xp_summary
  WHERE user_id = p_user_id;
  
  -- Calculate base XP (2 XP per minute + 25 XP per trend)
  v_scroll_xp := p_minutes * 2;
  v_trend_xp := p_trends_logged * 25;
  
  -- Calculate level multiplier
  v_level_multiplier := CASE
    WHEN v_user_level = 1 THEN 1.0
    WHEN v_user_level = 2 THEN 1.1
    WHEN v_user_level = 3 THEN 1.2
    WHEN v_user_level = 4 THEN 1.3
    WHEN v_user_level = 5 THEN 1.4
    WHEN v_user_level = 6 THEN 1.5
    WHEN v_user_level = 7 THEN 1.6
    WHEN v_user_level = 8 THEN 1.7
    WHEN v_user_level = 9 THEN 1.8
    WHEN v_user_level = 10 THEN 2.0
    WHEN v_user_level = 11 THEN 2.2
    WHEN v_user_level = 12 THEN 2.4
    WHEN v_user_level = 13 THEN 2.6
    WHEN v_user_level = 14 THEN 2.8
    WHEN v_user_level >= 15 THEN 3.0
    ELSE 1.0
  END;
  
  -- Calculate final XP
  v_final_xp := ROUND((v_scroll_xp + v_trend_xp) * v_level_multiplier);
  
  -- Apply max scroll minutes cap (300 minutes = 5 hours per day)
  IF p_minutes > 300 THEN
    v_final_xp := ROUND((300 * 2 + v_trend_xp) * v_level_multiplier);
  END IF;
  
  RETURN v_final_xp;
END;
$$;

-- Update user_xp_summary view to use unified level thresholds
CREATE OR REPLACE VIEW user_xp_summary AS
SELECT 
  u.id AS user_id,
  u.username,
  COALESCE(xp.total_xp, 0) AS total_xp,
  CASE
    WHEN COALESCE(xp.total_xp, 0) >= 15000 THEN 15
    WHEN COALESCE(xp.total_xp, 0) >= 12500 THEN 14
    WHEN COALESCE(xp.total_xp, 0) >= 10000 THEN 13
    WHEN COALESCE(xp.total_xp, 0) >= 8200 THEN 12
    WHEN COALESCE(xp.total_xp, 0) >= 6600 THEN 11
    WHEN COALESCE(xp.total_xp, 0) >= 5200 THEN 10
    WHEN COALESCE(xp.total_xp, 0) >= 4000 THEN 9
    WHEN COALESCE(xp.total_xp, 0) >= 3000 THEN 8
    WHEN COALESCE(xp.total_xp, 0) >= 2200 THEN 7
    WHEN COALESCE(xp.total_xp, 0) >= 1500 THEN 6
    WHEN COALESCE(xp.total_xp, 0) >= 1000 THEN 5
    WHEN COALESCE(xp.total_xp, 0) >= 600 THEN 4
    WHEN COALESCE(xp.total_xp, 0) >= 300 THEN 3
    WHEN COALESCE(xp.total_xp, 0) >= 100 THEN 2
    ELSE 1
  END AS level,
  CASE
    WHEN COALESCE(xp.total_xp, 0) >= 15000 THEN 'Legend'
    WHEN COALESCE(xp.total_xp, 0) >= 12500 THEN 'Master'
    WHEN COALESCE(xp.total_xp, 0) >= 10000 THEN 'Visionary'
    WHEN COALESCE(xp.total_xp, 0) >= 8200 THEN 'Pioneer'
    WHEN COALESCE(xp.total_xp, 0) >= 6600 THEN 'Authority'
    WHEN COALESCE(xp.total_xp, 0) >= 5200 THEN 'Researcher'
    WHEN COALESCE(xp.total_xp, 0) >= 4000 THEN 'Scholar'
    WHEN COALESCE(xp.total_xp, 0) >= 3000 THEN 'Expert'
    WHEN COALESCE(xp.total_xp, 0) >= 2200 THEN 'Specialist'
    WHEN COALESCE(xp.total_xp, 0) >= 1500 THEN 'Interpreter'
    WHEN COALESCE(xp.total_xp, 0) >= 1000 THEN 'Analyst'
    WHEN COALESCE(xp.total_xp, 0) >= 600 THEN 'Spotter'
    WHEN COALESCE(xp.total_xp, 0) >= 300 THEN 'Tracker'
    WHEN COALESCE(xp.total_xp, 0) >= 100 THEN 'Recorder'
    ELSE 'Observer'
  END AS level_title,
  COALESCE(s.trends_submitted, 0) AS trends_submitted,
  COALESCE(s.trends_validated, 0) AS trends_validated,
  COALESCE(s.validation_accuracy, 100) AS validation_accuracy,
  COALESCE(s.daily_streak, 0) AS daily_streak,
  COALESCE(s.longest_streak, 0) AS longest_streak,
  COALESCE(s.session_streak, 0) AS session_streak,
  s.last_submission_at
FROM user_profiles u
LEFT JOIN (
  SELECT 
    user_id,
    SUM(amount) AS total_xp
  FROM xp_transactions
  GROUP BY user_id
) xp ON u.id = xp.user_id
LEFT JOIN (
  SELECT 
    ct.user_id,
    COUNT(DISTINCT ct.id) AS trends_submitted,
    COUNT(DISTINCT tv.id) AS trends_validated,
    CASE 
      WHEN COUNT(DISTINCT tv.id) > 0 THEN
        ROUND(100.0 * COUNT(DISTINCT tv.id) FILTER (
          WHERE (tv.vote_value = 1 AND ct2.approval_status = 'approved')
             OR (tv.vote_value = -1 AND ct2.approval_status = 'rejected')
        ) / COUNT(DISTINCT tv.id))
      ELSE 100
    END AS validation_accuracy,
    -- Calculate daily streak
    CASE
      WHEN MAX(ct.created_at::date) = CURRENT_DATE OR 
           MAX(ct.created_at::date) = CURRENT_DATE - 1 THEN
        (SELECT COUNT(DISTINCT date_trunc('day', created_at))
         FROM captured_trends
         WHERE user_id = ct.user_id
           AND created_at >= CURRENT_DATE - INTERVAL '30 days')
      ELSE 0
    END AS daily_streak,
    0 AS longest_streak,  -- Would need separate tracking
    -- Calculate session streak (trends in last 5 minutes)
    (SELECT COUNT(*)
     FROM captured_trends
     WHERE user_id = ct.user_id
       AND created_at >= NOW() - INTERVAL '5 minutes') AS session_streak,
    MAX(ct.created_at) AS last_submission_at
  FROM captured_trends ct
  LEFT JOIN trend_validations tv ON tv.validator_id = ct.user_id
  LEFT JOIN captured_trends ct2 ON tv.trend_id = ct2.id
  GROUP BY ct.user_id
) s ON u.id = s.user_id;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_xp_transactions_user_date 
ON xp_transactions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_captured_trends_user_created 
ON captured_trends(user_id, created_at DESC);

-- Grant necessary permissions
GRANT SELECT ON xp_config TO authenticated;
GRANT SELECT ON user_xp_summary TO authenticated;
GRANT EXECUTE ON FUNCTION cast_trend_vote TO authenticated;
GRANT EXECUTE ON FUNCTION award_trend_submission_xp TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_scroll_session_xp TO authenticated;