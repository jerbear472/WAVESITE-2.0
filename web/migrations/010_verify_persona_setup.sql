-- Verify and fix persona persistence setup
-- Run this in Supabase SQL Editor to ensure everything is configured correctly

-- 1. Check if table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_personas'
) as table_exists;

-- 2. If table doesn't exist, this will show an error
-- Run the migration script: supabase/add_user_personas_schema.sql

-- 3. Check current RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'user_personas';

-- 4. Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'user_personas';

-- 5. Test inserting a persona (replace with your user ID)
-- First, get your user ID:
-- SELECT id FROM auth.users WHERE email = 'your-email@example.com';

-- 6. If policies are missing, recreate them:
-- DROP POLICY IF EXISTS "Users can view their own persona" ON user_personas;
-- DROP POLICY IF EXISTS "Users can insert their own persona" ON user_personas;
-- DROP POLICY IF EXISTS "Users can update their own persona" ON user_personas;
-- DROP POLICY IF EXISTS "Users can delete their own persona" ON user_personas;

-- CREATE POLICY "Users can view their own persona" ON user_personas
--     FOR SELECT USING (auth.uid() = user_id);

-- CREATE POLICY "Users can insert their own persona" ON user_personas
--     FOR INSERT WITH CHECK (auth.uid() = user_id);

-- CREATE POLICY "Users can update their own persona" ON user_personas
--     FOR UPDATE USING (auth.uid() = user_id);

-- CREATE POLICY "Users can delete their own persona" ON user_personas
--     FOR DELETE USING (auth.uid() = user_id);

-- 7. Grant necessary permissions
GRANT ALL ON user_personas TO authenticated;
GRANT USAGE ON SEQUENCE user_personas_id_seq TO authenticated;

-- 8. Test query as authenticated user
-- This should return data only for the logged-in user
SELECT * FROM user_personas WHERE user_id = auth.uid();