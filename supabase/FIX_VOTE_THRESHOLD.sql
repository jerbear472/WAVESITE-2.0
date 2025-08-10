-- Fix the vote threshold from 3 to 2 votes for approval/rejection
-- This ensures consistency with the UI which shows "2 votes needed"

-- First, let's check the current function
SELECT pg_get_functiondef('cast_trend_vote'::regproc);

-- Drop and recreate the function with correct vote threshold
CREATE OR REPLACE FUNCTION cast_trend_vote(
  p_trend_id UUID,
  p_vote TEXT
) RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_existing_vote TEXT;
  v_verify_count INT;
  v_reject_count INT;
  v_trend_status TEXT;
  v_spotter_id UUID;
BEGIN
  -- Get the authenticated user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not authenticated'
    );
  END IF;
  
  -- Check if trend exists and get its status and spotter
  SELECT status, spotter_id 
  INTO v_trend_status, v_spotter_id
  FROM trend_submissions 
  WHERE id = p_trend_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Trend not found'
    );
  END IF;
  
  -- Check if user is trying to validate their own trend
  IF v_spotter_id = v_user_id THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cannot validate your own trend'
    );
  END IF;
  
  -- Check if trend is in a validatable status
  IF v_trend_status NOT IN ('submitted', 'validating') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Trend is not available for validation'
    );
  END IF;
  
  -- Check for existing vote
  SELECT vote INTO v_existing_vote
  FROM trend_validations
  WHERE trend_submission_id = p_trend_id 
    AND validator_id = v_user_id;
  
  IF FOUND THEN
    -- User has already voted
    RETURN json_build_object(
      'success', false,
      'error', 'You have already voted on this trend',
      'existing_vote', v_existing_vote
    );
  END IF;
  
  -- Validate vote type
  IF p_vote NOT IN ('verify', 'reject') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid vote type. Must be "verify" or "reject"'
    );
  END IF;
  
  -- Insert the vote
  INSERT INTO trend_validations (
    trend_submission_id,
    validator_id,
    vote,
    created_at
  ) VALUES (
    p_trend_id,
    v_user_id,
    p_vote,
    NOW()
  );
  
  -- Count votes
  SELECT 
    COUNT(*) FILTER (WHERE vote = 'verify'),
    COUNT(*) FILTER (WHERE vote = 'reject')
  INTO v_verify_count, v_reject_count
  FROM trend_validations
  WHERE trend_submission_id = p_trend_id;
  
  -- Update trend status if we've reached the threshold
  -- CHANGED FROM 3 TO 2 VOTES
  IF v_verify_count >= 2 THEN
    -- Trend approved with 2 verify votes
    UPDATE trend_submissions 
    SET 
      status = 'approved',
      validation_count = v_verify_count + v_reject_count,
      approve_count = v_verify_count,
      reject_count = v_reject_count,
      updated_at = NOW()
    WHERE id = p_trend_id;
    
    -- Record earnings for the spotter
    INSERT INTO earnings_ledger (
      user_id,
      amount,
      transaction_type,
      description,
      reference_id,
      reference_type
    ) VALUES (
      v_spotter_id,
      1.00, -- Base earnings for approved trend
      'trend_approved',
      'Trend approved by community',
      p_trend_id,
      'trend'
    );
    
    RETURN json_build_object(
      'success', true,
      'message', 'Vote recorded. Trend has been approved!',
      'vote', p_vote,
      'status', 'approved',
      'verify_count', v_verify_count,
      'reject_count', v_reject_count
    );
    
  ELSIF v_reject_count >= 2 THEN
    -- Trend rejected with 2 reject votes
    UPDATE trend_submissions 
    SET 
      status = 'rejected',
      validation_count = v_verify_count + v_reject_count,
      approve_count = v_verify_count,
      reject_count = v_reject_count,
      updated_at = NOW()
    WHERE id = p_trend_id;
    
    RETURN json_build_object(
      'success', true,
      'message', 'Vote recorded. Trend has been rejected.',
      'vote', p_vote,
      'status', 'rejected',
      'verify_count', v_verify_count,
      'reject_count', v_reject_count
    );
    
  ELSE
    -- Still validating, update counts
    UPDATE trend_submissions 
    SET 
      status = 'validating',
      validation_count = v_verify_count + v_reject_count,
      approve_count = v_verify_count,
      reject_count = v_reject_count,
      updated_at = NOW()
    WHERE id = p_trend_id;
    
    RETURN json_build_object(
      'success', true,
      'message', 'Vote recorded successfully',
      'vote', p_vote,
      'status', 'validating',
      'verify_count', v_verify_count,
      'reject_count', v_reject_count,
      'threshold', 2  -- Making threshold explicit
    );
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION cast_trend_vote TO authenticated;

-- Verify the function works
SELECT prosrc FROM pg_proc WHERE proname = 'cast_trend_vote';

-- Test query to see current vote counts
SELECT 
  id,
  description,
  status,
  validation_count,
  approve_count,
  reject_count,
  CASE 
    WHEN approve_count >= 2 THEN 'Should be approved'
    WHEN reject_count >= 2 THEN 'Should be rejected'
    WHEN status = 'validating' THEN 'Still needs votes'
    ELSE 'Ready for validation'
  END as expected_status
FROM trend_submissions
WHERE status IN ('submitted', 'validating')
ORDER BY created_at DESC
LIMIT 10;