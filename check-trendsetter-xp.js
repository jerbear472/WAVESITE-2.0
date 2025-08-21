const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

async function checkTrendsetterXP() {
  console.log('Checking Trendsetter XP data...\n');
  
  // Find Trendsetter user
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, email')
    .ilike('username', '%trendsetter%');
    
  console.log('Found users matching "trendsetter":', profiles);
  
  if (!profiles || profiles.length === 0) {
    // Try to find by exact username
    const { data: allUsers } = await supabase
      .from('profiles')
      .select('id, username')
      .order('created_at', { ascending: false })
      .limit(20);
    
    console.log('\nAll recent users:', allUsers);
    return;
  }
  
  for (const user of profiles) {
    console.log(`\n=== User: ${user.username} (${user.id}) ===`);
    
    // Check user_xp table
    const { data: userXP, error: xpError } = await supabase
      .from('user_xp')
      .select('*')
      .eq('user_id', user.id)
      .single();
      
    if (xpError) {
      console.log('Error fetching user_xp:', xpError.message);
    } else {
      console.log('user_xp table:', userXP);
    }
    
    // Check user_xp_summary view - without .single() to see all results
    const { data: xpSummary, error: summaryError } = await supabase
      .from('user_xp_summary')
      .select('*')
      .eq('user_id', user.id);
      
    if (summaryError) {
      console.log('Error fetching user_xp_summary:', summaryError.message);
    } else {
      console.log('user_xp_summary view results:', xpSummary);
    }
    
    // Check xp_events
    const { data: xpEvents } = await supabase
      .from('xp_events')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
      
    console.log('Recent XP events:', xpEvents);
    
    // Check xp_transactions
    const { data: xpTransactions } = await supabase
      .from('xp_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
      
    console.log('XP transactions:', xpTransactions);
    
    // Check xp_leaderboard
    const { data: leaderboard } = await supabase
      .from('xp_leaderboard')
      .select('*')
      .eq('user_id', user.id);
      
    console.log('Leaderboard entry:', leaderboard);
  }
}

checkTrendsetterXP().then(() => {
  console.log('\nDone checking Trendsetter XP data');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});