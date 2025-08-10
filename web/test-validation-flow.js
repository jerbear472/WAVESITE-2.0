const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://achuavagkhjenaypawij.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjaHVhdmFna2hqZW5heXBhd2lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1OTY0MjQsImV4cCI6MjA2ODE3MjQyNH0.L4J5SIVGZDYAFAwNuR9b_hIvcpTJWGfu0Dvry7Umg2g';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testValidationFlow() {
  console.log('Testing Validation Flow');
  console.log('======================\n');
  
  // 1. Get the most recent trend submission
  const { data: recentTrend, error: trendError } = await supabase
    .from('trend_submissions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (trendError) {
    console.error('Error fetching recent trend:', trendError);
    return;
  }
  
  console.log('Most Recent Trend:');
  console.log('------------------');
  console.log('ID:', recentTrend.id);
  console.log('Description:', recentTrend.description);
  console.log('Status:', recentTrend.status);
  console.log('Spotter ID:', recentTrend.spotter_id);
  console.log('Created:', new Date(recentTrend.created_at).toLocaleString());
  console.log('Validation Count:', recentTrend.validation_count);
  console.log('Approve/Reject:', recentTrend.approve_count, '/', recentTrend.reject_count);
  
  // 2. Check who can validate this trend
  console.log('\n\nWho Can Validate This Trend?');
  console.log('-----------------------------');
  
  // Get all users who have already validated this trend
  const { data: validations, error: valError } = await supabase
    .from('trend_validations')
    .select('validator_id, vote')
    .eq('trend_submission_id', recentTrend.id);
  
  if (validations && validations.length > 0) {
    console.log('Already validated by:');
    validations.forEach(v => {
      console.log(`  - User ${v.validator_id} voted: ${v.vote}`);
    });
  } else {
    console.log('No validations yet for this trend');
  }
  
  // 3. Simulate what different users would see
  const testUserIds = [
    recentTrend.spotter_id, // The person who submitted it
    '1c756d2d-b068-4887-8bbb-b5f0273135c1', // A known user ID
    '4ecbbdce-b00f-4b1a-a293-ef179329c20d', // Another known user ID
    'test-user-123' // A hypothetical new user
  ];
  
  console.log('\n\nSimulating Different Users:');
  console.log('----------------------------');
  
  for (const userId of testUserIds) {
    console.log(`\nUser ID: ${userId}`);
    
    // Check if this user is the spotter
    if (userId === recentTrend.spotter_id) {
      console.log('  ❌ Cannot validate (own trend)');
      continue;
    }
    
    // Check if user already validated
    const alreadyValidated = validations?.some(v => v.validator_id === userId);
    if (alreadyValidated) {
      console.log('  ❌ Cannot validate (already voted)');
      continue;
    }
    
    // Check if trend is in valid status
    if (!['submitted', 'validating'].includes(recentTrend.status)) {
      console.log(`  ❌ Cannot validate (status: ${recentTrend.status})`);
      continue;
    }
    
    console.log('  ✅ Can validate this trend');
  }
  
  // 4. Check overall validation queue
  console.log('\n\nOverall Validation Queue:');
  console.log('-------------------------');
  
  const { data: queue, error: queueError } = await supabase
    .from('trend_submissions')
    .select('id, description, status, spotter_id')
    .in('status', ['submitted', 'validating'])
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (queue && queue.length > 0) {
    console.log(`Found ${queue.length} trends in validation queue:`);
    queue.forEach((trend, i) => {
      console.log(`  ${i + 1}. ${trend.description?.substring(0, 30)}...`);
      console.log(`     Status: ${trend.status}, Spotter: ${trend.spotter_id.substring(0, 8)}...`);
    });
  }
  
  // 5. Test the RPC function
  console.log('\n\nTesting RPC Function (cast_trend_vote):');
  console.log('----------------------------------------');
  
  // Check if the function exists
  const { data: functions, error: funcError } = await supabase
    .rpc('cast_trend_vote', {
      p_trend_id: 'test-id',
      p_vote: 'verify'
    })
    .catch(err => {
      if (err.message.includes('auth')) {
        console.log('RPC function exists but requires authentication');
      } else if (err.message.includes('not found')) {
        console.log('❌ RPC function "cast_trend_vote" not found!');
      } else {
        console.log('RPC error:', err.message);
      }
      return { data: null, error: err };
    });
  
  if (!funcError || funcError.message.includes('auth')) {
    console.log('✅ RPC function exists');
  }
}

testValidationFlow().catch(console.error);