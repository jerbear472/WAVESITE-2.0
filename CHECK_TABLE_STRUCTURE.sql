-- =====================================================
-- CHECK ACTUAL TABLE STRUCTURE
-- =====================================================
-- This script checks what columns actually exist in the
-- trend_submissions table to diagnose the issue
-- =====================================================

-- Show all columns in trend_submissions table
SELECT 
    column_name,
    data_type,
    udt_name,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'trend_submissions'
ORDER BY ordinal_position;

-- Check if status column exists at all
SELECT 
    EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'trend_submissions' 
        AND column_name = 'status'
    ) as status_column_exists;

-- Check what enum types exist
SELECT 
    n.nspname as schema,
    t.typname as type_name,
    string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) as enum_values
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE t.typname LIKE '%status%' OR t.typname LIKE '%trend%'
GROUP BY n.nspname, t.typname;

-- Show table definition
SELECT 
    'CREATE TABLE ' || table_name || ' (' ||
    string_agg(
        column_name || ' ' || 
        CASE 
            WHEN data_type = 'USER-DEFINED' THEN udt_name
            ELSE data_type 
        END ||
        CASE 
            WHEN character_maximum_length IS NOT NULL 
            THEN '(' || character_maximum_length || ')'
            ELSE ''
        END ||
        CASE 
            WHEN is_nullable = 'NO' THEN ' NOT NULL'
            ELSE ''
        END ||
        CASE 
            WHEN column_default IS NOT NULL 
            THEN ' DEFAULT ' || column_default
            ELSE ''
        END,
        ', '
    ) || ');' as table_definition
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'trend_submissions'
GROUP BY table_name;

-- Check if there are any recent records
SELECT COUNT(*) as record_count,
       MIN(created_at) as oldest_record,
       MAX(created_at) as newest_record
FROM trend_submissions;

-- Show a sample record to see actual data structure
SELECT * FROM trend_submissions 
LIMIT 1;