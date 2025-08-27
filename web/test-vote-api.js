// Simple test script to check vote API and database function
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function testVoteAPI() {
  console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 30) + '...');
  console.log('Service Key:', process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 30) + '...');
  console.log('Anon Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 30) + '...');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY  // Try anon key first
  );

  console.log('Testing database connection...');

  try {
    // Test 1: Check if cast_trend_vote function exists
    console.log('\n1. Testing cast_trend_vote function...');
    const { data, error } = await supabase.rpc('cast_trend_vote', {
      p_user_id: '00000000-0000-0000-0000-000000000000', // dummy UUID
      p_trend_id: '00000000-0000-0000-0000-000000000000', // dummy UUID  
      p_vote_type: 'fire',
      p_vote_value: 1
    });
    
    if (error) {
      console.error('Function error:', error);
    } else {
      console.log('Function exists and returned:', data);
    }

    // Test 2: Check if trend_votes table exists
    console.log('\n2. Testing trend_votes table...');
    const { data: votes, error: votesError } = await supabase
      .from('trend_votes')
      .select('*')
      .limit(1);
      
    if (votesError) {
      console.error('Table error:', votesError);
    } else {
      console.log('trend_votes table exists, sample:', votes);
    }

    // Test 3: Check if trend_submissions has vote columns
    console.log('\n3. Testing trend_submissions vote columns...');
    const { data: trends, error: trendsError } = await supabase
      .from('trend_submissions')
      .select('id, heat_score, wave_votes, fire_votes, declining_votes, dead_votes, total_votes')
      .limit(1);
      
    if (trendsError) {
      console.error('Trend submissions error:', trendsError);
    } else {
      console.log('trend_submissions vote columns exist, sample:', trends);
    }

  } catch (err) {
    console.error('Test failed:', err);
  }
}

testVoteAPI();