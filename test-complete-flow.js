#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testCompleteFlow() {
  console.log('🧪 TESTING COMPLETE VERIFY FLOW\n');
  console.log('='.repeat(50));
  
  // 1. Check if trends are accessible
  console.log('\n1️⃣ CHECKING TREND ACCESS...');
  const { data: trends, error: trendsError, count } = await supabase
    .from('trend_submissions')
    .select('*', { count: 'exact' })
    .limit(5);
  
  if (trendsError) {
    console.log('❌ Cannot access trends:', trendsError.message);
    console.log('\nFIX: Run PROPER_VERIFY_SYSTEM_FIX.sql in Supabase');
    return;
  }
  
  console.log(`✅ Can see ${count} trends`);
  
  // 2. Check trends needing validation
  console.log('\n2️⃣ TRENDS NEEDING VALIDATION...');
  const { data: pendingTrends } = await supabase
    .from('trend_submissions')
    .select('*')
    .lt('validation_count', 2)
    .order('created_at', { ascending: false })
    .limit(10);
  
  console.log(`Found ${pendingTrends?.length || 0} trends needing validation`);
  
  if (pendingTrends && pendingTrends.length > 0) {
    console.log('\nSample trends:');
    pendingTrends.slice(0, 3).forEach(t => {
      console.log(`- ${t.description?.substring(0, 40)}...`);
      console.log(`  Votes: ${t.approve_count || 0} approve, ${t.reject_count || 0} reject`);
    });
  }
  
  // 3. Check earnings flow
  console.log('\n3️⃣ CHECKING EARNINGS FLOW...');
  const { data: earnings } = await supabase
    .from('earnings_ledger')
    .select('status, type, amount')
    .in('status', ['awaiting_verification', 'pending', 'approved'])
    .limit(10);
  
  if (earnings) {
    const summary = {};
    earnings.forEach(e => {
      const key = `${e.type}-${e.status}`;
      summary[key] = (summary[key] || 0) + 1;
    });
    
    console.log('Earnings status:');
    Object.entries(summary).forEach(([key, count]) => {
      console.log(`  ${key}: ${count}`);
    });
  }
  
  // 4. Check profiles with awaiting_verification
  console.log('\n4️⃣ CHECKING USER BALANCES...');
  const { data: profiles } = await supabase
    .from('profiles')
    .select('awaiting_verification, earnings_pending, earnings_approved')
    .gt('awaiting_verification', 0)
    .limit(5);
  
  if (profiles && profiles.length > 0) {
    console.log('Users with awaiting verification:');
    profiles.forEach(p => {
      console.log(`  Awaiting: $${p.awaiting_verification || 0}`);
      console.log(`  Pending: $${p.earnings_pending || 0}`);
      console.log(`  Approved: $${p.earnings_approved || 0}`);
    });
  }
  
  // 5. Test RPC function exists
  console.log('\n5️⃣ TESTING VOTE FUNCTION...');
  const { error: rpcError } = await supabase
    .rpc('cast_trend_vote', {
      p_trend_id: '00000000-0000-0000-0000-000000000000',
      p_vote: 'verify'
    });
  
  if (rpcError) {
    if (rpcError.message.includes('authenticated')) {
      console.log('✅ Vote function exists and requires auth');
    } else {
      console.log('⚠️  Vote function issue:', rpcError.message);
    }
  }
  
  // SUMMARY
  console.log('\n' + '='.repeat(50));
  console.log('📊 SYSTEM STATUS\n');
  
  const checks = [
    { name: 'Trends accessible', passed: !trendsError },
    { name: 'Pending trends exist', passed: pendingTrends && pendingTrends.length > 0 },
    { name: 'Earnings tracking', passed: earnings && earnings.length > 0 },
    { name: 'Vote function exists', passed: rpcError?.message?.includes('authenticated') }
  ];
  
  checks.forEach(check => {
    console.log(`${check.passed ? '✅' : '❌'} ${check.name}`);
  });
  
  const allPassed = checks.every(c => c.passed);
  
  if (allPassed) {
    console.log('\n✅ SYSTEM READY!');
    console.log('\nThe verify page should work correctly with:');
    console.log('  • Trends visible to validate');
    console.log('  • 2-vote approval/rejection threshold');
    console.log('  • Earnings moving from awaiting to approved');
    console.log('  • $0.01 validator rewards');
  } else {
    console.log('\n⚠️  Some checks failed');
    console.log('Run PROPER_VERIFY_SYSTEM_FIX.sql in Supabase');
  }
}

testCompleteFlow().catch(console.error);