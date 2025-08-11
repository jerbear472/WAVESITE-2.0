-- FINAL FIX - Drop ALL views first, then fix columns

-- STEP 1: List all views that depend on trend_submissions (for visibility)
SELECT 'The following views will be dropped:' as action;
SELECT viewname FROM pg_views 
WHERE schemaname = 'public' 
AND definition LIKE '%trend_submissions%';

-- STEP 2: Drop ALL views that might reference trend_submissions
-- Using CASCADE to drop dependent views too
DROP VIEW IF EXISTS available_trends_for_verification CASCADE;
DROP VIEW IF EXISTS verify_page CASCADE;
DROP VIEW IF EXISTS trends_for_validation CASCADE;
DROP VIEW IF EXISTS trend_insights CASCADE;
DROP VIEW IF EXISTS trending_trends CASCADE;
DROP VIEW IF EXISTS validation_queue CASCADE;
DROP VIEW IF EXISTS trend_validation_stats CASCADE;
DROP VIEW IF EXISTS user_validation_stats CASCADE;
DROP VIEW IF EXISTS pending_trends CASCADE;
DROP VIEW IF EXISTS approved_trends CASCADE;
DROP VIEW IF EXISTS trending_now CASCADE;
DROP VIEW IF EXISTS trends_to_validate CASCADE;
DROP VIEW IF EXISTS trend_performance CASCADE;
DROP VIEW IF EXISTS user_trend_stats CASCADE;

-- STEP 3: Drop any materialized views too (just in case)
DROP MATERIALIZED VIEW IF EXISTS trend_stats CASCADE;
DROP MATERIALIZED VIEW IF EXISTS validation_stats CASCADE;

-- STEP 4: NOW fix the columns (should work with all views gone)
SELECT 'Fixing column types...' as action;

ALTER TABLE trend_submissions
ALTER COLUMN validation_count TYPE INTEGER USING COALESCE(validation_count, 0)::INTEGER;

ALTER TABLE trend_submissions
ALTER COLUMN approve_count TYPE INTEGER USING COALESCE(approve_count, 0)::INTEGER;

ALTER TABLE trend_submissions
ALTER COLUMN reject_count TYPE INTEGER USING COALESCE(reject_count, 0)::INTEGER;

-- Also fix other numeric columns while we're at it
ALTER TABLE trend_submissions
ALTER COLUMN virality_prediction TYPE INTEGER USING COALESCE(virality_prediction, 5)::INTEGER;

ALTER TABLE trend_submissions
ALTER COLUMN quality_score TYPE DECIMAL(5,2) USING COALESCE(quality_score, 0.50)::DECIMAL(5,2);

ALTER TABLE trend_submissions
ALTER COLUMN bounty_amount TYPE DECIMAL(10,2) USING COALESCE(bounty_amount, 1.00)::DECIMAL(10,2);

-- Fix wave_score if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trend_submissions' 
        AND column_name = 'wave_score'
    ) THEN
        ALTER TABLE trend_submissions
        ALTER COLUMN wave_score TYPE INTEGER USING COALESCE(wave_score, 50)::INTEGER;
    END IF;
END $$;

-- STEP 5: Recreate the essential views
SELECT 'Recreating views...' as action;

-- Main view for validation
CREATE VIEW verify_page AS
SELECT * FROM trend_submissions
WHERE status IN ('submitted', 'validating');

-- Available trends view
CREATE VIEW available_trends_for_verification AS
SELECT 
    ts.*,
    up.username as spotter_username
FROM trend_submissions ts
LEFT JOIN user_profiles up ON ts.spotter_id = up.id
WHERE ts.status IN ('submitted', 'validating');

-- Grant permissions
GRANT SELECT ON verify_page TO authenticated;
GRANT SELECT ON verify_page TO anon;
GRANT SELECT ON available_trends_for_verification TO authenticated;
GRANT SELECT ON available_trends_for_verification TO anon;

-- STEP 6: Verify the fix
SELECT 'Verification:' as action;

SELECT 
    column_name,
    data_type,
    CASE 
        WHEN data_type = 'integer' THEN '✅ FIXED'
        WHEN data_type = 'numeric' THEN '✅ FIXED'
        WHEN data_type = 'smallint' THEN '❌ NOT FIXED'
        ELSE '❓ CHECK'
    END as status
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'trend_submissions'
AND column_name IN ('validation_count', 'approve_count', 'reject_count')
ORDER BY column_name;

SELECT 'If all show ✅ FIXED, the numeric overflow is resolved!' as result;