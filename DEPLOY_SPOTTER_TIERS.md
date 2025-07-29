# Deploy Spotter Tiers Enhancement

This guide will help you deploy the new tiered earning system for the scroll page.

## Overview

The enhanced scroll page now includes:
- **Performance-based tiers**: Elite, Verified, Learning, and Restricted
- **Quality-based dynamic pricing**: $0.02-$0.20 per trend based on quality
- **Real-time quality indicators**: Shows users how to improve submissions
- **Category expertise tracking**: Bonus payments for category specialists
- **Daily challenges**: Extra rewards for completing specific tasks
- **Achievement system**: Unlock permanent bonuses
- **Detailed payment breakdowns**: Transparent earning calculations

## Step 1: Apply Database Changes

Run the SQL script to add the necessary tables and columns:

```bash
# From the web directory
psql $DATABASE_URL < scripts/add-spotter-performance-schema.sql
```

Or apply via Supabase dashboard:
1. Go to SQL Editor in Supabase
2. Copy contents of `web/scripts/add-spotter-performance-schema.sql`
3. Run the query

## Step 2: Update Environment Variables

No new environment variables are required for this feature.

## Step 3: Deploy the Enhanced Scroll Page

### Option A: Test First (Recommended)
1. Rename the current scroll page:
   ```bash
   mv web/app/(authenticated)/scroll/page.tsx web/app/(authenticated)/scroll/page-original.tsx
   ```

2. Use the enhanced version:
   ```bash
   mv web/app/(authenticated)/scroll/page-enhanced.tsx web/app/(authenticated)/scroll/page.tsx
   ```

3. Update the trend submission form import in the scroll page:
   ```typescript
   // Change this:
   import TrendSubmissionFormEnhanced from '@/components/TrendSubmissionFormEnhanced';
   
   // To this:
   import TrendSubmissionFormWithQuality from '@/components/TrendSubmissionFormWithQuality';
   ```

### Option B: Direct Deployment
Copy the enhanced components over the existing ones (make backups first).

## Step 4: Test the Features

1. **Check tier display**: Users should see their current tier badge
2. **Submit a trend**: Quality score should update in real-time
3. **View payment breakdown**: Detailed breakdown should show after submission
4. **Check performance modal**: Click "Performance Overview" to see detailed stats

## Step 5: Initialize User Tiers

For existing users, run this query to set initial tiers:

```sql
-- Set all users to 'learning' tier initially
UPDATE profiles 
SET spotter_tier = 'learning',
    spotter_quality_score = 0.5
WHERE spotter_tier IS NULL;

-- Calculate initial 30-day metrics for active users
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT DISTINCT spotter_id 
    FROM trend_submissions 
    WHERE created_at >= NOW() - INTERVAL '30 days'
  LOOP
    PERFORM update_spotter_tier(user_record.spotter_id);
  END LOOP;
END $$;
```

## Features for Users

### Tier Benefits

| Tier | Multiplier | Base Pay Range | Daily Limit | Benefits |
|------|------------|----------------|-------------|----------|
| 🏆 Elite | 1.5x | $0.12-$0.20 | Unlimited | All bonuses, premium categories |
| ✅ Verified | 1.0x | $0.08-$0.15 | 100 | Quality bonuses, full access |
| 📚 Learning | 0.7x | $0.05-$0.10 | 50 | Building reputation |
| ⚠️ Restricted | 0.3x | $0.02-$0.05 | 20 | Limited access |

### How to Advance Tiers

- **To Verified**: 50%+ approval rate with 20+ trends
- **To Elite**: 80%+ approval rate with 50+ trends
- **Maintain good standing**: Consecutive approved trends build streaks

### Quality Factors

1. **Media**: Include screenshots or videos (+15%)
2. **Description**: Detailed explanations (+15%)
3. **Metadata**: Complete all fields (+25%)
4. **Engagement**: High-engagement trends (+10%)
5. **Early Detection**: Be first to spot trends (+30-50% bonus)

## Monitoring

Track system performance:

```sql
-- View tier distribution
SELECT spotter_tier, COUNT(*) 
FROM profiles 
WHERE spotter_tier IS NOT NULL 
GROUP BY spotter_tier;

-- Average quality scores by tier
SELECT spotter_tier, AVG(spotter_quality_score) 
FROM profiles 
GROUP BY spotter_tier;

-- Daily submission quality
SELECT DATE(created_at), AVG(quality_score) 
FROM trend_submissions 
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY DATE(created_at) DESC;
```

## Rollback Plan

If needed, revert to the original scroll page:

```bash
mv web/app/(authenticated)/scroll/page.tsx web/app/(authenticated)/scroll/page-enhanced.tsx
mv web/app/(authenticated)/scroll/page-original.tsx web/app/(authenticated)/scroll/page.tsx
```

## Next Steps

1. Monitor user feedback and tier progression
2. Adjust tier thresholds based on data
3. Add more achievements and challenges
4. Consider seasonal bonus events

## Support

For issues or questions:
- Check user tier: `SELECT * FROM profiles WHERE id = 'user_id';`
- View payment calculations: Check `payment_breakdown` in `trend_submissions`
- Reset user metrics: Run `update_spotter_tier('user_id')`