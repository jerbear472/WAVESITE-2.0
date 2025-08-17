-- QUICK FIX: Disable duplicate trigger that's causing the hang

-- 1. Immediately disable the duplicate trigger
ALTER TABLE trend_submissions DISABLE TRIGGER calculate_trend_earnings_trigger;

-- 2. Verify it's disabled
SELECT 
    t.tgname as trigger_name,
    CASE 
        WHEN t.tgenabled = 'D' THEN '❌ DISABLED'
        WHEN t.tgenabled = 'O' THEN '✅ ENABLED'
    END as status
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'trend_submissions'
    AND t.tgname IN ('calculate_trend_earnings_trigger', 'create_earnings_on_submission');

-- 3. Test by inserting a test trend (optional)
-- This should complete quickly if the fix worked
/*
INSERT INTO trend_submissions (
    spotter_id,
    title,
    description,
    category,
    status,
    payment_amount
) VALUES (
    (SELECT id FROM auth.users LIMIT 1),
    'Test Trend After Fix',
    'Testing if submission works after disabling duplicate trigger',
    'technology',
    'submitted',
    0.25
) RETURNING id;
*/

-- 4. If still having issues, disable ALL triggers temporarily
-- ALTER TABLE trend_submissions DISABLE TRIGGER ALL;
-- Then try submitting and re-enable one by one to find the problematic one

SELECT 'Duplicate trigger disabled. Try submitting a trend now!' as message;