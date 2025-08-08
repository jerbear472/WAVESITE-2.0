# Fix for Trend Submission Error

## Problem
When submitting a trend on the scroll page, the submission fails because:
1. The code was trying to insert a `bounty_amount` field that doesn't exist in the database
2. Some social media metadata columns might be missing from the `trend_submissions` table

## Solution Applied

### 1. Code Fix (Already Applied)
- Modified `/web/app/(authenticated)/scroll/page.tsx` to remove the `bounty_amount` field
- Payment amount is now stored in the `evidence` JSON field instead

### 2. Database Fix (You Need to Apply)
To add any missing columns to your database:

1. **Go to your Supabase Dashboard**
   - Navigate to https://supabase.com/dashboard
   - Select your project

2. **Open the SQL Editor**
   - Click on "SQL Editor" in the left sidebar

3. **Run the Migration Script**
   - Copy and paste the contents of `fix-submission-columns.sql`
   - Click "Run" to execute the script
   - This will add any missing columns like:
     - platform
     - creator_handle, creator_name
     - post_caption
     - likes_count, comments_count, shares_count, views_count
     - hashtags
     - thumbnail_url, screenshot_url

4. **Verify the Fix**
   - Go back to your web app
   - Navigate to the scroll page
   - Try submitting a trend - it should now work!

## Alternative: Run the Full Fix
If you still have issues, run the more comprehensive fix:

```sql
-- Run this in Supabase SQL Editor
-- Content from fix-trend-submission-simple.sql
```

This will ensure all necessary columns exist and remove any problematic constraints.

## Testing
After applying the database fix:
1. Go to `/scroll` page
2. Paste a URL from any social media platform
3. Fill in the 3-step form
4. Submit the trend
5. You should see a success message with the earnings amount

## What Changed
- **Code**: Removed `bounty_amount` field from submission data
- **Database**: Added missing columns for social media metadata
- **Payment**: Now stored in the `evidence` JSON field instead of a separate column