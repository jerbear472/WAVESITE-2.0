-- QUICK FIX: Disable RLS on ALL XP-related tables
-- This immediately fixes all RLS errors but is less secure
-- Use this if you need to get the app working quickly

-- Disable RLS on all XP tables
ALTER TABLE user_xp DISABLE ROW LEVEL SECURITY;
ALTER TABLE xp_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE trend_submissions DISABLE ROW LEVEL SECURITY;

-- Try to disable on tables that might exist
DO $$ 
BEGIN
    -- user_xp_summary
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_xp_summary'
    ) THEN
        ALTER TABLE user_xp_summary DISABLE ROW LEVEL SECURITY;
    END IF;
    
    -- xp_events
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'xp_events'
    ) THEN
        ALTER TABLE xp_events DISABLE ROW LEVEL SECURITY;
    END IF;
    
    -- xp_levels
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'xp_levels'
    ) THEN
        ALTER TABLE xp_levels DISABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Grant full permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Success message
SELECT 'RLS has been disabled on all XP tables. The app should work now!' as message;