# Verify Page Setup Instructions

## Overview
The verify page allows users to judge trends submitted by other WaveSight users. This guide will help you set it up.

## Step 1: Apply Database Schema Updates

1. Go to your Supabase SQL Editor:
   https://supabase.com/dashboard/project/achuavagkhjenaypawij/sql/new

2. Copy and paste the contents of `supabase/fix_verify_page_schema_v2.sql` into the SQL editor

3. Click "Run" to execute the SQL

This will:
- Add the missing `platform` column to trend_submissions
- Update the verify page to use `user_profiles` table directly
- Add confidence_score to trend_validations
- Update RLS policies for proper access
- Create helper functions for fetching trends and stats
- Add sample test data if no trends exist

## Step 2: Access the Verify Page

1. Make sure your web server is running:
   ```bash
   cd web
   npm run dev
   ```

2. Navigate to: http://localhost:3001/login

3. Log in with your credentials (or create an account if you haven't)

4. Once logged in, go to: http://localhost:3001/verify

## Step 3: How the Verify Page Works

### For Users:
- View trends submitted by other users
- Judge each trend as "Trending" or "Not Trending"
- Earn rewards for accurate validations
- Track daily stats (verified count, earnings, accuracy)

### Features:
- **Trend Cards**: Display trend details including:
  - Screenshot/thumbnail
  - Creator information
  - Engagement metrics (likes, comments, shares, views)
  - Hashtags
  - Platform (TikTok, Instagram, etc.)
  
- **Validation Actions**:
  - ✅ "Yes, Trending" - Confirms the trend is valid
  - ❌ "Not Trending" - Rejects the trend
  
- **Progress Tracking**: Shows how many trends you've reviewed

- **Stats Dashboard**: 
  - Trends verified today
  - Earnings today
  - Accuracy score

## Step 4: Admin Features

As an admin (jeremyuys), you have additional capabilities:
- View all trends regardless of status
- Access admin dashboard at `/admin`
- Manage user permissions

## Step 5: Testing

1. Submit some test trends from the Submit page (`/submit`)
2. Log in with a different account (or incognito mode)
3. Go to the Verify page to see and judge the trends
4. Each trend needs 3 validations to be approved

## Troubleshooting

### No trends appearing?
- Check if trends exist in the database
- Ensure you're not trying to verify your own trends
- Run the SQL script to add test data

### Permission errors?
- Make sure you're logged in
- Check that RLS policies were applied correctly
- Verify your user exists in user_profiles table

### Page not loading?
- Check browser console for errors
- Ensure Supabase connection is working
- Verify environment variables are set correctly

## Next Steps

Once the verify page is working, you can:
1. Customize the validation rewards system
2. Add more sophisticated trend analysis
3. Implement trend similarity detection
4. Create leaderboards for top validators

The verify page is a core component of the WaveSight platform, enabling crowd-sourced validation of trending content!