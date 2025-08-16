# Instructions to Fix the Earnings System

## Problem Summary
The earnings system is not properly tracking pending earnings when trends are submitted. The main issues are:
1. Earnings are not being added to the `earnings_ledger` table when trends are submitted
2. Pending earnings are not showing up on the earnings page
3. The trigger function references wrong table names

## Solution Steps

### Step 1: Apply the Database Fix

1. Open your Supabase Dashboard
2. Go to the SQL Editor
3. Copy the entire contents of the file `FIX_EARNINGS_SYSTEM.sql`
4. Paste it into the SQL editor
5. Click "Run" to execute

This will:
- Create/update the `earnings_ledger` table with correct columns
- Set up proper trigger functions for `trend_submissions` table
- Add earnings tracking for both submissions and validations
- Fix any existing data retroactively

### Step 2: Verify the Fix

After running the SQL, verify it worked by running this query:

```sql
-- Check if triggers are active
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND event_object_table = 'trend_submissions';

-- Check recent earnings
SELECT * FROM earnings_ledger 
ORDER BY created_at DESC 
LIMIT 10;

-- Check pending earnings count
SELECT COUNT(*), SUM(amount) as total_pending 
FROM earnings_ledger 
WHERE status = 'pending';
```

### Step 3: Test the System

1. Submit a new trend through the app
2. Check that an entry appears in `earnings_ledger` with status 'pending'
3. Check that pending earnings show up on the earnings page
4. Verify the amount is calculated correctly ($0.25 base × multipliers)

## Expected Behavior After Fix

### When a trend is submitted:
1. Base amount: $0.25
2. Multipliers applied:
   - Tier multiplier (learning: 1x, verified: 1.5x, elite: 2x, master: 3x)
   - Daily streak multiplier (2+ days: 1.2x, 7+ days: 1.5x, etc.)
   - Session position multiplier (2nd trend: 1.2x, 3rd: 1.5x, etc.)
3. Entry created in `earnings_ledger` with status 'pending'
4. User's `pending_earnings` updated in `user_profiles`
5. Pending earnings immediately visible on earnings page

### When a trend is approved:
1. `earnings_ledger` entry status changes to 'approved'
2. Amount moves from pending to available balance

### When a validation is made:
1. $0.01 base × tier multiplier
2. Immediately added as 'approved' earnings

## Troubleshooting

If earnings are still not showing:

1. **Check the triggers exist:**
```sql
SELECT * FROM information_schema.triggers 
WHERE trigger_name LIKE '%earnings%';
```

2. **Check user profiles have earning columns:**
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND column_name LIKE '%earning%';
```

3. **Manually test the trigger function:**
```sql
-- This should create an earnings_ledger entry
INSERT INTO trend_submissions (spotter_id, description, category, status) 
VALUES (
  (SELECT id FROM auth.users LIMIT 1),
  'Test Trend',
  'other',
  'submitted'
);

-- Check if earnings were created
SELECT * FROM earnings_ledger 
ORDER BY created_at DESC 
LIMIT 1;
```

## Contact Support
If issues persist after following these steps, the problem may be with:
- RLS policies blocking access
- Missing database permissions
- Frontend not properly querying the data

Check the browser console and Supabase logs for any errors.