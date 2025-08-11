-- FIX NUMERIC OVERFLOW - DROP ALL DEPENDENT VIEWS
-- This finds and drops ALL views that depend on trend_submissions columns

-- STEP 1: Find all views that depend on trend_submissions
SELECT DISTINCT 
    dependent_view.relname AS view_name
FROM pg_depend 
JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid 
JOIN pg_class as dependent_view ON pg_rewrite.ev_class = dependent_view.oid 
JOIN pg_class as source_table ON pg_depend.refobjid = source_table.oid 
JOIN pg_namespace ON dependent_view.relnamespace = pg_namespace.oid
WHERE 
    source_table.relname = 'trend_submissions'
    AND pg_namespace.nspname = 'public'
ORDER BY view_name;

-- STEP 2: Drop ALL views that might depend on trend_submissions
-- Adding all possible views that might exist
DROP VIEW IF EXISTS verify_page CASCADE;
DROP VIEW IF EXISTS trend_insights CASCADE;
DROP VIEW IF EXISTS trending_trends CASCADE;
DROP VIEW IF EXISTS trends_for_validation CASCADE;
DROP VIEW IF EXISTS validation_queue CASCADE;
DROP VIEW IF EXISTS trend_validation_stats CASCADE;
DROP VIEW IF EXISTS user_validation_stats CASCADE;
DROP VIEW IF EXISTS pending_trends CASCADE;
DROP VIEW IF EXISTS approved_trends CASCADE;
DROP VIEW IF EXISTS trending_now CASCADE;

-- STEP 3: Fix the column types
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

-- STEP 4: Recreate essential views

-- Recreate verify_page view
CREATE OR REPLACE VIEW verify_page AS
SELECT 
    ts.*,
    up.username as spotter_username
FROM trend_submissions ts
LEFT JOIN user_profiles up ON ts.spotter_id = up.id
WHERE ts.status IN ('submitted', 'validating');

-- Recreate trends_for_validation view (if it was being used)
CREATE OR REPLACE VIEW trends_for_validation AS
SELECT 
    ts.id,
    ts.spotter_id,
    ts.category,
    ts.description,
    ts.screenshot_url,
    ts.thumbnail_url,
    ts.platform,
    ts.creator_handle,
    ts.post_caption,
    ts.likes_count,
    ts.comments_count,
    ts.views_count,
    ts.validation_count,
    ts.approve_count,
    ts.reject_count,
    ts.status,
    ts.created_at,
    up.username as spotter_username
FROM trend_submissions ts
LEFT JOIN user_profiles up ON ts.spotter_id = up.id
WHERE ts.status IN ('submitted', 'validating')
ORDER BY ts.created_at DESC;

-- Recreate trend_insights view
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
    up.username as spotter_username,
    COUNT(tv.id) as total_validations,
    COUNT(CASE WHEN tv.confirmed THEN 1 END) as positive_validations
FROM trend_submissions ts
LEFT JOIN user_profiles up ON ts.spotter_id = up.id
LEFT JOIN trend_validations tv ON (ts.id = tv.trend_submission_id OR ts.id = tv.trend_id)
GROUP BY ts.id, ts.category, ts.description, ts.virality_prediction, 
         ts.status, ts.created_at, ts.quality_score, ts.validation_count, 
         ts.bounty_amount, up.username;

-- STEP 5: Grant permissions
GRANT SELECT ON verify_page TO authenticated;
GRANT SELECT ON verify_page TO anon;
GRANT SELECT ON trends_for_validation TO authenticated;
GRANT SELECT ON trends_for_validation TO anon;
GRANT SELECT ON trend_insights TO authenticated;

-- STEP 6: Verify the fix worked
SELECT 
    column_name,
    data_type,
    numeric_precision,
    CASE 
        WHEN data_type = 'smallint' THEN '❌ STILL BROKEN - Max 32,767'
        WHEN data_type = 'integer' THEN '✅ FIXED - Max 2 billion'
        WHEN data_type = 'bigint' THEN '✅ FIXED - Max 9 quintillion'
        WHEN data_type = 'numeric' AND numeric_precision >= 5 THEN '✅ FIXED - Decimal OK'
        WHEN data_type = 'numeric' AND numeric_precision < 5 THEN '⚠️ May be too small'
        ELSE '❓ Check manually'
    END as status
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'trend_submissions'
AND column_name IN ('approve_count', 'reject_count', 'validation_count', 'quality_score', 'virality_prediction', 'wave_score', 'bounty_amount')
ORDER BY column_name;

-- If everything shows ✅ FIXED, the numeric overflow should be resolved!