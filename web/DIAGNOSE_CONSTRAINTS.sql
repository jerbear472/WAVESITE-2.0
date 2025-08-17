-- DIAGNOSE: What constraints are blocking us?

-- 1. Show ALL check constraints on trend_submissions
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'trend_submissions'::regclass
AND contype = 'c'  -- Check constraints
ORDER BY conname;

-- 2. Show column information for our new fields
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'trend_submissions'
AND column_name IN ('trend_velocity', 'trend_size', 'ai_angle', 'sentiment', 'audience_age', 'category_answers', 'velocity_metrics', 'title')
ORDER BY column_name;

-- 3. Check if the columns even exist
SELECT 
    'trend_velocity exists' as check_item,
    EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trend_submissions' 
        AND column_name = 'trend_velocity'
    ) as result
UNION ALL
SELECT 
    'trend_size exists' as check_item,
    EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trend_submissions' 
        AND column_name = 'trend_size'
    ) as result
UNION ALL
SELECT 
    'ai_angle exists' as check_item,
    EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trend_submissions' 
        AND column_name = 'ai_angle'
    ) as result;

-- 4. Try to see what values are currently stored (if any)
SELECT 
    trend_velocity,
    COUNT(*) as count
FROM trend_submissions
WHERE trend_velocity IS NOT NULL
GROUP BY trend_velocity
LIMIT 10;