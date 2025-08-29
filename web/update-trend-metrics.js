const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateTrendMetrics() {
  console.log('🔧 Updating trend metrics to realistic values...\n');
  
  try {
    // Get our dummy trends
    const dummyTitles = ['Stanley Cup Obsession', 'Roman Empire Thoughts', 'Throwing a Fit', 'Girl Dinner', 'Mob Wife Aesthetic'];
    
    const { data: trends, error } = await supabase
      .from('trend_submissions')
      .select('id, title, views_count, likes_count, comments_count')
      .in('title', dummyTitles);
    
    if (error) {
      console.error('Error fetching trends:', error);
      return;
    }
    
    if (!trends || trends.length === 0) {
      console.log('Dummy trends not found.');
      return;
    }
    
    console.log(`Found ${trends.length} trends to update:\n`);
    
    // Update each trend to have realistic or null metrics
    for (const trend of trends) {
      console.log(`Updating "${trend.title}"...`);
      console.log(`  Current: views=${trend.views_count}, likes=${trend.likes_count}, comments=${trend.comments_count}`);
      
      // Set realistic values or null for metrics we can't actually track
      const { error: updateError } = await supabase
        .from('trend_submissions')
        .update({
          views_count: null,  // We can't track actual TikTok views
          likes_count: null,  // We can't track actual likes
          comments_count: null,  // We can't track actual comments
          shares_count: null,  // We can't track shares
          follower_count: null,  // We can't track follower counts
          sentiment: 75,  // Default neutral-positive sentiment
          confidence_score: 0.7,  // Default confidence
          updated_at: new Date().toISOString()
        })
        .eq('id', trend.id);
      
      if (updateError) {
        console.error(`  ❌ Failed to update: ${updateError.message}`);
      } else {
        console.log(`  ✅ Updated to realistic values (nulled untrackable metrics)`);
      }
    }
    
    // Also update any other trends with unrealistic metrics
    console.log('\n📊 Checking all trends for unrealistic metrics...');
    
    const { data: allTrends } = await supabase
      .from('trend_submissions')
      .select('id, title, views_count')
      .gt('views_count', 1000000)  // Find trends with over 1M views (unrealistic)
      .limit(20);
    
    if (allTrends && allTrends.length > 0) {
      console.log(`Found ${allTrends.length} trends with unrealistic view counts\n`);
      
      for (const trend of allTrends) {
        const { error } = await supabase
          .from('trend_submissions')
          .update({
            views_count: null,
            likes_count: null,
            comments_count: null,
            shares_count: null
          })
          .eq('id', trend.id);
        
        if (!error) {
          console.log(`  ✅ Reset metrics for: "${trend.title || 'Untitled'}" (had ${trend.views_count} views)`);
        }
      }
    } else {
      console.log('No trends with unrealistic metrics found.');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Metrics updated to realistic values!');
    console.log('\nNote: Since we can\'t actually track TikTok/social media metrics,');
    console.log('these fields are now null. The app should focus on:');
    console.log('• User votes (wave, fire, declining, dead)');
    console.log('• Validation status');
    console.log('• User predictions');
    console.log('• Community consensus');
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

updateTrendMetrics();