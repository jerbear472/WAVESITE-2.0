-- TEMPORARY FIX: Disable RLS on XP tables
-- This is a quick fix to get things working
-- You can re-enable RLS with proper policies later

-- Disable RLS on xp_transactions
ALTER TABLE xp_transactions DISABLE ROW LEVEL SECURITY;

-- Disable RLS on xp_events if it exists
ALTER TABLE xp_events DISABLE ROW LEVEL SECURITY;

-- Grant full permissions to authenticated users
GRANT ALL ON xp_transactions TO authenticated;
GRANT ALL ON xp_events TO authenticated;
GRANT ALL ON trend_submissions TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Success message
SELECT 'RLS has been temporarily disabled on XP tables. The app should work now.' as message;