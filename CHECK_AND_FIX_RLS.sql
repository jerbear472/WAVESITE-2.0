-- ============================================
-- CHECK AND FIX RLS POLICIES
-- ============================================

-- Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('user_profiles', 'trend_submissions', 'trend_validations');

-- Disable RLS temporarily for user_profiles to allow trigger to work
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies on user_profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Service role can do anything" ON user_profiles;
DROP POLICY IF EXISTS "Public profiles are viewable" ON user_profiles;

-- Create new, more permissive policies
CREATE POLICY "Enable read access for all users" 
ON user_profiles FOR SELECT 
USING (true);

CREATE POLICY "Enable insert for registration" 
ON user_profiles FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Enable update for users to update own profile" 
ON user_profiles FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Enable delete for users to delete own profile" 
ON user_profiles FOR DELETE 
USING (auth.uid() = id);

-- Re-enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Also ensure auth schema permissions are correct
GRANT USAGE ON SCHEMA auth TO postgres, authenticated, anon, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA auth TO service_role;

-- Test
SELECT 'RLS policies fixed!' as status;