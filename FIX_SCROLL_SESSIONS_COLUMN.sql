-- Fix trends_submitted column in scroll_sessions table

-- Check current columns in scroll_sessions
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'scroll_sessions'
ORDER BY ordinal_position;

-- Add trends_submitted column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'scroll_sessions' 
        AND column_name = 'trends_submitted'
    ) THEN
        ALTER TABLE scroll_sessions 
        ADD COLUMN trends_submitted INTEGER DEFAULT 0;
        
        RAISE NOTICE 'Added trends_submitted column to scroll_sessions table';
    ELSE
        RAISE NOTICE 'trends_submitted column already exists in scroll_sessions table';
    END IF;
END $$;

-- Also add other potentially missing columns for scroll sessions
DO $$
BEGIN
    -- Add trends_validated if missing
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'scroll_sessions' 
        AND column_name = 'trends_validated'
    ) THEN
        ALTER TABLE scroll_sessions 
        ADD COLUMN trends_validated INTEGER DEFAULT 0;
    END IF;
    
    -- Add quality_score if missing
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'scroll_sessions' 
        AND column_name = 'quality_score'
    ) THEN
        ALTER TABLE scroll_sessions 
        ADD COLUMN quality_score DECIMAL(5,2) DEFAULT 0.00;
    END IF;
    
    -- Add earnings_generated if missing
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'scroll_sessions' 
        AND column_name = 'earnings_generated'
    ) THEN
        ALTER TABLE scroll_sessions 
        ADD COLUMN earnings_generated DECIMAL(10,2) DEFAULT 0.00;
    END IF;
END $$;

-- Check if there's a trigger that's trying to update scroll_sessions
SELECT 
    tg.trigger_name,
    tg.event_manipulation,
    tg.event_object_table,
    pg_get_functiondef(p.oid) as trigger_function
FROM information_schema.triggers tg
JOIN pg_proc p ON p.proname = tg.action_statement
WHERE tg.event_object_table IN ('trend_submissions', 'scroll_sessions')
    AND pg_get_functiondef(p.oid) LIKE '%trends_submitted%';

-- Display final columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'scroll_sessions'
ORDER BY ordinal_position;