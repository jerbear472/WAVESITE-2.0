-- Fix cashout minimum amount to match the constants file ($5 instead of $10)

-- Drop the existing policy
DROP POLICY IF EXISTS "users_create_own_cashouts" ON public.cashout_requests;

-- Recreate with correct minimum amount ($5)
CREATE POLICY "users_create_own_cashouts" ON public.cashout_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id 
    AND amount >= 5.00 -- Updated to match EARNINGS.MINIMUM_CASHOUT
    AND get_user_available_balance(auth.uid()) >= amount
  );

-- Also update the validation function to use $5
CREATE OR REPLACE FUNCTION validate_cashout_request(
  p_user_id UUID,
  p_amount DECIMAL
)
RETURNS TABLE(
  is_valid BOOLEAN,
  error_message TEXT,
  available_balance DECIMAL
) AS $$
DECLARE
  v_available_balance DECIMAL;
  v_has_pending BOOLEAN;
  v_min_amount DECIMAL := 5.00; -- Updated from 10.00 to 5.00
BEGIN
  -- Get available balance
  v_available_balance := get_user_available_balance(p_user_id);
  
  -- Check for pending requests
  SELECT EXISTS(
    SELECT 1 FROM public.cashout_requests
    WHERE user_id = p_user_id
    AND status IN ('pending', 'processing')
  ) INTO v_has_pending;

  -- Validate
  IF v_has_pending THEN
    RETURN QUERY SELECT false, 'You already have a pending cashout request', v_available_balance;
  ELSIF p_amount < v_min_amount THEN
    RETURN QUERY SELECT false, format('Minimum cashout amount is $%s', v_min_amount), v_available_balance;
  ELSIF p_amount > v_available_balance THEN
    RETURN QUERY SELECT false, 'Insufficient balance', v_available_balance;
  ELSE
    RETURN QUERY SELECT true, NULL::TEXT, v_available_balance;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Verify the change
SELECT 
  policyname,
  with_check
FROM pg_policies 
WHERE tablename = 'cashout_requests'
AND policyname = 'users_create_own_cashouts';