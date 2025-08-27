// Check what voting functions already exist
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function checkExistingFunctions() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  console.log('Checking existing functions and tables...');

  try {
    // Test if cast_trend_vote exists with different parameters
    console.log('\n1. Testing different cast_trend_vote function signatures...');
    
    // Try the existing function signature (might be different)
    const { data: test1, error: error1 } = await supabase.rpc('cast_trend_vote', {
      p_trend_id: '00000000-0000-0000-0000-000000000000',
      p_vote: 'fire'
    });
    
    if (error1) {
      console.log('Two-parameter version error:', error1.message);
    } else {
      console.log('Two-parameter version works:', test1);
    }

    // Try four-parameter version
    const { data: test2, error: error2 } = await supabase.rpc('cast_trend_vote', {
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_trend_id: '00000000-0000-0000-0000-000000000000', 
      p_vote_type: 'fire',
      p_vote_value: 1
    });
    
    if (error2) {
      console.log('Four-parameter version error:', error2.message);
    } else {
      console.log('Four-parameter version works:', test2);
    }

    // Check if trend_votes table exists
    console.log('\n2. Testing trend_votes table...');
    const { data: votes, error: votesError } = await supabase
      .from('trend_votes')
      .select('*')
      .limit(1);
      
    if (votesError) {
      console.log('trend_votes table error:', votesError.message);
    } else {
      console.log('trend_votes table exists');
    }

  } catch (err) {
    console.error('Test failed:', err);
  }
}

checkExistingFunctions();