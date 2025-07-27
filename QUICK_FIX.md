# Quick Fix for trend_umbrella_id Error

## The Error
```
Could not find the 'trend_umbrella_id' column of 'trend_submissions' in the schema cache
```

## Solution

You need to add the missing column to your database. Here's how:

### Option 1: Quick SQL Fix (Recommended)

1. Go to your Supabase SQL Editor:
   https://supabase.com/dashboard/project/achuavagkhjenaypawij/sql/new

2. Copy and paste this SQL:

```sql
-- Add the missing column
ALTER TABLE public.trend_submissions 
ADD COLUMN IF NOT EXISTS trend_umbrella_id UUID;

-- That's it! The app will now work without the error
```

3. Click "Run"

### Option 2: Full Setup (If you want trend grouping feature)

Run the complete SQL from `fix-trend-umbrella.sql` which will:
- Create the trend_umbrellas table
- Add the trend_umbrella_id column
- Set up proper relationships
- Enable trend grouping functionality

## What I've Done

I've updated the code to:
1. **Handle the missing column gracefully** - The app won't crash if the column doesn't exist
2. **Only use trend umbrellas if available** - The submission will work with or without this feature
3. **Continue working without errors** - Trends will save successfully even without the umbrella grouping

## Test It

After running the SQL fix:
1. Go to http://localhost:3000/trends
2. Click "+ New Trend"
3. Submit a test trend
4. It should work without any errors!

The trend submission will save all your data including:
- URL, title, description
- Social media metadata
- Engagement metrics
- Hashtags
- Images

The trend umbrella grouping is optional and won't block submissions.