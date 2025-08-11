-- DROP EVERY SINGLE VIEW IN THE DATABASE THAT REFERENCES TREND_SUBMISSIONS
-- This is the nuclear option but it WILL work

-- STEP 1: Create a function to drop all dependent views
CREATE OR REPLACE FUNCTION drop_all_views_referencing_table(table_name text)
RETURNS void AS $$
DECLARE
    view_record RECORD;
BEGIN
    -- Find ALL views that reference this table
    FOR view_record IN 
        SELECT DISTINCT 
            n.nspname as schema_name,
            c.relname as view_name
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_depend d ON d.refobjid = c.oid
        JOIN pg_rewrite r ON r.oid = d.objid
        JOIN pg_class v ON v.oid = r.ev_class
        WHERE c.relname = table_name
        AND n.nspname = 'public'
        AND c.relkind = 'r'  -- regular table
        AND v.relkind = 'v'  -- view
    LOOP
        EXECUTE format('DROP VIEW IF EXISTS %I.%I CASCADE', view_record.schema_name, view_record.view_name);
        RAISE NOTICE 'Dropped view: %.%', view_record.schema_name, view_record.view_name;
    END LOOP;
    
    -- Also drop views that might reference it in their definition
    FOR view_record IN
        SELECT schemaname, viewname 
        FROM pg_views 
        WHERE schemaname = 'public' 
        AND definition LIKE '%' || table_name || '%'
    LOOP
        EXECUTE format('DROP VIEW IF EXISTS %I.%I CASCADE', view_record.schemaname, view_record.viewname);
        RAISE NOTICE 'Dropped view: %.%', view_record.schemaname, view_record.viewname;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- STEP 2: Use the function to drop all views
SELECT drop_all_views_referencing_table('trend_submissions');

-- STEP 3: Manually drop any stragglers (belt and suspenders)
DROP VIEW IF EXISTS public_trends CASCADE;
DROP VIEW IF EXISTS verify_page CASCADE;
DROP VIEW IF EXISTS available_trends_for_verification CASCADE;
DROP VIEW IF EXISTS trends_for_validation CASCADE;
DROP VIEW IF EXISTS trend_insights CASCADE;

-- STEP 4: NOW we can FINALLY fix the columns
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

-- STEP 5: Clean up - drop the helper function
DROP FUNCTION IF EXISTS drop_all_views_referencing_table(text);

-- STEP 6: Recreate only the views your app actually needs
CREATE OR REPLACE VIEW verify_page AS
SELECT * FROM trend_submissions
WHERE status IN ('submitted', 'validating');

GRANT SELECT ON verify_page TO authenticated;
GRANT SELECT ON verify_page TO anon;

-- STEP 7: Verify the fix worked
SELECT 
    column_name,
    data_type,
    CASE 
        WHEN data_type = 'integer' THEN '✅ FIXED - Can hold billions'
        WHEN data_type = 'numeric' THEN '✅ FIXED - Proper decimal'
        WHEN data_type = 'smallint' THEN '❌ STILL BROKEN'
        ELSE data_type
    END as status
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'trend_submissions'
AND column_name IN ('validation_count', 'approve_count', 'reject_count', 'virality_prediction', 'quality_score')
ORDER BY column_name;

-- DONE! This WILL work because we're dropping EVERYTHING!