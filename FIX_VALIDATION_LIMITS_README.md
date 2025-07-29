# Validation Limits Fix - Complete Guide

This fix addresses issues with hourly and daily validation limits on the verify page.

## What Was Fixed

1. **Database Functions**:
   - Fixed `check_rate_limit` function to properly handle hourly/daily resets
   - Improved `increment_validation_count` with better boundary detection
   - Added proper timezone handling for accurate reset times

2. **Frontend (Verify Page)**:
   - Enhanced rate limit display showing current/max values
   - Added automatic refresh every 30 seconds
   - Improved error handling and optimistic UI updates
   - Better reset time display (shows minutes remaining when < 1 hour)
   - Added manual refresh button

3. **New Features**:
   - Admin function to adjust user limits: `set_user_validation_limits`
   - Monitoring view: `validation_rate_limits_status`
   - Test function for debugging: `test_validation_limits`

## How to Apply the Fix

### Step 1: Apply Database Changes

**Option A: Using Supabase Dashboard (Recommended)**
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the entire contents of `fix-validation-limits-complete.sql`
4. Paste and execute the SQL

**Option B: Using the Node.js Script**
```bash
cd /Users/JeremyUys_1/Desktop/wavesite2
npm install
node apply-validation-limits-fix.js
```

### Step 2: Verify the Fix

Test that the functions are working:
```bash
node test-validation-limits.js
```

### Step 3: Deploy Frontend Changes

The verify page (`web/app/(authenticated)/verify/page.tsx`) has been updated with:
- Better rate limit checking and display
- Automatic refresh of limits
- Improved UI for showing remaining validations

Make sure to deploy these changes to your production environment.

## How It Works

### Rate Limits
- **Hourly Limit**: 20 validations per hour (resets at the start of each hour)
- **Daily Limit**: 100 validations per day (resets at midnight)

### Reset Logic
1. When checking limits, the system compares the last validation timestamp with current time
2. If a new day has started, both daily and hourly counters reset
3. If a new hour has started (same day), only the hourly counter resets
4. The UI shows exact reset times and remaining counts

### UI Updates
- Progress bars show visual representation of remaining limits
- Color coding: Blue for hourly, Green for daily
- Warning message appears when limits are reached
- Automatic refresh keeps the display current

## Customizing Limits

To change default limits for all users:
```sql
UPDATE validation_rate_limits 
SET hourly_limit = 30, daily_limit = 150 
WHERE hourly_limit = 20;
```

To set custom limits for a specific user:
```sql
SELECT set_user_validation_limits(
  'user-uuid-here'::UUID,  -- User ID
  30,                      -- New hourly limit
  200                      -- New daily limit
);
```

## Monitoring

View all users' rate limit status:
```sql
SELECT * FROM validation_rate_limits_status 
ORDER BY validations_today DESC;
```

## Troubleshooting

1. **Limits not resetting**: Check server timezone settings
2. **Incorrect counts**: Run `test_validation_limits(user_id)` to debug
3. **UI not updating**: Ensure the frontend is deployed with latest changes

## Technical Details

The fix implements:
- Row-level locking to prevent race conditions
- Proper timezone handling for global users
- Optimistic UI updates with server reconciliation
- Automatic cleanup of stale data

For any issues, check the browser console for rate limit logs.