const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

async function testXPFix() {
  console.log('Testing XP Display Fix...\n');
  
  const userId = 'b8fbbb0b-b30d-4f6c-91da-baed848dec13'; // Trendsetter
  
  // Test 1: Check user_xp table directly
  console.log('1. Checking user_xp table:');
  const { data: xpData } = await supabase
    .from('user_xp')
    .select('*')
    .eq('user_id', userId)
    .single();
  console.log('   Total XP:', xpData?.total_xp || 0);
  console.log('   Level:', xpData?.current_level || 1);
  
  // Test 2: Check xp_leaderboard (working)
  console.log('\n2. Checking xp_leaderboard view (working):');
  const { data: leaderboard } = await supabase
    .from('xp_leaderboard')
    .select('total_xp, level_title, global_rank')
    .eq('user_id', userId)
    .single();
  console.log('   Total XP:', leaderboard?.total_xp || 0);
  console.log('   Level Title:', leaderboard?.level_title || 'Unknown');
  console.log('   Global Rank:', leaderboard?.global_rank || 'N/A');
  
  // Test 3: Check user_xp_summary (broken)
  console.log('\n3. Checking user_xp_summary view (broken):');
  const { data: summary, error } = await supabase
    .from('user_xp_summary')
    .select('total_xp, level, level_title')
    .eq('user_id', userId);
  
  if (summary && summary.length > 0) {
    console.log('   ✅ VIEW IS FIXED! XP is showing:', summary[0].total_xp);
  } else {
    console.log('   ❌ VIEW IS BROKEN - No data returned');
    console.log('   Error:', error?.message || 'No records found');
  }
  
  // Test 4: Show what the dashboard is querying
  console.log('\n4. Dashboard Query Test (same as Navigation.tsx):');
  const { data: dashboardData } = await supabase
    .from('user_xp_summary')
    .select('total_xp, level, level_title')
    .eq('user_id', userId)
    .single();
  
  if (dashboardData) {
    console.log('   ✅ Dashboard would show:', dashboardData.total_xp, 'XP');
  } else {
    console.log('   ❌ Dashboard shows 0 XP (default fallback)');
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY:');
  console.log('- User has', xpData?.total_xp || 0, 'XP in database');
  console.log('- Leaderboard correctly shows this XP');
  console.log('- user_xp_summary view needs to be fixed to show this XP');
  console.log('- Once fixed, dashboard and navigation will show correct XP');
  console.log('='.repeat(60));
}

testXPFix().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});