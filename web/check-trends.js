const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://aicahushpcslwjwrlqbo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpY2FodXNocGNzbHdqd3JscWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4ODc1NTQsImV4cCI6MjA3MDQ2MzU1NH0.rLPnouZXA1ejWG0tuurIb5sgo5CCHe15M4knaANrR2w';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTrends() {
  console.log('Checking trends in database...\n');
  
  // Get all trends ordered by newest first
  const { data: allTrends, error: allError } = await supabase
    .from('trend_submissions')
    .select('id, status, created_at, description, spotter_id, validation_count, approve_count, reject_count')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (allError) {
    console.error('Error fetching trends:', allError);
    return;
  }
  
  console.log(`Found ${allTrends?.length || 0} recent trends:`);
  console.log('=====================================');
  
  allTrends?.forEach((trend, index) => {
    const createdAt = new Date(trend.created_at);
    const hoursAgo = Math.round((Date.now() - createdAt.getTime()) / (1000 * 60 * 60));
    
    console.log(`\n${index + 1}. Trend ID: ${trend.id}`);
    console.log(`   Status: ${trend.status}`);
    console.log(`   Description: ${trend.description?.substring(0, 50)}...`);
    console.log(`   Created: ${hoursAgo} hours ago (${createdAt.toLocaleString()})`);
    console.log(`   Spotter ID: ${trend.spotter_id}`);
    console.log(`   Validation Count: ${trend.validation_count}`);
    console.log(`   Approve/Reject: ${trend.approve_count || 0}/${trend.reject_count || 0}`);
  });
  
  // Count trends by status
  const { data: statusCounts, error: countError } = await supabase
    .from('trend_submissions')
    .select('status');
  
  if (!countError && statusCounts) {
    const counts = statusCounts.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\n\nTrends by Status:');
    console.log('=====================================');
    Object.entries(counts).forEach(([status, count]) => {
      console.log(`${status}: ${count}`);
    });
  }
  
  // Check for trends that should be visible for validation
  const { data: validationTrends, error: valError } = await supabase
    .from('trend_submissions')
    .select('id, status, description')
    .in('status', ['submitted', 'validating'])
    .order('created_at', { ascending: false })
    .limit(20);
  
  console.log('\n\nTrends Available for Validation:');
  console.log('=====================================');
  console.log(`Found ${validationTrends?.length || 0} trends with status 'submitted' or 'validating'`);
  
  if (validationTrends && validationTrends.length > 0) {
    validationTrends.forEach((trend, index) => {
      console.log(`${index + 1}. ID: ${trend.id} - Status: ${trend.status} - ${trend.description?.substring(0, 30)}...`);
    });
  }
}

checkTrends().catch(console.error);