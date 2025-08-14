# Earnings Consistency Fix Plan

## Correct Earning Structure
- **Base Rate:** $0.25 per trend submission
- **Multipliers:** Tier multiplier × Streak multiplier
- **NO BONUSES** for screenshots, demographics, etc. (keep it simple)

## Files to Update

### 1. Configuration Files
- `web/lib/EARNINGS_STANDARD.ts` - Change base from $1.00 to $0.25
- `web/lib/SUSTAINABLE_EARNINGS.ts` - Already correct at $0.25 (use as reference)
- `backend/app/config/earnings_standard.py` - Change base from $1.00 to $0.25
- Create `mobile/src/config/earningsConfig.ts` - New file with $0.25 base

### 2. Database Functions (Critical)
All these need to be updated to:
- Use $0.25 base rate
- Apply tier multipliers
- Apply streak multipliers

Files:
- `supabase/migrations/20250111_standardize_earnings.sql`
- `supabase/add_earnings_ledger.sql`
- `supabase/add_earnings_ledger_updated.sql`
- `supabase/migrations/20250809_fix_earnings_ledger_column_v2.sql`
- `supabase/migrations/20250809_fix_earnings_ledger_column_v3.sql`

### 3. Frontend Components
- `web/app/(authenticated)/submit/page.tsx` - Show correct $0.25 base
- `web/app/(authenticated)/validate/page.tsx` - Update validation earnings
- `web/components/TrendScreenshotUpload.tsx` - Use correct calculation
- `web/components/EarningsDashboard.tsx` - Display correct amounts

### 4. Mobile App
- `mobile/src/screens/SubmitTrendScreen.tsx` - Add earning calculation
- `mobile/src/screens/ValidationScreen.tsx` - Update earnings display
- `mobile/src/screens/DashboardScreen.tsx` - Show correct totals
- `mobile/src/services/supabaseService.ts` - Use correct rates

## Tier Multipliers (from user_profiles.performance_tier)
- `master`: 3.0x
- `elite`: 2.0x  
- `verified`: 1.5x
- `learning`: 1.0x
- `restricted`: 0.5x

## Streak Multipliers (from user_profiles.current_streak)
- 0-1 days: 1.0x
- 2-6 days: 1.2x
- 7-13 days: 1.5x
- 14-29 days: 2.0x
- 30+ days: 2.5x

## Example Calculations
- Learning tier, no streak: $0.25 × 1.0 × 1.0 = $0.25
- Verified tier, 7-day streak: $0.25 × 1.5 × 1.5 = $0.56
- Elite tier, 30-day streak: $0.25 × 2.0 × 2.5 = $1.25
- Master tier, 30-day streak: $0.25 × 3.0 × 2.5 = $1.88

## SQL Migration Needed
```sql
-- Update base earning function
CREATE OR REPLACE FUNCTION calculate_trend_submission_earnings()
RETURNS TRIGGER AS $$
DECLARE
    v_base_amount DECIMAL(10,2) := 0.25; -- CORRECT BASE
    v_tier_multiplier DECIMAL(3,2);
    v_streak_multiplier DECIMAL(3,2);
    v_final_amount DECIMAL(10,2);
    v_user_tier TEXT;
    v_user_streak INTEGER;
BEGIN
    -- Get user tier and streak
    SELECT performance_tier, current_streak 
    INTO v_user_tier, v_user_streak
    FROM user_profiles 
    WHERE user_id = NEW.spotter_id;
    
    -- Calculate tier multiplier
    v_tier_multiplier := CASE v_user_tier
        WHEN 'master' THEN 3.0
        WHEN 'elite' THEN 2.0
        WHEN 'verified' THEN 1.5
        WHEN 'learning' THEN 1.0
        WHEN 'restricted' THEN 0.5
        ELSE 1.0
    END;
    
    -- Calculate streak multiplier
    v_streak_multiplier := CASE
        WHEN v_user_streak >= 30 THEN 2.5
        WHEN v_user_streak >= 14 THEN 2.0
        WHEN v_user_streak >= 7 THEN 1.5
        WHEN v_user_streak >= 2 THEN 1.2
        ELSE 1.0
    END;
    
    -- Calculate final amount
    v_final_amount := v_base_amount * v_tier_multiplier * v_streak_multiplier;
    
    -- Set the earnings on the trend
    NEW.earnings := v_final_amount;
    
    -- Update user's earnings
    UPDATE user_profiles
    SET 
        pending_earnings = pending_earnings + v_final_amount,
        total_earned = total_earned + v_final_amount
    WHERE user_id = NEW.spotter_id;
    
    -- Record in earnings ledger
    INSERT INTO earnings_ledger (
        user_id,
        amount,
        type,
        status,
        description,
        reference_id,
        reference_type
    ) VALUES (
        NEW.spotter_id,
        v_final_amount,
        'trend_submission',
        'pending',
        'Trend submission with ' || v_user_tier || ' tier and ' || v_user_streak || ' day streak',
        NEW.id,
        'captured_trends'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## Testing Checklist
- [ ] Submit trend as learning tier user = $0.25
- [ ] Submit trend as elite tier user = $0.50
- [ ] Submit trend with 7-day streak = multiplier applied
- [ ] Check earnings_ledger has correct amounts
- [ ] Check user_profiles.pending_earnings updated correctly
- [ ] Verify frontend displays match database values
- [ ] Test on mobile app