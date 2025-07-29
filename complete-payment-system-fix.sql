-- Complete Payment System Setup - All in One (Corrected Order)
-- This script handles all dependencies correctly

-- STEP 1: Add is_admin column FIRST (before creating anything that references it)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Set admin status for known admin email
UPDATE public.profiles 
SET is_admin = true 
WHERE email = 'jeremyuys@gmail.com';

-- STEP 2: Now create the payment tables
CREATE TABLE IF NOT EXISTS public.cashout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  venmo_username TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES auth.users(id),
  transaction_id TEXT,
  failure_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cashout_requests_user_id ON public.cashout_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_cashout_requests_status ON public.cashout_requests(status);
CREATE INDEX IF NOT EXISTS idx_cashout_requests_created_at ON public.cashout_requests(created_at DESC);

-- Create payment_methods table
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('venmo', 'paypal', 'cashapp', 'zelle', 'bank')),
  account_identifier TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, type, account_identifier)
);

-- Add total_cashed_out column to profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'profiles' 
                AND column_name = 'total_cashed_out') THEN
    ALTER TABLE public.profiles ADD COLUMN total_cashed_out DECIMAL(10,2) DEFAULT 0.00;
  END IF;
END $$;

-- STEP 3: Create functions (now that all columns exist)

-- Function to update user's total_cashed_out
CREATE OR REPLACE FUNCTION update_user_cashed_out_total()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    UPDATE public.profiles
    SET total_cashed_out = total_cashed_out + NEW.amount
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_cashed_out_trigger ON public.cashout_requests;
CREATE TRIGGER update_cashed_out_trigger
  AFTER INSERT OR UPDATE ON public.cashout_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_user_cashed_out_total();

-- Function to get user's available balance
CREATE OR REPLACE FUNCTION get_user_available_balance(p_user_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  v_total_earnings DECIMAL;
  v_pending_cashouts DECIMAL;
  v_completed_cashouts DECIMAL;
BEGIN
  -- Get total earnings from earnings_ledger
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_earnings
  FROM public.earnings_ledger
  WHERE user_id = p_user_id
  AND status = 'approved';

  -- Get pending cashouts
  SELECT COALESCE(SUM(amount), 0)
  INTO v_pending_cashouts
  FROM public.cashout_requests
  WHERE user_id = p_user_id
  AND status IN ('pending', 'processing');

  -- Get completed cashouts
  SELECT COALESCE(SUM(amount), 0)
  INTO v_completed_cashouts
  FROM public.cashout_requests
  WHERE user_id = p_user_id
  AND status = 'completed';

  -- Available = Total Earnings - Pending - Completed
  RETURN v_total_earnings - v_pending_cashouts - v_completed_cashouts;
END;
$$ LANGUAGE plpgsql;

-- Create view for user payment dashboard
CREATE OR REPLACE VIEW user_payment_summary AS
SELECT 
  u.id as user_id,
  p.email,
  p.username,
  COALESCE(e.total_earnings, 0) as total_earnings,
  COALESCE(c.total_cashed_out, 0) as total_cashed_out,
  COALESCE(c.pending_amount, 0) as pending_cashout,
  get_user_available_balance(u.id) as available_balance,
  c.last_cashout_date,
  c.last_cashout_status
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
LEFT JOIN (
  SELECT 
    user_id,
    SUM(amount) FILTER (WHERE status = 'approved') as total_earnings
  FROM public.earnings_ledger
  GROUP BY user_id
) e ON u.id = e.user_id
LEFT JOIN (
  SELECT 
    user_id,
    SUM(amount) FILTER (WHERE status = 'completed') as total_cashed_out,
    SUM(amount) FILTER (WHERE status IN ('pending', 'processing')) as pending_amount,
    MAX(created_at) FILTER (WHERE status = 'completed') as last_cashout_date,
    (ARRAY_AGG(status ORDER BY created_at DESC))[1] as last_cashout_status
  FROM public.cashout_requests
  GROUP BY user_id
) c ON u.id = c.user_id;

-- STEP 4: Create RLS Policies (now that is_admin exists)
ALTER TABLE public.cashout_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own cashout requests
CREATE POLICY "users_view_own_cashouts" ON public.cashout_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can create their own cashout requests (with $5 minimum)
CREATE POLICY "users_create_own_cashouts" ON public.cashout_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id 
    AND amount >= 5.00 -- $5 minimum to match constants
    AND get_user_available_balance(auth.uid()) >= amount
  );

-- Only admins can update cashout requests
CREATE POLICY "admins_update_cashouts" ON public.cashout_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (email = 'jeremyuys@gmail.com' OR is_admin = true)
    )
  );

-- RLS for payment_methods
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_payment_methods" ON public.payment_methods
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.cashout_requests TO authenticated;
GRANT ALL ON public.payment_methods TO authenticated;
GRANT SELECT ON user_payment_summary TO authenticated;

-- Function to validate cashout request (with $5 minimum)
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
  v_min_amount DECIMAL := 5.00; -- $5 minimum
BEGIN
  v_available_balance := get_user_available_balance(p_user_id);
  
  SELECT EXISTS(
    SELECT 1 FROM public.cashout_requests
    WHERE user_id = p_user_id
    AND status IN ('pending', 'processing')
  ) INTO v_has_pending;

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

-- Create admin view for processing payments
CREATE OR REPLACE VIEW admin_cashout_queue AS
SELECT 
  cr.id,
  cr.user_id,
  p.email,
  p.username,
  cr.amount,
  cr.venmo_username,
  cr.status,
  cr.created_at,
  cr.processed_at,
  cr.processed_by,
  cr.notes,
  get_user_available_balance(cr.user_id) as user_available_balance,
  COUNT(*) OVER (PARTITION BY cr.user_id) as user_total_requests,
  SUM(cr.amount) OVER (PARTITION BY cr.user_id) as user_total_requested
FROM public.cashout_requests cr
JOIN public.profiles p ON cr.user_id = p.id
WHERE cr.status IN ('pending', 'processing')
ORDER BY cr.created_at ASC;

-- Function to process cashout (for admin use)
CREATE OR REPLACE FUNCTION process_cashout_request(
  p_request_id UUID,
  p_admin_id UUID,
  p_status TEXT,
  p_transaction_id TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_failure_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Validate admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_admin_id
    AND (email = 'jeremyuys@gmail.com' OR is_admin = true)
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Update the request
  UPDATE public.cashout_requests
  SET 
    status = p_status,
    processed_at = NOW(),
    processed_by = p_admin_id,
    transaction_id = p_transaction_id,
    notes = p_notes,
    failure_reason = p_failure_reason,
    updated_at = NOW()
  WHERE id = p_request_id
  AND status IN ('pending', 'processing');

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cashout_requests_updated_at
  BEFORE UPDATE ON public.cashout_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id
    AND (email = 'jeremyuys@gmail.com' OR is_admin = true)
  );
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;

-- STEP 5: Verify everything was created
SELECT 
  'Setup Complete!' as status,
  (SELECT COUNT(*) FROM pg_tables WHERE tablename = 'cashout_requests') as cashout_table_exists,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_admin') as admin_column_exists,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'cashout_requests') as policies_count,
  (SELECT COUNT(*) FROM information_schema.routines WHERE routine_name IN ('get_user_available_balance', 'validate_cashout_request', 'process_cashout_request')) as functions_count;