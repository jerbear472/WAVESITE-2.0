# 🚨 IMPORTANT: Apply Database Migration First!

Before deploying to Vercel, you MUST apply the database migration in Supabase:

## Quick Steps:

1. **Go to Supabase Dashboard**
   - Open: https://supabase.com/dashboard
   - Select your project

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in the left sidebar

3. **Copy and paste this SQL:**

```sql
-- Add wave_score column to trend_submissions table
ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS wave_score INTEGER 
CHECK (wave_score >= 0 AND wave_score <= 100);

-- Add comment to explain the column
COMMENT ON COLUMN trend_submissions.wave_score IS 'User-submitted coolness rating for the trend (0-100 scale)';

-- Update any existing rows to have a default wave_score of 50
UPDATE trend_submissions 
SET wave_score = 50 
WHERE wave_score IS NULL;
```

4. **Click "Run" to execute**

5. **Verify it worked by running:**
```sql
SELECT id, title, wave_score 
FROM trend_submissions 
LIMIT 3;
```

## ✅ Once the database migration is complete, we'll deploy to Vercel!

**Have you completed the database migration? (y/n)**