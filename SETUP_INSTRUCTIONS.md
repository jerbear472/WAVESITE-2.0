# Database Setup Instructions

## Quick Setup - Run in Supabase SQL Editor

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/aicahushpcslwjwrlqbo
2. Navigate to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy and paste the contents of `supabase/COMPLETE_SCHEMA.sql`
5. Click **Run** button

## What This Schema Creates

### Core Tables
- ✅ `user_profiles` - Main user data table
- ✅ `profiles` - View alias for compatibility with frontend  
- ✅ `trend_submissions` - All trend submissions
- ✅ `trend_validations` - Voting/validation data
- ✅ `earnings_ledger` - Track all earnings
- ✅ `cashout_requests` - Venmo cashout requests
- ✅ `user_account_settings` - User preferences

### Mobile App Tables  
- ✅ `captured_trends` - Trends captured from TikTok/Instagram
- ✅ `scroll_sessions` - Track scrolling sessions for earnings

### Support Tables
- ✅ `submission_queue` - Failsafe for submissions

### Features
- ✅ Auto-create user profile on signup (trigger)
- ✅ Auto-update timestamps (triggers)
- ✅ Row Level Security policies
- ✅ Helper functions (cast_trend_vote, get_user_dashboard_stats)
- ✅ Proper indexes for performance

## After Running Schema

The database will be ready for:
1. User registration/login
2. Trend submissions
3. Validation/voting
4. Earnings tracking
5. Mobile app integration

## Test It

After running the schema, test by:
1. Creating a new account on the website
2. Submitting a trend
3. Voting on trends
4. Checking earnings

## Troubleshooting

If you get errors about "already exists":
- That's OK! It means some tables were already created
- The schema uses `IF NOT EXISTS` for safety

If user registration still fails:
- Check the auth trigger is created
- Verify RLS policies are in place
- Check browser console for specific errors