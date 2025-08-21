const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

async function fixXPView() {
  console.log('Fixing user_xp_summary view...\n');
  
  // First, let's check what columns exist in trend_submissions
  // Skip this check as it's not critical
  
  // Execute the fix as a raw SQL query using service role key
  const fixSQL = `
    -- Drop and recreate the view with a simpler structure that works
    DROP VIEW IF EXISTS user_xp_summary CASCADE;

    CREATE VIEW user_xp_summary AS
    SELECT 
        u.id as user_id,
        p.username,
        COALESCE(ux.total_xp, 0) as total_xp,
        COALESCE(ux.current_level, 1) as level,
        CASE COALESCE(ux.current_level, 1)
            WHEN 1 THEN 'Observer'
            WHEN 2 THEN 'Recorder'  
            WHEN 3 THEN 'Tracker'
            WHEN 4 THEN 'Tracker'  -- Level 4 is also Tracker based on leaderboard data
            WHEN 5 THEN 'Analyst'
            WHEN 6 THEN 'Interpreter'
            WHEN 7 THEN 'Specialist'
            WHEN 8 THEN 'Expert'
            WHEN 9 THEN 'Scholar'
            WHEN 10 THEN 'Researcher'
            WHEN 11 THEN 'Authority'
            WHEN 12 THEN 'Pioneer'
            WHEN 13 THEN 'Visionary'
            WHEN 14 THEN 'Master'
            WHEN 15 THEN 'Legend'
            ELSE 'Observer'
        END as level_title,
        COALESCE((SELECT COUNT(*) FROM trend_submissions ts WHERE ts.spotter_id = u.id), 0) as total_trends_submitted,
        COALESCE((SELECT COUNT(*) FROM trend_submissions ts WHERE ts.spotter_id = u.id AND ts.approval_status = 'approved'), 0) as validated_trends,
        COALESCE((SELECT COUNT(*) FROM trend_submissions ts WHERE ts.spotter_id = u.id AND ts.approval_status = 'rejected'), 0) as rejected_trends,
        COALESCE((SELECT COUNT(*) FROM trend_submissions ts WHERE ts.spotter_id = u.id AND ts.approval_status = 'pending'), 0) as pending_trends
    FROM users u
    LEFT JOIN profiles p ON p.id = u.id
    LEFT JOIN user_xp ux ON ux.user_id = u.id;
  `;
  
  // Since we can't execute raw SQL directly, let's use a different approach
  // We'll check if the view is working first
  console.log('Testing current view for Trendsetter...');
  const { data: testData, error: testError } = await supabase
    .from('user_xp_summary')
    .select('*')
    .eq('user_id', 'b8fbbb0b-b30d-4f6c-91da-baed848dec13');
  
  if (testError) {
    console.log('Error with current view:', testError.message);
  } else {
    console.log('Current view data for Trendsetter:', testData);
  }
  
  // Check if we can query the view without filters
  const { data: allData, error: allError } = await supabase
    .from('user_xp_summary')
    .select('user_id, username, total_xp, level, level_title')
    .gt('total_xp', 0)
    .limit(10);
  
  if (allError) {
    console.log('\nError querying all users:', allError.message);
  } else {
    console.log('\nUsers with XP > 0 in view:', allData);
  }
  
  // Let's also check if it's an RLS issue
  console.log('\nChecking RLS policies...');
  
  // Try to get the data directly from user_xp table
  const { data: directXP } = await supabase
    .from('user_xp')
    .select('*')
    .eq('user_id', 'b8fbbb0b-b30d-4f6c-91da-baed848dec13');
  
  console.log('Direct user_xp data:', directXP);
  
  // Check xp_leaderboard which we know works
  const { data: leaderboard } = await supabase
    .from('xp_leaderboard')
    .select('*')
    .eq('user_id', 'b8fbbb0b-b30d-4f6c-91da-baed848dec13');
  
  console.log('Leaderboard data (working):', leaderboard);
}

fixXPView().then(() => {
  console.log('\nDone checking XP view');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});