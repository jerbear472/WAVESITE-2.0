-- Drop the trend umbrella trigger and function that's causing RLS errors
-- This trigger tries to update trend_umbrellas table when inserting trends

-- Drop the trigger first
DROP TRIGGER IF EXISTS update_umbrella_stats_trigger ON trend_submissions;

-- Drop the function
DROP FUNCTION IF EXISTS update_trend_umbrella_stats();

-- Also drop the trend_umbrella_id column if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' 
             AND table_name = 'trend_submissions' 
             AND column_name = 'trend_umbrella_id') THEN
    -- First drop the foreign key constraint if it exists
    ALTER TABLE trend_submissions DROP CONSTRAINT IF EXISTS trend_submissions_trend_umbrella_id_fkey;
    
    -- Then drop the column
    ALTER TABLE trend_submissions DROP COLUMN trend_umbrella_id;
  END IF;
END $$;

-- Drop the trend_umbrellas table completely if you don't need it
-- Uncomment the line below if you want to remove the table entirely
-- DROP TABLE IF EXISTS trend_umbrellas CASCADE;

-- Success message
SELECT 'Trend umbrella trigger and references removed successfully!' as result;