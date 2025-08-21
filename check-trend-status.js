const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkTrendStatuses() {
  try {
    // Get distinct statuses
    const { data: statuses, error: statusError } = await supabase
      .from('trend_submissions')
      .select('status')
      .order('created_at', { ascending: false });

    if (statusError) throw statusError;

    const uniqueStatuses = [...new Set(statuses.map(s => s.status))];
    console.log('Unique statuses in database:', uniqueStatuses);

    // Get recent trends with their statuses
    const { data: trends, error: trendsError } = await supabase
      .from('trend_submissions')
      .select('id, title, status, validation_count, created_at, spotter_id')
      .order('created_at', { ascending: false })
      .limit(10);

    if (trendsError) throw trendsError;

    console.log('\nRecent trends:');
    trends.forEach(trend => {
      console.log(`- ${trend.title || 'Untitled'}: status="${trend.status}", validation_count=${trend.validation_count}, created=${new Date(trend.created_at).toLocaleDateString()}`);
    });

    // Count trends by status
    const statusCounts = {};
    statuses.forEach(s => {
      statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
    });

    console.log('\nTrends by status:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`- ${status}: ${count} trends`);
    });

    // Check for trends that should show on validate page
    const { data: validateTrends, error: validateError } = await supabase
      .from('trend_submissions')
      .select('id, title, status, validation_count')
      .or('validation_count.is.null,validation_count.lt.3')
      .in('status', ['submitted', 'validating', 'pending'])
      .limit(10);

    if (validateError) throw validateError;

    console.log('\nTrends that should show on validate page:');
    console.log(`Found ${validateTrends?.length || 0} trends`);
    if (validateTrends && validateTrends.length > 0) {
      validateTrends.forEach(trend => {
        console.log(`- ${trend.title || 'Untitled'}: status="${trend.status}", validation_count=${trend.validation_count}`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkTrendStatuses();