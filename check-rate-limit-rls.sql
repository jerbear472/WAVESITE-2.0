-- Check if RLS is enabled on validation_rate_limits table
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'validation_rate_limits';

-- Check existing policies on the table
SELECT 
  pol.polname as policy_name,
  pol.polcmd as command,
  pol.polroles::regrole[] as roles,
  CASE pol.polcmd 
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
  END as command_type,
  pg_get_expr(pol.polqual, pol.polrelid) as using_expression,
  pg_get_expr(pol.polwithcheck, pol.polrelid) as with_check_expression
FROM pg_policy pol
JOIN pg_class pc ON pol.polrelid = pc.oid
WHERE pc.relname = 'validation_rate_limits';

-- Check function permissions
SELECT 
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as security_definer,
  array_agg(
    CASE 
      WHEN a.grantee = 0 THEN 'public'
      ELSE a.grantee::regrole::text
    END || ' - ' || a.privilege_type
  ) as permissions
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
LEFT JOIN information_schema.routine_privileges a 
  ON a.routine_schema = n.nspname 
  AND a.routine_name = p.proname
WHERE p.proname IN ('check_rate_limit', 'increment_validation_count')
GROUP BY n.nspname, p.proname, p.oid, p.prosecdef;

-- Create RLS policies if missing
ALTER TABLE validation_rate_limits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own rate limits" ON validation_rate_limits;
DROP POLICY IF EXISTS "Users can update own rate limits" ON validation_rate_limits;
DROP POLICY IF EXISTS "Users can insert own rate limits" ON validation_rate_limits;

-- Create proper policies
CREATE POLICY "Users can view own rate limits" 
  ON validation_rate_limits 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own rate limits" 
  ON validation_rate_limits 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rate limits" 
  ON validation_rate_limits 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Also ensure the functions have proper permissions
GRANT EXECUTE ON FUNCTION check_rate_limit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_validation_count(UUID) TO authenticated;