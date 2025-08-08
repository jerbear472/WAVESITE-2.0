-- Create validation_rate_limits table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.validation_rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_limit INTEGER DEFAULT 100,
  hourly_limit INTEGER DEFAULT 20,
  validations_today INTEGER DEFAULT 0,
  validations_this_hour INTEGER DEFAULT 0,
  last_validation_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.validation_rate_limits ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own rate limits" 
  ON public.validation_rate_limits 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage all rate limits" 
  ON public.validation_rate_limits 
  FOR ALL 
  USING (true);

-- Drop existing function if exists
DROP FUNCTION IF EXISTS public.check_rate_limit(UUID);

-- Create improved check_rate_limit function
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
  v_current_date DATE;
  v_last_validation_date DATE;
  v_last_validation_hour TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Handle null user_id
  IF p_user_id IS NULL THEN
    RETURN QUERY SELECT 
      false::BOOLEAN as can_validate,
      0::INTEGER as validations_remaining_today,
      0::INTEGER as validations_remaining_hour,
      NOW()::TIMESTAMP WITH TIME ZONE as reset_time;
    RETURN;
  END IF;

  v_current_hour := date_trunc('hour', NOW());
  v_current_date := CURRENT_DATE;
  
  -- Get or create rate limit record
  INSERT INTO public.validation_rate_limits (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Get current limits
  SELECT * INTO v_limits
  FROM public.validation_rate_limits
  WHERE user_id = p_user_id;
  
  -- Handle case where no record exists (shouldn't happen after insert above)
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      true::BOOLEAN as can_validate,
      100::INTEGER as validations_remaining_today,
      20::INTEGER as validations_remaining_hour,
      (NOW() + INTERVAL '1 hour')::TIMESTAMP WITH TIME ZONE as reset_time;
    RETURN;
  END IF;
  
  -- Extract date and hour from last validation
  IF v_limits.last_validation_at IS NOT NULL THEN
    v_last_validation_date := v_limits.last_validation_at::DATE;
    v_last_validation_hour := date_trunc('hour', v_limits.last_validation_at);
  ELSE
    v_last_validation_date := v_current_date - INTERVAL '1 day';
    v_last_validation_hour := v_current_hour - INTERVAL '1 hour';
  END IF;
  
  -- Reset daily counter if it's a new day
  IF v_last_validation_date < v_current_date THEN
    UPDATE public.validation_rate_limits
    SET validations_today = 0
    WHERE user_id = p_user_id;
    v_limits.validations_today := 0;
  END IF;
  
  -- Reset hourly counter if it's a new hour
  IF v_last_validation_hour < v_current_hour THEN
    UPDATE public.validation_rate_limits
    SET validations_this_hour = 0
    WHERE user_id = p_user_id;
    v_limits.validations_this_hour := 0;
  END IF;
  
  -- Return the results
  RETURN QUERY SELECT
    (v_limits.validations_today < v_limits.daily_limit AND 
     v_limits.validations_this_hour < v_limits.hourly_limit) as can_validate,
    GREATEST(0, v_limits.daily_limit - v_limits.validations_today) as validations_remaining_today,
    GREATEST(0, v_limits.hourly_limit - v_limits.validations_this_hour) as validations_remaining_hour,
    CASE 
      WHEN v_limits.validations_today >= v_limits.daily_limit THEN (v_current_date + INTERVAL '1 day')::TIMESTAMP WITH TIME ZONE
      WHEN v_limits.validations_this_hour >= v_limits.hourly_limit THEN (v_current_hour + INTERVAL '1 hour')::TIMESTAMP WITH TIME ZONE
      ELSE NOW() + INTERVAL '1 hour'
    END as reset_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.check_rate_limit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(UUID) TO anon;

-- Add helpful comment
COMMENT ON FUNCTION public.check_rate_limit(UUID) IS 'Checks validation rate limits and returns remaining validations';

-- Create increment function
CREATE OR REPLACE FUNCTION public.increment_validation_count(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_current_hour TIMESTAMP WITH TIME ZONE;
  v_current_date DATE;
  v_last_validation RECORD;
BEGIN
  -- Handle null user_id
  IF p_user_id IS NULL THEN
    RETURN;
  END IF;

  v_current_hour := date_trunc('hour', NOW());
  v_current_date := CURRENT_DATE;
  
  -- Get current record
  SELECT * INTO v_last_validation
  FROM public.validation_rate_limits
  WHERE user_id = p_user_id;
  
  IF FOUND THEN
    -- Check if we need to reset counters before incrementing
    IF v_last_validation.last_validation_at::DATE < v_current_date THEN
      -- New day, reset both counters
      UPDATE public.validation_rate_limits
      SET 
        validations_today = 1,
        validations_this_hour = 1,
        last_validation_at = NOW()
      WHERE user_id = p_user_id;
    ELSIF date_trunc('hour', v_last_validation.last_validation_at) < v_current_hour THEN
      -- New hour, reset hourly counter only
      UPDATE public.validation_rate_limits
      SET 
        validations_today = validations_today + 1,
        validations_this_hour = 1,
        last_validation_at = NOW()
      WHERE user_id = p_user_id;
    ELSE
      -- Same hour, increment both
      UPDATE public.validation_rate_limits
      SET 
        validations_today = validations_today + 1,
        validations_this_hour = validations_this_hour + 1,
        last_validation_at = NOW()
      WHERE user_id = p_user_id;
    END IF;
  ELSE
    -- Insert new record
    INSERT INTO public.validation_rate_limits (
      user_id, 
      validations_today, 
      validations_this_hour, 
      last_validation_at
    )
    VALUES (p_user_id, 1, 1, NOW());
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.increment_validation_count(UUID) TO authenticated;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_validation_rate_limits_user_id ON public.validation_rate_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_validation_rate_limits_last_validation ON public.validation_rate_limits(last_validation_at);

-- Grant table permissions
GRANT SELECT ON public.validation_rate_limits TO authenticated;
GRANT INSERT, UPDATE ON public.validation_rate_limits TO service_role;