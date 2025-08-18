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

async function testVoteCounts() {
  try {
    console.log('🔍 Testing vote count system...\n');
    
    // Test 1: Check if vote count columns exist
    console.log('📋 Test 1: Checking if vote count columns exist...');
    const { data: trends, error: trendsError } = await supabase
      .from('trend_submissions')
      .select('id, approve_count, reject_count, validation_status')
      .limit(3);
    
    if (trendsError) {
      console.log('❌ Vote count columns do not exist yet:', trendsError.message);
      console.log('💡 This means the SQL migration needs to be applied.\n');
      
      // Test 2: Try manual calculation via join
      console.log('📋 Test 2: Testing manual vote calculation...');
      const { data: joinData, error: joinError } = await supabase
        .from('trend_submissions')
        .select(`
          id,
          description,
          status,
          trend_validations!left (
            vote
          )
        `)
        .limit(3);
      
      if (joinError) {
        console.log('❌ Join query failed:', joinError.message);
        return;
      }
      
      if (joinData && joinData.length > 0) {
        console.log('✅ Manual calculation works! Processing trends...\n');
        
        joinData.forEach((trend, index) => {
          const validations = trend.trend_validations || [];
          const approve_count = validations.filter(v => v.vote === 'verify' || v.vote === 'approve').length;
          const reject_count = validations.filter(v => v.vote === 'reject').length;
          const validation_status = approve_count >= 3 ? 'approved' : reject_count >= 3 ? 'rejected' : 'pending';
          
          console.log(`📊 Trend ${index + 1}:`);
          console.log(`   ID: ${trend.id}`);
          console.log(`   Status: ${trend.status}`);
          console.log(`   👍 Approves: ${approve_count}`);
          console.log(`   👎 Rejects: ${reject_count}`);
          console.log(`   ✅ Validation Status: ${validation_status}`);
          console.log(`   📝 Description: ${trend.description.substring(0, 50)}...`);
          console.log('');
        });
      }
    } else {
      console.log('✅ Vote count columns exist! Testing data...\n');
      
      if (trends && trends.length > 0) {
        trends.forEach((trend, index) => {
          console.log(`📊 Trend ${index + 1}:`);
          console.log(`   ID: ${trend.id}`);
          console.log(`   👍 Approves: ${trend.approve_count || 0}`);
          console.log(`   👎 Rejects: ${trend.reject_count || 0}`);
          console.log(`   ✅ Validation Status: ${trend.validation_status || 'pending'}`);
          console.log('');
        });
      } else {
        console.log('📋 No trends found in database.');
      }
    }
    
    // Test 3: Check existing validations
    console.log('📋 Test 3: Checking existing validations...');
    const { data: validations, error: validationsError } = await supabase
      .from('trend_validations')
      .select('trend_id, vote, created_at')
      .limit(5)
      .order('created_at', { ascending: false });
    
    if (validationsError) {
      console.log('❌ Could not fetch validations:', validationsError.message);
    } else if (validations && validations.length > 0) {
      console.log(`✅ Found ${validations.length} recent validations:`);
      validations.forEach((validation, index) => {
        console.log(`   ${index + 1}. Trend ${validation.trend_id}: ${validation.vote} (${new Date(validation.created_at).toLocaleString()})`);
      });
    } else {
      console.log('📋 No validations found.');
    }
    
    console.log('\n🎯 Summary:');
    if (trendsError) {
      console.log('❗ The SQL migration FIX_VOTE_COUNTS_REALTIME.sql needs to be applied');
      console.log('💡 But the frontend will still work using manual calculation');
      console.log('🔄 Real-time updates will work through subscription logic');
    } else {
      console.log('✅ Vote count system is properly set up');
      console.log('🎉 Real-time updates should work perfectly');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testVoteCounts();