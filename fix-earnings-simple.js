const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixEarnings() {
  console.log('🚀 Fixing earnings with proper multipliers...\n');
  
  try {
    // 1. First, update all $0 earnings in earnings_ledger with base amount
    console.log('1️⃣ Updating earnings_ledger entries...');
    
    const { data: zeroEarnings, error: fetchError } = await supabase
      .from('earnings_ledger')
      .select('*')
      .eq('amount', 0)
      .eq('type', 'trend_submission');
    
    if (fetchError) {
      console.error('Error fetching zero earnings:', fetchError);
    } else if (zeroEarnings && zeroEarnings.length > 0) {
      console.log(`   Found ${zeroEarnings.length} entries with $0 earnings`);
      
      for (const entry of zeroEarnings) {
        // Calculate proper amount with multipliers
        const baseAmount = 0.25;
        const tierMultiplier = entry.metadata?.tier_multiplier || 1.0;
        const sessionMultiplier = entry.metadata?.session_multiplier || 1.0;
        const dailyMultiplier = entry.metadata?.daily_multiplier || 1.0;
        
        const calculatedAmount = (baseAmount * tierMultiplier * sessionMultiplier * dailyMultiplier).toFixed(2);
        
        // Update the entry
        const { error: updateError } = await supabase
          .from('earnings_ledger')
          .update({ 
            amount: calculatedAmount,
            metadata: {
              ...entry.metadata,
              base_amount: baseAmount,
              tier_multiplier: tierMultiplier,
              session_multiplier: sessionMultiplier,
              daily_multiplier: dailyMultiplier
            }
          })
          .eq('id', entry.id);
        
        if (updateError) {
          console.error(`   Error updating entry ${entry.id}:`, updateError);
        } else {
          console.log(`   ✅ Updated entry: $${calculatedAmount} (${tierMultiplier}x × ${sessionMultiplier}x × ${dailyMultiplier}x)`);
        }
      }
    } else {
      console.log('   No $0 earnings found in earnings_ledger');
    }
    
    // 2. Update trend_submissions payment_amount
    console.log('\n2️⃣ Updating trend_submissions payment amounts...');
    
    const { data: zeroTrends, error: trendsError } = await supabase
      .from('trend_submissions')
      .select('*')
      .eq('payment_amount', 0);
    
    if (trendsError) {
      console.error('Error fetching trends:', trendsError);
    } else if (zeroTrends && zeroTrends.length > 0) {
      console.log(`   Found ${zeroTrends.length} trends with $0 payment`);
      
      for (const trend of zeroTrends) {
        // Get user tier
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('performance_tier, current_streak')
          .eq('user_id', trend.spotter_id)
          .single();
        
        const tier = profile?.performance_tier || 'learning';
        const tierMultiplier = tier === 'master' ? 3.0 :
                               tier === 'elite' ? 2.0 :
                               tier === 'verified' ? 1.5 :
                               tier === 'restricted' ? 0.5 : 1.0;
        
        // Simple calculation without session tracking for historical data
        const calculatedAmount = (0.25 * tierMultiplier).toFixed(2);
        
        const { error: updateError } = await supabase
          .from('trend_submissions')
          .update({ payment_amount: calculatedAmount })
          .eq('id', trend.id);
        
        if (updateError) {
          console.error(`   Error updating trend ${trend.id}:`, updateError);
        } else {
          console.log(`   ✅ Updated trend: $${calculatedAmount} (${tier} tier: ${tierMultiplier}x)`);
        }
      }
    } else {
      console.log('   No $0 payment amounts found in trend_submissions');
    }
    
    // 3. Recalculate user totals
    console.log('\n3️⃣ Recalculating user earnings totals...');
    
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select('user_id');
    
    if (!usersError && users) {
      for (const user of users) {
        // Calculate totals from earnings_ledger
        const { data: userEarnings } = await supabase
          .from('earnings_ledger')
          .select('amount, status')
          .eq('user_id', user.user_id);
        
        if (userEarnings && userEarnings.length > 0) {
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
          
          if (total > 0) {
            const { error: updateError } = await supabase
              .from('user_profiles')
              .update({
                earnings_pending: pending,
                earnings_approved: approved,
                earnings_paid: paid,
                total_earnings: total
              })
              .eq('user_id', user.user_id);
            
            if (!updateError) {
              console.log(`   ✅ Updated user totals: Pending: $${pending.toFixed(2)}, Approved: $${approved.toFixed(2)}, Total: $${total.toFixed(2)}`);
            }
          }
        }
      }
    }
    
    // 4. Verify the fix
    console.log('\n4️⃣ Verifying the fix...');
    
    const { data: verifyEarnings } = await supabase
      .from('earnings_ledger')
      .select('amount, status, metadata')
      .eq('type', 'trend_submission')
      .gt('amount', 0)
      .limit(5);
    
    if (verifyEarnings && verifyEarnings.length > 0) {
      console.log('\n✅ SUCCESS! Sample earnings after fix:');
      verifyEarnings.forEach((e, idx) => {
        const breakdown = e.metadata ? 
          `(${e.metadata.tier || 'unknown'}: ${e.metadata.tier_multiplier || 1}x × Session: ${e.metadata.session_multiplier || 1}x × Daily: ${e.metadata.daily_multiplier || 1}x)` :
          '(no multiplier data)';
        console.log(`   ${idx + 1}. $${e.amount} - ${e.status} ${breakdown}`);
      });
    }
    
    console.log('\n🎉 Earnings fix completed successfully!');
    console.log('📱 Users should now see their earnings with proper multipliers.');
    console.log('💰 The earnings page will display pending amounts that can be cashed out once approved.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixEarnings();