const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testValidationFlow() {
  console.log('🔍 EXAMINING TREND VALIDATION & PAYOUT FLOW\n');
  console.log('=' .repeat(60) + '\n');
  
  try {
    // 1. VALIDATION MECHANISM
    console.log('1️⃣ VALIDATION MECHANISM\n');
    console.log('How it works:');
    console.log('  • Users vote on trends: Verify ✅ or Reject ❌');
    console.log('  • First to reach 2 votes wins (2 verify = approved, 2 reject = cancelled)');
    console.log('  • Validators earn $0.02 per vote (instant payout)');
    console.log('  • Trend submitters get $0.50 bonus when approved\n');
    
    // 2. PAYOUT FLOW
    console.log('2️⃣ PAYOUT FLOW: PENDING → APPROVED\n');
    console.log('When trend is submitted:');
    console.log('  • Earnings go to PENDING status (yellow in UI)');
    console.log('  • Amount: $0.25 × tier × session × daily multipliers');
    console.log('  • Cannot be cashed out yet\n');
    
    console.log('When trend gets 2 VERIFY votes:');
    console.log('  • Status changes: pending → approved (green in UI)');
    console.log('  • Earnings move from pending_earnings → approved_earnings');
    console.log('  • $0.50 approval bonus added (× tier multiplier)');
    console.log('  • NOW can be cashed out!\n');
    
    console.log('When trend gets 2 REJECT votes:');
    console.log('  • Status changes: pending → cancelled');
    console.log('  • Earnings removed from pending_earnings');
    console.log('  • No payout occurs\n');
    
    // 3. USER NOTIFICATIONS
    console.log('3️⃣ USER NOTIFICATIONS\n');
    console.log('Real-time updates via Supabase channels:');
    console.log('  • Earnings page subscribes to earnings_ledger changes');
    console.log('  • Auto-refreshes when status changes');
    console.log('  • Shows transaction in history immediately');
    console.log('  • Visual indication: pending (yellow) → approved (green)\n');
    
    // 4. Check current pending trends
    console.log('4️⃣ CHECKING CURRENT TRENDS AWAITING VALIDATION...\n');
    
    const { data: pendingTrends } = await supabase
      .from('trend_submissions')
      .select(`
        id,
        title,
        spotter_id,
        payment_amount,
        approve_count,
        reject_count,
        created_at
      `)
      .eq('status', 'submitted')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (pendingTrends && pendingTrends.length > 0) {
      console.log(`Found ${pendingTrends.length} trends awaiting validation:\n`);
      
      for (const trend of pendingTrends) {
        console.log(`📊 "${trend.title || 'Untitled'}"`);
        console.log(`   ID: ${trend.id}`);
        console.log(`   Pending Amount: $${trend.payment_amount || 0.25}`);
        console.log(`   Votes: ✅ ${trend.approve_count || 0}/2, ❌ ${trend.reject_count || 0}/2`);
        console.log(`   Status: ${
          (trend.approve_count || 0) >= 2 ? '🎉 READY FOR APPROVAL' :
          (trend.reject_count || 0) >= 2 ? '❌ READY FOR REJECTION' :
          '⏳ Needs more votes'
        }`);
        console.log('');
      }
    } else {
      console.log('No pending trends found\n');
    }
    
    // 5. Check user earnings breakdown
    console.log('5️⃣ CHECKING USER EARNINGS STATUS...\n');
    
    const { data: users } = await supabase
      .from('user_profiles')
      .select('id, email, earnings_pending, earnings_approved, earnings_paid')
      .gt('earnings_pending', 0)
      .limit(3);
    
    if (users && users.length > 0) {
      console.log('Users with pending earnings:\n');
      
      for (const user of users) {
        console.log(`👤 ${user.email || user.id.substring(0, 8)}`);
        console.log(`   💛 Pending: $${user.earnings_pending || 0} (awaiting validation)`);
        console.log(`   ✅ Approved: $${user.earnings_approved || 0} (can cash out)`);
        console.log(`   💰 Paid: $${user.earnings_paid || 0} (already cashed out)`);
        
        // Check their pending trends
        const { data: userTrends } = await supabase
          .from('trend_submissions')
          .select('id, approve_count, reject_count')
          .eq('spotter_id', user.id)
          .eq('status', 'submitted');
        
        if (userTrends && userTrends.length > 0) {
          const needsVotes = userTrends.filter(t => 
            (t.approve_count || 0) < 2 && (t.reject_count || 0) < 2
          ).length;
          console.log(`   📊 ${userTrends.length} trends pending (${needsVotes} need votes)`);
        }
        console.log('');
      }
    } else {
      console.log('No users with pending earnings\n');
    }
    
    // 6. Summary
    console.log('=' .repeat(60));
    console.log('\n✅ VALIDATION & PAYOUT SYSTEM SUMMARY\n');
    console.log('📋 Flow:');
    console.log('  1. Submit trend → Earn pending $ (can\'t cash out)');
    console.log('  2. Get 2 verify votes → $ moves to approved (CAN cash out!)');
    console.log('  3. Get $0.50 bonus when approved');
    console.log('  4. Cash out at $10+ approved balance\n');
    
    console.log('💡 Key Features:');
    console.log('  ✅ 2-vote threshold for approval/rejection');
    console.log('  ✅ Real-time updates via Supabase subscriptions');
    console.log('  ✅ Automatic payout calculation with multipliers');
    console.log('  ✅ Approval bonus ($0.50 × tier)');
    console.log('  ✅ Validators earn $0.02 per vote instantly\n');
    
    console.log('🎯 Next Steps:');
    console.log('  • Submit trends at /scroll');
    console.log('  • Validate trends at /validate');
    console.log('  • Track earnings at /earnings');
    console.log('  • Cash out when approved balance ≥ $10');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testValidationFlow();