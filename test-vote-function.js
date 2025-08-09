#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testVoteFunction() {
  console.log('🧪 TESTING VOTE FUNCTION\n');
  console.log('='.repeat(50));
  
  // Test with a real trend ID
  const { data: trends } = await supabase
    .from('trend_submissions')
    .select('id')
    .limit(1)
    .single();
  
  if (!trends) {
    console.log('No trends found to test with');
    return;
  }
  
  console.log('Testing with trend ID:', trends.id);
  
  // Try to call the vote function
  const { data, error } = await supabase
    .rpc('cast_trend_vote', {
      p_trend_id: trends.id,
      p_vote: 'verify'
    });
  
  console.log('\nResult:');
  console.log('Data:', data);
  console.log('Error:', error);
  
  if (data) {
    if (data.success === false) {
      if (data.error === 'User not authenticated') {
        console.log('\n✅ Function exists and requires authentication');
        console.log('This is expected - the verify page will work when logged in');
      } else {
        console.log('\n⚠️ Function returned error:', data.error);
      }
    } else {
      console.log('\n✅ Vote was successful!');
    }
  } else if (error) {
    console.log('\n❌ Function error:', error.message);
    if (error.message.includes('function') && error.message.includes('does not exist')) {
      console.log('The function needs to be created in Supabase');
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('To test in the app:');
  console.log('1. Sign in to your account');
  console.log('2. Go to /verify page');
  console.log('3. You should see trends to validate');
  console.log('4. Click Approve or Reject to vote');
}

testVoteFunction().catch(console.error);