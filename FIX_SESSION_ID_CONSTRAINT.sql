-- Fix session_id constraint issue in scroll_sessions

-- First, check for any triggers that might be inserting into scroll_sessions
SELECT 
    n.nspname as schema_name,
    t.tgname as trigger_name,
    p.proname as function_name,
    c.relname as table_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
    AND (c.relname = 'trend_submissions' OR c.relname = 'earnings_ledger')
    AND pg_get_functiondef(p.oid) LIKE '%scroll_sessions%';

-- Option 1: Make session_id nullable (simplest fix)
ALTER TABLE scroll_sessions 
ALTER COLUMN session_id DROP NOT NULL;

-- Option 2: Set a default value for session_id
ALTER TABLE scroll_sessions 
ALTER COLUMN session_id SET DEFAULT gen_random_uuid()::text;

-- Option 3: If there's a trigger causing this, we need to fix it
-- Check if there's a trigger function that needs updating
DO $$
DECLARE
    trigger_exists boolean;
BEGIN
    -- Check if there's a trigger that inserts into scroll_sessions
    SELECT EXISTS (
        SELECT 1 
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_proc p ON t.tgfoid = p.oid
        WHERE c.relname IN ('trend_submissions', 'earnings_ledger')
        AND pg_get_functiondef(p.oid) LIKE '%INSERT INTO scroll_sessions%'
    ) INTO trigger_exists;
    
    IF trigger_exists THEN
        RAISE NOTICE 'Found trigger that inserts into scroll_sessions - may need manual fix';
    END IF;
END $$;

-- Create or replace a function to handle scroll session updates safely
CREATE OR REPLACE FUNCTION update_scroll_session_on_trend_submission()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if scroll_sessions record exists
    UPDATE scroll_sessions 
    SET 
        trends_submitted = COALESCE(trends_submitted, 0) + 1,
        earnings_generated = COALESCE(earnings_generated, 0) + COALESCE(NEW.payment_amount, 0)
    WHERE user_id = NEW.spotter_id
        AND is_active = true
        AND created_at >= CURRENT_DATE;
    
    -- Don't create a new session if one doesn't exist
    -- The app should handle session creation
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Check if there's a trigger that needs to be updated
DO $$
BEGIN
    -- Drop any existing trigger that might be causing issues
    DROP TRIGGER IF EXISTS update_scroll_session_on_trend ON trend_submissions;
    
    -- Create a safe trigger that only updates existing sessions
    CREATE TRIGGER update_scroll_session_on_trend
    AFTER INSERT ON trend_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_scroll_session_on_trend_submission();
    
    RAISE NOTICE 'Created/updated trigger for scroll session updates';
END $$;

-- Display the final state
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'scroll_sessions'
    AND column_name IN ('session_id', 'user_id')
ORDER BY ordinal_position;