#!/usr/bin/env node

// Test connection to new Supabase instance
require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables!');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Set' : '❌ Missing');
  process.exit(1);
}

console.log('🔄 Testing connection to new Supabase instance...');
console.log('URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  try {
    // Test 1: Check if we can query
    console.log('\n📊 Test 1: Checking database connection...');
    const { data: test, error: testError } = await supabase
      .from('trend_submissions')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.log('❌ Connection test failed:', testError.message);
      if (testError.message.includes('relation') && testError.message.includes('does not exist')) {
        console.log('⚠️  Tables not created yet. Please run FRESH_START_SCHEMA.sql first!');
      }
    } else {
      console.log('✅ Database connection successful!');
    }

    // Test 2: Check auth
    console.log('\n🔐 Test 2: Checking auth configuration...');
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.log('❌ Auth test failed:', authError.message);
    } else {
      console.log('✅ Auth is configured!');
      if (session) {
        console.log('  - User is logged in:', session.user.email);
      } else {
        console.log('  - No user logged in (this is normal)');
      }
    }

    // Test 3: Check if cast_trend_vote function exists
    console.log('\n🗳️ Test 3: Checking if voting function exists...');
    const { data: functions, error: funcError } = await supabase.rpc('cast_trend_vote', {
      p_trend_id: '00000000-0000-0000-0000-000000000000',
      p_vote: 'verify'
    });
    
    if (funcError) {
      if (funcError.message.includes('does not exist')) {
        console.log('⚠️  Voting function not created yet. Run the schema file.');
      } else if (funcError.message.includes('Not authenticated')) {
        console.log('✅ Voting function exists and is working!');
      } else {
        console.log('❓ Function response:', funcError.message);
      }
    } else {
      console.log('✅ Voting function is available!');
    }

    // Test 4: Check tables exist
    console.log('\n📋 Test 4: Checking tables...');
    const tables = [
      'user_profiles',
      'trend_submissions', 
      'trend_validations',
      'earnings_ledger',
      'cashout_requests'
    ];
    
    for (const table of tables) {
      const { error } = await supabase.from(table).select('count').limit(1);
      if (error && error.message.includes('does not exist')) {
        console.log(`  ❌ Table '${table}' - Not found`);
      } else {
        console.log(`  ✅ Table '${table}' - Exists`);
      }
    }

    console.log('\n✨ Connection test complete!');
    console.log('\nNext steps:');
    console.log('1. If tables are missing, run FRESH_START_SCHEMA.sql in Supabase SQL Editor');
    console.log('2. Create a test user account through the app');
    console.log('3. Try submitting a trend');
    console.log('4. Test the validation page');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testConnection();