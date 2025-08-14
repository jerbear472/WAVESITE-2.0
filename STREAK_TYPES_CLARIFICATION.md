# Streak Types Clarification

## Two Different Streak Systems

### 1. 🔥 Submission Streak (Within Session)
**What it is:** Rapid consecutive submissions within a short time window
- **Time Window:** Must submit within 5-10 minutes of previous submission
- **Purpose:** Rewards users for bulk submission sessions
- **Multiplier:** Increases with each consecutive submission in session
- **Resets:** After inactivity (no submission for >10 minutes)

**Example Multipliers:**
- 1st trend: 1.0x
- 2nd trend (within 5 min): 1.2x
- 3rd trend (within 5 min): 1.5x
- 4th trend (within 5 min): 2.0x
- 5th+ trend (within 5 min): 2.5x

### 2. 📅 Daily Streak (Consecutive Days)
**What it is:** Logging in and submitting at least one trend per day
- **Time Window:** At least one submission per calendar day
- **Purpose:** Rewards consistent daily engagement
- **Multiplier:** Based on consecutive days with activity
- **Resets:** After missing a full day (24-48 hour grace period)

**Example Multipliers:**
- 0-1 days: 1.0x
- 2-6 days: 1.2x
- 7-13 days: 1.5x
- 14-29 days: 2.0x
- 30+ days: 2.5x

## How They Work Together

The total multiplier is: `base × tier_multiplier × session_streak × daily_streak`

### Example Scenarios:

**Scenario 1: New user's first trend**
- Base: $0.25
- Tier: Learning (1.0x)
- Session streak: 1st submission (1.0x)
- Daily streak: Day 1 (1.0x)
- **Total: $0.25**

**Scenario 2: Elite user, 7-day daily streak, 3rd rapid submission**
- Base: $0.25
- Tier: Elite (2.0x)
- Session streak: 3rd in session (1.5x)
- Daily streak: 7 days (1.5x)
- **Total: $0.25 × 2.0 × 1.5 × 1.5 = $1.13**

**Scenario 3: Master user, 30-day daily streak, 5th rapid submission**
- Base: $0.25
- Tier: Master (3.0x)
- Session streak: 5th in session (2.5x)
- Daily streak: 30 days (2.5x)
- **Total: $0.25 × 3.0 × 2.5 × 2.5 = $4.69**

## Database Fields

### user_profiles table:
- `current_streak` - Daily streak (consecutive days)
- `session_streak` - Current submission session streak (resets after inactivity)
- `last_submission_at` - Timestamp of last submission (for session streak tracking)

### captured_trends table:
- `session_position` - Position in current session (1st, 2nd, 3rd, etc.)
- `session_multiplier` - Applied session streak multiplier
- `daily_multiplier` - Applied daily streak multiplier

## Implementation in Code

```sql
-- Check if submission is within session window
IF EXTRACT(EPOCH FROM (NOW() - last_submission_at)) / 60 <= 5 THEN
    -- Within 5 minutes, increment session streak
    v_session_streak := COALESCE(session_streak, 0) + 1;
ELSE
    -- New session, reset to 1
    v_session_streak := 1;
END IF;

-- Calculate session multiplier
v_session_multiplier := CASE
    WHEN v_session_streak >= 5 THEN 2.5
    WHEN v_session_streak = 4 THEN 2.0
    WHEN v_session_streak = 3 THEN 1.5
    WHEN v_session_streak = 2 THEN 1.2
    ELSE 1.0
END;

-- Daily streak multiplier (already implemented)
v_daily_multiplier := CASE
    WHEN v_daily_streak >= 30 THEN 2.5
    WHEN v_daily_streak >= 14 THEN 2.0
    WHEN v_daily_streak >= 7 THEN 1.5
    WHEN v_daily_streak >= 2 THEN 1.2
    ELSE 1.0
END;

-- Final calculation
v_final_amount := v_base_amount * v_tier_multiplier * v_session_multiplier * v_daily_multiplier;
```

## UI Display Examples

### During Submission:
```
🔥 Session Streak: 3x in a row! (1.5x bonus)
📅 Daily Streak: 7 days! (1.5x bonus)
💰 Next submission: $0.56
```

### Dashboard:
```
Current Streaks:
• Daily Streak: 7 days 🔥 (1.5x multiplier)
• Last Session: 5 trends in 8 minutes (2.5x multiplier achieved)
• Keep submitting to maintain your streak!
```

## Scroll Session vs Submission Session

**Scroll Session:** 
- The act of browsing/scrolling through content
- May or may not result in trend submissions
- Tracked separately for engagement metrics

**Submission Session:**
- Specifically when user is actively submitting trends
- Tracked by time between submissions
- Directly affects earnings through session streak multiplier