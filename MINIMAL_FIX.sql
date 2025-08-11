-- MINIMAL FIX - Just drop the problematic view and fix the column

-- Drop the view that's blocking us
DROP VIEW IF EXISTS available_trends_for_verification CASCADE;

-- Fix just the validation_count column (the one likely causing overflow)
ALTER TABLE trend_submissions
ALTER COLUMN validation_count TYPE INTEGER USING COALESCE(validation_count, 0)::INTEGER;

-- Recreate the view
CREATE OR REPLACE VIEW available_trends_for_verification AS
SELECT * FROM trend_submissions
WHERE status IN ('submitted', 'validating');

-- Grant permissions
GRANT SELECT ON available_trends_for_verification TO authenticated;
GRANT SELECT ON available_trends_for_verification TO anon;

-- Test if this fixed it
SELECT 
    column_name,
    data_type,
    CASE 
        WHEN data_type = 'integer' THEN 'FIXED - Can handle voting now'
        WHEN data_type = 'smallint' THEN 'STILL BROKEN - Will overflow'
        ELSE data_type
    END as status
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'trend_submissions'
AND column_name = 'validation_count';