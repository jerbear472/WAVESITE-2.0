# Unified XP System Documentation

## Overview
The FreeWaveSight platform uses a unified Experience Points (XP) system across web, mobile, and backend to gamify trend spotting and validation. This document outlines the complete XP earning structure and multipliers.

## XP Earning Methods

### 1. Core Actions
| Action | Base XP | Description |
|--------|---------|-------------|
| **Trend Submission** | 25 XP | Submit a new trend |
| **Validation Vote** | 5 XP | Vote on a trend (YES/NO) |
| **Approval Bonus** | 50 XP | When your trend gets 3+ YES votes |
| **Rejection Penalty** | -10 XP | When your trend gets 3+ NO votes |
| **Accurate Validation** | 15 XP | Vote with the majority consensus |

### 2. Engagement Actions
| Action | Base XP | Description |
|--------|---------|-------------|
| **Daily Login** | 10 XP | First login of the day |
| **First Trend of Day** | 20 XP | Bonus for first submission |
| **Active Scrolling** | 2 XP/min | Engaging with content |
| **Trend Shared** | 5 XP | Share a trend externally |
| **Viral Trend Bonus** | 100 XP | Your trend goes viral |
| **Helpful Vote** | 3 XP | Your validation marked helpful |

## Multiplier System

### Level Multipliers (15 Levels)
| Level | Title | XP Required | Multiplier |
|-------|-------|-------------|------------|
| 1 | Observer | 0 | 1.0x |
| 2 | Recorder | 100 | 1.1x |
| 3 | Tracker | 300 | 1.2x |
| 4 | Spotter | 600 | 1.3x |
| 5 | Analyst | 1,000 | 1.4x |
| 6 | Interpreter | 1,500 | 1.5x |
| 7 | Specialist | 2,200 | 1.6x |
| 8 | Expert | 3,000 | 1.7x |
| 9 | Scholar | 4,000 | 1.8x |
| 10 | Researcher | 5,200 | 2.0x |
| 11 | Authority | 6,600 | 2.2x |
| 12 | Pioneer | 8,200 | 2.4x |
| 13 | Visionary | 10,000 | 2.6x |
| 14 | Master | 12,500 | 2.8x |
| 15 | Legend | 15,000 | 3.0x |

### Session Streak Multipliers
Rapid submissions within 5-minute windows:
- **1st submission**: 1.0x
- **2nd submission**: 1.2x
- **3rd submission**: 1.5x
- **4th submission**: 2.0x
- **5th+ submission**: 2.5x (max)

### Daily Streak Multipliers
Consecutive days with activity:
- **30+ days** 🔥: 3.0x (Legendary Streak)
- **14-29 days** ⚡: 2.5x (Epic Streak)
- **7-13 days** ✨: 2.0x (Weekly Warrior)
- **3-6 days** ⭐: 1.5x (Consistent)
- **1-2 days** 🌟: 1.2x (Active)
- **0 days**: 1.0x (Starting)

### Quality Multipliers
Based on trend quality score:
- **Exceptional (95%+)**: 2.0x + 50 XP bonus
- **Excellent (90-94%)**: 1.75x + 40 XP bonus
- **Good (80-89%)**: 1.5x + 30 XP bonus
- **Average (70-79%)**: 1.25x + 20 XP bonus
- **Fair (60-69%)**: 1.0x + 10 XP bonus
- **Poor (50-59%)**: 0.75x + 5 XP bonus
- **Low (<50%)**: 0.5x + 0 XP bonus

## XP Calculation Formula

```
Total XP = (Base XP + Quality Bonus + First of Day Bonus) × 
           Level Multiplier × 
           Session Multiplier × 
           Daily Multiplier × 
           Quality Multiplier
```

### Example Calculations

**Beginner (Level 1, first trend):**
- Base: 25 XP
- No multipliers
- **Total: 25 XP**

**Active User (Level 5, 3rd rapid submission, 7-day streak, 80% quality):**
- Base: 25 XP + 30 quality bonus = 55 XP
- Level 5: 1.4x
- Session #3: 1.5x
- 7-day streak: 2.0x
- 80% quality: 1.5x
- **Total: 55 × 1.4 × 1.5 × 2.0 × 1.5 = 346 XP**

**Power User (Level 10, 5th rapid, 30-day streak, 95% quality, first of day):**
- Base: 25 + 50 quality + 20 first = 95 XP
- Level 10: 2.0x
- Session #5: 2.5x
- 30-day streak: 3.0x
- 95% quality: 2.0x
- **Total: 95 × 2.0 × 2.5 × 3.0 × 2.0 = 2,850 XP**

## Achievements

### Submission Achievements
- **First Trend** (100 XP): Submit your first trend
- **10th Trend** (250 XP): Submit 10 trends
- **50th Trend** (500 XP): Submit 50 trends
- **100th Trend** (1,000 XP): Submit 100 trends

### Validation Achievements
- **First Validation** (50 XP): First validation vote
- **Validation Master** (500 XP): 100 validations with 90%+ accuracy
- **Community Helper** (250 XP): Help validate 100 trends

### Streak Achievements
- **Perfect Week** (500 XP): 7-day streak
- **Perfect Fortnight** (1,000 XP): 14-day streak
- **Perfect Month** (2,000 XP): 30-day streak

### Special Achievements
- **Viral Spotter** (500 XP): Trend goes viral
- **Trend Expert** (1,000 XP): 90%+ approval rate over 50 trends
- **Speed Demon** (300 XP): Submit 5 trends in 5 minutes
- **Night Owl** (200 XP): Submit trends 12am-5am
- **Early Bird** (200 XP): Submit trends 5am-8am
- **Quality Guru** (750 XP): Maintain 95%+ quality for 30 days

## Daily Limits

To prevent abuse and maintain balance:
- **Max Submissions**: 100 trends/day
- **Max Validations**: 200 votes/day
- **Max XP**: 5,000 XP/day
- **Max Scroll Time**: 300 minutes/day

## Validation Rules

- **Approval Threshold**: 3+ YES votes
- **Rejection Threshold**: 3+ NO votes
- **Voting Window**: 72 hours
- **Self-Voting**: Not allowed
- **Min Quality for Approval**: 50%

## XP Decay System

To encourage consistent activity:
- **Inactive Period**: 7 days before decay starts
- **Decay Rate**: 1% per day after inactive period
- **Maximum Decay**: 30% of total XP

## Special Events

Admins can activate multipliers:
- **Double XP Weekends**: 2.0x all XP
- **Triple XP Holidays**: 3.0x all XP
- **New User Bonus**: 1.5x for first week
- **Community Goals**: 1.25x when goals met

## Implementation Files

### Configuration
- **Unified Config**: `/shared/src/config/UNIFIED_XP_CONFIG.ts`
- **Web Adapter**: `/web/lib/XP_REWARDS.ts`
- **Mobile Adapter**: `/mobile/src/config/xpConfig.ts`

### Database
- **Migration**: `/supabase/migrations/20250822_unified_xp_system.sql`
- **Functions**: `cast_trend_vote`, `award_trend_submission_xp`, `calculate_scroll_session_xp`
- **Views**: `user_xp_summary`

### Key Components
- **Web**: `XPDisplay`, `XPLeaderboard`, `ScrollSession_XP`
- **Mobile**: `ScrollSession`, `StreaksAndChallenges`

## Best Practices

1. **Always use the unified configuration** as the single source of truth
2. **Apply multipliers in order**: Level → Session → Daily → Quality
3. **Check daily caps** before awarding XP
4. **Log all XP transactions** with metadata for debugging
5. **Update user stats** atomically to prevent race conditions

## Testing XP Calculations

Use the provided helper functions:
```typescript
import { calculateTrendSubmissionXP } from '@/shared/src/config/UNIFIED_XP_CONFIG';

// Test calculation
const result = calculateTrendSubmissionXP(
  0.85,  // quality score (85%)
  5,     // user level
  3,     // session position
  7,     // daily streak
  true   // is first of day
);

console.log(result.breakdown); // See detailed calculation
console.log(result.total);     // Final XP amount
```

## Future Enhancements

- [ ] Team-based XP bonuses
- [ ] Seasonal XP events
- [ ] XP boosters/items
- [ ] Prestige system after Level 15
- [ ] XP wagering on predictions
- [ ] XP-based marketplace

---

*Last Updated: August 22, 2025*
*Version: 1.0.0*