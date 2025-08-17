const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function recalculateUserTotals() {
  console.log('🔄 Recalculating user earnings totals...\n');
  
  try {
    // Get all unique users from earnings_ledger
    const { data: userIds, error: userError } = await supabase
      .from('earnings_ledger')
      .select('user_id')
      .not('user_id', 'is', null);
    
    if (userError) {
      console.error('Error fetching users:', userError);
      return;
    }
    
    // Get unique user IDs
    const uniqueUserIds = [...new Set(userIds.map(u => u.user_id))];
    console.log(`Found ${uniqueUserIds.length} users with earnings\n`);
    
    for (const userId of uniqueUserIds) {
      // Get all earnings for this user
      const { data: userEarnings, error: earningsError } = await supabase
        .from('earnings_ledger')
        .select('amount, status')
        .eq('user_id', userId);
      
      if (earningsError) {
        console.error(`Error fetching earnings for user ${userId}:`, earningsError);
        continue;
      }
      
      // Calculate totals
      const pending = userEarnings
        .filter(e => e.status === 'pending')
        .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
      
      const approved = userEarnings
        .filter(e => e.status === 'approved')
        .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
      
      const paid = userEarnings
        .filter(e => e.status === 'paid')
        .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
      
      const total = pending + approved + paid;
      
      console.log(`User ${userId.substring(0, 8)}...`);
      console.log(`  Pending: $${pending.toFixed(2)}`);
      console.log(`  Approved: $${approved.toFixed(2)}`);
      console.log(`  Paid: $${paid.toFixed(2)}`);
      console.log(`  Total: $${total.toFixed(2)}`);
      
      // Update user_profiles (using 'id' column not 'user_id')
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          earnings_pending: pending,
          earnings_approved: approved,
          earnings_paid: paid,
          total_earnings: total
        })
        .eq('id', userId);
      
      if (updateError) {
        console.error(`  ❌ Error updating profile:`, updateError.message);
      } else {
        console.log(`  ✅ Profile updated successfully\n`);
      }
    }
    
    // Verify the update
    console.log('\n📊 Verification:');
    const { data: profiles, error: verifyError } = await supabase
      .from('user_profiles')
      .select('email, earnings_pending, earnings_approved, total_earnings')
      .gt('total_earnings', 0)
      .limit(3);
    
    if (!verifyError && profiles) {
      console.log('\nUsers with earnings:');
      profiles.forEach(p => {
        console.log(`- ${p.email || 'Unknown'}: Pending: $${p.earnings_pending}, Approved: $${p.earnings_approved}, Total: $${p.total_earnings}`);
      });
    }
    
    console.log('\n✅ User totals recalculation complete!');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

recalculateUserTotals();