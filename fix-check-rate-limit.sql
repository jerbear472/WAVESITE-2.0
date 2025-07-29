-- Drop the existing function first
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

-- Add helpful comment
COMMENT ON FUNCTION public.check_rate_limit(UUID) IS 'Checks validation rate limits and returns remaining validations';

-- Also ensure the increment function properly handles the reset logic
CREATE OR REPLACE FUNCTION public.increment_validation_count(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_current_hour TIMESTAMP WITH TIME ZONE;
  v_current_date DATE;
  v_last_validation RECORD;
BEGIN
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