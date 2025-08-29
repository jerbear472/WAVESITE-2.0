const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPredictionsData() {
  console.log('🔍 Checking Predictions Page Data\n');
  console.log('=' .repeat(60));
  
  try {
    // Check trends by status
    console.log('\n📊 Trend Status Distribution:');
    const { data: statusCounts } = await supabase
      .from('trend_submissions')
      .select('status');
    
    const counts = {};
    statusCounts?.forEach(row => {
      counts[row.status] = (counts[row.status] || 0) + 1;
    });
    
    Object.entries(counts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count} trends`);
    });
    
    // Get validated trends (these appear on predictions page)
    console.log('\n✅ VALIDATED TRENDS (visible on Predictions page):');
    console.log('-'.repeat(50));
    
    const { data: validatedTrends, error: validatedError } = await supabase
      .from('trend_submissions')
      .select('*')
      .in('status', ['validated', 'approved', 'validating'])
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (validatedTrends && validatedTrends.length > 0) {
      validatedTrends.forEach((trend, index) => {
        console.log(`\n${index + 1}. "${trend.title || trend.trend_headline || 'Untitled'}"`);
        console.log(`   Status: ${trend.status}`);
        console.log(`   Platform: ${trend.platform || 'unknown'}`);
        console.log(`   Category: ${trend.category || 'uncategorized'}`);
        console.log(`   Votes: Wave=${trend.wave_votes || 0}, Fire=${trend.fire_votes || 0}, Dead=${trend.dead_votes || 0}`);
        console.log(`   Validation Votes: Wave=${trend.validation_wave_votes || 0}, Fire=${trend.validation_fire_votes || 0}, Dead=${trend.validation_dead_votes || 0}`);
        console.log(`   Heat Score: ${trend.heat_score || 0}`);
        console.log(`   Created: ${new Date(trend.created_at).toLocaleDateString()}`);
      });
    } else {
      console.log('No validated trends found. Trends need 3+ validation votes to appear here.');
    }
    
    // Get submitted trends (in validation queue)
    console.log('\n\n📝 SUBMITTED TRENDS (in Validation queue):');
    console.log('-'.repeat(50));
    
    const { data: submittedTrends, error: submittedError } = await supabase
      .from('trend_submissions')
      .select('id, title, status, validation_wave_votes, validation_fire_votes, validation_dead_votes')
      .eq('status', 'submitted')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (submittedTrends && submittedTrends.length > 0) {
      submittedTrends.forEach((trend, index) => {
        console.log(`\n${index + 1}. "${trend.title || 'Untitled'}"`);
        console.log(`   Validation Progress: ${(trend.validation_wave_votes || 0) + (trend.validation_fire_votes || 0)}/3 approval votes`);
        console.log(`   Status will change to 'validated' after 3 approval votes`);
      });
      
      console.log('\n💡 To make these appear on Predictions page:');
      console.log('   1. Go to /validate');
      console.log('   2. Vote "Approve" (right swipe) with 3 different accounts');
      console.log('   3. They\'ll automatically move to Predictions page');
    } else {
      console.log('No submitted trends in queue.');
    }
    
    // Check our newly added dummy trends
    console.log('\n\n🆕 Recently Added Dummy Trends:');
    console.log('-'.repeat(50));
    
    const dummyTitles = ['Stanley Cup Obsession', 'Roman Empire Thoughts', 'Throwing a Fit', 'Girl Dinner', 'Mob Wife Aesthetic'];
    
    const { data: dummyTrends } = await supabase
      .from('trend_submissions')
      .select('title, status, validation_wave_votes, validation_fire_votes, validation_dead_votes')
      .in('title', dummyTitles);
    
    if (dummyTrends && dummyTrends.length > 0) {
      dummyTrends.forEach(trend => {
        const totalValidationVotes = (trend.validation_wave_votes || 0) + (trend.validation_fire_votes || 0);
        const votesNeeded = Math.max(0, 3 - totalValidationVotes);
        
        console.log(`\n• "${trend.title}"`);
        console.log(`  Status: ${trend.status}`);
        console.log(`  Validation votes: ${totalValidationVotes}/3`);
        
        if (votesNeeded > 0) {
          console.log(`  ⚠️  Needs ${votesNeeded} more approval votes to appear on Predictions page`);
        } else {
          console.log(`  ✅ Should be visible on Predictions page!`);
        }
      });
    }
    
    // Summary
    console.log('\n\n' + '=' .repeat(60));
    console.log('📈 PREDICTIONS PAGE STATUS:');
    console.log(`• ${counts.validated || 0} validated trends visible on Predictions page`);
    console.log(`• ${counts.submitted || 0} trends awaiting validation votes`);
    console.log(`• ${counts.validating || 0} trends currently being validated`);
    
    if ((counts.validated || 0) === 0) {
      console.log('\n⚠️  No trends on Predictions page yet!');
      console.log('    Vote on trends at /validate to move them to Predictions');
    }
    
  } catch (error) {
    console.error('Error checking predictions data:', error);
  }
  
  process.exit(0);
}

checkPredictionsData();