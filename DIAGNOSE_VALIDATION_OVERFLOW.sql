-- DIAGNOSE NUMERIC OVERFLOW IN VALIDATION
-- This happens when voting on trends, not from large numbers

-- 1. Check data types of count columns
SELECT 
    column_name,
    data_type,
    numeric_precision,
    numeric_scale
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'trend_submissions'
AND column_name IN ('approve_count', 'reject_count', 'validation_count', 'quality_score', 'virality_prediction')
ORDER BY column_name;

-- 2. Check trend_validations columns
SELECT 
    column_name,
    data_type,
    numeric_precision,
    numeric_scale
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'trend_validations'
AND column_name IN ('reward_amount', 'vote')
ORDER BY column_name;

-- 3. Check for any triggers that might be doing calculations
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND event_object_table IN ('trend_validations', 'trend_submissions')
ORDER BY event_object_table, trigger_name;

-- 4. Check if there are any computed columns or generated columns
SELECT 
    c.column_name,
    c.data_type,
    c.generation_expression,
    c.is_generated
FROM information_schema.columns c
WHERE c.table_schema = 'public'
AND c.table_name IN ('trend_submissions', 'trend_validations')
AND (c.is_generated = 'ALWAYS' OR c.generation_expression IS NOT NULL);

-- 5. Look for any infinite loops or recursive triggers
SELECT 
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN (
    'update_trend_validation_counts',
    'calculate_submission_earnings',
    'calculate_validation_earnings',
    'handle_trend_approval',
    'handle_trend_submission_earnings',
    'handle_validation_earnings'
);

-- 6. Check for corrupt data that might cause overflow
SELECT 
    id,
    approve_count,
    reject_count,
    validation_count,
    quality_score,
    virality_prediction
FROM trend_submissions
WHERE 
    approve_count > 1000 
    OR reject_count > 1000 
    OR validation_count > 1000
    OR approve_count < 0
    OR reject_count < 0
    OR validation_count < 0;

-- 7. THE LIKELY CULPRIT - Check if validation_count is SMALLINT (max 32,767)
-- or if quality_score/virality_prediction have issues
SELECT 
    column_name,
    data_type,
    CASE 
        WHEN data_type = 'smallint' THEN 'MAX: 32,767 - Could overflow!'
        WHEN data_type = 'integer' THEN 'MAX: 2,147,483,647'
        WHEN data_type = 'bigint' THEN 'MAX: 9,223,372,036,854,775,807'
        WHEN data_type LIKE 'numeric%' THEN 'Check precision/scale'
        ELSE 'Other type'
    END as potential_issue
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'trend_submissions'
AND data_type IN ('smallint', 'integer', 'bigint', 'numeric', 'decimal');

-- 8. FIX: Convert problematic columns to proper types
-- Run this if you find SMALLINT columns
ALTER TABLE trend_submissions
ALTER COLUMN validation_count TYPE INTEGER USING COALESCE(validation_count, 0)::INTEGER,
ALTER COLUMN approve_count TYPE INTEGER USING COALESCE(approve_count, 0)::INTEGER,
ALTER COLUMN reject_count TYPE INTEGER USING COALESCE(reject_count, 0)::INTEGER;

-- If virality_prediction is causing issues (might be NUMERIC(2,0) which only allows 0-99)
ALTER TABLE trend_submissions
ALTER COLUMN virality_prediction TYPE INTEGER USING COALESCE(virality_prediction, 0)::INTEGER;