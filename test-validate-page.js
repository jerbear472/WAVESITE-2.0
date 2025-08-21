const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testValidatePage() {
  try {
    // Simulate the validate page query
    const { data: trends, error } = await supabase
      .from('trend_submissions')
      .select('*')
      .or('validation_count.is.null,validation_count.lt.3')
      .in('status', ['submitted', 'validating']) // Using the fixed status values
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Query error:', error);
      return;
    }

    console.log(`Found ${trends?.length || 0} trends for validation:`);
    
    if (trends && trends.length > 0) {
      trends.slice(0, 5).forEach(trend => {
        console.log(`\n- Title: ${trend.title || trend.trend_headline || 'Untitled'}`);
        console.log(`  Status: ${trend.status}`);
        console.log(`  Validation Count: ${trend.validation_count || 0}`);
        console.log(`  Created: ${new Date(trend.created_at).toLocaleDateString()}`);
        console.log(`  Category: ${trend.category}`);
        console.log(`  Platform: ${trend.platform}`);
      });
      
      if (trends.length > 5) {
        console.log(`\n... and ${trends.length - 5} more trends`);
      }
    } else {
      console.log('No trends found for validation');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

testValidatePage();