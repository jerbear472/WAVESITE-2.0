# Fix for "positive_votes" Column Error

## Problem
The mobile app is trying to access a `positive_votes` column in the `captured_trends` table that doesn't exist in the database schema.

## Solution

### Option 1: Run the Migration Script (Recommended)

1. Navigate to the mobile directory:
   ```bash
   cd /Users/JeremyUys_1/Desktop/WAVESITE2/mobile
   ```

2. Install dependencies if not already done:
   ```bash
   npm install
   ```

3. Run the fix script:
   ```bash
   node fix-database.js
   ```

### Option 2: Manual Database Update

1. Go to your Supabase Dashboard
2. Navigate to the SQL Editor
3. Copy and paste the following SQL:

```sql
-- Add validation-related columns to captured_trends table
ALTER TABLE captured_trends 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending_validation',
ADD COLUMN IF NOT EXISTS validation_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS positive_votes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS skip_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS validated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE;

-- Create index for validation queries
CREATE INDEX IF NOT EXISTS idx_captured_trends_status ON captured_trends(status);
CREATE INDEX IF NOT EXISTS idx_captured_trends_validation_count ON captured_trends(validation_count);

-- Create validations table if it doesn't exist
CREATE TABLE IF NOT EXISTS validations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trend_id UUID REFERENCES captured_trends(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  vote VARCHAR(10) NOT NULL CHECK (vote IN ('yes', 'no', 'skip')),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(trend_id, user_id)
);

-- Create indexes for validations table
CREATE INDEX IF NOT EXISTS idx_validations_trend_id ON validations(trend_id);
CREATE INDEX IF NOT EXISTS idx_validations_user_id ON validations(user_id);
CREATE INDEX IF NOT EXISTS idx_validations_timestamp ON validations(timestamp DESC);

-- Enable RLS on validations table
ALTER TABLE validations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for validations table
CREATE POLICY "Users can view all validations"
  ON validations FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own validations"
  ON validations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own validations"
  ON validations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

4. Click "Run" to execute the query

### Option 3: Quick Fix (Temporary)

If you need to quickly test the app without the validation features, you can modify the `TrendCaptureService.ts` file to remove the reference to `positive_votes`:

1. Open `/Users/JeremyUys_1/Desktop/WAVESITE2/mobile/src/services/TrendCaptureService.ts`
2. Find line 254 and comment out or remove: `positive_votes: 0,`
3. Save and rebuild the app

## Verification

After applying the fix:

1. Restart the mobile app
2. Try capturing a trend again
3. The error should be resolved

## Additional Notes

- This error occurred because the gamification features (including validation voting) were added after the initial database schema
- The migration adds support for trend validation, voting, and status tracking
- These columns are required for the full validation workflow in the app