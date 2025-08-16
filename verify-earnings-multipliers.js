/**
 * VERIFY EARNINGS MULTIPLIERS
 * This script confirms System 1 multipliers are correctly applied
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './web/.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// System 1 - The Correct Standard
const EXPECTED_VALUES = {
  tiers: {
    master: 3.0,
    elite: 2.0,
    verified: 1.5,
    learning: 1.0,
    restricted: 0.5
  },
  sessionStreaks: {
    1: 1.0,
    2: 1.2,
    3: 1.5,
    4: 2.0,
    5: 2.5
  },
  dailyStreaks: {
    0: 1.0,    // 0-1 days
    2: 1.2,    // 2-6 days
    7: 1.5,    // 7-13 days
    14: 2.0,   // 14-29 days
    30: 2.5    // 30+ days
  }
};

async function verifyMultipliers() {
  console.log('🔍 VERIFYING EARNINGS MULTIPLIERS (System 1)\n');
  console.log('='.'repeat(50));
  
  let allCorrect = true;
  
  // 1. Verify Tier Multipliers
  console.log('\n📊 TIER MULTIPLIERS:');
  console.log('-'.repeat(30));
  
  for (const [tier, expectedMultiplier] of Object.entries(EXPECTED_VALUES.tiers)) {
    try {
      const { data, error } = await supabase.rpc('get_tier_multiplier', { 
        p_tier: tier 
      });
      
      if (error) throw error;
      
      const actualMultiplier = parseFloat(data);
      const isCorrect = actualMultiplier === expectedMultiplier;
      const status = isCorrect ? '✅' : '❌';
      
      console.log(`${status} ${tier.padEnd(12)} Expected: ${expectedMultiplier}x  Actual: ${actualMultiplier}x`);
      
      if (!isCorrect) allCorrect = false;
    } catch (err) {
      console.log(`❌ ${tier.padEnd(12)} Error: ${err.message}`);
      allCorrect = false;
    }
  }
  
  // 2. Verify Session Streak Multipliers
  console.log('\n🔥 SESSION STREAK MULTIPLIERS:');
  console.log('-'.repeat(30));
  
  for (const [position, expectedMultiplier] of Object.entries(EXPECTED_VALUES.sessionStreaks)) {
    try {
      const { data, error } = await supabase.rpc('get_session_streak_multiplier', { 
        p_position: parseInt(position) 
      });
      
      if (error) throw error;
      
      const actualMultiplier = parseFloat(data);
      const isCorrect = actualMultiplier === expectedMultiplier;
      const status = isCorrect ? '✅' : '❌';
      
      const label = position === '5' ? '5+' : position;
      console.log(`${status} Position ${label.padEnd(3)} Expected: ${expectedMultiplier}x  Actual: ${actualMultiplier}x`);
      
      if (!isCorrect) allCorrect = false;
    } catch (err) {
      console.log(`❌ Position ${position}   Error: ${err.message}`);
      allCorrect = false;
    }
  }
  
  // 3. Verify Daily Streak Multipliers
  console.log('\n📅 DAILY STREAK MULTIPLIERS:');
  console.log('-'.repeat(30));
  
  for (const [days, expectedMultiplier] of Object.entries(EXPECTED_VALUES.dailyStreaks)) {
    try {
      const { data, error } = await supabase.rpc('get_daily_streak_multiplier', { 
        p_streak: parseInt(days) 
      });
      
      if (error) throw error;
      
      const actualMultiplier = parseFloat(data);
      const isCorrect = actualMultiplier === expectedMultiplier;
      const status = isCorrect ? '✅' : '❌';
      
      let label;
      if (days === '0') label = '0-1 days';
      else if (days === '2') label = '2-6 days';
      else if (days === '7') label = '7-13 days';
      else if (days === '14') label = '14-29 days';
      else label = '30+ days';
      
      console.log(`${status} ${label.padEnd(12)} Expected: ${expectedMultiplier}x  Actual: ${actualMultiplier}x`);
      
      if (!isCorrect) allCorrect = false;
    } catch (err) {
      console.log(`❌ ${days} days      Error: ${err.message}`);
      allCorrect = false;
    }
  }
  
  // 4. Test Sample Calculations
  console.log('\n🧮 SAMPLE CALCULATIONS:');
  console.log('-'.repeat(30));
  
  const testCases = [
    {
      name: 'New user, first submission',
      tier: 'learning',
      sessionPos: 1,
      dailyStreak: 0,
      expected: 0.25 // $0.25 × 1.0 × 1.0 × 1.0
    },
    {
      name: 'Verified user, 3rd rapid submission, 7-day streak',
      tier: 'verified',
      sessionPos: 3,
      dailyStreak: 7,
      expected: 0.84 // $0.25 × 1.5 × 1.5 × 1.5 = 0.84375 → 0.84
    },
    {
      name: 'Elite user, 5th submission, 30-day streak',
      tier: 'elite',
      sessionPos: 5,
      dailyStreak: 30,
      expected: 3.13 // $0.25 × 2.0 × 2.5 × 2.5 = 3.125 → 3.13
    },
    {
      name: 'Master user, 2nd submission, 14-day streak',
      tier: 'master',
      sessionPos: 2,
      dailyStreak: 14,
      expected: 1.80 // $0.25 × 3.0 × 1.2 × 2.0 = 1.80
    }
  ];
  
  for (const test of testCases) {
    try {
      // Get multipliers
      const { data: tierMult } = await supabase.rpc('get_tier_multiplier', { p_tier: test.tier });
      const { data: sessionMult } = await supabase.rpc('get_session_streak_multiplier', { p_position: test.sessionPos });
      const { data: dailyMult } = await supabase.rpc('get_daily_streak_multiplier', { p_streak: test.dailyStreak });
      
      const calculated = Math.round(0.25 * tierMult * sessionMult * dailyMult * 100) / 100;
      const isCorrect = Math.abs(calculated - test.expected) < 0.02; // Allow small rounding difference
      const status = isCorrect ? '✅' : '❌';
      
      console.log(`\n${status} ${test.name}`);
      console.log(`   Formula: $0.25 × ${tierMult} × ${sessionMult} × ${dailyMult}`);
      console.log(`   Expected: $${test.expected.toFixed(2)}  Actual: $${calculated.toFixed(2)}`);
      
      if (!isCorrect) allCorrect = false;
    } catch (err) {
      console.log(`❌ ${test.name}: ${err.message}`);
      allCorrect = false;
    }
  }
  
  // 5. Check database functions exist
  console.log('\n🔧 DATABASE FUNCTIONS:');
  console.log('-'.repeat(30));
  
  const requiredFunctions = [
    'get_tier_multiplier',
    'get_session_streak_multiplier',
    'get_daily_streak_multiplier',
    'calculate_trend_earnings',
    'calculate_validation_earnings',
    'get_user_earnings_summary'
  ];
  
  for (const funcName of requiredFunctions) {
    try {
      const { data, error } = await supabase.rpc(funcName === 'get_user_earnings_summary' 
        ? funcName 
        : funcName === 'get_tier_multiplier' ? funcName : funcName, 
        funcName === 'get_user_earnings_summary' 
          ? { p_user_id: '00000000-0000-0000-0000-000000000000' }
          : funcName === 'get_tier_multiplier' 
            ? { p_tier: 'learning' }
            : funcName.includes('session') 
              ? { p_position: 1 }
              : { p_streak: 1 }
      );
      
      console.log(`✅ ${funcName}`);
    } catch (err) {
      console.log(`❌ ${funcName} - Missing or error`);
      allCorrect = false;
    }
  }
  
  // 6. Check tables exist
  console.log('\n📋 REQUIRED TABLES:');
  console.log('-'.repeat(30));
  
  const requiredTables = [
    'user_profiles',
    'earnings_ledger',
    'scroll_sessions',
    'trend_validations'
  ];
  
  for (const table of requiredTables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error && !error.message.includes('permission')) throw error;
      
      console.log(`✅ ${table}`);
    } catch (err) {
      console.log(`❌ ${table} - Missing or error`);
      allCorrect = false;
    }
  }
  
  // Final Summary
  console.log('\n' + '='.repeat(50));
  if (allCorrect) {
    console.log('✅ SUCCESS! System 1 multipliers are correctly configured.');
    console.log('\n📊 ACTIVE CONFIGURATION:');
    console.log('  Base rate: $0.25');
    console.log('  Tiers: Master(3x), Elite(2x), Verified(1.5x), Learning(1x), Restricted(0.5x)');
    console.log('  Session: 1x → 1.2x → 1.5x → 2x → 2.5x');
    console.log('  Daily: 1x → 1.2x → 1.5x → 2x → 2.5x');
    console.log('  Max per submission: $5.00');
  } else {
    console.log('❌ ISSUES FOUND! Some multipliers are not configured correctly.');
    console.log('\nTo fix: Run APPLY_EARNINGS_FIX.sql again or check error messages above.');
  }
}

// Run verification
verifyMultipliers().catch(console.error);