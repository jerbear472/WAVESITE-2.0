-- Enhanced Voting System Migration
-- Implements weighted voting, confidence scoring, and improved trend lifecycle

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Add user reputation and vote weighting
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS validation_reputation DECIMAL(3,2) DEFAULT 0.50,
ADD COLUMN IF NOT EXISTS vote_weight DECIMAL(3,2) DEFAULT 1.00,
ADD COLUMN IF NOT EXISTS total_validations INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS correct_validations INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS validation_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_validation_date DATE;

-- 2. Create trend lifecycle enum
DO $$ BEGIN
  CREATE TYPE trend_stage AS ENUM (
    'submitted',
    'validating', 
    'trending',
    'viral',
    'peaked',
    'declining',
    'archived'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. Enhance trend_submissions table
ALTER TABLE public.trend_submissions
ADD COLUMN IF NOT EXISTS stage trend_stage DEFAULT 'submitted',
ADD COLUMN IF NOT EXISTS stage_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS peak_validation_score DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS weighted_consensus_score DECIMAL(3,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS validation_difficulty DECIMAL(2,1) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS ml_confidence_score DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS auto_rejected BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS auto_approved BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS quality_check_required BOOLEAN DEFAULT FALSE;

-- 4. Enhance trend_validations table with confidence scoring
ALTER TABLE public.trend_validations
ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2) DEFAULT 0.75,
ADD COLUMN IF NOT EXISTS reasoning TEXT,
ADD COLUMN IF NOT EXISTS validation_time_seconds INTEGER,
ADD COLUMN IF NOT EXISTS is_quality_check BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS aligned_with_consensus BOOLEAN;

-- 5. Create validator expertise tracking table
CREATE TABLE IF NOT EXISTS public.validator_expertise (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  accuracy_rate DECIMAL(3,2) DEFAULT 0.50,
  validations_count INTEGER DEFAULT 0,
  correct_predictions INTEGER DEFAULT 0,
  expertise_level TEXT DEFAULT 'novice' CHECK (expertise_level IN ('novice', 'intermediate', 'expert', 'specialist')),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, category)
);

-- 6. Create rate limiting table
CREATE TABLE IF NOT EXISTS public.validation_rate_limits (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  validations_today INTEGER DEFAULT 0,
  validations_this_hour INTEGER DEFAULT 0,
  last_validation_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  daily_limit INTEGER DEFAULT 100,
  hourly_limit INTEGER DEFAULT 20,
  is_trusted_validator BOOLEAN DEFAULT FALSE
);

-- 7. Create quality control trends table
CREATE TABLE IF NOT EXISTS public.quality_control_trends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  original_trend_id UUID REFERENCES public.trend_submissions(id),
  known_outcome TEXT NOT NULL CHECK (known_outcome IN ('trending', 'not_trending')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- 8. Create performance metrics table
CREATE TABLE IF NOT EXISTS public.validator_performance_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_validations INTEGER DEFAULT 0,
  correct_validations INTEGER DEFAULT 0,
  earnings DECIMAL(10,2) DEFAULT 0.00,
  accuracy_rate DECIMAL(3,2),
  average_confidence DECIMAL(3,2),
  categories_validated JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, period_start, period_end)
);

-- 9. Function to calculate weighted consensus
CREATE OR REPLACE FUNCTION public.calculate_weighted_consensus(p_trend_id UUID)
RETURNS TABLE(
  weighted_score DECIMAL(3,2),
  total_weight DECIMAL(10,2),
  vote_count INTEGER,
  confidence_avg DECIMAL(3,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN SUM(p.vote_weight) > 0 THEN
        SUM(
          CASE 
            WHEN tv.vote = 'verify' THEN p.vote_weight * tv.confidence_score
            ELSE -p.vote_weight * tv.confidence_score
          END
        ) / SUM(p.vote_weight)
      ELSE 0
    END::DECIMAL(3,2) as weighted_score,
    COALESCE(SUM(p.vote_weight), 0)::DECIMAL(10,2) as total_weight,
    COUNT(*)::INTEGER as vote_count,
    AVG(tv.confidence_score)::DECIMAL(3,2) as confidence_avg
  FROM public.trend_validations tv
  JOIN public.profiles p ON tv.validator_id = p.id
  WHERE tv.trend_id = p_trend_id
  AND tv.is_quality_check = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Function to get dynamic consensus threshold
CREATE OR REPLACE FUNCTION public.get_consensus_threshold(
  p_category TEXT,
  p_engagement_level INTEGER DEFAULT 0
) RETURNS DECIMAL AS $$
BEGIN
  RETURN CASE
    -- Viral categories need lower threshold
    WHEN p_category IN ('meme', 'viral_challenge', 'dance') THEN 0.60
    -- High engagement content
    WHEN p_engagement_level > 10000 THEN 0.65
    -- Tech and news need higher accuracy
    WHEN p_category IN ('tech', 'news', 'politics') THEN 0.80
    -- Default threshold
    ELSE 0.70
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 11. Function to calculate validation payment
CREATE OR REPLACE FUNCTION public.calculate_validation_payment(
  p_user_accuracy DECIMAL,
  p_validation_difficulty DECIMAL,
  p_aligned_with_consensus BOOLEAN,
  p_confidence_score DECIMAL
) RETURNS DECIMAL AS $$
DECLARE
  base_rate CONSTANT DECIMAL := 0.05;
  accuracy_multiplier DECIMAL;
  difficulty_bonus DECIMAL;
  consensus_bonus DECIMAL;
  confidence_multiplier DECIMAL;
  total_payment DECIMAL;
BEGIN
  -- Calculate accuracy multiplier (0.5x to 2x)
  accuracy_multiplier := CASE
    WHEN p_user_accuracy >= 0.90 THEN 2.0
    WHEN p_user_accuracy >= 0.80 THEN 1.5
    WHEN p_user_accuracy >= 0.70 THEN 1.2
    WHEN p_user_accuracy >= 0.60 THEN 1.0
    ELSE 0.5
  END;
  
  -- Difficulty bonus (0 to 0.03)
  difficulty_bonus := p_validation_difficulty * 0.03;
  
  -- Consensus alignment bonus
  consensus_bonus := CASE WHEN p_aligned_with_consensus THEN 0.01 ELSE 0 END;
  
  -- Confidence multiplier (rewards decisive votes)
  confidence_multiplier := CASE
    WHEN p_confidence_score >= 0.9 OR p_confidence_score <= 0.1 THEN 1.1
    ELSE 1.0
  END;
  
  -- Calculate total payment
  total_payment := (base_rate * accuracy_multiplier + difficulty_bonus + consensus_bonus) * confidence_multiplier;
  
  -- Cap at reasonable maximum
  RETURN LEAST(total_payment, 0.25);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 12. Function to update user reputation after validation
CREATE OR REPLACE FUNCTION public.update_user_reputation()
RETURNS TRIGGER AS $$
DECLARE
  v_trend_outcome TEXT;
  v_user_was_correct BOOLEAN;
  v_current_reputation DECIMAL;
  v_reputation_change DECIMAL;
BEGIN
  -- Only process if trend has reached a decision
  SELECT stage INTO v_trend_outcome
  FROM public.trend_submissions
  WHERE id = NEW.trend_id;
  
  IF v_trend_outcome IN ('trending', 'viral') OR v_trend_outcome = 'archived' THEN
    -- Determine if user's vote was correct
    v_user_was_correct := 
      (NEW.vote = 'verify' AND v_trend_outcome IN ('trending', 'viral')) OR
      (NEW.vote = 'reject' AND v_trend_outcome = 'archived');
    
    -- Update aligned_with_consensus
    UPDATE public.trend_validations
    SET aligned_with_consensus = v_user_was_correct
    WHERE id = NEW.id;
    
    -- Get current reputation
    SELECT validation_reputation INTO v_current_reputation
    FROM public.profiles
    WHERE id = NEW.validator_id;
    
    -- Calculate reputation change (Elo-like system)
    v_reputation_change := CASE
      WHEN v_user_was_correct THEN 
        0.02 * (1 - v_current_reputation) -- Gain decreases as reputation increases
      ELSE 
        -0.03 * v_current_reputation -- Loss increases with reputation
    END;
    
    -- Update user profile
    UPDATE public.profiles
    SET 
      validation_reputation = GREATEST(0.1, LEAST(0.99, validation_reputation + v_reputation_change)),
      total_validations = total_validations + 1,
      correct_validations = correct_validations + CASE WHEN v_user_was_correct THEN 1 ELSE 0 END,
      validation_streak = CASE 
        WHEN v_user_was_correct THEN validation_streak + 1 
        ELSE 0 
      END,
      vote_weight = GREATEST(0.5, LEAST(3.0, 
        0.5 + (validation_reputation * 2) + (CASE WHEN total_validations > 100 THEN 0.5 ELSE 0 END)
      ))
    WHERE id = NEW.validator_id;
    
    -- Update expertise for this category
    INSERT INTO public.validator_expertise (user_id, category, validations_count, correct_predictions)
    VALUES (NEW.validator_id, 
      (SELECT category FROM public.trend_submissions WHERE id = NEW.trend_id), 
      1, 
      CASE WHEN v_user_was_correct THEN 1 ELSE 0 END
    )
    ON CONFLICT (user_id, category) DO UPDATE
    SET 
      validations_count = validator_expertise.validations_count + 1,
      correct_predictions = validator_expertise.correct_predictions + CASE WHEN v_user_was_correct THEN 1 ELSE 0 END,
      accuracy_rate = (validator_expertise.correct_predictions + CASE WHEN v_user_was_correct THEN 1 ELSE 0 END)::DECIMAL / 
                      (validator_expertise.validations_count + 1),
      expertise_level = CASE
        WHEN (validator_expertise.validations_count + 1) >= 100 AND 
             ((validator_expertise.correct_predictions + CASE WHEN v_user_was_correct THEN 1 ELSE 0 END)::DECIMAL / 
              (validator_expertise.validations_count + 1)) >= 0.85 THEN 'specialist'
        WHEN (validator_expertise.validations_count + 1) >= 50 AND 
             ((validator_expertise.correct_predictions + CASE WHEN v_user_was_correct THEN 1 ELSE 0 END)::DECIMAL / 
              (validator_expertise.validations_count + 1)) >= 0.75 THEN 'expert'
        WHEN (validator_expertise.validations_count + 1) >= 20 THEN 'intermediate'
        ELSE 'novice'
      END,
      last_updated = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 13. Function to check and update trend stage
CREATE OR REPLACE FUNCTION public.update_trend_stage()
RETURNS TRIGGER AS $$
DECLARE
  v_consensus RECORD;
  v_threshold DECIMAL;
  v_hours_since_submission INTEGER;
BEGIN
  -- Calculate weighted consensus
  SELECT * INTO v_consensus 
  FROM public.calculate_weighted_consensus(NEW.id);
  
  -- Update weighted consensus score
  UPDATE public.trend_submissions
  SET weighted_consensus_score = v_consensus.weighted_score
  WHERE id = NEW.id;
  
  -- Get dynamic threshold
  v_threshold := public.get_consensus_threshold(NEW.category, COALESCE(NEW.likes_count, 0));
  
  -- Calculate hours since submission
  v_hours_since_submission := EXTRACT(EPOCH FROM (NOW() - NEW.created_at)) / 3600;
  
  -- Update stage based on consensus and time
  UPDATE public.trend_submissions
  SET 
    stage = CASE
      -- Quality control check
      WHEN NEW.quality_check_required AND v_consensus.vote_count < 5 THEN 'validating'
      -- Early viral detection (high consensus quickly)
      WHEN v_consensus.weighted_score >= 0.85 AND v_consensus.vote_count >= 10 THEN 'viral'
      -- Normal trending threshold
      WHEN v_consensus.weighted_score >= v_threshold AND v_consensus.vote_count >= 15 THEN 'trending'
      -- Not trending (rejected)
      WHEN v_consensus.weighted_score <= -0.5 AND v_consensus.vote_count >= 10 THEN 'archived'
      -- Peak detection (was trending but losing momentum)
      WHEN NEW.stage = 'trending' AND v_hours_since_submission > 48 THEN 'peaked'
      -- Still validating
      ELSE 'validating'
    END,
    stage_changed_at = CASE 
      WHEN NEW.stage != 
        CASE
          WHEN NEW.quality_check_required AND v_consensus.vote_count < 5 THEN 'validating'
          WHEN v_consensus.weighted_score >= 0.85 AND v_consensus.vote_count >= 10 THEN 'viral'
          WHEN v_consensus.weighted_score >= v_threshold AND v_consensus.vote_count >= 15 THEN 'trending'
          WHEN v_consensus.weighted_score <= -0.5 AND v_consensus.vote_count >= 10 THEN 'archived'
          WHEN NEW.stage = 'trending' AND v_hours_since_submission > 48 THEN 'peaked'
          ELSE 'validating'
        END
      THEN NOW()
      ELSE NEW.stage_changed_at
    END,
    peak_validation_score = GREATEST(NEW.peak_validation_score, v_consensus.weighted_score)
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 14. Create triggers
DROP TRIGGER IF EXISTS update_trend_stage_trigger ON public.trend_submissions;
CREATE TRIGGER update_trend_stage_trigger
  AFTER UPDATE OF validation_count ON public.trend_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_trend_stage();

DROP TRIGGER IF EXISTS update_reputation_on_validation ON public.trend_validations;
CREATE TRIGGER update_reputation_on_validation
  AFTER INSERT OR UPDATE ON public.trend_validations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_reputation();

-- 15. Function for rate limiting check
CREATE OR REPLACE FUNCTION public.check_rate_limit(p_user_id UUID)
RETURNS TABLE(
  can_validate BOOLEAN,
  validations_remaining_today INTEGER,
  validations_remaining_hour INTEGER,
  reset_time TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  v_limits RECORD;
  v_current_hour TIMESTAMP WITH TIME ZONE;
BEGIN
  v_current_hour := date_trunc('hour', NOW());
  
  -- Get or create rate limit record
  INSERT INTO public.validation_rate_limits (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Get current limits
  SELECT * INTO v_limits
  FROM public.validation_rate_limits
  WHERE user_id = p_user_id;
  
  -- Reset counters if needed
  IF v_limits.last_validation_at < CURRENT_DATE THEN
    UPDATE public.validation_rate_limits
    SET validations_today = 0, validations_this_hour = 0
    WHERE user_id = p_user_id;
    v_limits.validations_today := 0;
    v_limits.validations_this_hour := 0;
  ELSIF v_limits.last_validation_at < v_current_hour THEN
    UPDATE public.validation_rate_limits
    SET validations_this_hour = 0
    WHERE user_id = p_user_id;
    v_limits.validations_this_hour := 0;
  END IF;
  
  RETURN QUERY SELECT
    (v_limits.validations_today < v_limits.daily_limit AND 
     v_limits.validations_this_hour < v_limits.hourly_limit) as can_validate,
    (v_limits.daily_limit - v_limits.validations_today) as validations_remaining_today,
    (v_limits.hourly_limit - v_limits.validations_this_hour) as validations_remaining_hour,
    CASE 
      WHEN v_limits.validations_today >= v_limits.daily_limit THEN CURRENT_DATE + INTERVAL '1 day'
      ELSE v_current_hour + INTERVAL '1 hour'
    END as reset_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 16. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trend_submissions_stage ON public.trend_submissions(stage);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_weighted_consensus ON public.trend_submissions(weighted_consensus_score);
CREATE INDEX IF NOT EXISTS idx_trend_validations_confidence ON public.trend_validations(confidence_score);
CREATE INDEX IF NOT EXISTS idx_validator_expertise_user_category ON public.validator_expertise(user_id, category);
CREATE INDEX IF NOT EXISTS idx_validation_rate_limits_user ON public.validation_rate_limits(user_id);

-- 17. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.validator_expertise TO authenticated;
GRANT SELECT ON public.quality_control_trends TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.validation_rate_limits TO authenticated;
GRANT SELECT, INSERT ON public.validator_performance_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_weighted_consensus(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_consensus_threshold(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_validation_payment(DECIMAL, DECIMAL, BOOLEAN, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(UUID) TO authenticated;

-- 18. Initialize existing users with default reputation
UPDATE public.profiles
SET 
  validation_reputation = CASE 
    WHEN accuracy_score > 0 THEN LEAST(accuracy_score, 0.99)
    ELSE 0.50
  END,
  vote_weight = 1.0
WHERE validation_reputation IS NULL;