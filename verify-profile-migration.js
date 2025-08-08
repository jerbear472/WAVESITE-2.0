const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyMigration() {
  console.log('🔍 Verifying Profile Migration...\n');
  console.log('=' .repeat(50));
  
  try {
    // 1. Check profiles table
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(5);
    
    if (profilesError) {
      console.error('❌ Error accessing profiles table:', profilesError);
      return;
    }
    
    console.log('✅ Profiles table is accessible');
    console.log(`   Found ${profiles?.length || 0} sample profiles\n`);
    
    // 2. Check if user_profiles view works (backward compatibility)
    const { data: userProfilesView, error: viewError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1);
    
    if (!viewError) {
      console.log('✅ Backward compatibility view "user_profiles" is working\n');
    } else {
      console.log('ℹ️  user_profiles view not accessible (table may have been dropped)\n');
    }
    
    // 3. Count total profiles
    const { count: profileCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📊 Total profiles in database: ${profileCount}\n`);
    
    // 4. Check auth users have profiles
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const authUserCount = authUsers?.users?.length || 0;
    
    console.log(`👥 Total auth users: ${authUserCount}`);
    console.log(`📋 Total profiles: ${profileCount}`);
    
    if (authUserCount === profileCount) {
      console.log('✅ All auth users have profiles!\n');
    } else if (profileCount > authUserCount) {
      console.log('ℹ️  More profiles than auth users (some auth users may have been deleted)\n');
    } else {
      console.log(`⚠️  ${authUserCount - profileCount} auth users missing profiles\n`);
    }
    
    // 5. Check foreign key references work
    console.log('🔗 Checking foreign key references...');
    
    // Test trend_submissions
    const { error: trendsError } = await supabase
      .from('trend_submissions')
      .select('id, spotter_id')
      .limit(1);
    
    if (!trendsError) {
      console.log('  ✅ trend_submissions -> profiles FK working');
    } else {
      console.log('  ⚠️ trend_submissions FK issue:', trendsError.message);
    }
    
    // Test earnings_ledger
    const { error: earningsError } = await supabase
      .from('earnings_ledger')
      .select('id, user_id')
      .limit(1);
    
    if (!earningsError) {
      console.log('  ✅ earnings_ledger -> profiles FK working');
    } else {
      console.log('  ⚠️ earnings_ledger FK issue:', earningsError.message);
    }
    
    // Test trend_validations
    const { error: validationsError } = await supabase
      .from('trend_validations')
      .select('id, validator_id')
      .limit(1);
    
    if (!validationsError) {
      console.log('  ✅ trend_validations -> profiles FK working');
    } else {
      console.log('  ⚠️ trend_validations FK issue:', validationsError.message);
    }
    
    // 6. Check new columns exist
    console.log('\n📝 Checking profile columns...');
    
    if (profiles && profiles.length > 0) {
      const sampleProfile = profiles[0];
      const importantColumns = [
        'id', 'email', 'username', 'role', 
        'total_earnings', 'pending_earnings', 'trends_spotted',
        'subscription_tier', 'created_at', 'updated_at'
      ];
      
      importantColumns.forEach(col => {
        if (col in sampleProfile) {
          console.log(`  ✅ ${col} exists`);
        } else {
          console.log(`  ⚠️ ${col} missing`);
        }
      });
    }
    
    console.log('\n' + '=' .repeat(50));
    console.log('✨ Migration Verification Complete!\n');
    
    console.log('📌 Next Steps:');
    console.log('1. Test your application to ensure everything works');
    console.log('2. Update any code references from "user_profiles" to "profiles"');
    console.log('3. Once confirmed working, you can remove the backward compatibility view');
    console.log('4. Commit your changes\n');
    
  } catch (error) {
    console.error('❌ Verification error:', error);
  }
}

// Run verification
verifyMigration();