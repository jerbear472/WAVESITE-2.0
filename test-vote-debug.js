const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'web/.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testAuthenticatedVote() {
  // First sign in
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'enterprise@test.com',
    password: 'testpass123'
  });
  
  if (authError) {
    console.log('Auth error:', authError);
    return;
  }
  
  console.log('Signed in as:', authData.user.email);
  console.log('User ID:', authData.user.id);
  
  // Get a real trend to test with (not created by this user)
  const { data: trends, error: trendsError } = await supabase
    .from('trend_submissions')
    .select('id, spotter_id, status')
    .eq('status', 'submitted')
    .neq('spotter_id', authData.user.id)
    .limit(1)
    .single();
    
  if (trendsError) {
    console.log('Error getting trends:', trendsError);
    // Try to get any trend
    const { data: anyTrend, error: anyError } = await supabase
      .from('trend_submissions')
      .select('id, spotter_id, status')
      .limit(5);
    console.log('Available trends:', anyTrend);
    return;
  }
  
  console.log('Testing with trend:', trends);
  
  // Check if already voted
  const { data: existingVote, error: voteCheckError } = await supabase
    .from('trend_validations')
    .select('*')
    .eq('trend_submission_id', trends.id)
    .eq('validator_id', authData.user.id)
    .single();
    
  if (existingVote) {
    console.log('Already voted on this trend:', existingVote);
  }
  
  // Now try to vote
  console.log('\nCalling cast_trend_vote with:', {
    trend_id: trends.id,
    vote_type: 'verify'
  });
  
  const { data, error } = await supabase
    .rpc('cast_trend_vote', {
      trend_id: trends.id,
      vote_type: 'verify'
    });
    
  console.log('\nVote result:');
  console.log('Error:', error);
  console.log('Data:', data);
  
  if (data && typeof data === 'object' && 'success' in data) {
    if (!data.success) {
      console.log('Vote failed with error:', data.error);
    } else {
      console.log('Vote successful!');
    }
  }
  
  // Check if vote was created
  const { data: newVote, error: checkError } = await supabase
    .from('trend_validations')
    .select('*')
    .eq('trend_submission_id', trends.id)
    .eq('validator_id', authData.user.id)
    .single();
    
  console.log('\nCheck for new vote:');
  console.log('Vote record:', newVote);
  console.log('Check error:', checkError);
}

testAuthenticatedVote().catch(console.error);