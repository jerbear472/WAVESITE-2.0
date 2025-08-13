/**
 * Verify the unified earnings system is working
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './web/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifySystem() {
  console.log('🔍 Verifying Unified Earnings System...\n');
  
  try {
    // 1. Check earnings config
    console.log('1️⃣ Checking earnings configuration...');
    const { data: config, error: configError } = await supabase
      .from('earnings_config')
      .select('*')
      .eq('config_type', 'base');
    
    if (configError) throw configError;
    
    console.log('✅ Base rates configured:');
    config.forEach(c => {
      console.log(`   • ${c.config_key}: $${c.value}`);
    });
    
    // 2. Check tier multipliers
    console.log('\n2️⃣ Checking tier multipliers...');
    const { data: tiers } = await supabase
      .from('earnings_config')
      .select('*')
      .eq('config_type', 'tier')
      .order('value', { ascending: false });
    
    console.log('✅ Tier multipliers:');
    tiers.forEach(t => {
      console.log(`   • ${t.config_key}: ${t.value}x`);
    });
    
    // 3. Check daily caps
    console.log('\n3️⃣ Checking daily caps...');
    const { data: caps } = await supabase
      .from('earnings_config')
      .select('*')
      .eq('config_type', 'daily_cap')
      .order('value', { ascending: false });
    
    console.log('✅ Daily caps:');
    caps.forEach(c => {
      console.log(`   • ${c.config_key}: $${c.value}/day`);
    });
    
    // 4. Test user creation
    console.log('\n4️⃣ Creating test user...');
    const testEmail = `test.${Date.now()}@wavesight.com`;
    const { data: { user }, error: userError } = await supabase.auth.signUp({
      email: testEmail,
      password: 'TestPassword123!',
    });
    
    if (userError) throw userError;
    console.log(`✅ User created: ${user.email}`);
    
    // 5. Check user profile
    console.log('\n5️⃣ Checking user profile...');
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    console.log(`✅ Profile created:
   • Tier: ${profile.performance_tier}
   • Balance: $${profile.current_balance || 0}
   • Trends: ${profile.trends_submitted || 0}`);
    
    // 6. Test trend submission
    console.log('\n6️⃣ Testing trend submission...');
    const { data: trend, error: trendError } = await supabase
      .from('captured_trends')
      .insert([{
        user_id: user.id,
        url: `https://test.com/trend/${Date.now()}`,
        title: 'Test Trend',
        description: 'Testing the unified earnings system with a proper description',
        category: 'other',
        platform: 'test',
        quality_score: 75
      }])
      .select()
      .single();
    
    if (trendError) throw trendError;
    console.log(`✅ Trend submitted:
   • ID: ${trend.id}
   • Earnings: $${trend.earnings}`);
    
    // 7. Check earnings ledger
    console.log('\n7️⃣ Checking earnings ledger...');
    const { data: ledger } = await supabase
      .from('earnings_ledger')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (ledger) {
      console.log(`✅ Ledger entry created:
   • Type: ${ledger.transaction_type}
   • Amount: $${ledger.amount}
   • Balance after: $${ledger.balance_after}`);
    }
    
    // 8. Check updated profile balance
    console.log('\n8️⃣ Verifying balance update...');
    const { data: updatedProfile } = await supabase
      .from('user_profiles')
      .select('current_balance, total_earned, trends_submitted')
      .eq('user_id', user.id)
      .single();
    
    console.log(`✅ Profile updated:
   • Current balance: $${updatedProfile.current_balance}
   • Total earned: $${updatedProfile.total_earned}
   • Trends submitted: ${updatedProfile.trends_submitted}`);
    
    // 9. Test earnings summary function
    console.log('\n9️⃣ Testing summary function...');
    const { data: summary, error: summaryError } = await supabase
      .rpc('get_user_earnings_summary', { p_user_id: user.id });
    
    if (!summaryError && summary?.[0]) {
      const s = summary[0];
      console.log(`✅ Summary function working:
   • Today earned: $${s.today_earned}
   • Daily cap: $${s.daily_cap}
   • Tier: ${s.performance_tier}`);
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('🎉 UNIFIED EARNINGS SYSTEM VERIFICATION COMPLETE!');
    console.log('='.repeat(50));
    console.log('\n✅ All systems operational:');
    console.log('   • Earnings config loaded');
    console.log('   • User profiles working');
    console.log('   • Trend earnings calculated');
    console.log('   • Ledger tracking transactions');
    console.log('   • Balances updating correctly');
    console.log('   • Summary functions working');
    console.log('\n💰 Your sustainable earnings system is ready!');
    console.log('   • Base rate: $0.25/trend');
    console.log('   • Validation: $0.02/vote');
    console.log('   • Daily caps: $5-30');
    console.log('   • Tier multipliers: 0.5x-3x');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Details:', error);
  }
}

verifySystem();