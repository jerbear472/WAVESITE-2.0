const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testVoting() {
  console.log('🧪 Testing voting functionality...\n');
  
  try {
    // Get a sample trend
    const { data: trends, error: trendsError } = await supabase
      .from('trend_submissions')
      .select('id, title, wave_votes, fire_votes, declining_votes, dead_votes')
      .limit(1);
    
    if (trendsError || !trends || trends.length === 0) {
      console.log('No trends found to test with');
      return;
    }
    
    const trend = trends[0];
    console.log('Testing with trend:', trend.title);
    console.log('Current votes:', {
      wave: trend.wave_votes || 0,
      fire: trend.fire_votes || 0,
      declining: trend.declining_votes || 0,
      dead: trend.dead_votes || 0
    });
    
    // Get a test user
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select('user_id, username')
      .limit(1);
    
    if (usersError || !users || users.length === 0) {
      console.log('No users found to test with');
      return;
    }
    
    const user = users[0];
    console.log('\nTesting as user:', user.username);
    
    // Check if user already voted
    const { data: existingVote } = await supabase
      .from('trend_user_votes')
      .select('vote_type')
      .eq('user_id', user.user_id)
      .eq('trend_id', trend.id)
      .single();
    
    if (existingVote) {
      console.log('User already voted:', existingVote.vote_type);
      console.log('Changing vote to: wave');
      
      // Update vote
      const { error: updateError } = await supabase
        .from('trend_user_votes')
        .upsert({
          user_id: user.user_id,
          trend_id: trend.id,
          vote_type: 'wave',
          vote_value: 2,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,trend_id'
        });
      
      if (updateError) {
        console.error('Error updating vote:', updateError);
      } else {
        console.log('✅ Vote updated successfully!');
      }
    } else {
      console.log('No existing vote, creating new vote: fire');
      
      // Create new vote
      const { error: insertError } = await supabase
        .from('trend_user_votes')
        .insert({
          user_id: user.user_id,
          trend_id: trend.id,
          vote_type: 'fire',
          vote_value: 1,
          updated_at: new Date().toISOString()
        });
      
      if (insertError) {
        console.error('Error inserting vote:', insertError);
      } else {
        console.log('✅ Vote created successfully!');
      }
    }
    
    // Verify the vote was saved
    const { data: verifyVote } = await supabase
      .from('trend_user_votes')
      .select('*')
      .eq('user_id', user.user_id)
      .eq('trend_id', trend.id)
      .single();
    
    if (verifyVote) {
      console.log('\n✅ Vote verified in database:');
      console.log('  - Vote type:', verifyVote.vote_type);
      console.log('  - Vote value:', verifyVote.vote_value);
      console.log('  - Updated at:', verifyVote.updated_at);
    }
    
    // Test removing a vote
    console.log('\nTesting vote removal...');
    const { error: deleteError } = await supabase
      .from('trend_user_votes')
      .delete()
      .eq('user_id', user.user_id)
      .eq('trend_id', trend.id);
    
    if (deleteError) {
      console.error('Error removing vote:', deleteError);
    } else {
      console.log('✅ Vote removed successfully!');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testVoting();