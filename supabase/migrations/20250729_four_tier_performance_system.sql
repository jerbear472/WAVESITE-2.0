-- Four-Tier Performance Management System Migration
-- Implements Premium, Standard, Probation, and Suspended tiers with automated management

-- 1. Create user tier enum
DO $$ BEGIN
  CREATE TYPE user_performance_tier AS ENUM (
    'premium',     -- 1.5x payments, high performers
    'standard',    -- 1.0x payments, normal users  
    'probation',   -- 0.5x payments, warning status
    'suspended'    -- No payments, verification only
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Enhance profiles table with performance tracking
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS performance_tier user_performance_tier DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS tier_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS tier_change_reason TEXT,
ADD COLUMN IF NOT EXISTS verification_accuracy_30d DECIMAL(3,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS trend_approval_rate_30d DECIMAL(3,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS composite_reputation_score DECIMAL(3,2) DEFAULT 0.50,
ADD COLUMN IF NOT EXISTS consecutive_good_votes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS consecutive_poor_votes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS suspension_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS suspension_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_permanently_banned BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_performance_review TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. Create performance history table
CREATE TABLE IF NOT EXISTS public.user_performance_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  period_date DATE NOT NULL,
  total_verifications INTEGER DEFAULT 0,
  correct_verifications INTEGER DEFAULT 0,
  verification_accuracy DECIMAL(3,2),
  trends_submitted INTEGER DEFAULT 0,
  trends_approved INTEGER DEFAULT 0,
  trend_approval_rate DECIMAL(3,2),
  composite_score DECIMAL(3,2),
  tier user_performance_tier,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, period_date)
);

-- 4. Create tier change log
CREATE TABLE IF NOT EXISTS public.tier_change_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  old_tier user_performance_tier,
  new_tier user_performance_tier,
  change_reason TEXT,
  metrics JSONB,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create suspension history
CREATE TABLE IF NOT EXISTS public.suspension_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  suspension_type TEXT CHECK (suspension_type IN ('temporary', 'permanent')),
  suspension_reason TEXT,
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE,
  lifted_early BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Function to calculate 30-day performance metrics
CREATE OR REPLACE FUNCTION public.calculate_user_performance_metrics(p_user_id UUID)
RETURNS TABLE(
  verification_accuracy_30d DECIMAL(3,2),
  trend_approval_rate_30d DECIMAL(3,2),
  composite_score DECIMAL(3,2),
  total_verifications_30d INTEGER,
  total_trends_30d INTEGER
) AS $$
DECLARE
  v_verification_accuracy DECIMAL(3,2);
  v_trend_approval_rate DECIMAL(3,2);
  v_composite_score DECIMAL(3,2);
  v_total_verifications INTEGER;
  v_total_trends INTEGER;
BEGIN
  -- Calculate verification accuracy (last 30 days)
  SELECT 
    COUNT(*) FILTER (WHERE aligned_with_consensus = true),
    COUNT(*)
  INTO v_total_verifications, v_total_verifications
  FROM public.trend_validations
  WHERE validator_id = p_user_id
  AND created_at >= NOW() - INTERVAL '30 days';
  
  v_verification_accuracy := CASE 
    WHEN v_total_verifications > 0 
    THEN (v_total_verifications::DECIMAL / v_total_verifications::DECIMAL)
    ELSE 0.5 -- Default for new users
  END;
  
  -- Calculate trend approval rate (last 30 days)
  SELECT 
    COUNT(*) FILTER (WHERE stage IN ('trending', 'viral')),
    COUNT(*)
  INTO v_total_trends, v_total_trends
  FROM public.trend_submissions
  WHERE spotter_id = p_user_id
  AND created_at >= NOW() - INTERVAL '30 days';
  
  v_trend_approval_rate := CASE 
    WHEN v_total_trends > 0 
    THEN (v_total_trends::DECIMAL / v_total_trends::DECIMAL)
    ELSE 0.5 -- Default for new users
  END;
  
  -- Calculate composite score (60% verification, 40% trends)
  v_composite_score := (v_verification_accuracy * 0.6) + (v_trend_approval_rate * 0.4);
  
  RETURN QUERY SELECT 
    v_verification_accuracy,
    v_trend_approval_rate,
    v_composite_score,
    v_total_verifications,
    v_total_trends;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Function to determine user tier based on performance
CREATE OR REPLACE FUNCTION public.determine_user_tier(
  p_composite_score DECIMAL,
  p_total_activities INTEGER,
  p_suspension_count INTEGER
) RETURNS user_performance_tier AS $$
BEGIN
  -- Check minimum activity threshold
  IF p_total_activities < 10 THEN
    RETURN 'standard'; -- New users start standard
  END IF;
  
  -- Suspension logic
  IF p_suspension_count >= 3 THEN
    RETURN 'suspended'; -- Three strikes = permanent suspension
  END IF;
  
  -- Performance-based tiers
  IF p_composite_score >= 0.85 AND p_total_activities >= 50 THEN
    RETURN 'premium';
  ELSIF p_composite_score >= 0.65 THEN
    RETURN 'standard';
  ELSIF p_composite_score >= 0.45 THEN
    RETURN 'probation';
  ELSE
    RETURN 'suspended';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 8. Function to update user performance tier
CREATE OR REPLACE FUNCTION public.update_user_performance_tier(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_metrics RECORD;
  v_current_tier user_performance_tier;
  v_new_tier user_performance_tier;
  v_user RECORD;
BEGIN
  -- Get current user info
  SELECT * INTO v_user FROM public.profiles WHERE id = p_user_id;
  
  -- Calculate performance metrics
  SELECT * INTO v_metrics 
  FROM public.calculate_user_performance_metrics(p_user_id);
  
  -- Determine new tier
  v_new_tier := public.determine_user_tier(
    v_metrics.composite_score,
    v_metrics.total_verifications_30d + v_metrics.total_trends_30d,
    v_user.suspension_count
  );
  
  -- Update user profile
  UPDATE public.profiles
  SET 
    verification_accuracy_30d = v_metrics.verification_accuracy_30d,
    trend_approval_rate_30d = v_metrics.trend_approval_rate_30d,
    composite_reputation_score = v_metrics.composite_score,
    last_performance_review = NOW()
  WHERE id = p_user_id;
  
  -- If tier changed, update and log
  IF v_user.performance_tier != v_new_tier THEN
    -- Determine change reason
    DECLARE v_reason TEXT;
    BEGIN
      IF v_new_tier = 'premium' THEN
        v_reason := 'Promoted to premium for excellent performance';
      ELSIF v_new_tier = 'standard' AND v_user.performance_tier = 'premium' THEN
        v_reason := 'Demoted from premium due to decreased performance';
      ELSIF v_new_tier = 'standard' AND v_user.performance_tier = 'probation' THEN
        v_reason := 'Improved from probation to standard';
      ELSIF v_new_tier = 'probation' THEN
        v_reason := 'Placed on probation due to poor performance';
      ELSIF v_new_tier = 'suspended' THEN
        v_reason := 'Suspended due to consistently poor performance';
      END IF;
      
      -- Update profile
      UPDATE public.profiles
      SET 
        performance_tier = v_new_tier,
        tier_changed_at = NOW(),
        tier_change_reason = v_reason
      WHERE id = p_user_id;
      
      -- Log the change
      INSERT INTO public.tier_change_log (
        user_id, old_tier, new_tier, change_reason, metrics
      ) VALUES (
        p_user_id, v_user.performance_tier, v_new_tier, v_reason,
        jsonb_build_object(
          'verification_accuracy', v_metrics.verification_accuracy_30d,
          'trend_approval_rate', v_metrics.trend_approval_rate_30d,
          'composite_score', v_metrics.composite_score,
          'total_activities', v_metrics.total_verifications_30d + v_metrics.total_trends_30d
        )
      );
      
      -- Handle suspension
      IF v_new_tier = 'suspended' AND v_user.performance_tier != 'suspended' THEN
        UPDATE public.profiles
        SET 
          suspension_count = suspension_count + 1,
          suspension_end_date = NOW() + INTERVAL '30 days'
        WHERE id = p_user_id;
        
        INSERT INTO public.suspension_history (
          user_id, suspension_type, suspension_reason, end_date
        ) VALUES (
          p_user_id, 'temporary', v_reason, NOW() + INTERVAL '30 days'
        );
      END IF;
    END;
  END IF;
  
  -- Store daily performance record
  INSERT INTO public.user_performance_history (
    user_id, period_date, total_verifications, correct_verifications,
    verification_accuracy, trends_submitted, trends_approved,
    trend_approval_rate, composite_score, tier
  ) VALUES (
    p_user_id, CURRENT_DATE, v_metrics.total_verifications_30d,
    ROUND(v_metrics.total_verifications_30d * v_metrics.verification_accuracy_30d),
    v_metrics.verification_accuracy_30d, v_metrics.total_trends_30d,
    ROUND(v_metrics.total_trends_30d * v_metrics.trend_approval_rate_30d),
    v_metrics.trend_approval_rate_30d, v_metrics.composite_score, v_new_tier
  )
  ON CONFLICT (user_id, period_date) DO UPDATE
  SET 
    total_verifications = EXCLUDED.total_verifications,
    correct_verifications = EXCLUDED.correct_verifications,
    verification_accuracy = EXCLUDED.verification_accuracy,
    trends_submitted = EXCLUDED.trends_submitted,
    trends_approved = EXCLUDED.trends_approved,
    trend_approval_rate = EXCLUDED.trend_approval_rate,
    composite_score = EXCLUDED.composite_score,
    tier = EXCLUDED.tier;
END;
$$ LANGUAGE plpgsql;

-- 9. Enhanced payment calculation with tier multipliers and streak bonuses
CREATE OR REPLACE FUNCTION public.calculate_tiered_validation_payment(
  p_user_id UUID,
  p_base_amount DECIMAL,
  p_difficulty_bonus DECIMAL DEFAULT 0,
  p_consensus_bonus DECIMAL DEFAULT 0
) RETURNS DECIMAL AS $$
DECLARE
  v_user RECORD;
  v_tier_multiplier DECIMAL;
  v_streak_bonus DECIMAL;
  v_total_payment DECIMAL;
BEGIN
  -- Get user info
  SELECT performance_tier, consecutive_good_votes
  INTO v_user
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- Tier multipliers
  v_tier_multiplier := CASE v_user.performance_tier
    WHEN 'premium' THEN 1.5
    WHEN 'standard' THEN 1.0
    WHEN 'probation' THEN 0.5
    WHEN 'suspended' THEN 0.0
    ELSE 1.0
  END;
  
  -- Streak bonus (up to 20% for 20+ consecutive good votes)
  v_streak_bonus := LEAST(v_user.consecutive_good_votes * 0.01, 0.20);
  
  -- Calculate total payment
  v_total_payment := (p_base_amount + p_difficulty_bonus + p_consensus_bonus) 
                     * v_tier_multiplier 
                     * (1 + v_streak_bonus);
  
  -- Cap at reasonable maximum
  RETURN LEAST(v_total_payment, 0.50);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Function to update consecutive vote streaks
CREATE OR REPLACE FUNCTION public.update_vote_streaks()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.aligned_with_consensus = true THEN
    -- Good vote - increment good streak, reset poor streak
    UPDATE public.profiles
    SET 
      consecutive_good_votes = consecutive_good_votes + 1,
      consecutive_poor_votes = 0
    WHERE id = NEW.validator_id;
  ELSE
    -- Poor vote - increment poor streak, reset good streak
    UPDATE public.profiles
    SET 
      consecutive_good_votes = 0,
      consecutive_poor_votes = consecutive_poor_votes + 1
    WHERE id = NEW.validator_id;
    
    -- Check if user needs immediate review (5 consecutive poor votes)
    UPDATE public.profiles
    SET last_performance_review = NOW() - INTERVAL '25 hours'
    WHERE id = NEW.validator_id
    AND consecutive_poor_votes >= 5;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. Daily performance review function
CREATE OR REPLACE FUNCTION public.review_all_user_performance()
RETURNS TABLE(users_reviewed INTEGER, tier_changes INTEGER) AS $$
DECLARE
  v_users_reviewed INTEGER := 0;
  v_tier_changes INTEGER := 0;
  v_user RECORD;
  v_old_tier user_performance_tier;
BEGIN
  -- Review users who haven't been reviewed in 24 hours
  FOR v_user IN 
    SELECT id, performance_tier 
    FROM public.profiles
    WHERE is_permanently_banned = false
    AND (last_performance_review < NOW() - INTERVAL '24 hours' OR last_performance_review IS NULL)
  LOOP
    v_old_tier := v_user.performance_tier;
    
    -- Update performance tier
    PERFORM public.update_user_performance_tier(v_user.id);
    
    v_users_reviewed := v_users_reviewed + 1;
    
    -- Check if tier changed
    SELECT performance_tier INTO v_user 
    FROM public.profiles 
    WHERE id = v_user.id;
    
    IF v_old_tier != v_user.performance_tier THEN
      v_tier_changes := v_tier_changes + 1;
    END IF;
  END LOOP;
  
  -- Check for users to permanently ban (suspended 3+ times)
  UPDATE public.profiles
  SET is_permanently_banned = true
  WHERE suspension_count >= 3
  AND is_permanently_banned = false;
  
  RETURN QUERY SELECT v_users_reviewed, v_tier_changes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Function to get trends prioritized by user tier
CREATE OR REPLACE FUNCTION public.get_trends_for_validation(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20
) RETURNS TABLE(
  trend_id UUID,
  priority_score DECIMAL
) AS $$
DECLARE
  v_user_tier user_performance_tier;
BEGIN
  -- Get user tier
  SELECT performance_tier INTO v_user_tier
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- Premium users get priority access to high-difficulty trends
  RETURN QUERY
  SELECT 
    ts.id,
    CASE 
      WHEN v_user_tier = 'premium' THEN ts.validation_difficulty * 2
      WHEN v_user_tier = 'standard' THEN ts.validation_difficulty
      ELSE 0.5 -- Probation/suspended get easier trends
    END as priority_score
  FROM public.trend_submissions ts
  WHERE ts.stage IN ('submitted', 'validating')
  AND ts.spotter_id != p_user_id
  AND NOT EXISTS (
    SELECT 1 FROM public.trend_validations tv
    WHERE tv.trend_id = ts.id AND tv.validator_id = p_user_id
  )
  ORDER BY priority_score DESC, ts.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Create triggers
DROP TRIGGER IF EXISTS update_vote_streaks_trigger ON public.trend_validations;
CREATE TRIGGER update_vote_streaks_trigger
  AFTER UPDATE OF aligned_with_consensus ON public.trend_validations
  FOR EACH ROW
  WHEN (NEW.aligned_with_consensus IS NOT NULL)
  EXECUTE FUNCTION public.update_vote_streaks();

-- 14. Create scheduled job for daily performance reviews (requires pg_cron extension)
-- Note: This is a placeholder - actual scheduling depends on your setup
-- SELECT cron.schedule('daily-performance-review', '0 2 * * *', 'SELECT public.review_all_user_performance();');

-- 15. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_performance_tier ON public.profiles(performance_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_last_review ON public.profiles(last_performance_review);
CREATE INDEX IF NOT EXISTS idx_performance_history_user_date ON public.user_performance_history(user_id, period_date DESC);
CREATE INDEX IF NOT EXISTS idx_tier_change_log_user ON public.tier_change_log(user_id, changed_at DESC);

-- 16. Grant permissions
GRANT SELECT ON public.user_performance_history TO authenticated;
GRANT SELECT ON public.tier_change_log TO authenticated;
GRANT SELECT ON public.suspension_history TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_user_performance_metrics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_tiered_validation_payment(UUID, DECIMAL, DECIMAL, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_trends_for_validation(UUID, INTEGER) TO authenticated;

-- 17. Initialize existing users with performance metrics
UPDATE public.profiles
SET performance_tier = 'standard'
WHERE performance_tier IS NULL;

-- 18. Add RLS policies for new tables
ALTER TABLE public.user_performance_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tier_change_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suspension_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own performance history
CREATE POLICY "Users can view own performance history"
  ON public.user_performance_history
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own tier changes"
  ON public.tier_change_log
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own suspension history"
  ON public.suspension_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- 19. Add quality control restrictions
ALTER TABLE public.trend_submissions
ADD COLUMN IF NOT EXISTS submitter_tier user_performance_tier;

-- Update existing trends with submitter tier
UPDATE public.trend_submissions ts
SET submitter_tier = p.performance_tier
FROM public.profiles p
WHERE ts.spotter_id = p.id;

-- Create function to check if user can submit trends
CREATE OR REPLACE FUNCTION public.can_user_submit_trends(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user RECORD;
BEGIN
  SELECT performance_tier, is_permanently_banned
  INTO v_user
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- Suspended and banned users cannot submit trends
  RETURN v_user.performance_tier != 'suspended' 
    AND v_user.is_permanently_banned = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 20. Summary view for user dashboard
CREATE OR REPLACE VIEW public.user_performance_summary AS
SELECT 
  p.id,
  p.username,
  p.performance_tier,
  p.verification_accuracy_30d,
  p.trend_approval_rate_30d,
  p.composite_reputation_score,
  p.consecutive_good_votes,
  p.tier_changed_at,
  p.tier_change_reason,
  CASE p.performance_tier
    WHEN 'premium' THEN '⭐ Premium Validator'
    WHEN 'standard' THEN '✓ Standard Validator'
    WHEN 'probation' THEN '⚠️ On Probation'
    WHEN 'suspended' THEN '🚫 Suspended'
  END as tier_display,
  CASE p.performance_tier
    WHEN 'premium' THEN 1.5
    WHEN 'standard' THEN 1.0
    WHEN 'probation' THEN 0.5
    WHEN 'suspended' THEN 0.0
  END as payment_multiplier,
  LEAST(p.consecutive_good_votes * 0.01, 0.20) as streak_bonus
FROM public.profiles p
WHERE p.is_permanently_banned = false;

GRANT SELECT ON public.user_performance_summary TO authenticated;