# Wave Score Display Fix - Complete Guide

This fix updates the wave score calculation and display on the trend timeline to include:
- Dynamic wave score calculation (1-10)
- Trend velocity/stage indicators
- Yes/No vote counts from the verify page
- Proper visual indicators for trend status

## What Was Fixed

### 1. **Database Enhancements**
- Added `wave_score` column to store calculated scores
- Created `calculate_wave_score()` function with intelligent scoring
- Added triggers to auto-update scores when data changes
- Created `trend_timeline_view` for easy data access

### 2. **Wave Score Calculation**
The new formula considers multiple factors:

```
Wave Score = (
  Virality Prediction (30%) +
  Vote Score (up to 60%) +
  Engagement Score (up to 40%)
) × Stage Multiplier × Engagement Multiplier
```

**Stage Multipliers:**
- 🌱 Just Starting (submitted): 0.5x
- 📈 Gaining Traction (validating): 0.7x
- 🔥 Trending: 1.0x
- 🚀 Going Viral: 1.3x
- ⭐ At Peak: 0.9x
- 📉 Declining: 0.6x

### 3. **Frontend Updates**
- Timeline now shows calculated wave score instead of static "5/10"
- Added velocity/stage badges with color coding
- Displays vote counts: "Votes: 15👍 3👎"
- Visual indicators for trend momentum

## How to Apply

### Step 1: Run the SQL Migration
```bash
# Check what will be updated
node apply-wave-score-fix.js

# Then in Supabase Dashboard:
# 1. Go to SQL Editor
# 2. Copy contents of fix-wave-score-display.sql
# 3. Execute the SQL
```

### Step 2: Verify Installation
The SQL script will:
- Add missing columns if needed
- Create the wave score calculation function
- Set up automatic triggers
- Update all existing trends with calculated scores

### Step 3: Test the Timeline
Visit `/timeline` and you should see:
- Wave scores dynamically calculated (1-10)
- Stage badges (e.g., "🚀 Going Viral")
- Vote counts from verifications
- Color-coded status indicators

## How Wave Scores Work

### Base Score Components

1. **Virality Prediction (30%)**
   - Initial AI prediction score
   - Ranges from 1-10

2. **Vote Score (up to 60%)**
   - Based on yes/no ratio from verify page
   - More votes = higher confidence
   - Formula: `(positive_votes / total_votes) × weight`

3. **Engagement Score (up to 40%)**
   - Likes: Up to 10 points (100k+ likes)
   - Shares: Up to 20 points (10k+ shares, weighted 2x)
   - Comments: Up to 10 points (10k+ comments)
   - Views: Up to 5 points (1M+ views)

### Special Rules

- **Heavy Downvotes**: If > 5 votes with < 30% positive, cap at 3/10
- **Viral + Good Votes**: If stage="viral" with > 70% positive, minimum 8/10
- **No Votes Yet**: Uses virality prediction with stage multiplier

## Visual Indicators

### Stage Badges
- 🌱 Just Starting - Gray badge
- 📈 Gaining Traction - Blue badge
- 🔥 Trending - Green badge
- 🚀 Going Viral! - Red badge
- ⭐ At Peak - Yellow badge
- 📉 Declining - Orange badge

### Status Colors
Existing status badges remain unchanged but now paired with stage indicators.

## Example Display

Before:
```
Wave: 5/10
Approval: 18
```

After:
```
Wave: 8/10
Votes: 15👍 3👎
[🚀 Going Viral!]
```

## Monitoring

Check wave score calculations:
```sql
-- View all trends with scores
SELECT 
    description,
    stage,
    wave_score,
    positive_validations,
    negative_validations,
    likes_count + shares_count + comments_count as total_engagement
FROM trend_submissions
ORDER BY wave_score DESC;

-- Get detailed stats for a trend
SELECT * FROM get_trend_stats('trend-id-here');
```

## Troubleshooting

1. **Wave score shows 5/10 for everything**
   - The SQL migration hasn't been run
   - Check if `wave_score` column exists

2. **Stage not displaying**
   - Ensure `stage` column has been populated
   - May need to run: `UPDATE trend_submissions SET stage = 'submitted' WHERE stage IS NULL`

3. **Votes not showing**
   - Check if `positive_validations` and `negative_validations` columns exist
   - These are updated by the verify page validations

## Future Enhancements

The system is designed to be extensible:
- Adjust multipliers in `calculate_wave_score()` function
- Add new factors (e.g., comment sentiment analysis)
- Create tier-based scoring for different trend categories

For any issues, check the browser console and Supabase logs.