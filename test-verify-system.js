#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

// Use anon key to simulate regular user
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testVerifySystem() {
  console.log('🧪 TESTING VERIFY SYSTEM');
  console.log('========================\n');

  const tests = {
    passed: 0,
    failed: 0,
    results: []
  };

  // Test 1: Can fetch trends
  console.log('📋 Test 1: Fetching trends for validation...');
  try {
    const { data: trends, error } = await supabase
      .from('trend_submissions')
      .select('*')
      .limit(5);

    if (error) throw error;

    tests.passed++;
    console.log(`   ✅ Can fetch trends (found ${trends?.length || 0})`);
    tests.results.push({ test: 'Fetch trends', status: 'PASS', count: trends?.length });
  } catch (error) {
    tests.failed++;
    console.log(`   ❌ Cannot fetch trends: ${error.message}`);
    tests.results.push({ test: 'Fetch trends', status: 'FAIL', error: error.message });
  }

  // Test 2: Check for pending trends
  console.log('\n📋 Test 2: Finding pending trends...');
  try {
    const { data: pendingTrends, error } = await supabase
      .from('trend_submissions')
      .select('id, description, validation_status, validation_count, approve_count, reject_count')
      .or('validation_status.eq.pending,validation_count.lt.2')
      .limit(10);

    if (error) throw error;

    const needsVotes = pendingTrends?.filter(t => 
      t.validation_status === 'pending' || t.validation_count < 2
    );

    tests.passed++;
    console.log(`   ✅ Found ${needsVotes?.length || 0} trends needing votes`);
    
    if (needsVotes && needsVotes.length > 0) {
      console.log('   Sample trends:');
      needsVotes.slice(0, 3).forEach(t => {
        console.log(`     - ${t.description?.substring(0, 30)}... (${t.approve_count} yes, ${t.reject_count} no)`);
      });
    }
    
    tests.results.push({ test: 'Find pending trends', status: 'PASS', count: needsVotes?.length });
  } catch (error) {
    tests.failed++;
    console.log(`   ❌ Cannot find pending trends: ${error.message}`);
    tests.results.push({ test: 'Find pending trends', status: 'FAIL', error: error.message });
  }

  // Test 3: Check if we can see ALL trends (including own)
  console.log('\n📋 Test 3: Checking if ALL trends are visible...');
  try {
    const { data: allTrends, count } = await supabase
      .from('trend_submissions')
      .select('*', { count: 'exact' });

    if (count > 0) {
      tests.passed++;
      console.log(`   ✅ Can see ${count} total trends (no user filtering)`);
      tests.results.push({ test: 'See all trends', status: 'PASS', count });
    } else {
      tests.failed++;
      console.log(`   ⚠️  No trends found in database`);
      tests.results.push({ test: 'See all trends', status: 'WARN', count: 0 });
    }
  } catch (error) {
    tests.failed++;
    console.log(`   ❌ Error checking trends: ${error.message}`);
    tests.results.push({ test: 'See all trends', status: 'FAIL', error: error.message });
  }

  // Test 4: Check if cast_trend_vote function exists
  console.log('\n📋 Test 4: Testing cast_trend_vote function...');
  try {
    // Try calling with invalid ID to test if function exists
    const { data, error } = await supabase.rpc('cast_trend_vote', {
      trend_id: '00000000-0000-0000-0000-000000000000',
      vote_type: 'verify'
    });

    if (error?.message?.includes('not found') && !error?.message?.includes('function')) {
      // Trend not found is OK, means function exists
      tests.passed++;
      console.log('   ✅ cast_trend_vote function exists');
      tests.results.push({ test: 'cast_trend_vote exists', status: 'PASS' });
    } else if (error?.message?.includes('function')) {
      tests.failed++;
      console.log('   ❌ cast_trend_vote function not found');
      tests.results.push({ test: 'cast_trend_vote exists', status: 'FAIL', error: 'Function not found' });
    } else if (data?.error === 'Not authenticated') {
      tests.passed++;
      console.log('   ✅ cast_trend_vote function exists (auth required)');
      tests.results.push({ test: 'cast_trend_vote exists', status: 'PASS' });
    } else {
      tests.passed++;
      console.log('   ✅ cast_trend_vote function responded');
      tests.results.push({ test: 'cast_trend_vote exists', status: 'PASS' });
    }
  } catch (error) {
    tests.failed++;
    console.log(`   ❌ Error testing function: ${error.message}`);
    tests.results.push({ test: 'cast_trend_vote exists', status: 'FAIL', error: error.message });
  }

  // Test 5: Check profiles table structure
  console.log('\n📋 Test 5: Checking profiles table...');
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, awaiting_verification, total_earnings')
      .limit(1);

    if (error?.message?.includes('awaiting_verification')) {
      tests.failed++;
      console.log('   ❌ awaiting_verification column missing');
      tests.results.push({ test: 'Profiles structure', status: 'FAIL', error: 'Missing column' });
    } else if (error) {
      throw error;
    } else {
      tests.passed++;
      console.log('   ✅ Profiles table has correct structure');
      tests.results.push({ test: 'Profiles structure', status: 'PASS' });
    }
  } catch (error) {
    tests.failed++;
    console.log(`   ❌ Error checking profiles: ${error.message}`);
    tests.results.push({ test: 'Profiles structure', status: 'FAIL', error: error.message });
  }

  // Test 6: Check earnings_ledger
  console.log('\n📋 Test 6: Checking earnings_ledger table...');
  try {
    const { data: earnings, error } = await supabase
      .from('earnings_ledger')
      .select('id, status, type')
      .limit(1);

    if (!error) {
      tests.passed++;
      console.log('   ✅ Earnings ledger accessible');
      tests.results.push({ test: 'Earnings ledger', status: 'PASS' });
    } else {
      throw error;
    }
  } catch (error) {
    if (error.message?.includes('not exist')) {
      tests.failed++;
      console.log('   ❌ Earnings ledger table missing');
      tests.results.push({ test: 'Earnings ledger', status: 'FAIL', error: 'Table missing' });
    } else {
      tests.failed++;
      console.log(`   ⚠️  Earnings ledger issue: ${error.message}`);
      tests.results.push({ test: 'Earnings ledger', status: 'WARN', error: error.message });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(50));
  console.log(`   ✅ Passed: ${tests.passed}`);
  console.log(`   ❌ Failed: ${tests.failed}`);
  console.log('\nDetailed Results:');
  tests.results.forEach(r => {
    const icon = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`   ${icon} ${r.test}: ${r.status} ${r.count ? `(${r.count} items)` : ''} ${r.error ? `- ${r.error}` : ''}`);
  });

  // Recommendations
  console.log('\n📝 RECOMMENDATIONS:');
  if (tests.failed > 0) {
    console.log('   ⚠️  Some tests failed. Please:');
    console.log('   1. Run IMPLEMENT_VERIFY_SYSTEM_NOW.sql in Supabase SQL Editor');
    console.log('   2. Check that RLS policies are not blocking access');
    console.log('   3. Ensure all required columns exist');
  } else {
    console.log('   ✅ All tests passed! The verify system should be working.');
    console.log('   Try submitting a trend and checking the /verify page.');
  }

  // Check what the verify page would see
  console.log('\n🔍 WHAT THE VERIFY PAGE WILL SEE:');
  try {
    const { data: verifyTrends, error } = await supabase
      .from('trend_submissions')
      .select('id, description, validation_count, approve_count, reject_count')
      .or('validation_status.eq.pending,validation_count.lt.2,status.eq.submitted')
      .order('created_at', { ascending: false })
      .limit(5);

    if (!error && verifyTrends) {
      console.log(`   Found ${verifyTrends.length} trends for validation:`);
      verifyTrends.forEach(t => {
        console.log(`   - ${t.description?.substring(0, 40)}...`);
        console.log(`     Votes: ${t.approve_count || 0} yes, ${t.reject_count || 0} no (needs ${2 - (t.validation_count || 0)} more)`);
      });
    } else if (error) {
      console.log(`   Error: ${error.message}`);
    }
  } catch (e) {
    console.log(`   Error: ${e.message}`);
  }
}

// Run tests
testVerifySystem().catch(console.error);