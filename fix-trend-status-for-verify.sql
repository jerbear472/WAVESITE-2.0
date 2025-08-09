-- Fix trend submission status to ensure they appear in the verify page
-- The verify page looks for status: 'pending', 'submitted', or 'validating'

-- First, let's check what statuses we currently have
SELECT 
    status,
    COUNT(*) as count,
    MIN(created_at) as oldest,
    MAX(created_at) as newest
FROM public.trend_submissions
GROUP BY status
ORDER BY count DESC;

-- Check if there are any trends that should be available for validation
-- but have the wrong status
SELECT 
    id,
    trend_name,
    status,
    created_at,
    approve_count,
    reject_count,
    validation_count
FROM public.trend_submissions
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 20;

-- If needed, update any trends that are stuck in an incorrect status
-- This will reset recent trends that haven't been validated yet to 'pending'
UPDATE public.trend_submissions
SET status = 'pending'
WHERE status NOT IN ('pending', 'submitted', 'validating', 'approved', 'rejected')
  AND created_at > NOW() - INTERVAL '7 days'
  AND (approve_count = 0 OR approve_count IS NULL)
  AND (reject_count < 3 OR reject_count IS NULL);

-- Also ensure that trends with no votes are set to pending
UPDATE public.trend_submissions
SET status = 'pending'
WHERE (validation_count = 0 OR validation_count IS NULL)
  AND status NOT IN ('pending', 'submitted', 'validating')
  AND created_at > NOW() - INTERVAL '7 days';

-- Verify the fix
SELECT 
    'Trends available for validation:' as info,
    COUNT(*) as total_pending_trends
FROM public.trend_submissions
WHERE status IN ('pending', 'submitted', 'validating')
  AND created_at > NOW() - INTERVAL '7 days';