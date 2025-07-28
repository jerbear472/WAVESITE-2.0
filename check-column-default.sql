-- Check the default value for the status column
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'trend_submissions'
AND column_name = 'status';

-- If the default is still 'pending', we need to fix it:
-- ALTER TABLE trend_submissions ALTER COLUMN status SET DEFAULT 'submitted';

-- Also check if there are any triggers that might set status
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'trend_submissions';