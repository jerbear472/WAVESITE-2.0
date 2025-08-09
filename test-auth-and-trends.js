#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

async function testAuthAndTrends() {
  console.log('🔍 TESTING AUTH AND TRENDS ACCESS\n');
  console.log('='.repeat(50));
  
  // Create client as a regular user would
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  // 1. Test if we can see trends at all
  console.log('\n1️⃣ CAN WE SEE TRENDS?');
  const { data: trends, error: trendsError, count } = await supabase
    .from('trend_submissions')
    .select('*', { count: 'exact' })
    .limit(5);
  
  if (trendsError) {
    console.log('❌ Cannot access trends:', trendsError.message);
    console.log('\n⚠️  This is the problem! RLS is blocking access.');
    console.log('FIX: Run FORCE_FIX_VERIFY_NOW.sql in Supabase');
  } else {
    console.log(`✅ Can see ${count} trends total`);
    if (trends && trends.length > 0) {
      console.log('Sample trend:', {
        id: trends[0].id,
        description: trends[0].description?.substring(0, 30) + '...',
        validation_status: trends[0].validation_status
      });
    }
  }
  
  // 2. Test authentication
  console.log('\n2️⃣ TESTING AUTHENTICATION');
  
  // Try to sign in with a test account (you'll need to replace with real credentials)
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'test@example.com', // Replace with a real test account
    password: 'testpassword'   // Replace with real password
  });
  
  if (authError) {
    console.log('⚠️  Could not sign in:', authError.message);
    console.log('   (This is expected if test credentials are invalid)');
  } else {
    console.log('✅ Signed in as:', authData.user.email);
    
    // Try to access trends as authenticated user
    const { data: authTrends, error: authTrendsError } = await supabase
      .from('trend_submissions')
      .select('*')
      .limit(5);
    
    if (authTrendsError) {
      console.log('❌ Even authenticated users cannot see trends!');
    } else {
      console.log(`✅ Authenticated user can see ${authTrends?.length} trends`);
    }
  }
  
  // 3. Test the RPC function
  console.log('\n3️⃣ TESTING RPC FUNCTION');
  
  // Try to call cast_trend_vote (will fail without auth but shows if it exists)
  const { data: rpcTest, error: rpcError } = await supabase
    .rpc('cast_trend_vote', {
      p_trend_id: '00000000-0000-0000-0000-000000000000',
      p_vote: 'verify'
    });
  
  if (rpcError) {
    if (rpcError.message.includes('not exist')) {
      console.log('❌ RPC function does not exist!');
      console.log('FIX: Run FORCE_FIX_VERIFY_NOW.sql');
    } else if (rpcError.message.includes('authenticated') || rpcError.message.includes('Not authenticated')) {
      console.log('✅ RPC function exists (auth required)');
    } else {
      console.log('⚠️  RPC error:', rpcError.message);
    }
  } else {
    console.log('RPC response:', rpcTest);
  }
  
  // SUMMARY
  console.log('\n' + '='.repeat(50));
  console.log('📊 DIAGNOSIS SUMMARY\n');
  
  if (trendsError) {
    console.log('❌ MAIN ISSUE: Cannot access trends table');
    console.log('\nTO FIX:');
    console.log('1. Go to Supabase Dashboard > SQL Editor');
    console.log('2. Run the contents of FORCE_FIX_VERIFY_NOW.sql');
    console.log('3. This will disable RLS temporarily for testing');
  } else if (count === 0) {
    console.log('⚠️  No trends in database');
    console.log('\nTO FIX:');
    console.log('1. Submit some trends first');
    console.log('2. Or create test trends in the database');
  } else {
    console.log('✅ Trends are accessible!');
    console.log(`Found ${count} trends in database`);
    console.log('\nVerify page should work now.');
  }
}

testAuthAndTrends().catch(console.error);