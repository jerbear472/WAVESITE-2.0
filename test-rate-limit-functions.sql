-- Test the rate limit functions directly

-- First, check current state for a test user
-- Replace 'YOUR_USER_ID' with an actual user ID
DO $$
DECLARE
  v_user_id UUID := 'YOUR_USER_ID'::UUID; -- Replace with actual user ID
  v_result RECORD;
BEGIN
  -- Check current rate limit
  RAISE NOTICE 'Checking rate limit...';
  SELECT * INTO v_result FROM check_rate_limit(v_user_id);
  RAISE NOTICE 'Rate limit result: %', row_to_json(v_result);
  
  -- Check raw data
  SELECT * INTO v_result FROM validation_rate_limits WHERE user_id = v_user_id;
  RAISE NOTICE 'Raw data: %', row_to_json(v_result);
  
  -- Increment count
  RAISE NOTICE 'Incrementing count...';
  PERFORM increment_validation_count(v_user_id);
  
  -- Check again
  SELECT * INTO v_result FROM check_rate_limit(v_user_id);
  RAISE NOTICE 'After increment - Rate limit: %', row_to_json(v_result);
  
  SELECT * INTO v_result FROM validation_rate_limits WHERE user_id = v_user_id;
  RAISE NOTICE 'After increment - Raw data: %', row_to_json(v_result);
END $$;

-- Alternative: Create a test function that returns results
CREATE OR REPLACE FUNCTION test_rate_limit_system(p_user_id UUID)
RETURNS TABLE(
  step TEXT,
  data JSONB
) AS $$
BEGIN
  -- Step 1: Initial check
  RETURN QUERY 
  SELECT 
    'initial_check_rate_limit'::TEXT as step,
    row_to_json(t.*)::JSONB as data
  FROM check_rate_limit(p_user_id) t;
  
  -- Step 2: Raw data before
  RETURN QUERY
  SELECT 
    'raw_data_before'::TEXT as step,
    row_to_json(t.*)::JSONB as data
  FROM validation_rate_limits t
  WHERE user_id = p_user_id;
  
  -- Step 3: Increment
  PERFORM increment_validation_count(p_user_id);
  
  -- Step 4: Check after increment
  RETURN QUERY 
  SELECT 
    'after_increment_check_rate_limit'::TEXT as step,
    row_to_json(t.*)::JSONB as data
  FROM check_rate_limit(p_user_id) t;
  
  -- Step 5: Raw data after
  RETURN QUERY
  SELECT 
    'raw_data_after'::TEXT as step,
    row_to_json(t.*)::JSONB as data
  FROM validation_rate_limits t
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Grant permission
GRANT EXECUTE ON FUNCTION test_rate_limit_system(UUID) TO authenticated;