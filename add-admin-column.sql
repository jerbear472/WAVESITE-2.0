-- Add is_admin column to profiles table for admin access control

-- 1. Add is_admin column if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 2. Set admin status for known admin email
UPDATE public.profiles 
SET is_admin = true 
WHERE email = 'jeremyuys@gmail.com';

-- 3. Update the process_cashout_request function to handle missing is_admin column
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
  -- Validate admin (check email or is_admin flag)
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_admin_id
    AND (email = 'jeremyuys@gmail.com' OR (is_admin IS NOT NULL AND is_admin = true))
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

-- 4. Update RLS policy for admins
DROP POLICY IF EXISTS "admins_update_cashouts" ON public.cashout_requests;

CREATE POLICY "admins_update_cashouts" ON public.cashout_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (email = 'jeremyuys@gmail.com' OR (is_admin IS NOT NULL AND is_admin = true))
    )
  );

-- 5. Create a simple function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id
    AND (email = 'jeremyuys@gmail.com' OR (is_admin IS NOT NULL AND is_admin = true))
  );
END;
$$ LANGUAGE plpgsql;

-- 6. Grant execute permission
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;

-- 7. Verify the column was added
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name = 'is_admin';

-- 8. Show current admins
SELECT 
  id,
  email,
  username,
  is_admin
FROM public.profiles
WHERE email = 'jeremyuys@gmail.com' OR (is_admin IS NOT NULL AND is_admin = true);