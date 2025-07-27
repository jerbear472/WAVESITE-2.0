# Database Update Guide for Trend Submission Flow

This guide ensures your trend submission flow works correctly with all metadata capture and validation features.

## Quick Fix

Run this SQL script in your Supabase SQL editor to ensure all necessary columns and tables exist:

```sql
-- Copy and paste the contents of scripts/ensure-social-media-columns.sql
```

## What This Fixes

### 1. **Trend Submission**
- ✅ Captures all social media metadata (likes, comments, shares, views, hashtags)
- ✅ Stores creator information (handle, name)
- ✅ Saves post caption and URL
- ✅ Stores platform information
- ✅ Handles image uploads

### 2. **Timeline Display**
- ✅ Shows all captured metadata on your timeline
- ✅ Displays engagement metrics with proper formatting
- ✅ Shows creator information
- ✅ Links to original posts

### 3. **Validation Feed**
- ✅ Shows trends from other users for validation
- ✅ Displays all metadata to help validators make informed decisions
- ✅ Prevents duplicate validations
- ✅ Updates trend status automatically based on validation count

## How the Flow Works

1. **Submit a Trend**
   - Go to `/submit`
   - Paste a social media URL
   - The form auto-extracts metadata (if available)
   - Fill in additional details
   - Submit the trend

2. **View in Timeline**
   - Go to `/timeline`
   - See all your submitted trends
   - View engagement metrics and status

3. **Validate Others' Trends**
   - Go to `/verify`
   - Review trends submitted by others
   - Vote whether they are valid trends
   - Earn rewards for validation

## Database Schema

The system uses these main tables:

### trend_submissions
- Stores all trend data including social media metadata
- Tracks status (submitted → validating → approved)
- Links to user who submitted

### trend_validations
- Records validation votes
- Prevents duplicate votes
- Triggers status updates

## Troubleshooting

If trends aren't showing in the validation feed:
1. Make sure you're logged in as a different user than the one who submitted
2. Check that trends have status 'submitted' or 'validating'
3. Ensure RLS policies are correctly applied

If metadata isn't being saved:
1. Run the SQL migration script above
2. Check browser console for errors
3. Ensure Supabase connection is working

## Testing the Flow

1. Submit a test trend with a real social media URL
2. Check it appears in your timeline with all metadata
3. Log in as a different user
4. Go to /verify and confirm the trend appears
5. Validate the trend
6. Check that validation count increases