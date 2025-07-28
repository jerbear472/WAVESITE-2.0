# Apply Wave Score Database Migration

## Quick Steps

1. **Go to Supabase Dashboard**
   - Navigate to your project
   - Click on "SQL Editor" in the left sidebar

2. **Copy and paste this SQL:**

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

3. **Click "Run" to execute the migration**

4. **Verify the migration worked:**
   - Run this query to check a few records:
   ```sql
   SELECT id, title, wave_score 
   FROM trend_submissions 
   LIMIT 5;
   ```

## After Database Migration

Once the database migration is complete, you can deploy the application changes.

### Option 1: Use the deployment script
```bash
cd ~/Desktop/wavesite2
./deploy-wave-score.sh
```

### Option 2: Quick update (if Docker images are already built)
```bash
cd ~/Desktop/wavesite2
./update-live.sh
```

### Option 3: Manual deployment via push-to-live script
```bash
cd ~/Desktop/wavesite2
./push-to-live.sh
```

## Verification

After deployment, verify the feature is working:

1. Go to http://134.199.179.19/dashboard
2. Navigate to the trend submission form
3. Check that the Wave Score slider appears in Step 2
4. Submit a test trend and verify the score is saved