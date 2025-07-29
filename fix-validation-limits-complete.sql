-- Complete fix for validation limits (hourly and daily)
-- This script fixes the rate limiting functions to properly handle hourly and daily resets

-- First, let's drop the existing functions to ensure clean replacement
DROP FUNCTION IF EXISTS public.check_rate_limit(UUID);
DROP FUNCTION IF EXISTS public.increment_validation_count(UUID);

-- Create improved check_rate_limit function with better reset logic
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
  v_hour_start TIMESTAMP WITH TIME ZONE;
  v_day_start TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get precise time boundaries
  v_current_hour := date_trunc('hour', NOW());
  v_current_date := CURRENT_DATE;
  v_hour_start := v_current_hour;
  v_day_start := v_current_date::TIMESTAMP WITH TIME ZONE;
  
  -- Ensure user has a rate limit record
  INSERT INTO public.validation_rate_limits (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Get current limits
  SELECT * INTO v_limits
  FROM public.validation_rate_limits
  WHERE user_id = p_user_id
  FOR UPDATE; -- Lock the row to prevent race conditions
  
  -- Extract date and hour from last validation
  IF v_limits.last_validation_at IS NOT NULL THEN
    v_last_validation_date := v_limits.last_validation_at::DATE;
    v_last_validation_hour := date_trunc('hour', v_limits.last_validation_at);
  ELSE
    -- If no previous validation, set to past values
    v_last_validation_date := v_current_date - INTERVAL '1 day';
    v_last_validation_hour := v_current_hour - INTERVAL '1 hour';
  END IF;
  
  -- Reset daily counter if it's a new day
  IF v_last_validation_date < v_current_date THEN
    UPDATE public.validation_rate_limits
    SET 
      validations_today = 0,
      validations_this_hour = 0 -- Also reset hourly when day changes
    WHERE user_id = p_user_id;
    v_limits.validations_today := 0;
    v_limits.validations_this_hour := 0;
  -- Reset hourly counter if it's a new hour (but same day)
  ELSIF v_last_validation_hour < v_current_hour THEN
    UPDATE public.validation_rate_limits
    SET validations_this_hour = 0
    WHERE user_id = p_user_id;
    v_limits.validations_this_hour := 0;
  END IF;
  
  -- Calculate reset time
  -- If daily limit reached, reset is next day
  -- If hourly limit reached, reset is next hour
  -- Otherwise, show when the next reset would be
  RETURN QUERY SELECT
    (v_limits.validations_today < v_limits.daily_limit AND 
     v_limits.validations_this_hour < v_limits.hourly_limit) as can_validate,
    GREATEST(0, v_limits.daily_limit - v_limits.validations_today) as validations_remaining_today,
    GREATEST(0, v_limits.hourly_limit - v_limits.validations_this_hour) as validations_remaining_hour,
    CASE 
      WHEN v_limits.validations_today >= v_limits.daily_limit THEN 
        (v_current_date + INTERVAL '1 day')::TIMESTAMP WITH TIME ZONE
      WHEN v_limits.validations_this_hour >= v_limits.hourly_limit THEN 
        (v_current_hour + INTERVAL '1 hour')::TIMESTAMP WITH TIME ZONE
      ELSE 
        -- Show next hourly reset if under both limits
        (v_current_hour + INTERVAL '1 hour')::TIMESTAMP WITH TIME ZONE
    END as reset_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create improved increment function with proper reset handling
CREATE OR REPLACE FUNCTION public.increment_validation_count(p_user_id UUID)
RETURNS TABLE(
  success BOOLEAN,
  validations_today INTEGER,
  validations_this_hour INTEGER,
  message TEXT
) AS $$
DECLARE
  v_current_hour TIMESTAMP WITH TIME ZONE;
  v_current_date DATE;
  v_record RECORD;
  v_last_validation_date DATE;
  v_last_validation_hour TIMESTAMP WITH TIME ZONE;
BEGIN
  v_current_hour := date_trunc('hour', NOW());
  v_current_date := CURRENT_DATE;
  
  -- Get current record with lock
  SELECT * INTO v_record
  FROM public.validation_rate_limits
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    -- Insert new record if doesn't exist
    INSERT INTO public.validation_rate_limits (
      user_id, 
      validations_today, 
      validations_this_hour, 
      last_validation_at
    )
    VALUES (p_user_id, 1, 1, NOW())
    RETURNING * INTO v_record;
    
    RETURN QUERY SELECT 
      true as success,
      v_record.validations_today,
      v_record.validations_this_hour,
      'First validation recorded'::TEXT as message;
  ELSE
    -- Extract date and hour from last validation
    IF v_record.last_validation_at IS NOT NULL THEN
      v_last_validation_date := v_record.last_validation_at::DATE;
      v_last_validation_hour := date_trunc('hour', v_record.last_validation_at);
    ELSE
      v_last_validation_date := v_current_date - INTERVAL '1 day';
      v_last_validation_hour := v_current_hour - INTERVAL '1 hour';
    END IF;
    
    -- Check if we need to reset counters before incrementing
    IF v_last_validation_date < v_current_date THEN
      -- New day, reset both counters
      UPDATE public.validation_rate_limits
      SET 
        validations_today = 1,
        validations_this_hour = 1,
        last_validation_at = NOW()
      WHERE user_id = p_user_id
      RETURNING * INTO v_record;
      
      RETURN QUERY SELECT 
        true as success,
        v_record.validations_today,
        v_record.validations_this_hour,
        'New day - counters reset'::TEXT as message;
        
    ELSIF v_last_validation_hour < v_current_hour THEN
      -- New hour (but same day), reset hourly counter only
      UPDATE public.validation_rate_limits
      SET 
        validations_today = validations_today + 1,
        validations_this_hour = 1,
        last_validation_at = NOW()
      WHERE user_id = p_user_id
      RETURNING * INTO v_record;
      
      RETURN QUERY SELECT 
        true as success,
        v_record.validations_today,
        v_record.validations_this_hour,
        'New hour - hourly counter reset'::TEXT as message;
        
    ELSE
      -- Same hour and day, increment both
      UPDATE public.validation_rate_limits
      SET 
        validations_today = validations_today + 1,
        validations_this_hour = validations_this_hour + 1,
        last_validation_at = NOW()
      WHERE user_id = p_user_id
      RETURNING * INTO v_record;
      
      RETURN QUERY SELECT 
        true as success,
        v_record.validations_today,
        v_record.validations_this_hour,
        'Validation counted'::TEXT as message;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.check_rate_limit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_validation_count(UUID) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION public.check_rate_limit(UUID) IS 'Checks validation rate limits with proper hourly/daily reset logic';
COMMENT ON FUNCTION public.increment_validation_count(UUID) IS 'Increments validation count with automatic hourly/daily reset';

-- Optional: Update default limits if needed (you can adjust these values)
-- UPDATE public.validation_rate_limits SET hourly_limit = 30, daily_limit = 150 WHERE hourly_limit = 20;

-- Create a function to manually adjust user limits (for admins)
CREATE OR REPLACE FUNCTION public.set_user_validation_limits(
  p_user_id UUID,
  p_hourly_limit INTEGER DEFAULT NULL,
  p_daily_limit INTEGER DEFAULT NULL
)
RETURNS TABLE(
  user_id UUID,
  hourly_limit INTEGER,
  daily_limit INTEGER,
  is_trusted_validator BOOLEAN
) AS $$
BEGIN
  -- Ensure user has a rate limit record
  INSERT INTO public.validation_rate_limits (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Update limits if provided
  IF p_hourly_limit IS NOT NULL THEN
    UPDATE public.validation_rate_limits
    SET hourly_limit = p_hourly_limit
    WHERE user_id = p_user_id;
  END IF;
  
  IF p_daily_limit IS NOT NULL THEN
    UPDATE public.validation_rate_limits
    SET daily_limit = p_daily_limit
    WHERE user_id = p_user_id;
  END IF;
  
  -- Return updated record
  RETURN QUERY
  SELECT 
    vrl.user_id,
    vrl.hourly_limit,
    vrl.daily_limit,
    vrl.is_trusted_validator
  FROM public.validation_rate_limits vrl
  WHERE vrl.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (restrict in app logic to admins)
GRANT EXECUTE ON FUNCTION public.set_user_validation_limits(UUID, INTEGER, INTEGER) TO authenticated;

-- Create a view for easier monitoring of rate limits
CREATE OR REPLACE VIEW public.validation_rate_limits_status AS
SELECT 
  vrl.user_id,
  p.username,
  p.email,
  vrl.validations_today,
  vrl.validations_this_hour,
  vrl.hourly_limit,
  vrl.daily_limit,
  vrl.last_validation_at,
  CASE 
    WHEN vrl.validations_today >= vrl.daily_limit THEN 'Daily limit reached'
    WHEN vrl.validations_this_hour >= vrl.hourly_limit THEN 'Hourly limit reached'
    ELSE 'Can validate'
  END as status,
  CASE 
    WHEN vrl.last_validation_at::DATE < CURRENT_DATE THEN 'Pending daily reset'
    WHEN date_trunc('hour', vrl.last_validation_at) < date_trunc('hour', NOW()) THEN 'Pending hourly reset'
    ELSE 'Active'
  END as reset_status
FROM public.validation_rate_limits vrl
JOIN public.profiles p ON p.id = vrl.user_id;

-- Grant select permission on the view
GRANT SELECT ON public.validation_rate_limits_status TO authenticated;

-- Test function to verify the system works correctly
CREATE OR REPLACE FUNCTION public.test_validation_limits(p_user_id UUID)
RETURNS TABLE(
  step TEXT,
  data JSONB
) AS $$
BEGIN
  -- Step 1: Check initial state
  RETURN QUERY
  SELECT 
    'initial_check'::TEXT as step,
    row_to_json(t.*)::JSONB as data
  FROM check_rate_limit(p_user_id) t;
  
  -- Step 2: Show raw data
  RETURN QUERY
  SELECT 
    'raw_data'::TEXT as step,
    row_to_json(t.*)::JSONB as data
  FROM validation_rate_limits t
  WHERE user_id = p_user_id;
  
  -- Step 3: Current time info
  RETURN QUERY
  SELECT 
    'time_info'::TEXT as step,
    jsonb_build_object(
      'current_time', NOW(),
      'current_date', CURRENT_DATE,
      'current_hour', date_trunc('hour', NOW()),
      'next_hour', date_trunc('hour', NOW()) + INTERVAL '1 hour',
      'next_day', (CURRENT_DATE + INTERVAL '1 day')::TIMESTAMP WITH TIME ZONE
    ) as data;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.test_validation_limits(UUID) TO authenticated;