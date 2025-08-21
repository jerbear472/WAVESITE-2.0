-- Quick fix for xp_transactions RLS error
-- Run this in Supabase SQL Editor

-- 1. First, temporarily disable RLS to fix the immediate issue
ALTER TABLE IF EXISTS xp_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS xp_events DISABLE ROW LEVEL SECURITY;

-- 2. Drop all existing policies
DROP POLICY IF EXISTS "Users can view own xp_transactions" ON xp_transactions;
DROP POLICY IF EXISTS "Users can insert own xp_transactions" ON xp_transactions;
DROP POLICY IF EXISTS "System can insert xp_transactions" ON xp_transactions;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON xp_transactions;

DROP POLICY IF EXISTS "Users can view own xp_events" ON xp_events;
DROP POLICY IF EXISTS "Users can insert own xp_events" ON xp_events;
DROP POLICY IF EXISTS "System can insert xp_events" ON xp_events;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON xp_events;

-- 3. Create permissive policies for authenticated users
-- For xp_transactions
CREATE POLICY "Enable read for authenticated users" 
ON xp_transactions FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Enable insert for authenticated users" 
ON xp_transactions FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" 
ON xp_transactions FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

-- For xp_events (if it exists)
CREATE POLICY "Enable read for authenticated users" 
ON xp_events FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Enable insert for authenticated users" 
ON xp_events FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" 
ON xp_events FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

-- 4. Re-enable RLS
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY;

-- 5. Grant permissions
GRANT ALL ON xp_transactions TO authenticated;
GRANT ALL ON xp_events TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 6. Test message
DO $$
BEGIN
    RAISE NOTICE 'RLS policies have been updated to be more permissive. XP transactions should now work.';
END $$;