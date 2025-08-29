const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTrendsStatus() {
  console.log('🔍 Checking trends status in database...\n');
  
  // Get all trends with their vote counts
  const { data: trends, error } = await supabase
    .from('trend_submissions')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching trends:', error);
    return;
  }
  
  if (!trends || trends.length === 0) {
    console.log('No trends found in database');
    return;
  }
  
  console.log(`Found ${trends.length} trends total:\n`);
  
  // Group by status
  const statusGroups = {
    approved: [],
    validated: [],
    validating: [],
    submitted: [],
    rejected: [],
    other: []
  };
  
  trends.forEach(trend => {
    const status = trend.status || 'other';
    if (statusGroups[status]) {
      statusGroups[status].push(trend);
    } else {
      statusGroups.other.push(trend);
    }
  });
  
  // Display summary
  console.log('📊 Status Summary:');
  console.log('==================');
  Object.entries(statusGroups).forEach(([status, trendList]) => {
    if (trendList.length > 0) {
      console.log(`\n${status.toUpperCase()}: ${trendList.length} trends`);
      console.log('-'.repeat(40));
      
      trendList.slice(0, 3).forEach(trend => {
        console.log(`  • "${trend.title || 'Untitled'}" `);
        console.log(`    Votes: 🌊 ${trend.wave_votes || 0} | 🔥 ${trend.fire_votes || 0} | 📉 ${trend.declining_votes || 0} | 💀 ${trend.dead_votes || 0}`);
        console.log(`    Total wave score: ${(trend.wave_votes || 0) * 2 + (trend.fire_votes || 0) - (trend.declining_votes || 0) - (trend.dead_votes || 0) * 2}`);
        console.log(`    Created: ${new Date(trend.created_at).toLocaleDateString()}`);
        console.log(`    Validation votes: ${trend.validation_wave_votes || 0} (need 3 for approval)`);
      });
      
      if (trendList.length > 3) {
        console.log(`  ... and ${trendList.length - 3} more`);
      }
    }
  });
  
  // Check for trends close to approval
  console.log('\n\n🎯 Trends Close to Approval (2+ validation votes):');
  console.log('=================================================');
  const closeToApproval = trends.filter(t => 
    t.validation_wave_votes >= 2 && t.status !== 'approved' && t.status !== 'validated'
  );
  
  if (closeToApproval.length === 0) {
    console.log('No trends are close to approval (need 3 validation votes)');
  } else {
    closeToApproval.forEach(trend => {
      console.log(`  • "${trend.title}" - ${trend.validation_wave_votes}/3 votes`);
    });
  }
  
  // Check validation votes separately
  console.log('\n\n📋 Checking validation votes from trend_validations table:');
  const { data: validations, error: valError } = await supabase
    .from('trend_validations')
    .select('trend_id, vote_type')
    .order('created_at', { ascending: false })
    .limit(20);
    
  if (valError) {
    console.log('Could not fetch from trend_validations table (might not exist)');
  } else if (validations && validations.length > 0) {
    // Count votes per trend
    const voteCounts = {};
    validations.forEach(v => {
      if (!voteCounts[v.trend_id]) {
        voteCounts[v.trend_id] = { wave: 0, fire: 0, skip: 0, dead: 0 };
      }
      voteCounts[v.trend_id][v.vote_type]++;
    });
    
    console.log('Recent validation activity:');
    Object.entries(voteCounts).slice(0, 5).forEach(([trendId, votes]) => {
      console.log(`  Trend ${trendId.slice(0, 8)}...`);
      console.log(`    Votes: 🌊 ${votes.wave} | 🔥 ${votes.fire} | ⏭️ ${votes.skip} | 💀 ${votes.dead}`);
    });
  } else {
    console.log('No validation votes found');
  }
  
  process.exit(0);
}

checkTrendsStatus();