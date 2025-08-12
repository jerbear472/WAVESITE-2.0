# 🔄 MIGRATION TO UNIFIED EARNINGS SYSTEM

## ⚠️ CRITICAL: Complete Migration Steps

This guide ensures ALL old earnings logic is removed and replaced with the single unified system.

## Step 1: Database Migration (10 minutes)

```sql
-- 1. Backup your database first!
-- 2. Run FINAL_UNIFIED_EARNINGS.sql in Supabase SQL Editor
-- This will:
--   - Remove ALL old earnings functions
--   - Create new unified functions
--   - Set up proper triggers
```

## Step 2: Clean Up Old Files (2 minutes)

```bash
# Make the cleanup script executable
chmod +x cleanup-old-earnings.sh

# Run the cleanup
./cleanup-old-earnings.sh

# This will backup and remove:
# - All old earnings config files
# - All old service files
# - All conflicting SQL files
```

## Step 3: Update Import Statements (5 minutes)

### Find all files that need updating:
```bash
grep -r "earningsConfig\|EARNINGS_STANDARD\|UnifiedTrend\|ReliableTrend" web/ --include="*.ts" --include="*.tsx"
```

### Replace ALL old imports:

❌ **OLD IMPORTS TO REMOVE:**
```typescript
import { earningsConfig } from '@/lib/earningsConfig';
import { EARNINGS_STANDARD } from '@/lib/EARNINGS_STANDARD';
import { UNIFIED_EARNINGS } from '@/lib/UNIFIED_EARNINGS_CONFIG';
import { UnifiedTrendSubmissionService } from '@/services/UnifiedTrendSubmission';
import { ReliableTrendSubmissionV2 } from '@/services/ReliableTrendSubmissionV2';
```

✅ **NEW IMPORTS TO USE:**
```typescript
import { EARNINGS, formatMoney, previewTrendEarnings } from '@/lib/earnings';
import { TrendSubmissionService, ValidationService } from '@/services/TrendSubmission';
```

## Step 4: Update Components

### Submit Page (`web/app/(authenticated)/submit/page.tsx`)
```typescript
'use client';
import { TrendSubmissionService } from '@/services/TrendSubmission';
import { EARNINGS, formatMoney } from '@/lib/earnings';

export default function SubmitPage() {
  const service = new TrendSubmissionService();
  
  const handleSubmit = async (data) => {
    const result = await service.submitTrend(data);
    if (result.success) {
      // Earnings calculated by database
      alert(`Earned ${formatMoney(result.earnings)}`);
    }
  };
  
  return (
    <div>
      <p>Base earnings: {formatMoney(EARNINGS.base.trend)}</p>
      {/* form */}
    </div>
  );
}
```

### Validation Page (`web/app/(authenticated)/validate/page.tsx`)
```typescript
'use client';
import { ValidationService } from '@/services/TrendSubmission';
import { EARNINGS, formatMoney } from '@/lib/earnings';

export default function ValidatePage() {
  const service = new ValidationService();
  
  const handleVote = async (trendId, vote) => {
    const result = await service.submitVote(trendId, vote);
    // Earnings handled by database
  };
  
  return (
    <div>
      <p>Earn {formatMoney(EARNINGS.base.validation)} per vote</p>
      {/* validation UI */}
    </div>
  );
}
```

### Dashboard (`web/app/(authenticated)/dashboard/page.tsx`)
```typescript
import { TrendSubmissionService } from '@/services/TrendSubmission';
import { formatMoney, getTierInfo } from '@/lib/earnings';

const service = new TrendSubmissionService();
const summary = await service.getEarningsSummary();

// Display tier info
const tierInfo = getTierInfo(summary.performance_tier);
```

## Step 5: Verify No Old Code Remains

### Check for old function calls:
```bash
# Should return NO results
grep -r "calculateTrendEarnings\|calculate_trend_earnings_v2" web/
grep -r "ReliableTrend\|UnifiedTrend" web/
grep -r "UNIFIED_EARNINGS\|EARNINGS_STANDARD" web/
```

### Check database for old functions:
```sql
-- Run in Supabase SQL Editor
-- Should return NO results
SELECT proname FROM pg_proc 
WHERE proname LIKE '%earning%' 
AND proname NOT LIKE '%_final';
```

## Step 6: Test the Unified System

```javascript
// test-unified-earnings.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testUnifiedSystem() {
  // Test user
  const testUser = {
    email: `test.${Date.now()}@wavesight.com`,
    password: 'Test123!'
  };
  
  // Sign up
  const { data: { user } } = await supabase.auth.signUp(testUser);
  console.log('✅ User created');
  
  // Submit trend
  const { data: trend } = await supabase
    .from('captured_trends')
    .insert([{
      user_id: user.id,
      url: 'https://test.com/trend',
      title: 'Test Trend',
      description: 'Testing unified earnings',
      category: 'other',
      platform: 'test'
    }])
    .select()
    .single();
  
  console.log(`✅ Trend submitted, earned: $${trend.earnings}`);
  
  // Check ledger
  const { data: ledger } = await supabase
    .from('earnings_ledger')
    .select('*')
    .eq('user_id', user.id)
    .single();
  
  console.log(`✅ Ledger updated: $${ledger.amount}`);
  
  // Check balance
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('current_balance, performance_tier')
    .eq('user_id', user.id)
    .single();
  
  console.log(`✅ Balance: $${profile.current_balance}`);
  console.log(`✅ Tier: ${profile.performance_tier}`);
}

testUnifiedSystem();
```

## Step 7: Deploy Changes

```bash
# Commit all changes
git add .
git commit -m "BREAKING: Migrate to unified earnings system

- Removed all old earnings logic
- Single source of truth in /lib/earnings.ts
- Database functions unified with _final suffix
- Sustainable economics: $0.25 base, up to $30/day cap"

# Push to repository
git push origin main
```

## ✅ Migration Complete Checklist

- [ ] Ran `FINAL_UNIFIED_EARNINGS.sql` in database
- [ ] Ran `cleanup-old-earnings.sh` script
- [ ] Updated all imports to use `@/lib/earnings`
- [ ] Updated all services to use `TrendSubmissionService`
- [ ] Verified no old functions in database
- [ ] Verified no old imports in code
- [ ] Tested submission flow
- [ ] Tested validation flow
- [ ] Checked earnings calculations
- [ ] Deployed to production

## 🎯 Final State

After migration, you should have:

### Files That Exist:
- `web/lib/earnings.ts` - ONLY earnings config
- `web/services/TrendSubmission.ts` - ONLY submission service
- `FINAL_UNIFIED_EARNINGS.sql` - Database schema
- `SUSTAINABLE_ECONOMICS.md` - Business model docs

### Files That Should NOT Exist:
- Any file with `earningsConfig` in the name
- Any file with `EARNINGS_STANDARD` in the name
- Any file with `UnifiedTrend` in the name
- Any file with `ReliableTrend` in the name

### Database Functions:
- `calculate_earnings_final()` - ONLY earnings calculation
- `calculate_validation_earnings_final()` - ONLY validation calculation
- `get_user_earnings_summary()` - User stats

## 💰 Final Economics

| Tier | Multiplier | Daily Cap | Monthly Potential |
|------|------------|-----------|-------------------|
| Master | 3x | $30 | $900 |
| Elite | 2x | $20 | $600 |
| Verified | 1.5x | $15 | $450 |
| Learning | 1x | $10 | $300 |
| Restricted | 0.5x | $5 | $150 |

**Base Rates:**
- Trend: $0.25
- Validation: $0.02
- Approval: $0.10

This ensures sustainable unit economics while providing meaningful income to users.