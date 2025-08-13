-- Create a simple validation function that avoids the user_id issue
-- This is an alternative approach if you want to keep using RPC

-- Create a new function with a different name to avoid conflicts
CREATE OR REPLACE FUNCTION public.submit_trend_validation(
  p_trend_id UUID,
  p_vote TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_validator_id UUID;
  v_existing_vote TEXT;
BEGIN
  -- Get the current user ID from auth context
  v_validator_id := auth.uid();
  
  IF v_validator_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not authenticated');
  END IF;
  
  -- Check if user has already voted on this trend
  SELECT vote INTO v_existing_vote
  FROM public.trend_validations
  WHERE trend_submission_id = p_trend_id 
    AND validator_id = v_validator_id;  -- Using validator_id correctly
  
  IF v_existing_vote IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'You have already voted on this trend',
      'existing_vote', v_existing_vote
    );
  END IF;
  
  -- Insert the validation using validator_id
  INSERT INTO public.trend_validations (
    trend_submission_id,
    validator_id,  -- Correct field name
    vote,
    created_at
  ) VALUES (
    p_trend_id,
    v_validator_id,
    p_vote,
    NOW()
  );
  
  -- Update the trend submission counts
  IF p_vote = 'verify' THEN
    UPDATE public.trend_submissions
    SET 
      validation_count = COALESCE(validation_count, 0) + 1,
      approve_count = COALESCE(approve_count, 0) + 1,
      updated_at = NOW()
    WHERE id = p_trend_id;
    
    -- Check for auto-approval
    UPDATE public.trend_submissions
    SET status = 'approved'
    WHERE id = p_trend_id
      AND status IN ('submitted', 'validating')
      AND approve_count >= 3
      AND approve_count > COALESCE(reject_count, 0);
      
  ELSIF p_vote = 'reject' THEN
    UPDATE public.trend_submissions
    SET 
      validation_count = COALESCE(validation_count, 0) + 1,
      reject_count = COALESCE(reject_count, 0) + 1,
      updated_at = NOW()
    WHERE id = p_trend_id;
    
    -- Check for auto-rejection
    UPDATE public.trend_submissions
    SET status = 'rejected'
    WHERE id = p_trend_id
      AND status IN ('submitted', 'validating')
      AND reject_count >= 3
      AND reject_count > COALESCE(approve_count, 0);
  END IF;
  
  -- Set to validating if still submitted
  UPDATE public.trend_submissions
  SET status = 'validating'
  WHERE id = p_trend_id
    AND status = 'submitted'
    AND (approve_count > 0 OR reject_count > 0);
  
  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Vote recorded successfully',
    'vote', p_vote
  );
  
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'You have already voted on this trend'
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', SQLERRM,
      'detail', SQLSTATE
    );
END;
$$;

-- Grant permission to authenticated users
GRANT EXECUTE ON FUNCTION public.submit_trend_validation(UUID, TEXT) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION public.submit_trend_validation IS 'Handles trend validation votes, using validator_id field correctly';

-- Test query to verify the function exists
SELECT 
    proname AS function_name,
    pg_catalog.pg_get_function_identity_arguments(oid) AS arguments,
    pg_catalog.pg_get_function_result(oid) AS return_type
FROM pg_catalog.pg_proc
WHERE proname = 'submit_trend_validation';