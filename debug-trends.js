const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugTrends() {
  console.log('🔍 Debugging trend data...\n');

  try {
    // Get recent trends with all fields
    const { data: trends, error } = await supabase
      .from('trend_submissions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Error fetching trends:', error);
      return;
    }

    console.log(`Found ${trends?.length || 0} recent trends:\n`);
    
    trends?.forEach((trend, index) => {
      console.log(`\n===== Trend ${index + 1} =====`);
      console.log(`ID: ${trend.id}`);
      console.log(`Title: "${trend.title}"`);
      console.log(`Description: "${trend.description}"`);
      console.log(`Category: "${trend.category}"`);
      console.log(`Trend Velocity: "${trend.trend_velocity}"`);
      console.log(`Trend Size: "${trend.trend_size}"`);
      console.log(`Likes: ${trend.likes_count}`);
      console.log(`Views: ${trend.views_count}`);
      console.log(`Comments: ${trend.comments_count}`);
      console.log(`Shares: ${trend.shares_count}`);
      console.log(`Creator Handle: "${trend.creator_handle}"`);
      console.log(`Evidence:`, trend.evidence);
      
      // Check for problematic values
      const problems = [];
      if (trend.title === '0' || trend.title === '00') problems.push('Title is "0"');
      if (trend.description === '0' || trend.description === '00') problems.push('Description is "0"');
      if (!trend.category) problems.push('No category');
      if (trend.likes_count === '0') problems.push('Likes is string "0"');
      if (trend.views_count === '0') problems.push('Views is string "0"');
      
      if (problems.length > 0) {
        console.log(`\n⚠️  PROBLEMS FOUND:`);
        problems.forEach(p => console.log(`  - ${p}`));
      }
    });

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the debug
debugTrends();