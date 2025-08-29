const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function manuallyValidateTrends() {
  console.log('🚀 Manually validating dummy trends for testing...\n');
  
  try {
    // Get our dummy trends
    const dummyTitles = ['Stanley Cup Obsession', 'Roman Empire Thoughts', 'Throwing a Fit', 'Girl Dinner', 'Mob Wife Aesthetic'];
    
    const { data: trends, error } = await supabase
      .from('trend_submissions')
      .select('id, title, status')
      .in('title', dummyTitles);
    
    if (error) {
      console.error('Error fetching trends:', error);
      return;
    }
    
    if (!trends || trends.length === 0) {
      console.log('Dummy trends not found. Please run add-dummy-trends.js first.');
      return;
    }
    
    console.log(`Found ${trends.length} dummy trends to validate:\n`);
    
    // Directly update the trends to validated status for testing
    console.log('Directly updating trends to validated status for testing...\n');
    
    for (const trend of trends) {
      console.log(`Validating "${trend.title}"...`);
      
      const { error: updateError } = await supabase
        .from('trend_submissions')
        .update({
          status: 'validating',  // This is what the predictions page shows
          updated_at: new Date().toISOString()
        })
        .eq('id', trend.id);
      
      if (updateError) {
        console.error(`  ❌ Failed to validate: ${updateError.message}`);
      } else {
        console.log(`  ✅ Successfully validated!`);
      }
    }
    
    // Also change some existing validating trends to validated for variety
    console.log('\nAlso validating some existing trends...');
    
    const { data: validatingTrends } = await supabase
      .from('trend_submissions')
      .select('id, title')
      .eq('status', 'validating')
      .limit(5);
    
    if (validatingTrends && validatingTrends.length > 0) {
      for (const trend of validatingTrends) {
        const { error } = await supabase
          .from('trend_submissions')
          .update({
            status: 'validated'
          })
          .eq('id', trend.id);
        
        if (!error) {
          console.log(`  ✅ Validated: "${trend.title || 'Untitled Trend'}"`);
        }
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✨ Validation complete!');
    console.log('\n📍 Next steps:');
    console.log('1. Go to http://localhost:3002/predictions');
    console.log('2. You should now see the validated trends');
    console.log('3. Click "Predict Peak" on any trend');
    console.log('4. Test the interactive draggable prediction chart!');
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

manuallyValidateTrends();