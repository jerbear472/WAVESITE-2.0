-- Fix the cast_trend_vote function to use validator_id instead of user_id
-- This fixes the error: record "new" has no field "user_id"

-- First, let's check the current function definition
-- The error suggests the function or a trigger is trying to access NEW.user_id
-- but the trend_validations table uses validator_id

-- Drop and recreate the function with correct field names
DROP FUNCTION IF EXISTS cast_trend_vote(uuid, text);

CREATE OR REPLACE FUNCTION cast_trend_vote(
  p_trend_id UUID,
  p_vote TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_existing_vote TEXT;
  v_result JSONB;
BEGIN
  -- Get the current user ID from auth context
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not authenticated');
  END IF;
  
  -- Check if user has already voted on this trend
  SELECT vote INTO v_existing_vote
  FROM trend_validations
  WHERE trend_submission_id = p_trend_id 
    AND validator_id = v_user_id;  -- Use validator_id, not user_id
  
  IF v_existing_vote IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You have already voted on this trend');
  END IF;
  
  -- Insert the validation
  INSERT INTO trend_validations (
    trend_submission_id,
    validator_id,  -- Use validator_id, not user_id
    vote,
    created_at
  ) VALUES (
    p_trend_id,
    v_user_id,
    p_vote,
    NOW()
  );
  
  -- Update the trend submission counts
  IF p_vote = 'verify' THEN
    UPDATE trend_submissions
    SET 
      validation_count = COALESCE(validation_count, 0) + 1,
      approve_count = COALESCE(approve_count, 0) + 1,
      updated_at = NOW()
    WHERE id = p_trend_id;
  ELSIF p_vote = 'reject' THEN
    UPDATE trend_submissions
    SET 
      validation_count = COALESCE(validation_count, 0) + 1,
      reject_count = COALESCE(reject_count, 0) + 1,
      updated_at = NOW()
    WHERE id = p_trend_id;
  END IF;
  
  -- Check if trend should be approved or rejected based on votes
  PERFORM check_trend_status(p_trend_id);
  
  RETURN jsonb_build_object('success', true, 'message', 'Vote recorded successfully');
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Create the check_trend_status function if it doesn't exist
CREATE OR REPLACE FUNCTION check_trend_status(p_trend_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_approve_count INT;
  v_reject_count INT;
  v_status TEXT;
BEGIN
  -- Get current vote counts
  SELECT 
    COALESCE(approve_count, 0),
    COALESCE(reject_count, 0),
    status
  INTO v_approve_count, v_reject_count, v_status
  FROM trend_submissions
  WHERE id = p_trend_id;
  
  -- Only update if status is still in validation phase
  IF v_status IN ('submitted', 'validating') THEN
    -- Auto-approve if 3+ approvals and more approvals than rejections
    IF v_approve_count >= 3 AND v_approve_count > v_reject_count THEN
      UPDATE trend_submissions
      SET status = 'approved',
          updated_at = NOW()
      WHERE id = p_trend_id;
    -- Auto-reject if 3+ rejections and more rejections than approvals
    ELSIF v_reject_count >= 3 AND v_reject_count > v_approve_count THEN
      UPDATE trend_submissions
      SET status = 'rejected',
          updated_at = NOW()
      WHERE id = p_trend_id;
    -- Set to validating if it has any votes but not enough to decide
    ELSIF v_approve_count > 0 OR v_reject_count > 0 THEN
      UPDATE trend_submissions
      SET status = 'validating',
          updated_at = NOW()
      WHERE id = p_trend_id AND status = 'submitted';
    END IF;
  END IF;
END;
$$;

-- Also check if there are any triggers that might be using user_id
-- and update them to use validator_id

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION cast_trend_vote(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_trend_status(UUID) TO authenticated;

-- Add comment to document the fix
COMMENT ON FUNCTION cast_trend_vote IS 'Fixed to use validator_id instead of user_id to match the trend_validations table schema';