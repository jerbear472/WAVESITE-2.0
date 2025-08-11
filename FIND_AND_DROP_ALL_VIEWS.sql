-- FIND ALL VIEWS FIRST, THEN DROP THEM

-- STEP 1: Find ALL views that might reference trend_submissions
SELECT 'Run these DROP commands:' as instruction;
SELECT 'DROP VIEW IF EXISTS ' || schemaname || '.' || viewname || ' CASCADE;' as drop_command
FROM pg_views 
WHERE schemaname = 'public' 
AND (
    definition LIKE '%trend_submissions%'
    OR definition LIKE '%validation_count%'
    OR definition LIKE '%approve_count%'
    OR definition LIKE '%reject_count%'
    OR definition LIKE '%virality_prediction%'
)
ORDER BY viewname;

-- This will show you EVERY view to drop. Copy and run those commands.

-- STEP 2: After dropping all views, run this to fix the columns:
/*
ALTER TABLE trend_submissions
ALTER COLUMN validation_count TYPE INTEGER,
ALTER COLUMN approve_count TYPE INTEGER,
ALTER COLUMN reject_count TYPE INTEGER,
ALTER COLUMN virality_prediction TYPE INTEGER,
ALTER COLUMN quality_score TYPE DECIMAL(5,2),
ALTER COLUMN bounty_amount TYPE DECIMAL(10,2);
*/

-- STEP 3: Then recreate only what you need:
/*
CREATE VIEW verify_page AS
SELECT * FROM trend_submissions
WHERE status IN ('submitted', 'validating');

GRANT SELECT ON verify_page TO authenticated;
*/