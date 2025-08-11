# 🌊 WaveSight Actual User Flow

## Core User Journey (What's Actually Being Used)

### 1. 📤 **Trend Submission** (`/submit`)
Users submit trends they spot on social media:
- Enter URL → Auto-extracts metadata (views, likes, creator info)
- Fill out 4-step form with trend details
- **Earn**: $1.00 base + bonuses (up to $3.00)
- Status: `pending` until validated by community

### 2. ✅ **Community Validation** (`/validate`) 
Users validate each other's submissions:
- See trends from other users (not their own)
- Vote: Approve ✅ or Reject ❌
- **Earn**: $0.10 per validation vote
- **Threshold**: 2 approvals = trend approved

### 3. 💰 **Earnings System**
Based on community validation:
- **Submission approved** (2+ approve votes):
  - Spotter gets their $1.00 + bonuses confirmed
  - Spotter gets $0.50 approval bonus
  - Earnings move from `pending` to `approved`
- **Submission rejected** (2+ reject votes):
  - No earnings for spotter
  - Validators still earn $0.10 per vote

### 4. 📊 **User Dashboard** (`/dashboard`)
Track performance:
- Pending earnings (awaiting validation)
- Approved earnings (ready for cashout)
- Submission history
- Validation accuracy

### 5. 💸 **Cash Out**
When balance reaches minimum:
- Request payout via Venmo/PayPal
- Admin processes payments

## What's NOT Being Used (Legacy/Deprecated)

❌ **Trend Umbrellas** - Grouping system that's no longer needed
❌ **UnassignedTrendsPool** - Legacy component for orphan trends
❌ **Multiple form variations** - Only TrendSubmissionFormEnhanced is active
❌ **Multiple validation pages** - Only main validate/page.tsx is active
❌ **TrendTilesGrid** - Not used anywhere in the app

## Database Tables Actually in Use

✅ **user_profiles** - User accounts and earnings
✅ **trend_submissions** - Submitted trends
✅ **trend_validations** - Validation votes
✅ **earnings_ledger** - Transaction history
✅ **profiles** (VIEW) - Compatibility view for user_profiles

## The Simple Truth

**Users submit trends → Community validates → Approved trends earn money**

That's it. No complex umbrella systems, no tile grids, no unassigned pools. Just a clean, simple flow where the community decides what's valuable.