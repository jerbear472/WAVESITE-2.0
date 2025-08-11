const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://aicahushpcslwjwrlqbo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpY2FodXNocGNzbHdqd3JscWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4ODc1NTQsImV4cCI6MjA3MDQ2MzU1NH0.rLPnouZXA1ejWG0tuurIb5sgo5CCHe15M4knaANrR2w';

const supabase = createClient(supabaseUrl, supabaseKey);

// The user ID that seems to be submitting trends
const MAIN_USER_ID = '1c756d2d-b068-4887-8bbb-b5f0273135c1';

async function analyzeUserTrends() {
  console.log('Analyzing User Trends and Validation Issues');
  console.log('============================================\n');
  
  // 1. Get all trend submissions by the main user
  const { data: userTrends, error: userError } = await supabase
    .from('trend_submissions')
    .select('id, description, status, created_at')
    .eq('spotter_id', MAIN_USER_ID)
    .order('created_at', { ascending: false });
  
  console.log(`User ${MAIN_USER_ID.substring(0, 8)}... has submitted ${userTrends?.length || 0} trends\n`);
  
  if (userTrends && userTrends.length > 0) {
    console.log('Recent submissions by this user:');
    userTrends.slice(0, 5).forEach((trend, i) => {
      const hoursAgo = Math.round((Date.now() - new Date(trend.created_at).getTime()) / (1000 * 60 * 60));
      console.log(`  ${i + 1}. ${trend.description?.substring(0, 30)}... (${trend.status}) - ${hoursAgo}h ago`);
    });
  }
  
  // 2. Check what this user CAN validate
  const { data: validatedByUser, error: valError } = await supabase
    .from('trend_validations')
    .select('trend_submission_id')
    .eq('validator_id', MAIN_USER_ID);
  
  const validatedIds = validatedByUser?.map(v => v.trend_submission_id) || [];
  
  // Build query for available trends
  let query = supabase
    .from('trend_submissions')
    .select('id, description, status, spotter_id')
    .neq('spotter_id', MAIN_USER_ID); // Can't validate own trends
  
  if (validatedIds.length > 0) {
    query = query.not('id', 'in', `(${validatedIds.join(',')})`);
  }
  
  const { data: availableForUser, error: availError } = await query
    .in('status', ['submitted', 'validating'])
    .order('created_at', { ascending: false })
    .limit(10);
  
  console.log(`\n\nTrends available for user ${MAIN_USER_ID.substring(0, 8)}... to validate: ${availableForUser?.length || 0}\n`);
  
  if (availableForUser && availableForUser.length > 0) {
    console.log('Available trends for validation:');
    availableForUser.forEach((trend, i) => {
      console.log(`  ${i + 1}. ${trend.description?.substring(0, 50)}...`);
      console.log(`     Submitted by: ${trend.spotter_id.substring(0, 8)}...`);
    });
  } else {
    console.log('❌ NO TRENDS AVAILABLE FOR THIS USER TO VALIDATE!\n');
    console.log('This is because:');
    console.log('1. Most/all "submitted" or "validating" trends were created by this user');
    console.log('2. User has already validated all other available trends');
  }
  
  // 3. Show trends from OTHER users that could be validated
  const { data: otherUserTrends, error: otherError } = await supabase
    .from('trend_submissions')
    .select('id, description, status, spotter_id')
    .neq('spotter_id', MAIN_USER_ID)
    .in('status', ['submitted', 'validating'])
    .order('created_at', { ascending: false })
    .limit(10);
  
  console.log(`\n\nTrends from OTHER users (not ${MAIN_USER_ID.substring(0, 8)}...): ${otherUserTrends?.length || 0}\n`);
  
  if (otherUserTrends && otherUserTrends.length > 0) {
    console.log('These trends SHOULD be visible for validation:');
    otherUserTrends.forEach((trend, i) => {
      console.log(`  ${i + 1}. ${trend.description?.substring(0, 50)}...`);
      console.log(`     ID: ${trend.id}`);
      console.log(`     Submitted by: ${trend.spotter_id.substring(0, 8)}...`);
      console.log(`     Status: ${trend.status}`);
    });
  }
  
  // 4. Summary and solution
  console.log('\n\n📊 SUMMARY');
  console.log('===========');
  
  const userTrendCount = userTrends?.filter(t => ['submitted', 'validating'].includes(t.status))?.length || 0;
  const otherTrendCount = otherUserTrends?.length || 0;
  
  console.log(`- User has ${userTrendCount} trends awaiting validation`);
  console.log(`- There are ${otherTrendCount} trends from other users to validate`);
  console.log(`- User has already validated ${validatedIds.length} trends`);
  
  if (availableForUser?.length === 0 && userTrendCount > 0) {
    console.log('\n⚠️  PROBLEM IDENTIFIED:');
    console.log('The user is submitting trends but cannot see any to validate.');
    console.log('This is likely because they are the only active user submitting trends.');
    console.log('\n✅ SOLUTION:');
    console.log('1. Create a second test account to submit trends');
    console.log('2. Or login with a different user account to validate');
    console.log('3. The system is working correctly - users cannot validate their own trends');
  }
}

analyzeUserTrends().catch(console.error);