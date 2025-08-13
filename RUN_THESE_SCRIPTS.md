# Scripts to Run for WaveSight Earnings System Setup

## Required Scripts (Run in Order)

### 1. Fix User Profiles Table
**File:** `FIX_USER_PROFILES_FINAL.sql`
**Purpose:** Fixes the user_profiles table schema to support the unified earnings system
**Where to run:** Supabase SQL Editor

```bash
# Copy the contents of this file and run in Supabase:
cat FIX_USER_PROFILES_FINAL.sql
```

This script will:
- Add missing columns (user_id, earnings fields)
- Create test user for verification
- Fix earnings calculation functions
- Set up proper constraints

### 2. Test the System
**File:** `quick-test.js`
**Purpose:** Verify the earnings system is working
**Where to run:** Terminal

```bash
node quick-test.js
```

Expected output:
- ✅ Earnings Config loaded
- ✅ Validation earnings work
- ✅ Test User Profile exists
- ✅ Ready for production!

### 3. Clean Up Old Files (Optional)
**File:** `cleanup-old-earnings.sh`
**Purpose:** Remove old conflicting earnings files
**Where to run:** Terminal

```bash
chmod +x cleanup-old-earnings.sh
./cleanup-old-earnings.sh
```

## Quick Command Summary

```bash
# Step 1: Go to Supabase SQL editor and run FIX_USER_PROFILES_FINAL.sql

# Step 2: Test locally
node quick-test.js

# Step 3: Clean up (optional)
./cleanup-old-earnings.sh
```

## System Configuration
- **Base Rate:** $0.25 per trend
- **Validation:** $0.02 per vote  
- **Daily Caps:** $5-30 based on tier
- **Multipliers:** 0.5x-3x based on performance

## Next Steps After Scripts
1. Frontend components will automatically use new system via `@/lib/earnings`
2. Test with real user submissions
3. Monitor earnings ledger in Supabase dashboard
4. Deploy to production when ready