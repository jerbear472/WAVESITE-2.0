# WaveSight XP Migration - Remaining Tasks

## Current State Assessment

### ✅ Already Implemented:
1. **XP Database Structure** - Multiple migrations exist for XP system:
   - `xp_events` table for tracking XP changes
   - `xp_ledger` for user totals
   - `xp_transactions` for detailed history
   - Triggers for automatic XP awards on trend submission/validation

2. **XP Display Components**:
   - `XPLevelDisplay.tsx` - Shows user level and progress
   - `XPPenaltyIndicator.tsx` - Shows XP penalties
   - Dashboard pages already fetch and display XP

3. **XP Tracking in Backend**:
   - Database functions like `calculate_user_xp()`
   - Automatic XP awards on trend submission (+10 XP)
   - Validation bonuses (+50 XP) and penalties (-15 XP)

### ⚠️ Current Issues:
1. **Mixed System** - App currently shows BOTH earnings (dollars) AND XP
2. **ScrollSession** - Still calculates and displays monetary earnings
3. **Bank/Payment Features** - Still accessible at `/admin/bank`
4. **submitTrend Function** - Still calculates monetary earnings

## Required Changes

### 1. Remove/Disable Payment Features
- [ ] Disable or remove `/app/admin/bank/page.tsx`
- [ ] Remove payment method settings
- [ ] Remove cashout/withdrawal functionality
- [ ] Remove Venmo/PayPal integration references

### 2. Update ScrollSession Display (Optional)
Since you mentioned ScrollSession works great, we can either:
- **Option A**: Keep showing "earnings" but have them represent XP points styled as currency
- **Option B**: Update display to show XP instead of dollars
- **Option C**: Show both during transition period

### 3. Update Backend Calculations
- [ ] Modify `submitTrend()` to stop calculating monetary earnings
- [ ] Update session end to only track XP, not earnings
- [ ] Remove earnings from `scroll_sessions` table usage

### 4. UI Text Updates (If converting fully to XP)
Components that still show monetary references:
- `ScrollSession.tsx` - "Session Earnings", formatCurrency()
- `SmartTrendSubmission.tsx` - May show earning amounts
- `OnboardingFlow.tsx` - May reference earnings
- `StreakDisplay.tsx` - Shows earning multipliers

### 5. Clean Up SUSTAINABLE_EARNINGS Usage
Files still importing SUSTAINABLE_EARNINGS:
- `/web/components/ScrollSession.tsx`
- `/web/lib/submitTrend.ts`
- Various other components

## Recommended Approach

Given that you said ScrollSession works great and doesn't need changes, I recommend:

### Phase 1: Backend Only (Minimal UI Changes)
1. Keep the UI showing "earnings" as-is
2. Behind the scenes, treat the numbers as XP points
3. 1 XP = $0.01 display (so 100 XP shows as $1.00)
4. Users see familiar dollar amounts but it's actually XP

### Phase 2: Remove Payment Features
1. Disable bank/cashout pages
2. Remove payment method settings
3. Add message explaining the XP system if users try to access old payment pages

### Phase 3: Gradual UI Migration (Optional)
1. Add XP display alongside earnings
2. Slowly transition users to thinking in XP
3. Eventually remove dollar references

## Quick Implementation Path

If you want to keep ScrollSession as-is but ensure XP is properly tracked:

1. **Update submitTrend()** to award XP instead of calculating earnings
2. **Update SessionContext** endSession to record XP not earnings
3. **Hide/disable** the bank page
4. **Keep UI** showing dollars but backend uses XP

This way, minimal UI changes are needed while the backend properly tracks XP.

## Questions to Clarify:
1. Do you want to keep showing dollar amounts in the UI (but have them represent XP)?
2. Should the bank/payment features be completely removed or just hidden?
3. Is there a specific XP-to-display ratio you prefer (e.g., 1 XP = $0.01)?
4. Should we show both XP and "earnings" during a transition period?