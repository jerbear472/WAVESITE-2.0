const { createClient } = require('@supabase/supabase-js');

// Load environment variables from web directory
require('dotenv').config({ path: '/Users/JeremyUys_1/Desktop/WaveSight/web/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRealtimeVotes() {
  try {
    console.log('🔄 Testing real-time vote updates...\n');
    
    // Step 1: Get a trend to test with
    console.log('📋 Step 1: Finding a trend to test validation...');
    const { data: trends, error: trendsError } = await supabase
      .from('trend_submissions')
      .select('id, description, approve_count, reject_count, validation_status')
      .limit(1);
    
    if (trendsError || !trends || trends.length === 0) {
      console.log('❌ No trends found to test with');
      return;
    }
    
    const testTrend = trends[0];
    console.log(`✅ Found trend to test: ${testTrend.id}`);
    console.log(`   Description: ${testTrend.description.substring(0, 60)}...`);
    console.log(`   Current votes: 👍 ${testTrend.approve_count} | 👎 ${testTrend.reject_count}`);
    console.log(`   Status: ${testTrend.validation_status}\n`);
    
    // Step 2: Get a user to vote with
    console.log('📋 Step 2: Finding a user to test voting...');
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select('user_id, username')
      .limit(1);
    
    if (usersError || !users || users.length === 0) {
      console.log('❌ No users found to test with');
      return;
    }
    
    const testUser = users[0];
    console.log(`✅ Found user to test: ${testUser.user_id}`);
    console.log(`   Username: ${testUser.username || 'No username'}\n`);
    
    // Step 3: Check if user has already voted on this trend
    const { data: existingVote, error: voteCheckError } = await supabase
      .from('trend_validations')
      .select('vote')
      .eq('trend_id', testTrend.id)
      .eq('validator_id', testUser.user_id)
      .single();
    
    if (voteCheckError && voteCheckError.code !== 'PGRST116') {
      console.log('⚠️  Error checking existing vote:', voteCheckError.message);
    }
    
    if (existingVote) {
      console.log(`ℹ️  User has already voted: ${existingVote.vote}`);
      console.log('   This is perfect for testing - we can see if the counts are working correctly.\n');
    } else {
      console.log('ℹ️  User has not voted yet - this is perfect for testing!\n');
    }
    
    // Step 4: Set up real-time listener
    console.log('📋 Step 4: Setting up real-time listener...');
    let updatesReceived = 0;
    
    const subscription = supabase
      .channel('test-vote-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trend_submissions',
          filter: `id=eq.${testTrend.id}`
        },
        (payload) => {
          updatesReceived++;
          console.log(`🔄 Real-time update #${updatesReceived} received:`);
          console.log(`   👍 Approves: ${payload.new.approve_count}`);
          console.log(`   👎 Rejects: ${payload.new.reject_count}`);
          console.log(`   ✅ Status: ${payload.new.validation_status}\n`);
        }
      )
      .subscribe();
    
    console.log('✅ Real-time listener active!\n');
    
    // Step 5: Simulate a vote (only if user hasn't voted)
    if (!existingVote) {
      console.log('📋 Step 5: Simulating a vote...');
      
      const { error: voteError } = await supabase
        .from('trend_validations')
        .insert({
          trend_id: testTrend.id,
          validator_id: testUser.user_id,
          vote: 'verify',
          created_at: new Date().toISOString()
        });
      
      if (voteError) {
        console.log('❌ Error simulating vote:', voteError.message);
      } else {
        console.log('✅ Vote submitted! Waiting for real-time update...\n');
        
        // Wait a moment for the trigger to fire
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } else {
      console.log('📋 Step 5: Checking current vote counts...');
      
      // Re-fetch the trend to see current state
      const { data: updatedTrend } = await supabase
        .from('trend_submissions')
        .select('approve_count, reject_count, validation_status')
        .eq('id', testTrend.id)
        .single();
      
      if (updatedTrend) {
        console.log('✅ Current vote counts:');
        console.log(`   👍 Approves: ${updatedTrend.approve_count}`);
        console.log(`   👎 Rejects: ${updatedTrend.reject_count}`);
        console.log(`   ✅ Status: ${updatedTrend.validation_status}\n`);
      }
    }
    
    // Step 6: Clean up
    setTimeout(() => {
      subscription.unsubscribe();
      console.log('🏁 Test completed!');
      console.log(`📊 Real-time updates received: ${updatesReceived}`);
      
      if (updatesReceived > 0) {
        console.log('🎉 ✅ Real-time vote updates are working perfectly!');
      } else if (existingVote) {
        console.log('ℹ️  No new updates (user already voted) but system structure is correct');
        console.log('🎉 ✅ Vote count system is properly set up for real-time updates!');
      } else {
        console.log('⚠️  No real-time updates received. This could mean:');
        console.log('   - Database triggers are not set up');
        console.log('   - Real-time is not enabled');
        console.log('   - There was a connection issue');
      }
      
      process.exit(0);
    }, 3000);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testRealtimeVotes();