const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

// Use service role key for admin access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

async function applyFix() {
  console.log('Applying user_xp_summary view fix...\n');
  
  // Since we can't execute raw SQL via the JS client, we'll need to use a different approach
  // Let's test if the fix would work by checking the data
  
  console.log('Testing current state...');
  
  // Check Trendsetter in current view
  const { data: currentView, error: viewError } = await supabase
    .from('user_xp_summary')
    .select('*')
    .eq('user_id', 'b8fbbb0b-b30d-4f6c-91da-baed848dec13');
  
  console.log('Current view result for Trendsetter:', currentView, viewError?.message || '');
  
  // Check if we can see all profiles with XP
  const { data: profilesWithXP } = await supabase
    .from('profiles')
    .select(`
      id,
      username,
      user_xp!left(total_xp, current_level)
    `)
    .not('user_xp', 'is', null)
    .order('user_xp(total_xp)', { ascending: false })
    .limit(10);
  
  console.log('\nProfiles with XP data:');
  profilesWithXP?.forEach(p => {
    console.log(`- ${p.username}: ${p.user_xp?.total_xp || 0} XP (Level ${p.user_xp?.current_level || 1})`);
  });
  
  // Show the SQL that needs to be run
  console.log('\n' + '='.repeat(60));
  console.log('TO FIX THIS ISSUE, RUN THE FOLLOWING SQL IN SUPABASE:');
  console.log('='.repeat(60) + '\n');
  
  const fixSQL = fs.readFileSync('./supabase/migrations/20250821_fix_user_xp_summary_view.sql', 'utf8');
  console.log(fixSQL);
  
  console.log('\n' + '='.repeat(60));
  console.log('You can run this SQL in the Supabase SQL Editor at:');
  console.log('https://supabase.com/dashboard/project/aicahushpcslwjwrlqbo/sql/new');
  console.log('='.repeat(60));
}

applyFix().then(() => {
  console.log('\nDone');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});