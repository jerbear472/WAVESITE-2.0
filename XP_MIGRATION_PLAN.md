# WaveSight XP Migration Plan

## Overview
Transitioning WaveSight from a monetary payment system to a gamified XP (Experience Points) system for trend spotting.

## Current State Analysis

### Existing Systems
1. **Payment System** (`SUSTAINABLE_EARNINGS.ts`)
   - Dollar-based rewards ($0.25 per trend, etc.)
   - Tier multipliers for earnings
   - Daily/monthly earning caps
   - Payment methods (Venmo, PayPal, etc.)

2. **XP System** (Already partially implemented)
   - 15-level progression (Observer → Legend)
   - XP events tracking in database
   - XP display components
   - Level-based titles and emojis

## Migration Strategy

### Phase 1: Core System Updates ✅
- [x] Create `XP_REWARDS.ts` configuration
- [ ] Update database schema for XP-only tracking
- [ ] Modify session tracking to award XP

### Phase 2: Component Updates
Components to modify:
1. **ScrollSession.tsx**
   - Replace earnings calculations with XP calculations
   - Update UI to show XP instead of dollars
   - Remove currency formatting

2. **SessionContext.tsx**
   - Change earnings tracking to XP tracking
   - Update session end to record XP instead of money

3. **FloatingSessionTimer.tsx**
   - Display XP earned instead of dollar amounts
   - Update progress indicators

4. **SmartTrendSubmission.tsx**
   - Show XP rewards for submissions
   - Update submission feedback

5. **Dashboard components**
   - Update stats to show XP totals
   - Remove earning/payment sections
   - Enhance level progression display

### Phase 3: Feature Removal
Remove or hide:
- Bank/payment pages (`/admin/bank`)
- Withdrawal functionality
- Payment method settings
- Earning history in dollars
- Monthly earning projections

### Phase 4: Database Updates
Tables to modify:
- `scroll_sessions`: Change earnings fields to XP
- `trend_submissions`: Add XP reward tracking
- `user_profiles`: Remove payment-related fields
- Add `xp_transactions` table for detailed tracking

## Implementation Steps

### Step 1: Update Core Libraries
```typescript
// Replace SUSTAINABLE_EARNINGS imports with XP_REWARDS
import { XP_REWARDS, calculateTrendXP, formatXP } from '@/lib/XP_REWARDS';
```

### Step 2: Update Calculation Functions
```typescript
// Old: Calculate earnings
const earnings = calculateTrendEarnings(trend, userProfile);

// New: Calculate XP
const xpReward = calculateTrendXP(qualityScore, userLevel, sessionPosition, dailyStreak);
```

### Step 3: Update UI Text
- "Earn $X" → "Earn X XP"
- "Total Earnings" → "Total XP"
- "Daily Cap: $X" → "Daily XP Cap: X"
- "Cashout" → "Rewards" or remove entirely

### Step 4: Update Database Queries
```sql
-- Old: Track earnings
INSERT INTO scroll_sessions (user_id, total_earnings, ...)

-- New: Track XP
INSERT INTO scroll_sessions (user_id, xp_earned, ...)
```

## Components Affected

### High Priority (Core Functionality)
1. `/web/components/ScrollSession.tsx`
2. `/web/contexts/SessionContext.tsx`
3. `/web/lib/submitTrend.ts`
4. `/web/app/(authenticated)/spot/page.tsx`

### Medium Priority (Display & Stats)
1. `/web/components/FloatingSessionTimer.tsx`
2. `/web/app/(authenticated)/dashboard/page.tsx`
3. `/web/components/XPLevelDisplay.tsx`
4. `/web/components/SmartTrendSubmission.tsx`

### Low Priority (Admin & Legacy)
1. `/web/app/admin/bank/page.tsx` (Remove or disable)
2. `/web/components/PerformanceTierDisplay.tsx`
3. `/web/components/SpotterTierDisplay.tsx`

## Testing Checklist
- [ ] User can start a scroll session
- [ ] XP is calculated correctly based on activity
- [ ] XP is displayed instead of dollars
- [ ] Level progression works correctly
- [ ] Streak multipliers apply to XP
- [ ] Daily XP caps are enforced
- [ ] Database correctly stores XP transactions
- [ ] No monetary references remain in UI
- [ ] Achievement system awards bonus XP

## Rollback Plan
If issues arise:
1. Keep `SUSTAINABLE_EARNINGS.ts` as backup
2. Database changes should be additive (new columns) not destructive
3. Feature flag to toggle between XP and money display
4. Maintain git branch for quick revert

## Success Metrics
- Users understand XP system immediately
- Increased engagement through gamification
- Clear progression path visible
- No confusion about monetary rewards
- Positive user feedback on new system

## Notes
- Consider keeping some tier names (Master, Elite, etc.) for familiarity
- XP values should feel substantial (25 XP vs $0.25)
- Visual feedback for XP gains should be prominent
- Consider adding achievement notifications
- May want to add XP boost events for engagement