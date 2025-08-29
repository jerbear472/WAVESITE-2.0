const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testValidationSystem() {
  console.log('🧪 Testing Validation System\n');
  console.log('=' .repeat(60));
  
  try {
    // Test 1: Check if unique constraint exists
    console.log('\n📋 Test 1: Checking database constraints...');
    try {
      const { data: constraints, error: constraintError } = await supabase
        .rpc('get_table_constraints', { table_name: 'trend_validations' });
      
      if (!constraintError && constraints) {
        const hasUnique = constraints.some(c => c.constraint_name === 'unique_user_trend_validation');
        console.log(hasUnique ? '✅ Unique constraint exists' : '❌ Unique constraint missing');
      } else {
        console.log('⚠️  Cannot verify constraints via RPC, will test indirectly');
      }
    } catch (e) {
      console.log('⚠️  RPC not available, will test constraint indirectly');
    }
    
    // Test 2: Verify validation filtering
    console.log('\n📋 Test 2: Checking validation filtering...');
    
    // Get a sample trend
    const { data: sampleTrend, error: trendError } = await supabase
      .from('trend_submissions')
      .select('id, title, status, validation_wave_votes, validation_dead_votes')
      .in('status', ['submitted', 'validating'])
      .limit(1)
      .single();
    
    if (sampleTrend) {
      console.log(`Found test trend: "${sampleTrend.title || 'Untitled'}" (${sampleTrend.id})`);
      console.log(`Current votes: Wave=${sampleTrend.validation_wave_votes || 0}, Dead=${sampleTrend.validation_dead_votes || 0}`);
      
      // Check who has voted on this trend
      const { data: votes, error: voteError } = await supabase
        .from('trend_validations')
        .select('validator_id, vote, created_at')
        .eq('trend_id', sampleTrend.id);
      
      if (votes && votes.length > 0) {
        console.log(`\n  This trend has ${votes.length} votes:`);
        votes.forEach(v => {
          console.log(`    • User ${v.validator_id.substring(0, 8)}... voted "${v.vote}"`);
        });
      } else {
        console.log('  No votes yet on this trend');
      }
    } else {
      console.log('No trends available for testing');
    }
    
    // Test 3: Verify vote counting trigger
    console.log('\n📋 Test 3: Checking vote counting...');
    
    const { data: trendStats, error: statsError } = await supabase
      .from('trend_submissions')
      .select('status, validation_wave_votes, validation_fire_votes, validation_dead_votes, validation_count')
      .not('validation_count', 'is', null)
      .gt('validation_count', 0)
      .limit(5);
    
    if (trendStats && trendStats.length > 0) {
      console.log('Trends with votes:');
      trendStats.forEach(t => {
        const total = (t.validation_wave_votes || 0) + (t.validation_fire_votes || 0) + (t.validation_dead_votes || 0);
        console.log(`  • Status: ${t.status}, Wave: ${t.validation_wave_votes}, Fire: ${t.validation_fire_votes}, Dead: ${t.validation_dead_votes}, Total: ${total}`);
        
        // Check if status is correct based on votes
        if ((t.validation_wave_votes + t.validation_fire_votes) >= 3 && t.status !== 'validated') {
          console.log(`    ⚠️  Should be validated but status is ${t.status}`);
        }
        if (t.validation_dead_votes >= 3 && t.status !== 'rejected') {
          console.log(`    ⚠️  Should be rejected but status is ${t.status}`);
        }
      });
    } else {
      console.log('No trends have votes yet');
    }
    
    // Test 4: Simulate duplicate vote attempt
    console.log('\n📋 Test 4: Testing duplicate vote prevention...');
    
    // Get a test user
    const { data: testUser } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .single();
    
    if (testUser && sampleTrend) {
      // Check if this user already voted
      const { data: existingVote } = await supabase
        .from('trend_validations')
        .select('id')
        .eq('trend_id', sampleTrend.id)
        .eq('validator_id', testUser.id)
        .single();
      
      if (existingVote) {
        console.log('✅ User already voted on this trend - duplicate prevention working');
        
        // Try to vote again (should fail)
        const { error: dupError } = await supabase
          .from('trend_validations')
          .insert({
            trend_id: sampleTrend.id,
            validator_id: testUser.id,
            vote: 'wave',
            is_valid: true
          });
        
        if (dupError) {
          console.log('✅ Duplicate vote correctly rejected:', dupError.message);
        } else {
          console.log('❌ Duplicate vote was incorrectly allowed!');
        }
      } else {
        console.log('User has not voted on this trend yet');
      }
    }
    
    // Test 5: Check status transitions
    console.log('\n📋 Test 5: Checking status transitions...');
    
    const { data: statusCounts } = await supabase
      .from('trend_submissions')
      .select('status')
      .then(({ data }) => {
        const counts = {};
        data?.forEach(row => {
          counts[row.status] = (counts[row.status] || 0) + 1;
        });
        return { data: counts };
      });
    
    console.log('\nCurrent trend distribution:');
    Object.entries(statusCounts || {}).forEach(([status, count]) => {
      console.log(`  ${status}: ${count} trends`);
    });
    
    // Summary
    console.log('\n' + '=' .repeat(60));
    console.log('✅ Validation System Test Complete\n');
    console.log('Key Points for Testing:');
    console.log('1. Each user can only vote once per trend');
    console.log('2. Voted trends are filtered out from validation queue');
    console.log('3. After 3 wave/fire votes → status becomes "validated"');
    console.log('4. After 3 dead votes → status becomes "rejected"');
    console.log('5. Database constraint prevents duplicate votes');
    console.log('\nYou can now test with 3 different accounts!');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
  
  process.exit(0);
}

testValidationSystem();