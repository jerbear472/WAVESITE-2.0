-- FIX: Update earnings to correct user_id (CORRECTED VERSION)

-- Step 1: Get your current auth user ID
SELECT 
    'Your current auth user ID' as info,
    auth.uid()::text as value;

-- Step 2: Find the user ID for jeremyuys@gmail.com
SELECT 
    'User ID for jeremyuys@gmail.com' as info,
    id::text as value
FROM auth.users 
WHERE email = 'jeremyuys@gmail.com';

-- Step 3: See what user_ids exist in earnings_ledger
SELECT 
    'Unique user IDs in earnings_ledger' as info,
    COUNT(DISTINCT user_id) as count
FROM earnings_ledger;

-- Step 4: Show sample of user_ids in earnings_ledger
SELECT DISTINCT 
    user_id,
    COUNT(*) as earnings_count
FROM earnings_ledger
GROUP BY user_id
ORDER BY earnings_count DESC
LIMIT 5;

-- Step 5: Check if your trends exist
SELECT 
    'Trends for jeremyuys@gmail.com' as info,
    COUNT(*) as count
FROM trend_submissions ts
JOIN auth.users u ON ts.spotter_id = u.id
WHERE u.email = 'jeremyuys@gmail.com';

-- Step 6: Find trends with your email
SELECT 
    ts.id as trend_id,
    ts.spotter_id,
    ts.description,
    ts.created_at,
    u.email
FROM trend_submissions ts
JOIN auth.users u ON ts.spotter_id = u.id
WHERE u.email = 'jeremyuys@gmail.com'
LIMIT 5;

-- Step 7: Check if earnings exist but with wrong user_id
SELECT 
    el.id,
    el.user_id,
    el.amount,
    el.description,
    el.created_at as earnings_created_at,
    ts.spotter_id as trend_spotter_id,
    u.email as user_email
FROM earnings_ledger el
LEFT JOIN trend_submissions ts ON el.trend_id = ts.id
LEFT JOIN auth.users u ON el.user_id = u.id
LIMIT 10;

-- Step 8: FIX - Update earnings to correct user_id
-- First, let's see what would be updated
SELECT 
    'Earnings that need user_id fix' as info,
    COUNT(*) as count
FROM earnings_ledger el
JOIN trend_submissions ts ON el.trend_id = ts.id
JOIN auth.users u ON ts.spotter_id = u.id
WHERE u.email = 'jeremyuys@gmail.com'
AND el.user_id != u.id;

-- Step 9: ACTUAL FIX - Update earnings to match the correct user
-- This will update all earnings to match your current auth user
UPDATE earnings_ledger el
SET user_id = u.id
FROM trend_submissions ts
JOIN auth.users u ON ts.spotter_id = u.id
WHERE el.trend_id = ts.id
AND u.email = 'jeremyuys@gmail.com'
AND el.user_id != u.id;

-- Step 10: Alternative fix - Update ALL earnings for trends you submitted
UPDATE earnings_ledger
SET user_id = (SELECT id FROM auth.users WHERE email = 'jeremyuys@gmail.com')
WHERE trend_id IN (
    SELECT ts.id 
    FROM trend_submissions ts
    JOIN auth.users u ON ts.spotter_id = u.id
    WHERE u.email = 'jeremyuys@gmail.com'
);

-- Step 11: Verify the fix worked
SELECT 
    'Earnings for jeremyuys@gmail.com after fix' as info,
    COUNT(*) as count
FROM earnings_ledger el
JOIN auth.users u ON el.user_id = u.id
WHERE u.email = 'jeremyuys@gmail.com';

-- Step 12: Show your earnings now
SELECT 
    el.amount,
    el.transaction_type,
    el.status,
    el.description,
    el.created_at
FROM earnings_ledger el
JOIN auth.users u ON el.user_id = u.id
WHERE u.email = 'jeremyuys@gmail.com'
ORDER BY el.created_at DESC
LIMIT 10;

-- Step 13: Show total earnings summary
SELECT 
    'Total pending' as status,
    SUM(amount) as total
FROM earnings_ledger el
JOIN auth.users u ON el.user_id = u.id
WHERE u.email = 'jeremyuys@gmail.com'
AND el.status = 'pending'

UNION ALL

SELECT 
    'Total approved' as status,
    SUM(amount) as total
FROM earnings_ledger el
JOIN auth.users u ON el.user_id = u.id
WHERE u.email = 'jeremyuys@gmail.com'
AND el.status = 'approved'

UNION ALL

SELECT 
    'Total all' as status,
    SUM(amount) as total
FROM earnings_ledger el
JOIN auth.users u ON el.user_id = u.id
WHERE u.email = 'jeremyuys@gmail.com';