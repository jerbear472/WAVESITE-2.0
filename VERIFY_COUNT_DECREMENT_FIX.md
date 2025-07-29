# Verify Page Count Decrement Fix

## Overview
Fixed the verify page to ensure daily and hourly validation counts decrement immediately when a new verification is submitted.

## Changes Made

### 1. **Optimistic UI Updates** (web/app/(authenticated)/verify/page.tsx)
- Moved the local state update to happen BEFORE the database call
- This ensures the UI shows the decremented count immediately
- Fixed the `can_validate` calculation to properly check if counts will be > 0 after decrement

### 2. **Removed Delayed Rate Limit Check**
- Removed the `setTimeout` that was calling `checkRateLimit()` after 1 second
- This was overwriting the optimistic update with stale data from the server
- Now only refreshes rate limit when all trends are verified

### 3. **Error Handling**
- Added rollback logic to revert the optimistic update if the server call fails
- This ensures data consistency between UI and database

## How It Works

1. User clicks verify/reject button
2. UI immediately decrements both daily and hourly counts (optimistic update)
3. Validation is saved to database
4. Rate limit increment function is called on the server
5. If server call fails, UI reverts to previous state
6. If successful, UI remains with the decremented values

## Testing

Created `test-rate-limit-decrement.js` to verify the functionality:
```bash
node test-rate-limit-decrement.js <user-id>
```

This script:
- Checks initial rate limits
- Simulates a validation
- Verifies counts decreased correctly

## Database Logic
The database tracks counts that increment (`validations_today`, `validations_this_hour`), but the UI calculates and displays the remaining validations by subtracting from the limits. This is working correctly - we just needed to fix the UI update timing.

## Result
Users will now see their daily and hourly counts decrease immediately when they submit a verification, providing better visual feedback.