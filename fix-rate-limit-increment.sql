-- Create a function to properly increment validation counts
CREATE OR REPLACE FUNCTION public.increment_validation_count(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Update the validation counts
  UPDATE public.validation_rate_limits
  SET 
    validations_today = validations_today + 1,
    validations_this_hour = validations_this_hour + 1,
    last_validation_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Insert if user doesn't have a rate limit record yet
  IF NOT FOUND THEN
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.increment_validation_count(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.increment_validation_count(UUID) IS 'Increments validation count for rate limiting';