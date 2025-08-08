# Voting System Documentation

## Overview
The WaveSite voting system allows validators to approve or reject submitted trends. The system tracks votes in real-time and automatically updates trend statuses based on voting thresholds.

## Voting Rules

### Validation Thresholds
- **1 Approve Vote** = Trend is validated/approved ✅
- **2 Reject Votes** = Trend is rejected ❌
- **Pending** = Less than threshold votes

## Database Structure

### Tables

#### `trend_submissions`
Stores trend information with vote counts:
- `approve_count` - Number of approve/verify votes
- `reject_count` - Number of reject votes
- `validation_status` - Current status (pending/approved/rejected)
- `validation_count` - Total number of votes

#### `trend_validations`
Stores individual votes:
- `trend_id` - Reference to the trend
- `validator_id` - User who voted
- `vote` - Vote type ('verify' or 'reject')
- `confidence_score` - Validator's confidence in their vote

## How It Works

### 1. Vote Submission
When a validator votes on a trend:
1. A record is created in `trend_validations`
2. Trigger automatically updates counts in `trend_submissions`
3. Status is recalculated based on thresholds

### 2. Vote Synchronization
The system uses database triggers to keep vote counts synchronized:
- `update_trend_vote_counts()` - Trigger function that updates counts
- Runs automatically on INSERT/UPDATE/DELETE of votes

### 3. Timeline Display
The timeline component fetches trends with vote counts:
```javascript
// Vote counts are displayed in the UI
Votes: {trend.approve_count || 0}✅ {trend.reject_count || 0}❌
```

## Applying the Fix

### Step 1: Apply Database Changes
```bash
# Using the SQL file directly
psql -h your-db-host -U your-username -d your-database -f fix-vote-count-sync.sql

# Or using the Node.js script
npm install
node apply-vote-count-fix.js
```

### Step 2: Verify Installation
Check that the following exist:
- Columns: `approve_count`, `reject_count`, `validation_status` in `trend_submissions`
- Trigger: `update_vote_counts_on_validation` on `trend_validations`
- View: `trend_vote_summary` for easy querying

### Step 3: Test the System
1. Submit a test trend
2. Have a validator approve it (should change to approved after 1 vote)
3. Submit another trend and have 2 validators reject it (should change to rejected)
4. Check the timeline shows correct counts

## Troubleshooting

### Vote counts not updating
1. Check if trigger exists:
```sql
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'update_vote_counts_on_validation';
```

2. Manually sync counts:
```sql
UPDATE public.trend_submissions ts
SET 
    approve_count = (SELECT COUNT(*) FROM trend_validations WHERE trend_id = ts.id AND vote = 'verify'),
    reject_count = (SELECT COUNT(*) FROM trend_validations WHERE trend_id = ts.id AND vote = 'reject');
```

### Timeline not showing votes
1. Check browser console for errors
2. Verify the user is authenticated
3. Check that the API is returning vote count fields

## Payments Integration

When a trend is approved (1 approve vote):
- Validator receives $0.05 for validation
- Trend spotter receives bounty amount (if not already paid)
- Payments are tracked in `earnings_ledger` table

## Security

- Only authenticated users can vote
- Each user can only vote once per trend (UNIQUE constraint)
- Vote counts are server-side calculated (not client-side)
- RLS policies ensure data integrity

## Future Enhancements

Potential improvements to consider:
- Weighted voting based on validator reputation
- Time-based voting windows
- Consensus requirements based on trend category
- ML-assisted validation suggestions