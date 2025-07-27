# Quick Setup Guide for Verify Page

## Current Status
✅ Web server is running at: http://localhost:3001
✅ Login page should be open in your browser

## Step 1: Apply Database Changes (Required)

1. **Open Supabase SQL Editor**:
   - Go to: https://supabase.com/dashboard/project/achuavagkhjenaypawij/sql/new
   - Make sure you're logged into Supabase

2. **Copy the SQL**:
   - Open the file: `supabase/fix_verify_page_schema_v2.sql`
   - Copy ALL the contents

3. **Run the SQL**:
   - Paste it into the SQL editor
   - Click the "Run" button
   - You should see "Success. No rows returned" or similar

## Step 2: Login to WaveSight

1. **If you have an account**:
   - Use your existing credentials
   - Email: jeremyuys@gmail.com (or your registered email)
   - Password: (your password)

2. **If you need to create an account**:
   - Click "Sign up" on the login page
   - Use a realistic email like: john.doe@gmail.com
   - Password: TestUser123!

3. **If login fails**:
   - Go to: https://supabase.com/dashboard/project/achuavagkhjenaypawij/auth/users
   - Click "Add user" → "Create new user"
   - Create with email: demo@wavesight.com, password: DemoUser123!

## Step 3: Access the Verify Page

Once logged in:
1. Navigate to: http://localhost:3001/verify
2. You should see the trend verification interface

## What You'll See

The verify page shows:
- **Trend Cards**: Each card displays a trend to review
- **Voting Buttons**: 
  - ✅ "Yes, Trending" - Mark as a valid trend
  - ❌ "Not Trending" - Mark as not a trend
- **Stats Dashboard**: Your daily verifications and earnings
- **Progress Bar**: Shows how many trends you've reviewed

## If No Trends Appear

This means there are no trends in the database yet. To add test trends:

1. Go to the Submit page: http://localhost:3001/submit
2. Submit a test trend
3. Log out and log in with a different account
4. Go back to /verify to see the trend

## Quick Test

To quickly test if everything is working:
1. The SQL script includes 10 test trends
2. After running the SQL, you should immediately see trends on the verify page
3. Try voting on a few trends to test the functionality

---

**Need Help?**
- Check browser console (F12) for errors
- Make sure you're logged in
- Verify the SQL script ran successfully