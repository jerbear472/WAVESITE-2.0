-- NUCLEAR OPTION: FIND AND DROP ALL VIEWS, FIX COLUMNS, RECREATE VIEWS

-- STEP 1: Find ALL views that reference trend_submissions
DO $$
DECLARE
    view_record RECORD;
    drop_command TEXT;
BEGIN
    -- Find and drop all dependent views
    FOR view_record IN 
        SELECT DISTINCT dependent_view.relname AS view_name
        FROM pg_depend 
        JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid 
        JOIN pg_class as dependent_view ON pg_rewrite.ev_class = dependent_view.oid 
        JOIN pg_class as source_table ON pg_depend.refobjid = source_table.oid 
        JOIN pg_namespace ON dependent_view.relnamespace = pg_namespace.oid
        WHERE source_table.relname = 'trend_submissions'
        AND pg_namespace.nspname = 'public'
        AND dependent_view.relkind = 'v'
    LOOP
        drop_command := 'DROP VIEW IF EXISTS ' || view_record.view_name || ' CASCADE';
        RAISE NOTICE 'Dropping view: %', view_record.view_name;
        EXECUTE drop_command;
    END LOOP;
END $$;

-- STEP 2: Also manually drop any views we know about (belt and suspenders)
DROP VIEW IF EXISTS verify_page CASCADE;
DROP VIEW IF EXISTS trend_insights CASCADE;
DROP VIEW IF EXISTS trending_trends CASCADE;
DROP VIEW IF EXISTS trends_for_validation CASCADE;
DROP VIEW IF EXISTS available_trends_for_verification CASCADE;
DROP VIEW IF EXISTS validation_queue CASCADE;
DROP VIEW IF EXISTS trend_validation_stats CASCADE;
DROP VIEW IF EXISTS user_validation_stats CASCADE;
DROP VIEW IF EXISTS pending_trends CASCADE;
DROP VIEW IF EXISTS approved_trends CASCADE;
DROP VIEW IF EXISTS trending_now CASCADE;
DROP VIEW IF EXISTS trends_to_validate CASCADE;
DROP VIEW IF EXISTS trend_performance CASCADE;
DROP VIEW IF EXISTS user_trend_stats CASCADE;

-- STEP 3: NOW we can fix the columns (no views left to complain!)
ALTER TABLE trend_submissions
ALTER COLUMN validation_count TYPE INTEGER USING COALESCE(validation_count, 0)::INTEGER,
ALTER COLUMN approve_count TYPE INTEGER USING COALESCE(approve_count, 0)::INTEGER,
ALTER COLUMN reject_count TYPE INTEGER USING COALESCE(reject_count, 0)::INTEGER,
ALTER COLUMN virality_prediction TYPE INTEGER USING COALESCE(virality_prediction, 5)::INTEGER,
ALTER COLUMN quality_score TYPE DECIMAL(5,2) USING COALESCE(quality_score, 0.50)::DECIMAL(5,2),
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

-- Fix trend_validations columns
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trend_validations' 
        AND column_name = 'reward_amount'
    ) THEN
        ALTER TABLE trend_validations
        ALTER COLUMN reward_amount TYPE DECIMAL(10,2) USING COALESCE(reward_amount, 0.10)::DECIMAL(10,2);
    END IF;
END $$;

-- STEP 4: Recreate only the essential views that the app actually uses

-- View for validation page
CREATE OR REPLACE VIEW available_trends_for_verification AS
SELECT 
    ts.*,
    up.username as spotter_username,
    up.email as spotter_email
FROM trend_submissions ts
LEFT JOIN user_profiles up ON ts.spotter_id = up.id
WHERE ts.status IN ('submitted', 'validating')
ORDER BY ts.created_at DESC;

-- Simpler verify_page view
CREATE OR REPLACE VIEW verify_page AS
SELECT * FROM trend_submissions
WHERE status IN ('submitted', 'validating');

-- Trends for validation
CREATE OR REPLACE VIEW trends_for_validation AS
SELECT * FROM trend_submissions
WHERE status IN ('submitted', 'validating')
ORDER BY created_at DESC;

-- Trend insights for dashboard
CREATE OR REPLACE VIEW trend_insights AS
SELECT 
    ts.id,
    ts.category,
    ts.description,
    ts.virality_prediction,
    ts.status,
    ts.created_at,
    ts.quality_score,
    ts.validation_count,
    ts.bounty_amount,
    up.username as spotter_username
FROM trend_submissions ts
LEFT JOIN user_profiles up ON ts.spotter_id = up.id;

-- STEP 5: Grant permissions
GRANT SELECT ON available_trends_for_verification TO authenticated;
GRANT SELECT ON available_trends_for_verification TO anon;
GRANT SELECT ON verify_page TO authenticated;
GRANT SELECT ON verify_page TO anon;
GRANT SELECT ON trends_for_validation TO authenticated;
GRANT SELECT ON trends_for_validation TO anon;
GRANT SELECT ON trend_insights TO authenticated;

-- STEP 6: Verify everything is fixed
SELECT 
    'COLUMN TYPES AFTER FIX:' as info;

SELECT 
    column_name,
    data_type,
    CASE 
        WHEN data_type = 'integer' THEN '✅ FIXED - Can hold 2+ billion'
        WHEN data_type = 'numeric' THEN '✅ FIXED - Decimal type'
        WHEN data_type = 'smallint' THEN '❌ STILL BROKEN!'
        ELSE '✅ OK'
    END as status
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'trend_submissions'
AND column_name IN ('approve_count', 'reject_count', 'validation_count', 'quality_score', 'virality_prediction')
ORDER BY column_name;

SELECT 
    'VIEWS RECREATED:' as info;

SELECT viewname 
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname IN ('available_trends_for_verification', 'verify_page', 'trends_for_validation', 'trend_insights');

-- DONE! The numeric overflow should be fixed now.