const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

async function checkXPData() {
  console.log('Checking XP data in database...\n');
  
  // Get a sample user ID (you might need to adjust this)
  const { data: users } = await supabase
    .from('profiles')
    .select('id, username')
    .limit(5);
    
  if (!users || users.length === 0) {
    console.log('No users found');
    return;
  }
  
  console.log('Users found:', users);
  
  for (const user of users) {
    console.log(`\n=== User: ${user.username || user.id} ===`);
    
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
    
    // Check user_xp_summary view
    const { data: xpSummary, error: summaryError } = await supabase
      .from('user_xp_summary')
      .select('*')
      .eq('user_id', user.id)
      .single();
      
    if (summaryError) {
      console.log('Error fetching user_xp_summary:', summaryError.message);
    } else {
      console.log('user_xp_summary view:', xpSummary);
    }
    
    // Check xp_events
    const { data: xpEvents } = await supabase
      .from('xp_events')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);
      
    console.log('Recent XP events:', xpEvents);
  }
}

checkXPData().then(() => {
  console.log('\nDone checking XP data');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});