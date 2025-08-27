-- FIX: Check and update trend_velocity constraint

-- Step 1: Check existing constraints on trend_submissions
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'trend_submissions'::regclass
AND conname LIKE '%velocity%';

-- Step 2: Check what values are currently in the column
SELECT DISTINCT trend_velocity, COUNT(*) 
FROM trend_submissions 
WHERE trend_velocity IS NOT NULL
GROUP BY trend_velocity
ORDER BY trend_velocity;

-- Step 3: Drop the existing constraint if it exists
ALTER TABLE trend_submissions 
DROP CONSTRAINT IF EXISTS trend_submissions_trend_velocity_check;

-- Step 4: Add a new constraint with the correct values
-- These match what we're using in the frontend
ALTER TABLE trend_submissions 
ADD CONSTRAINT trend_submissions_trend_velocity_check 
CHECK (trend_velocity IN (
    'just_starting', 
    'picking_up', 
    'viral', 
    'saturated', 
    'declining',
    NULL  -- Allow NULL values
));

-- Step 5: Verify the constraint was updated
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'trend_submissions'::regclass
AND conname LIKE '%velocity%';

-- Step 6: Test inserting a value
-- This should now work
UPDATE trend_submissions 
SET trend_velocity = 'picking_up'
WHERE id = 'eaf97d24-ce55-4a56-a381-225455f2a564';

-- Step 7: Check if there are similar constraints on other new columns
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'trend_submissions'::regclass
AND (conname LIKE '%size%' OR conname LIKE '%ai_angle%');

-- Step 8: Fix trend_size constraint if needed
ALTER TABLE trend_submissions 
DROP CONSTRAINT IF EXISTS trend_submissions_trend_size_check;

ALTER TABLE trend_submissions 
ADD CONSTRAINT trend_submissions_trend_size_check 
CHECK (trend_size IN (
    'micro', 
    'niche', 
    'viral', 
    'mega', 
    'global',
    NULL
));

-- Step 9: Fix ai_angle constraint if needed  
ALTER TABLE trend_submissions 
DROP CONSTRAINT IF EXISTS trend_submissions_ai_angle_check;

ALTER TABLE trend_submissions 
ADD CONSTRAINT trend_submissions_ai_angle_check 
CHECK (ai_angle IN (
    'using_ai',
    'reacting_to_ai', 
    'ai_tool_viral',
    'ai_technique',
    'anti_ai',
    'not_ai',
    NULL
));

-- Step 10: Verify all constraints are fixed
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'trend_submissions'
AND column_name IN ('trend_velocity', 'trend_size', 'ai_angle')
ORDER BY column_name;

-- Step 11: Show final constraint definitions
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'trend_submissions'::regclass
AND contype = 'c'  -- Check constraints only
ORDER BY conname;