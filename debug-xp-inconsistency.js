// Debug XP inconsistency across the app
// Run this to check what data exists for trendsetter user

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iypcltnwhdblumgkvkkb.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGNsdG53aGRibHVtZ2t2a2tiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU5MDIyMDEsImV4cCI6MjA0MTQ3ODIwMX0.sKS6veBJPNP1SbLZ3iSuIrmUcQjzAw_ZPhLUYkANO3o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugXPInconsistency() {
  console.log('🔍 Debugging XP Inconsistency\n');

  try {
    // 1. Check if user exists in profiles
    console.log('1. Checking profiles table...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username')
      .ilike('username', '%trendsetter%');
    
    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError);
      return;
    }
    
    console.log('📋 Profiles found:', profiles?.length || 0);
    profiles?.forEach(p => console.log(`   - ${p.username} (${p.id})`));
    
    if (!profiles || profiles.length === 0) {
      console.log('❌ No trendsetter user found in profiles');
      return;
    }
    
    const userId = profiles[0].id;
    console.log(`\n🎯 Using user: ${profiles[0].username} (${userId})\n`);

    // 2. Check user_xp table
    console.log('2. Checking user_xp table...');
    const { data: userXP, error: xpError } = await supabase
      .from('user_xp')
      .select('*')
      .eq('user_id', userId);
    
    if (xpError) {
      console.error('❌ Error fetching user_xp:', xpError);
    } else {
      console.log('📊 user_xp data:', userXP?.[0] || 'No data found');
    }

    // 3. Check user_xp_summary view
    console.log('\n3. Checking user_xp_summary view...');
    const { data: xpSummary, error: summaryError } = await supabase
      .from('user_xp_summary')
      .select('*')
      .eq('user_id', userId);
    
    if (summaryError) {
      console.error('❌ Error fetching user_xp_summary:', summaryError);
    } else {
      console.log('📈 user_xp_summary data:', xpSummary?.[0] || 'No data found');
    }

    // 4. Check xp_leaderboard view
    console.log('\n4. Checking xp_leaderboard view...');
    const { data: leaderboard, error: leaderboardError } = await supabase
      .from('xp_leaderboard')
      .select('*')
      .eq('user_id', userId);
    
    if (leaderboardError) {
      console.error('❌ Error fetching xp_leaderboard:', leaderboardError);
    } else {
      console.log('🏆 xp_leaderboard data:', leaderboard?.[0] || 'No data found');
    }

    // 5. Check xp_transactions
    console.log('\n5. Checking xp_transactions...');
    const { data: transactions, error: transError } = await supabase
      .from('xp_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (transError) {
      console.error('❌ Error fetching xp_transactions:', transError);
    } else {
      console.log(`💰 Found ${transactions?.length || 0} XP transactions`);
      if (transactions && transactions.length > 0) {
        const totalXP = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
        console.log(`   Total XP from transactions: ${totalXP}`);
        console.log('   Recent transactions:');
        transactions.slice(0, 3).forEach(t => 
          console.log(`   - ${t.type}: ${t.amount} XP (${t.description})`)
        );
      }
    }

    // 6. Check if user exists in multiple views
    console.log('\n6. Summary of findings:');
    console.log(`   Profiles: ${profiles?.length || 0} found`);
    console.log(`   user_xp: ${userXP?.length || 0} records`);
    console.log(`   user_xp_summary: ${xpSummary?.length || 0} records`);
    console.log(`   xp_leaderboard: ${leaderboard?.length || 0} records`);
    console.log(`   xp_transactions: ${transactions?.length || 0} records`);

    // 7. Recommendations
    console.log('\n💡 Recommendations:');
    if (!userXP || userXP.length === 0) {
      console.log('❗ Missing user_xp record - need to create initial entry');
    }
    if (transactions && transactions.length > 0 && (!userXP || userXP[0]?.total_xp === 0)) {
      console.log('❗ XP transactions exist but user_xp not updated - check triggers');
    }
    if (xpSummary && leaderboard && xpSummary[0]?.total_xp !== leaderboard[0]?.total_xp) {
      console.log('❗ XP mismatch between views - need to refresh views');
    }

  } catch (error) {
    console.error('💥 Script error:', error);
  }
}

debugXPInconsistency();