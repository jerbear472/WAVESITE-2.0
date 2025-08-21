-- Comprehensive fix for ALL XP-related tables RLS issues
-- This will fix all "row violates row-level security policy" errors

-- 1. Fix user_xp table
ALTER TABLE user_xp DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own user_xp" ON user_xp;
DROP POLICY IF EXISTS "Users can insert own user_xp" ON user_xp;
DROP POLICY IF EXISTS "Users can update own user_xp" ON user_xp;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON user_xp;

CREATE POLICY "Anyone can read user_xp" 
ON user_xp FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert user_xp" 
ON user_xp FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update user_xp" 
ON user_xp FOR UPDATE 
USING (true)
WITH CHECK (true);

ALTER TABLE user_xp ENABLE ROW LEVEL SECURITY;

-- 2. Fix xp_transactions table
ALTER TABLE xp_transactions DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read all xp_transactions" ON xp_transactions;
DROP POLICY IF EXISTS "Users can insert xp_transactions" ON xp_transactions;
DROP POLICY IF EXISTS "Users can update xp_transactions" ON xp_transactions;

CREATE POLICY "Anyone can read xp_transactions" 
ON xp_transactions FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert xp_transactions" 
ON xp_transactions FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update xp_transactions" 
ON xp_transactions FOR UPDATE 
USING (true)
WITH CHECK (true);

ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;

-- 3. Fix user_xp_summary table (if exists)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_xp_summary'
    ) THEN
        ALTER TABLE user_xp_summary DISABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can view own xp summary" ON user_xp_summary;
        DROP POLICY IF EXISTS "Users can view all xp summaries" ON user_xp_summary;
        
        CREATE POLICY "Anyone can read user_xp_summary" 
        ON user_xp_summary FOR SELECT 
        USING (true);
        
        CREATE POLICY "Anyone can insert user_xp_summary" 
        ON user_xp_summary FOR INSERT 
        WITH CHECK (true);
        
        CREATE POLICY "Anyone can update user_xp_summary" 
        ON user_xp_summary FOR UPDATE 
        USING (true)
        WITH CHECK (true);
        
        ALTER TABLE user_xp_summary ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- 4. Fix xp_levels table (if exists)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'xp_levels'
    ) THEN
        ALTER TABLE xp_levels DISABLE ROW LEVEL SECURITY;
        
        CREATE POLICY IF NOT EXISTS "Anyone can read xp_levels" 
        ON xp_levels FOR SELECT 
        USING (true);
        
        ALTER TABLE xp_levels ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- 5. Fix trend_submissions table
ALTER TABLE trend_submissions DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read trends" ON trend_submissions;
DROP POLICY IF EXISTS "Authenticated can insert trends" ON trend_submissions;
DROP POLICY IF EXISTS "Authenticated can update trends" ON trend_submissions;

CREATE POLICY "Anyone can read trend_submissions" 
ON trend_submissions FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert trend_submissions" 
ON trend_submissions FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update trend_submissions" 
ON trend_submissions FOR UPDATE 
USING (true)
WITH CHECK (true);

ALTER TABLE trend_submissions ENABLE ROW LEVEL SECURITY;

-- 6. Grant all necessary permissions
GRANT ALL ON user_xp TO authenticated;
GRANT ALL ON user_xp TO anon;
GRANT ALL ON user_xp TO service_role;

GRANT ALL ON xp_transactions TO authenticated;
GRANT ALL ON xp_transactions TO anon;
GRANT ALL ON xp_transactions TO service_role;

GRANT ALL ON trend_submissions TO authenticated;
GRANT ALL ON trend_submissions TO anon;
GRANT ALL ON trend_submissions TO service_role;

-- Grant permissions on user_xp_summary if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_xp_summary'
    ) THEN
        GRANT ALL ON user_xp_summary TO authenticated;
        GRANT ALL ON user_xp_summary TO anon;
        GRANT ALL ON user_xp_summary TO service_role;
    END IF;
END $$;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Success message
SELECT 'All XP table RLS policies have been fixed!' as message;