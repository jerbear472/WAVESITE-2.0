-- Minimal fix for trend submission - just remove umbrella column
-- This avoids policy conflicts

-- 1. Remove umbrella-related column and constraints
DO $$ 
BEGIN
  -- Drop foreign key constraints
  ALTER TABLE trend_submissions DROP CONSTRAINT IF EXISTS trend_submissions_trend_umbrella_id_fkey;
  ALTER TABLE trend_submissions DROP CONSTRAINT IF EXISTS fk_trend_umbrella;
  
  -- Drop the trend_umbrella_id column if it exists
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' 
             AND table_name = 'trend_submissions' 
             AND column_name = 'trend_umbrella_id') THEN
    ALTER TABLE trend_submissions DROP COLUMN trend_umbrella_id CASCADE;
    RAISE NOTICE 'Dropped trend_umbrella_id column';
  ELSE
    RAISE NOTICE 'trend_umbrella_id column does not exist';
  END IF;
END $$;

-- 2. Drop umbrella-related triggers and functions
DROP TRIGGER IF EXISTS update_umbrella_stats_trigger ON trend_submissions;
DROP TRIGGER IF EXISTS create_umbrella_on_submission ON trend_submissions;
DROP TRIGGER IF EXISTS update_umbrella_on_trend_insert ON trend_submissions;
DROP FUNCTION IF EXISTS update_trend_umbrella_stats() CASCADE;
DROP FUNCTION IF EXISTS auto_create_trend_umbrella() CASCADE;
DROP FUNCTION IF EXISTS find_or_create_umbrella() CASCADE;
DROP FUNCTION IF EXISTS create_trend_umbrella() CASCADE;

-- 3. Check if all required columns exist
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'trend_submissions'
ORDER BY ordinal_position;

-- 4. Verify the table is ready
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN 'Table exists with ' || COUNT(*) || ' columns'
        ELSE 'Table does not exist'
    END as status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = 'trend_submissions' 
                    AND column_name = 'trend_umbrella_id') 
        THEN 'WARNING: trend_umbrella_id still exists!'
        ELSE 'SUCCESS: trend_umbrella_id removed!'
    END as umbrella_status
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'trend_submissions';

-- Success message
SELECT 'Trend umbrella references removed. Table is ready for submissions!' as result;