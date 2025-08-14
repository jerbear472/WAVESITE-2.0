# Deploy Earnings Migration

## How to Deploy the Migration

Since the Supabase CLI is not linked to the project, you need to deploy the migration manually through the Supabase Dashboard.

### Steps:

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/aicahushpcslwjwrlqbo
   - Navigate to the SQL Editor

2. **Run the Hotfix (if you get "cannot change return type" errors)**
   - Copy the entire contents of: `HOTFIX_DROP_FUNCTIONS.sql`
   - Paste it into the SQL Editor
   - Click "Run" to execute

3. **Run the Main Migration**
   - Copy the entire contents of: `supabase/migrations/20250114_complete_earnings_with_approval_logic.sql`
   - Paste it into the SQL Editor
   - Click "Run" to execute

### What This Migration Does:

✅ **Fixed Validation Rate**: $0.02 per validation (was incorrectly $0.10)
✅ **Pending Earnings**: Trends start as PENDING until approved
✅ **Approval Logic**: 2+ YES votes moves earnings from pending to approved
✅ **Rejection Logic**: 2+ NO votes cancels pending earnings
✅ **Dual Streak System**: Both session streaks and daily streaks work

### Key Changes:

1. **Base Rates**:
   - Trend submission: $0.25 (pending)
   - Validation vote: $0.02 (approved immediately)
   - Approval bonus: $0.50 (when trend approved)

2. **Earnings Flow**:
   - User submits trend → PENDING earnings ($0.25 × multipliers)
   - Gets 2 YES votes → APPROVED earnings (can cash out)
   - Gets 2 NO votes → CANCELLED (pending earnings removed)

3. **Multipliers**:
   - Tier: 0.5x to 3.0x
   - Session streak: 1.0x to 2.5x (rapid submissions within 5 min)
   - Daily streak: 1.0x to 2.5x (consecutive days)

### Verification After Deploy:

Run this query to verify the functions exist:
```sql
-- Check if functions are installed
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'calculate_trend_submission_earnings',
  'calculate_validation_earnings', 
  'handle_validation_vote',
  'get_tier_multiplier',
  'get_session_streak_multiplier',
  'get_daily_streak_multiplier'
);
```

### Test the System:

```sql
-- Check a user's earnings summary
SELECT * FROM get_user_earnings_summary('YOUR_USER_ID_HERE');
```