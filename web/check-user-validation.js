const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://achuavagkhjenaypawij.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjaHVhdmFna2hqZW5heXBhd2lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1OTY0MjQsImV4cCI6MjA2ODE3MjQyNH0.L4J5SIVGZDYAFAwNuR9b_hIvcpTJWGfu0Dvry7Umg2g';

const supabase = createClient(supabaseUrl, supabaseKey);

// Replace this with your actual user ID when logged in
// You can find this in the browser console when logged in
const USER_ID = process.argv[2];

if (!USER_ID) {
  console.log('Usage: node check-user-validation.js <USER_ID>');
  console.log('\nTo find your user ID:');
  console.log('1. Open the browser console when logged in');
  console.log('2. Type: JSON.parse(localStorage.getItem("supabase.auth.token")).currentSession.user.id');
  console.log('\nLet me check some known user IDs from the trends:');
  
  // Show unique spotter IDs
  supabase
    .from('trend_submissions')
    .select('spotter_id')
    .then(({ data }) => {
      const uniqueSpotters = [...new Set(data?.map(d => d.spotter_id) || [])];
      console.log('\nKnown user IDs who have submitted trends:');
      uniqueSpotters.forEach(id => console.log(`  - ${id}`));
    });
  
  process.exit(1);
}

async function checkUserValidation(userId) {
  console.log(`\nChecking validation status for user: ${userId}`);
  console.log('=====================================\n');
  
  // 1. Get trends already validated by this user
  const { data: validatedTrends, error: valError } = await supabase
    .from('trend_validations')
    .select('trend_submission_id, vote')
    .eq('validator_id', userId);
  
  if (valError) {
    console.error('Error fetching validated trends:', valError);
    return;
  }
  
  const validatedIds = validatedTrends?.map(v => v.trend_submission_id) || [];
  console.log(`User has already validated ${validatedIds.length} trends`);
  
  if (validatedIds.length > 0) {
    console.log('Already validated trend IDs:', validatedIds.slice(0, 5).join(', '), '...');
  }
  
  // 2. Get trends submitted by this user
  const { data: userTrends, error: userError } = await supabase
    .from('trend_submissions')
    .select('id, description, status')
    .eq('spotter_id', userId)
    .order('created_at', { ascending: false })
    .limit(5);
  
  console.log(`\nUser's own submitted trends: ${userTrends?.length || 0}`);
  if (userTrends && userTrends.length > 0) {
    userTrends.forEach((trend, i) => {
      console.log(`  ${i + 1}. ${trend.description?.substring(0, 30)}... (${trend.status})`);
    });
  }
  
  // 3. Build the query as the validate page does
  let query = supabase
    .from('trend_submissions')
    .select('id, description, status, spotter_id')
    .neq('spotter_id', userId); // Exclude user's own trends
  
  if (validatedIds.length > 0) {
    query = query.not('id', 'in', `(${validatedIds.join(',')})`);
  }
  
  const { data: availableTrends, error: availError } = await query
    .in('status', ['submitted', 'validating'])
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (availError) {
    console.error('Error fetching available trends:', availError);
    return;
  }
  
  console.log(`\nTrends available for this user to validate: ${availableTrends?.length || 0}`);
  
  if (availableTrends && availableTrends.length > 0) {
    console.log('\nAvailable trends:');
    availableTrends.forEach((trend, i) => {
      console.log(`  ${i + 1}. ${trend.description?.substring(0, 50)}...`);
      console.log(`     ID: ${trend.id}`);
      console.log(`     Status: ${trend.status}`);
      console.log(`     Spotter: ${trend.spotter_id}`);
    });
  } else {
    console.log('\n⚠️  NO TRENDS AVAILABLE FOR VALIDATION');
    console.log('\nPossible reasons:');
    console.log('1. User has already validated all available trends');
    console.log('2. All available trends were submitted by this user');
    console.log('3. No trends have status "submitted" or "validating"');
    
    // Check if there are any trends the user hasn't validated regardless of status
    const { data: anyTrends } = await supabase
      .from('trend_submissions')
      .select('id, status')
      .neq('spotter_id', userId)
      .not('id', 'in', validatedIds.length > 0 ? `(${validatedIds.join(',')})` : '(null)')
      .limit(5);
    
    if (anyTrends && anyTrends.length > 0) {
      console.log(`\nFound ${anyTrends.length} trends with other statuses:`, anyTrends.map(t => t.status).join(', '));
    }
  }
}

checkUserValidation(USER_ID).catch(console.error);