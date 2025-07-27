-- Completely remove trend_umbrellas table and all references
-- This will fix the RLS policy error once and for all

-- 1. Drop any views that might reference trend_umbrellas
DROP VIEW IF EXISTS trending_umbrellas CASCADE;
DROP VIEW IF EXISTS umbrella_stats CASCADE;

-- 2. Drop triggers first
DROP TRIGGER IF EXISTS update_umbrella_stats_trigger ON trend_submissions;
DROP TRIGGER IF EXISTS create_umbrella_on_submission ON trend_submissions;
DROP TRIGGER IF EXISTS update_umbrella_on_trend_insert ON trend_submissions;

-- 3. Drop functions that reference trend_umbrellas
DROP FUNCTION IF EXISTS update_trend_umbrella_stats() CASCADE;
DROP FUNCTION IF EXISTS find_or_create_umbrella() CASCADE;
DROP FUNCTION IF EXISTS create_trend_umbrella() CASCADE;
DROP FUNCTION IF EXISTS auto_create_trend_umbrella() CASCADE;

-- 4. Remove the foreign key and column from trend_submissions
DO $$ 
BEGIN
  -- Drop all possible foreign key constraints
  ALTER TABLE trend_submissions DROP CONSTRAINT IF EXISTS trend_submissions_trend_umbrella_id_fkey;
  ALTER TABLE trend_submissions DROP CONSTRAINT IF EXISTS fk_trend_umbrella;
  ALTER TABLE trend_submissions DROP CONSTRAINT IF EXISTS trend_umbrella_fk;
  
  -- Drop the column if it exists
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' 
             AND table_name = 'trend_submissions' 
             AND column_name = 'trend_umbrella_id') THEN
    ALTER TABLE trend_submissions DROP COLUMN trend_umbrella_id CASCADE;
  END IF;
END $$;

-- 5. Drop any indexes related to trend_umbrellas
DROP INDEX IF EXISTS idx_trend_submissions_umbrella;
DROP INDEX IF EXISTS idx_trend_umbrellas_name;
DROP INDEX IF EXISTS idx_trend_umbrellas_embedding;
DROP INDEX IF EXISTS idx_trend_umbrellas_status;

-- 6. Finally, drop the trend_umbrellas table itself
DROP TABLE IF EXISTS trend_umbrellas CASCADE;

-- 7. Check if there are any remaining references
SELECT 
    'Checking for remaining references to trend_umbrellas...' as status;

-- Check triggers
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name
FROM pg_trigger 
WHERE tgname LIKE '%umbrella%';

-- Check functions
SELECT 
    proname as function_name 
FROM pg_proc 
WHERE prosrc LIKE '%trend_umbrella%';

-- Success message
SELECT 'Trend umbrellas completely removed from database!' as result;