-- Debug script to check why trends aren't showing on verify page

-- 1. Check what statuses exist in trend_submissions
SELECT 
    status, 
    validation_status,
    COUNT(*) as count
FROM trend_submissions
GROUP BY status, validation_status
ORDER BY count DESC;

-- 2. Check recent trends and their statuses
SELECT 
    id,
    description,
    status,
    validation_status,
    validation_count,
    approve_count,
    reject_count,
    created_at,
    spotter_id
FROM trend_submissions
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check the trend_status enum values
SELECT 
    e.enumlabel as status_value
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'trend_status'
ORDER BY e.enumsortorder;

-- 4. Check if there are any trends with 'submitted' status
SELECT COUNT(*) as submitted_count
FROM trend_submissions
WHERE status = 'submitted';

-- 5. Check if validation_status is being used instead of status
SELECT COUNT(*) as pending_validation_count
FROM trend_submissions
WHERE validation_status = 'pending' 
   OR validation_status IS NULL;

-- 6. Get trends that SHOULD appear on verify page (pending validation)
SELECT 
    id,
    description,
    status,
    validation_status,
    validation_count,
    created_at
FROM trend_submissions
WHERE (validation_status = 'pending' OR validation_status IS NULL OR validation_count = 0)
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- 7. Check if the status column has a default value
SELECT 
    column_name,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'trend_submissions'
  AND column_name IN ('status', 'validation_status');