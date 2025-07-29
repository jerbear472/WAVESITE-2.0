-- Test Payment System Setup

-- 1. Verify all components were created
SELECT 
  'Cashout Requests Table' as component,
  EXISTS(SELECT 1 FROM pg_tables WHERE tablename = 'cashout_requests') as exists
UNION ALL
SELECT 
  'Payment Methods Table',
  EXISTS(SELECT 1 FROM pg_tables WHERE tablename = 'payment_methods')
UNION ALL
SELECT 
  'Admin Column in Profiles',
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_admin')
UNION ALL
SELECT 
  'Total Cashed Out Column',
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'total_cashed_out');

-- 2. Check your admin status
SELECT 
  id,
  email,
  username,
  is_admin,
  total_cashed_out
FROM profiles 
WHERE email = 'jeremyuys@gmail.com';

-- 3. Test the balance function with your user
-- Replace 'YOUR_USER_ID' with your actual user ID from above
/*
SELECT 
  get_user_available_balance('YOUR_USER_ID') as available_balance;
*/

-- 4. Check if you have any earnings
SELECT 
  user_id,
  COUNT(*) as transaction_count,
  SUM(amount) FILTER (WHERE status = 'approved') as approved_earnings,
  SUM(amount) FILTER (WHERE status = 'pending') as pending_earnings
FROM earnings_ledger
GROUP BY user_id
LIMIT 5;

-- 5. View the payment summary
SELECT * FROM user_payment_summary LIMIT 5;

-- 6. Check RLS policies
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies 
WHERE tablename = 'cashout_requests'
ORDER BY policyname;

-- 7. Test cashout validation (replace with your user_id)
/*
SELECT * FROM validate_cashout_request('YOUR_USER_ID', 5.00);
*/