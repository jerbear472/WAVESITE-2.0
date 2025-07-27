# Earnings System Test Guide

## Overview
The earnings system has been successfully implemented with the following features:
- 10 cents pending earning on trend submission
- Verification voting system with majority rule
- Earnings approved when majority verifies
- Cash out only uses approved earnings

## How to Test the Complete Flow

### 1. Run the SQL Script
First, execute the earnings system SQL script to set up the database:
```bash
# In your Supabase SQL editor, run:
/Users/JeremyUys_1/Desktop/WAVESITE2/create-earnings-system.sql
```

### 2. Submit a Trend
1. Go to `/submit` page
2. Fill out the trend submission form
3. Submit the trend
4. You should see "+$0.10 Earned!" message
5. The earning is now in PENDING status

### 3. Check Earnings Page
1. Go to `/earnings` page
2. You should see:
   - Pending Earnings: $0.10
   - Available to Cash Out: $0.00 (needs approval first)
   - Transaction History showing "Trend Submission" with "Awaiting Verification" status

### 4. Verify Trends (Need 3+ Votes)
1. Log in with different user accounts (need at least 3 other users)
2. Go to `/verify` page with each user
3. Vote on the submitted trend:
   - If majority vote "Verify as Trend" → earnings become approved
   - If majority vote "Not a Trend" → earnings are rejected
   - Tie votes favor the submitter
4. Each validator earns $0.02 per vote (instantly approved)

### 5. Check Approved Earnings
1. Go back to `/earnings` page with original user
2. After majority verification, you should see:
   - Pending Earnings: $0.00
   - Available to Cash Out: $0.10
   - Transaction History showing "Verified" status

### 6. Cash Out (Minimum $5.00)
1. When you have $5.00+ in approved earnings
2. Click "Cash Out" button
3. Enter your Venmo username
4. Submit cash out request

## Database Schema

### Key Tables Created:
1. **earnings_ledger** - Tracks all earnings transactions
2. **trend_validations** - Records voting on trends
3. **Profiles columns** - Added earnings_pending, earnings_approved, earnings_paid

### Automatic Triggers:
1. **add_earnings_on_submission** - Adds 10 cents pending when trend submitted
2. **check_verification_on_vote** - Checks majority and approves/rejects earnings

## Testing Different Scenarios

### Scenario 1: Trend Gets Verified
- Submit trend → +$0.10 pending
- 3 users vote: 2 verify, 1 reject
- Result: $0.10 becomes approved

### Scenario 2: Trend Gets Rejected
- Submit trend → +$0.10 pending
- 3 users vote: 1 verify, 2 reject
- Result: $0.10 is removed from pending

### Scenario 3: Tie Vote
- Submit trend → +$0.10 pending
- 4 users vote: 2 verify, 2 reject
- Result: $0.10 becomes approved (tie favors submitter)

### Scenario 4: Validator Earnings
- Each validation vote → +$0.02 instantly approved
- No verification needed for validator earnings

## API Endpoints Used

1. **Submit Trend**: Creates entry in trend_submissions with status='pending'
2. **Vote on Trend**: Creates entry in trend_validations with vote='verify' or 'reject'
3. **Fetch Earnings**: Queries profiles table for earnings summary
4. **Cash Out**: Creates entry in cashout_requests (when implemented)

## Troubleshooting

If trends aren't showing in verify page:
- Make sure trends have status='pending' (not 'submitted')
- Ensure user didn't submit the trend themselves
- Check that user hasn't already voted on the trend

If earnings aren't updating:
- Check that database triggers were created successfully
- Verify that trend_submissions table has status column
- Ensure profiles table has earnings columns

## Next Steps

To fully test:
1. Create multiple test user accounts
2. Submit several trends
3. Vote with different patterns
4. Monitor earnings changes
5. Test cash out when reaching $5.00