# Apply Awaiting Verification Earnings System

This guide explains how to set up the awaiting verification earnings system that properly tracks money for submitted trends that haven't been verified yet.

## Overview

The system separates earnings into three categories:
1. **Awaiting Verification** - Money from trends submitted but not yet verified ($1.00 per trend)
2. **Approved/Available** - Money from verified trends (can be cashed out)
3. **Paid** - Money that has already been cashed out

## How It Works

1. **When a trend is submitted**: $1.00 is added to `awaiting_verification` balance
2. **When a trend gets first approval**: Money moves from `awaiting_verification` to `total_earnings`
3. **When a trend is rejected**: Money is removed from `awaiting_verification`
4. **Validators earn**: $0.01 per validation immediately added to their `total_earnings`

## Installation Steps

### Step 1: Apply Database Changes

Run the SQL script to add the awaiting_verification column and set up triggers:

```bash
# Option 1: Use the Node.js script
node apply-awaiting-verification.js

# Option 2: Run SQL directly in Supabase Dashboard
# Go to SQL Editor and paste contents of add-awaiting-verification-earnings.sql
```

### Step 2: Verify Database Changes

Check that the following have been created:
- `profiles.awaiting_verification` column
- `handle_trend_submission_earnings()` trigger
- `handle_trend_verification_earnings()` trigger
- `handle_validation_reward()` trigger
- Updated `earnings_ledger` status constraint

### Step 3: Deploy Frontend Changes

The following files have been updated:
- `/web/app/(authenticated)/earnings/page.tsx` - Shows awaiting_verification amount
- `/web/app/(authenticated)/dashboard/page.tsx` - Updated stats interface
- `/web/app/(authenticated)/verify/page.tsx` - Validation page (already working)

## Testing the System

### Test Trend Submission Flow:
1. Submit a new trend
2. Check that $1.00 is added to `awaiting_verification` in earnings page
3. The money should show as "Awaiting Verification"

### Test Verification Flow:
1. Have another user verify the trend
2. When first approval comes in, money moves to "Available" balance
3. Validator gets $0.01 added to their earnings

### Test Rejection Flow:
1. Submit a trend
2. Have 2+ users reject it
3. Money should be removed from `awaiting_verification`

## SQL Query to Check Status

```sql
-- Check a user's earnings breakdown
SELECT 
    id,
    email,
    total_earnings,
    awaiting_verification,
    pending_earnings
FROM profiles
WHERE email = 'user@example.com';

-- Check earnings ledger entries
SELECT 
    el.*,
    ts.description as trend_description,
    ts.validation_status
FROM earnings_ledger el
LEFT JOIN trend_submissions ts ON el.trend_submission_id = ts.id
WHERE el.user_id = 'USER_ID_HERE'
ORDER BY el.created_at DESC;

-- Check trends awaiting verification
SELECT 
    ts.id,
    ts.description,
    ts.spotter_id,
    ts.validation_count,
    ts.approve_count,
    ts.reject_count,
    p.email as spotter_email
FROM trend_submissions ts
JOIN profiles p ON ts.spotter_id = p.id
WHERE ts.validation_status = 'pending'
ORDER BY ts.created_at DESC;
```

## Troubleshooting

### Issue: awaiting_verification column not found
**Solution**: Run the SQL migration again or manually add the column:
```sql
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS awaiting_verification DECIMAL(10,2) DEFAULT 0.00;
```

### Issue: Earnings not updating when trends are submitted
**Solution**: Check that triggers are properly installed:
```sql
-- List all triggers on trend_submissions
SELECT * FROM pg_trigger 
WHERE tgrelid = 'public.trend_submissions'::regclass;
```

### Issue: Money not moving when trends are verified
**Solution**: Ensure the vote counting trigger is working:
```sql
-- Check if update_trend_vote_counts trigger exists
SELECT * FROM pg_trigger 
WHERE tgname = 'update_vote_counts_trigger';
```

## Rollback Instructions

If you need to rollback these changes:

```sql
-- Remove the awaiting_verification column
ALTER TABLE public.profiles DROP COLUMN IF EXISTS awaiting_verification;

-- Remove the new triggers
DROP TRIGGER IF EXISTS on_trend_submission_earnings ON public.trend_submissions;
DROP TRIGGER IF EXISTS on_trend_verification_earnings ON public.trend_submissions;
DROP TRIGGER IF EXISTS on_validation_reward ON public.trend_validations;

-- Revert earnings_ledger status constraint
ALTER TABLE public.earnings_ledger 
DROP CONSTRAINT IF EXISTS earnings_ledger_status_check;

ALTER TABLE public.earnings_ledger 
ADD CONSTRAINT earnings_ledger_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'paid', 'cancelled'));
```

## Support

If you encounter issues:
1. Check the Supabase logs for trigger execution errors
2. Verify RLS policies aren't blocking the operations
3. Ensure all users have profiles created
4. Check that earnings_ledger table exists with correct structure

## Next Steps

After successful implementation:
1. Monitor the first few trend submissions to ensure proper earnings tracking
2. Verify cash out functionality still works with the new system
3. Consider adding email notifications when earnings move from awaiting to approved