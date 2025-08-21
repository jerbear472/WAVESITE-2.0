const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

async function checkTrendsetterUser() {
  const userId = 'b8fbbb0b-b30d-4f6c-91da-baed848dec13';
  
  console.log('Checking Trendsetter user data across all tables...\n');
  
  // Check users table
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId);
  
  console.log('Users table:', userData, userError?.message || '');
  
  // Check profiles table
  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId);
  
  console.log('\nProfiles table:', profileData);
  
  // Check user_xp table
  const { data: xpData } = await supabase
    .from('user_xp')
    .select('*')
    .eq('user_id', userId);
  
  console.log('\nuser_xp table:', xpData);
  
  // Check xp_leaderboard view
  const { data: leaderboardData } = await supabase
    .from('xp_leaderboard')
    .select('*')
    .eq('user_id', userId);
  
  console.log('\nxp_leaderboard view:', leaderboardData);
  
  // Raw query to user_xp_summary with service role
  const { data: summaryData, error: summaryError } = await supabase
    .from('user_xp_summary')
    .select('*')
    .eq('user_id', userId);
  
  console.log('\nuser_xp_summary view:', summaryData, summaryError?.message || '');
  
  // Try to get all users from the view to see if Trendsetter is in there at all
  const { data: allSummaryData } = await supabase
    .from('user_xp_summary')
    .select('user_id, username')
    .ilike('username', '%trend%');
  
  console.log('\nuser_xp_summary users with "trend" in username:', allSummaryData);
  
  // Check if there's a different ID for trendsetter
  const { data: trendsetterProfiles } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', 'trendsetter');
  
  console.log('\nAll profiles with username "trendsetter":', trendsetterProfiles);
}

checkTrendsetterUser().then(() => {
  console.log('\nDone checking Trendsetter user');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});