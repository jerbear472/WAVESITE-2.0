# Hybrid Verification System: How Predictions Get Verified

## Overview
A two-stage verification system that combines automated data analysis with community intelligence to verify trend peak predictions efficiently and accurately.

## The Clean Flow

### When Verification Triggers
When a user's prediction timeframe expires (e.g., Sarah predicted "peaks in 1 week"), the system verifies through two methods:

## Stage 1: Automatic Google Trends Check

### What Happens:
1. System searches Google Trends for the trend name/keywords
2. If found with sufficient data → analyze the curve
3. Peak detected when search volume drops 30% from recent high
4. Prediction marked as CORRECT or INCORRECT automatically

### Example:
```
"Winter arc" prediction expires
→ Google Trends shows peak 6 days ago
→ Sarah's "1 week" prediction: ✓ VERIFIED
→ XP awarded automatically
```

### Works For:
- Major trends
- Viral challenges
- Mainstream memes
- Branded terms

### Doesn't Work For:
- Niche trends
- New slang
- Platform-specific content
- Most early-stage trends

## Stage 2: Community Verification Queue

### If Google Trends has no/insufficient data:
Trend enters the verification queue, where active users vote on whether it peaked:

```
┌─────────────────────────────────────────┐
│ VERIFICATION NEEDED                      │
│                                         │
│ "Orange peel theory"                    │
│ Sarah predicted: Peaks in 2-3 days      │
│ (3 days ago)                           │
│                                         │
│ Based on what you've seen, did this    │
│ peak?                                   │
│                                         │
│ [Yes, it peaked] [Still growing]       │
│ [It died] [Not sure]                   │
│                                         │
│ 3 of 5 votes needed                    │
└─────────────────────────────────────────┘
```

### Verification Triggers:
- Need 5 votes minimum (odd number to avoid ties)
- 60% consensus = verified
- Users who vote accurately (with majority) earn reliability score
- Higher reliability = votes count more

## The Priority System

```
1. Check Google Trends → Found? → Auto-verify
                     ↓
                 Not found?
                     ↓
2. Community queue → 5 votes → Consensus verify
```

## Why This Works

- **Efficient**: Big obvious trends verify automatically
- **Accurate**: Niche trends get human intelligence
- **Scalable**: As you grow, more trends hit Google Trends
- **Fast**: No waiting for community on mainstream trends
- **Educational**: Users learn what "peak" looks like by voting

## The User Experience

### For Predictors:
1. Make prediction and forget about it
2. Get notification when verified: "Your prediction was correct! +50 XP"
3. See accuracy stats building on profile

### For Verifiers:
1. Daily prompt: "5 predictions need your verification"
2. Quick voting interface (30 seconds per trend)
3. Earn XP and reliability score
4. See if you voted with consensus

## Trust & Gaming Prevention

- Submitters can't vote on their own predictions
- Votes weighted by reliability score
- Google Trends data is objective (can't be gamed)
- Random distribution prevents coordination
- "Not sure" option prevents forced votes

## Implementation Notes

### Database Schema Needs:
```sql
-- trend_predictions table
- prediction_id
- trend_id
- user_id
- predicted_peak (timeframe)
- prediction_date
- expiry_date
- verification_status (pending/auto_verified/community_verified/incorrect)
- verification_method (google_trends/community)
- verification_date

-- verification_votes table
- vote_id
- prediction_id
- voter_id
- vote (peaked/growing/died/unsure)
- vote_date
- was_correct (boolean, set after consensus)

-- user_reliability table
- user_id
- total_votes
- correct_votes
- reliability_score (0-100)
- last_updated
```

### XP Rewards:
- Correct prediction: +50 XP
- Voting with consensus: +5 XP
- Reliability bonus: Up to 2x multiplier for high reliability users

### Notification System:
- Prediction verified notification
- Daily verification prompt (if queue has items)
- Weekly accuracy report

## Simple. Clean. Automated where possible, human where necessary.

---

*This system ensures predictions are verified accurately while maintaining scalability and preventing gaming. It combines the best of automated data analysis with community intelligence.*