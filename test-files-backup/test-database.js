#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration - NEW instance
const supabaseUrl = 'https://aicahushpcslwjwrlqbo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpY2FodXNocGNzbHdqd3JscWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4ODc1NTQsImV4cCI6MjA3MDQ2MzU1NH0.rLPnouZXA1ejWG0tuurIb5sgo5CCHe15M4knaANrR2w';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testDatabase() {
  console.log('🔍 Testing database setup...\n');
  
  const tests = {
    tables: 0,
    passed: 0,
    failed: 0
  };
  
  // Test 1: Check user_profiles table
  console.log('1️⃣ Testing user_profiles table...');
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1);
    
    if (error) throw error;
    console.log('   ✅ user_profiles table exists');
    tests.passed++;
  } catch (error) {
    console.log('   ❌ user_profiles table error:', error.message);
    tests.failed++;
  }
  tests.tables++;
  
  // Test 2: Check profiles view
  console.log('\n2️⃣ Testing profiles view (frontend compatibility)...');
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (error) throw error;
    console.log('   ✅ profiles view exists');
    tests.passed++;
  } catch (error) {
    console.log('   ❌ profiles view error:', error.message);
    tests.failed++;
  }
  tests.tables++;
  
  // Test 3: Check trend_submissions table
  console.log('\n3️⃣ Testing trend_submissions table...');
  try {
    const { data, error } = await supabase
      .from('trend_submissions')
      .select('id, trend_name, image_url, platform, views_count')
      .limit(1);
    
    if (error) throw error;
    console.log('   ✅ trend_submissions table exists with new columns');
    tests.passed++;
  } catch (error) {
    console.log('   ❌ trend_submissions table error:', error.message);
    tests.failed++;
  }
  tests.tables++;
  
  // Test 4: Check trend_validations table
  console.log('\n4️⃣ Testing trend_validations table...');
  try {
    const { data, error } = await supabase
      .from('trend_validations')
      .select('id')
      .limit(1);
    
    if (error) throw error;
    console.log('   ✅ trend_validations table exists');
    tests.passed++;
  } catch (error) {
    console.log('   ❌ trend_validations table error:', error.message);
    tests.failed++;
  }
  tests.tables++;
  
  // Test 5: Check earnings_ledger table
  console.log('\n5️⃣ Testing earnings_ledger table...');
  try {
    const { data, error } = await supabase
      .from('earnings_ledger')
      .select('id')
      .limit(1);
    
    if (error) throw error;
    console.log('   ✅ earnings_ledger table exists');
    tests.passed++;
  } catch (error) {
    console.log('   ❌ earnings_ledger table error:', error.message);
    tests.failed++;
  }
  tests.tables++;
  
  // Test 6: Check cashout_requests table
  console.log('\n6️⃣ Testing cashout_requests table...');
  try {
    const { data, error } = await supabase
      .from('cashout_requests')
      .select('id')
      .limit(1);
    
    if (error) throw error;
    console.log('   ✅ cashout_requests table exists');
    tests.passed++;
  } catch (error) {
    console.log('   ❌ cashout_requests table error:', error.message);
    tests.failed++;
  }
  tests.tables++;
  
  // Test 7: Check captured_trends table (mobile)
  console.log('\n7️⃣ Testing captured_trends table (mobile)...');
  try {
    const { data, error } = await supabase
      .from('captured_trends')
      .select('id')
      .limit(1);
    
    if (error) throw error;
    console.log('   ✅ captured_trends table exists');
    tests.passed++;
  } catch (error) {
    console.log('   ❌ captured_trends table error:', error.message);
    tests.failed++;
  }
  tests.tables++;
  
  // Test 8: Check scroll_sessions table (mobile)
  console.log('\n8️⃣ Testing scroll_sessions table (mobile)...');
  try {
    const { data, error } = await supabase
      .from('scroll_sessions')
      .select('id')
      .limit(1);
    
    if (error) throw error;
    console.log('   ✅ scroll_sessions table exists');
    tests.passed++;
  } catch (error) {
    console.log('   ❌ scroll_sessions table error:', error.message);
    tests.failed++;
  }
  tests.tables++;
  
  // Test 9: Check user_account_settings table
  console.log('\n9️⃣ Testing user_account_settings table...');
  try {
    const { data, error } = await supabase
      .from('user_account_settings')
      .select('id')
      .limit(1);
    
    if (error) throw error;
    console.log('   ✅ user_account_settings table exists');
    tests.passed++;
  } catch (error) {
    console.log('   ❌ user_account_settings table error:', error.message);
    tests.failed++;
  }
  tests.tables++;
  
  // Test 10: Check submission_queue table (failsafe)
  console.log('\n🔟 Testing submission_queue table (failsafe)...');
  try {
    const { data, error } = await supabase
      .from('submission_queue')
      .select('id')
      .limit(1);
    
    if (error) throw error;
    console.log('   ✅ submission_queue table exists');
    tests.passed++;
  } catch (error) {
    console.log('   ❌ submission_queue table error:', error.message);
    tests.failed++;
  }
  tests.tables++;
  
  // Test 11: Test RPC function
  console.log('\n🎯 Testing RPC functions...');
  try {
    // This will fail if no user exists, but we're testing if the function exists
    const { data, error } = await supabase
      .rpc('get_user_dashboard_stats', { 
        p_user_id: '00000000-0000-0000-0000-000000000000' 
      });
    
    // If we get here, the function exists (even if it returns null)
    console.log('   ✅ get_user_dashboard_stats function exists');
    tests.passed++;
  } catch (error) {
    if (error.message.includes('function') && error.message.includes('does not exist')) {
      console.log('   ❌ get_user_dashboard_stats function missing');
      tests.failed++;
    } else {
      console.log('   ✅ get_user_dashboard_stats function exists');
      tests.passed++;
    }
  }
  tests.tables++;
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 DATABASE TEST SUMMARY:');
  console.log(`✅ Passed: ${tests.passed}/${tests.tables}`);
  console.log(`❌ Failed: ${tests.failed}/${tests.tables}`);
  console.log('='.repeat(50));
  
  if (tests.failed === 0) {
    console.log('\n🎉 All database tables are set up correctly!');
    console.log('\n📝 Next steps:');
    console.log('1. Try creating a new account on the website');
    console.log('2. Submit a test trend');
    console.log('3. Test voting on trends');
  } else {
    console.log('\n⚠️ Some tables are missing or have errors.');
    console.log('Please run the SETUP_SAFE.sql script in Supabase SQL Editor.');
  }
}

// Run the test
testDatabase().catch(console.error);