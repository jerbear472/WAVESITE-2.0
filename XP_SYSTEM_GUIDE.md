# FreeWaveSight XP System Guide

## Overview

FreeWaveSight has transitioned from a monetary earnings system to an Experience Points (XP) based gamification system. This change focuses on engagement, achievement, and community contribution rather than financial incentives.

## XP System Structure

### Base XP Rates

| Action | Base XP | Description |
|--------|---------|-------------|
| Trend Submission | 25 XP | Submit a new trend |
| Validation Vote | 5 XP | Validate another user's trend |
| Trend Approved | 50 XP | When your trend gets 2+ YES votes |
| Perfect Validation | 15 XP | 100% validation accuracy |
| Daily Login | 10 XP | First login of the day |
| First Trend of Day | 20 XP | Bonus for first submission |

### Level System

The XP system includes 15 levels, each with unique titles and perks:

1. **Newcomer** (0 XP) - 🌱 Starting level
2. **Scout** (100 XP) - 🔍 Unlocks validation access
3. **Explorer** (300 XP) - 🗺️ Profile badges
4. **Tracker** (600 XP) - 🎯 Custom avatar frame
5. **Hunter** (1,000 XP) - 🏹 Priority validation queue
6. **Analyst** (1,500 XP) - 📊 Trend insights access
7. **Expert** (2,200 XP) - 💎 Community moderator tools
8. **Master** (3,000 XP) - 👑 Elite badge, 2x XP multiplier
9. **Guru** (4,000 XP) - 🧙 Custom title
10. **Legend** (5,200 XP) - ⚔️ Hall of fame, 3x XP multiplier
11. **Mythic** (6,600 XP) - 🌟 Exclusive content access
12. **Titan** (8,200 XP) - ⛰️ Community leader privileges
13. **Oracle** (10,000 XP) - 🔮 Special recognition
14. **Sage** (12,000 XP) - 📿 Mentor status
15. **Visionary** (14,500 XP) - 👁️ Platform influencer

### Multipliers

#### Tier Multipliers (Based on Level)
- **Newcomer** (Levels 1-2): 1.0x
- **Scout** (Levels 3-4): 1.2x
- **Explorer** (Levels 5-6): 1.5x
- **Tracker** (Levels 7-8): 1.8x
- **Hunter** (Levels 9-10): 2.0x
- **Analyst** (Levels 11-12): 2.5x
- **Expert** (Levels 13+): 3.0x

#### Session Streak Multipliers
Rapid submissions within 5 minutes:
- 1st submission: 1.0x
- 2nd submission: 1.2x
- 3rd submission: 1.5x
- 4th submission: 2.0x
- 5+ submissions: 2.5x (max)

#### Daily Streak Multipliers
Consecutive days with submissions:
- 0-2 days: 1.0x
- 3-6 days: 1.2x ⭐
- 7-13 days: 1.5x ✨
- 14-29 days: 2.0x ⚡
- 30+ days: 3.0x 🔥

#### Quality Multipliers
Based on validation accuracy:
- Exceptional (95%+): 2.0x
- High (80-94%): 1.5x
- Medium (60-79%): 1.0x
- Low (<60%): 0.5x

### XP Calculation Formula

```
Final XP = Base XP × Tier Multiplier × Session Streak × Daily Streak × Quality Bonus
```

Example: Level 5 user, 3rd rapid submission, 7-day streak, 85% accuracy
- Base: 25 XP
- Tier (Explorer): 1.5x
- Session Streak (3rd): 1.5x
- Daily Streak (7 days): 1.5x
- Quality (High): 1.5x
- **Final: 25 × 1.5 × 1.5 × 1.5 × 1.5 = 190 XP**

## Achievements System

### Submission Achievements
- **First Steps** (50 XP): Submit your first trend
- **Trend Spotter** (100 XP): Submit 10 trends
- **Eagle Eye** (250 XP): Submit 50 trends
- **Trend Master** (500 XP): Submit 100 trends

### Validation Achievements
- **Quality Control** (75 XP): Complete 10 validations
- **Gatekeeper** (300 XP): Complete 100 validations
- **Perfect Week** (200 XP): 100% validation accuracy for a week

### Streak Achievements
- **Week Warrior** (200 XP): 7-day submission streak
- **Fortnight Fighter** (400 XP): 14-day submission streak
- **Month Master** (1,000 XP): 30-day submission streak

### Special Achievements
- **Viral Sensation** (500 XP): Submit a trend that goes viral
- **Community Helper** (250 XP): Help 50 community members
- **Early Bird** (150 XP): Submit 10 trends before 7 AM
- **Night Owl** (150 XP): Submit 10 trends after 10 PM

## Database Schema

### Core Tables

#### `user_xp`
Tracks user's total XP and level:
- `user_id`: Reference to user
- `total_xp`: Total accumulated XP
- `current_level`: Current level (1-15)
- `xp_to_next_level`: XP needed for next level

#### `xp_transactions`
Ledger of all XP gains:
- `user_id`: User who earned XP
- `amount`: XP amount
- `type`: Type of action (trend_submission, validation_vote, etc.)
- `description`: Human-readable description
- `reference_id`: Related entity (trend_id, validation_id, etc.)
- `metadata`: Additional data in JSON format

#### `achievements`
Definition of all achievements:
- `name`: Achievement name
- `description`: What it's for
- `xp_reward`: XP granted when earned
- `category`: Type of achievement
- `requirements`: JSON requirements to earn

#### `user_achievements`
Tracks which achievements users have earned:
- `user_id`: User reference
- `achievement_id`: Achievement reference
- `earned_at`: When it was earned

## API Endpoints

### GET `/api/xp`
Get user's XP data:
```json
{
  "xp": {
    "total_xp": 1250,
    "current_level": 5,
    "level_title": "Hunter",
    "xp_to_next_level": {
      "current": 250,
      "required": 500,
      "percentage": 50
    }
  },
  "transactions": [...],
  "achievements": [...]
}
```

### POST `/api/xp`
Award XP (admin only):
```json
{
  "amount": 50,
  "type": "trend_submission",
  "description": "Trend submitted",
  "reference_id": "uuid",
  "reference_type": "trend"
}
```

### GET `/api/xp/leaderboard`
Get global or weekly leaderboard:
```json
{
  "global": [
    {
      "user_id": "uuid",
      "username": "user123",
      "total_xp": 5000,
      "level": 10,
      "rank": 1
    }
  ],
  "weekly": [...]
}
```

## Migration from Earnings

### What Changed
- **Removed**: All monetary values, Stripe integration, payment methods
- **Replaced**: Earnings → XP, Payouts → Rewards, Balance → Total XP
- **Added**: Levels, achievements, leaderboards, gamification elements

### Data Migration
- Previous earnings are not converted to XP (fresh start)
- User tiers are mapped to initial levels
- Validation history preserved for accuracy calculations

### Rollback Plan
If needed to revert:
1. Restore database from backup: `backups/pre-xp-migration-*.sql`
2. Restore original files from `.bak` backups
3. Reinstall Stripe dependencies
4. Re-enable Stripe environment variables

## UI Components

### XPDisplay Component
Main component showing:
- Current XP and level
- Progress to next level
- Recent XP gains
- Achievement badges

### Leaderboard Component
Shows:
- Global top users
- Weekly top performers
- User's current rank

### Achievement Gallery
Displays:
- Earned achievements
- Locked achievements with requirements
- Progress toward next achievements

## Configuration

### Environment Variables
Remove/comment out:
```bash
# STRIPE_SECRET_KEY=...
# STRIPE_WEBHOOK_SECRET=...
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
```

Add:
```bash
XP_MULTIPLIER_ENABLED=true
XP_DAILY_LIMIT=5000
XP_ACHIEVEMENT_NOTIFICATIONS=true
```

### XP Config File
Located at `mobile/src/config/xpConfig.ts` and `web/config/xpConfig.ts`

Adjust rates and multipliers as needed for game balance.

## Best Practices

### Balancing XP Economy
1. Monitor average daily XP gain
2. Adjust multipliers if progression too fast/slow
3. Add seasonal events with bonus XP
4. Consider XP decay for inactive users

### Engagement Strategies
1. Daily challenges for bonus XP
2. Weekly community goals
3. Special event achievements
4. Referral bonuses in XP

### Anti-Gaming Measures
1. Daily XP cap (5,000 XP)
2. Cooldown between submissions
3. Quality checks affect multipliers
4. Suspicious pattern detection

## Troubleshooting

### Common Issues

**XP not updating:**
- Check if triggers are enabled in database
- Verify user authentication
- Check XP transaction logs

**Level not changing:**
- Verify level calculation function
- Check user_xp table for correct totals
- Ensure level thresholds are correct

**Achievements not unlocking:**
- Check achievement requirements JSON
- Verify check_achievements function is called
- Look for errors in achievement queries

## Future Enhancements

### Planned Features
1. **XP Seasons**: Quarterly resets with special rewards
2. **Team XP**: Collaborative goals and shared achievements
3. **XP Store**: Spend XP on profile customizations
4. **Mentor System**: High-level users can boost newcomers
5. **Dynamic Events**: Time-limited XP multipliers
6. **Social Features**: Gift XP, challenge friends

### Potential Gamification Elements
- Daily quests
- Weekly challenges
- Milestone rewards
- Prestige system (reset at max level for special badge)
- XP wagering on trend predictions
- Community XP pools

## Support

For issues or questions about the XP system:
1. Check this guide first
2. Review error logs in Supabase
3. Test in development environment
4. Contact development team

Remember: The goal is engagement and fun, not just accumulation!