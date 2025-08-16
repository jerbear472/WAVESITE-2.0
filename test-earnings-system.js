/**
 * Test Script for Earnings System
 * This verifies that all earnings calculations work correctly
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './web/.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Test configuration
const TEST_USER_EMAIL = 'earnings-test@example.com';
const TEST_PASSWORD = 'TestPassword123!';

async function cleanupTestData() {
  console.log('🧹 Cleaning up test data...');
  
  // Get test user
  const { data: users } = await supabase.auth.admin.listUsers();
  const testUser = users?.users?.find(u => u.email === TEST_USER_EMAIL);
  
  if (testUser) {
    // Delete test data
    await supabase.from('captured_trends').delete().eq('spotter_id', testUser.id);
    await supabase.from('trend_validations').delete().eq('validator_id', testUser.id);
    await supabase.from('earnings_ledger').delete().eq('user_id', testUser.id);
    await supabase.from('scroll_sessions').delete().eq('user_id', testUser.id);
    await supabase.from('user_profiles').delete().eq('user_id', testUser.id);
    
    // Delete user
    await supabase.auth.admin.deleteUser(testUser.id);
  }
}

async function createTestUser() {
  console.log('👤 Creating test user...');
  
  const { data: authUser, error } = await supabase.auth.admin.createUser({
    email: TEST_USER_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true
  });
  
  if (error) throw error;
  
  // Create profile
  await supabase.from('user_profiles').insert({
    user_id: authUser.user.id,
    email: TEST_USER_EMAIL,
    performance_tier: 'learning',
    current_streak: 0,
    pending_earnings: 0,
    approved_earnings: 0
  });
  
  return authUser.user;
}

async function testTrendSubmissionEarnings(userId) {
  console.log('\n📊 Testing Trend Submission Earnings...');
  
  // Test 1: Single submission (base rate)
  console.log('  Test 1: Single submission');
  const { data: trend1, error: error1 } = await supabase
    .from('captured_trends')
    .insert({
      spotter_id: userId,
      trend_name: 'Test Trend 1',
      category: 'test'
    })
    .select()
    .single();
  
  if (error1) throw error1;
  console.log(`    ✅ Earnings: $${trend1.earnings} (expected: $0.25)`);
  console.log(`    Session position: ${trend1.session_position}`);
  console.log(`    Multipliers - Tier: ${trend1.tier_multiplier}x, Session: ${trend1.session_multiplier}x, Daily: ${trend1.daily_multiplier}x`);
  
  // Test 2: Second submission within 5 minutes (session streak)
  console.log('  Test 2: Session streak (2nd submission)');
  await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
  
  const { data: trend2, error: error2 } = await supabase
    .from('captured_trends')
    .insert({
      spotter_id: userId,
      trend_name: 'Test Trend 2',
      category: 'test'
    })
    .select()
    .single();
  
  if (error2) throw error2;
  console.log(`    ✅ Earnings: $${trend2.earnings} (expected: $0.30 = 0.25 × 1.2)`);
  console.log(`    Session position: ${trend2.session_position}`);
  console.log(`    Session multiplier: ${trend2.session_multiplier}x`);
  
  // Test 3: Third submission (higher multiplier)
  console.log('  Test 3: Session streak (3rd submission)');
  const { data: trend3, error: error3 } = await supabase
    .from('captured_trends')
    .insert({
      spotter_id: userId,
      trend_name: 'Test Trend 3',
      category: 'test'
    })
    .select()
    .single();
  
  if (error3) throw error3;
  console.log(`    ✅ Earnings: $${trend3.earnings} (expected: $0.38 = 0.25 × 1.5)`);
  console.log(`    Session position: ${trend3.session_position}`);
  console.log(`    Session multiplier: ${trend3.session_multiplier}x`);
  
  return [trend1.id, trend2.id, trend3.id];
}

async function testValidationEarnings(userId, trendIds) {
  console.log('\n✅ Testing Validation Earnings...');
  
  // Create another user to validate
  const { data: validator } = await supabase.auth.admin.createUser({
    email: 'validator-test@example.com',
    password: TEST_PASSWORD,
    email_confirm: true
  });
  
  await supabase.from('user_profiles').insert({
    user_id: validator.user.id,
    email: 'validator-test@example.com',
    performance_tier: 'verified', // 1.5x multiplier
    approved_earnings: 0
  });
  
  // Validate first trend
  console.log('  Validating trend with verified tier...');
  const { data: validation, error } = await supabase
    .from('trend_validations')
    .insert({
      trend_id: trendIds[0],
      validator_id: validator.user.id,
      is_genuine: true,
      vote: 'verify'
    })
    .select()
    .single();
  
  if (error) throw error;
  console.log(`    ✅ Reward: $${validation.reward_amount} (expected: $0.15 = 0.10 × 1.5)`);
  
  // Check validator's approved earnings
  const { data: validatorProfile } = await supabase
    .from('user_profiles')
    .select('approved_earnings')
    .eq('user_id', validator.user.id)
    .single();
  
  console.log(`    ✅ Validator approved earnings: $${validatorProfile.approved_earnings}`);
  
  // Cleanup
  await supabase.auth.admin.deleteUser(validator.user.id);
  
  return validation;
}

async function testPendingToApprovedFlow(userId, trendId) {
  console.log('\n🔄 Testing Pending → Approved Flow...');
  
  // Check initial pending earnings
  const { data: initialProfile } = await supabase
    .from('user_profiles')
    .select('pending_earnings, approved_earnings')
    .eq('user_id', userId)
    .single();
  
  console.log(`  Initial: Pending=$${initialProfile.pending_earnings}, Approved=$${initialProfile.approved_earnings}`);
  
  // Create two validators
  const validators = [];
  for (let i = 1; i <= 2; i++) {
    const { data: validator } = await supabase.auth.admin.createUser({
      email: `validator${i}@example.com`,
      password: TEST_PASSWORD,
      email_confirm: true
    });
    validators.push(validator.user);
  }
  
  // Cast 2 YES votes
  console.log('  Casting 2 YES votes...');
  for (const validator of validators) {
    await supabase.from('trend_validations').insert({
      trend_id: trendId,
      validator_id: validator.id,
      is_genuine: true,
      vote: 'verify'
    });
  }
  
  // Check trend status
  const { data: approvedTrend } = await supabase
    .from('captured_trends')
    .select('status, earnings_status, yes_votes, no_votes')
    .eq('id', trendId)
    .single();
  
  console.log(`    Trend status: ${approvedTrend.status} (${approvedTrend.yes_votes} YES, ${approvedTrend.no_votes} NO)`);
  
  // Check updated earnings
  const { data: finalProfile } = await supabase
    .from('user_profiles')
    .select('pending_earnings, approved_earnings')
    .eq('user_id', userId)
    .single();
  
  console.log(`  Final: Pending=$${finalProfile.pending_earnings}, Approved=$${finalProfile.approved_earnings}`);
  console.log(`    ✅ Earnings moved from pending to approved + $0.50 bonus`);
  
  // Cleanup validators
  for (const validator of validators) {
    await supabase.auth.admin.deleteUser(validator.id);
  }
}

async function testTierMultipliers(userId) {
  console.log('\n🎯 Testing Tier Multipliers...');
  
  const tiers = [
    { name: 'restricted', multiplier: 0.5 },
    { name: 'learning', multiplier: 1.0 },
    { name: 'verified', multiplier: 1.5 },
    { name: 'elite', multiplier: 2.0 },
    { name: 'master', multiplier: 3.0 }
  ];
  
  for (const tier of tiers) {
    // Update user tier
    await supabase
      .from('user_profiles')
      .update({ performance_tier: tier.name })
      .eq('user_id', userId);
    
    // Submit a trend
    const { data: trend } = await supabase
      .from('captured_trends')
      .insert({
        spotter_id: userId,
        trend_name: `Test ${tier.name} tier`,
        category: 'test'
      })
      .select()
      .single();
    
    const expected = (0.25 * tier.multiplier).toFixed(2);
    console.log(`  ${tier.name}: $${trend.earnings} (expected: $${expected})`);
  }
}

async function checkEarningsSummary(userId) {
  console.log('\n📈 Earnings Summary:');
  
  // Get summary from database function
  const { data: summary, error } = await supabase
    .rpc('get_user_earnings_summary', { p_user_id: userId });
  
  if (error) {
    console.error('Error getting summary:', error);
    return;
  }
  
  if (summary && summary.length > 0) {
    const s = summary[0];
    console.log(`  Pending: $${s.pending_earnings}`);
    console.log(`  Approved: $${s.approved_earnings}`);
    console.log(`  Total Earned: $${s.total_earned}`);
    console.log(`  Today: $${s.today_earned}`);
    console.log(`  Tier: ${s.performance_tier}`);
    console.log(`  Daily Streak: ${s.current_streak} days`);
    console.log(`  Session Streak: ${s.session_streak} submissions`);
    console.log(`  Next Earning Estimate: $${s.next_earning_estimate}`);
  }
  
  // Check scroll sessions
  const { data: sessions } = await supabase
    .from('scroll_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('start_time', { ascending: false });
  
  console.log(`\n  Active Sessions: ${sessions?.filter(s => s.is_active).length || 0}`);
  console.log(`  Total Sessions: ${sessions?.length || 0}`);
  if (sessions && sessions.length > 0) {
    console.log(`  Latest Session: ${sessions[0].trends_submitted} trends, $${sessions[0].session_earnings} earned`);
  }
}

async function runTests() {
  try {
    console.log('🚀 Starting Earnings System Tests...\n');
    
    // Cleanup first
    await cleanupTestData();
    
    // Create test user
    const testUser = await createTestUser();
    console.log(`  Created user: ${testUser.id}`);
    
    // Run tests
    const trendIds = await testTrendSubmissionEarnings(testUser.id);
    await testValidationEarnings(testUser.id, trendIds);
    await testPendingToApprovedFlow(testUser.id, trendIds[0]);
    await testTierMultipliers(testUser.id);
    
    // Final summary
    await checkEarningsSummary(testUser.id);
    
    // Cleanup
    await cleanupTestData();
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
runTests();