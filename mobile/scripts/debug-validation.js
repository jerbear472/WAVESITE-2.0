// Debug script to identify validation issues
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugValidation() {
  console.log('🔍 Debugging Validation System\n');

  try {
    // 1. Check if we're connected
    console.log('1️⃣ Testing Supabase connection...');
    const { data: test, error: testError } = await supabase
      .from('captured_trends')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('❌ Cannot connect to Supabase:', testError.message);
      return;
    }
    console.log('✅ Connected to Supabase\n');

    // 2. Check tables
    console.log('2️⃣ Checking database tables...');
    
    // Check captured_trends
    const { count: trendsCount, error: trendsError } = await supabase
      .from('captured_trends')
      .select('*', { count: 'exact', head: true });
    
    if (trendsError) {
      console.error('❌ captured_trends table error:', trendsError.message);
    } else {
      console.log(`✅ captured_trends table exists (${trendsCount || 0} records)`);
    }

    // Check validations
    const { count: validationsCount, error: validationsError } = await supabase
      .from('validations')
      .select('*', { count: 'exact', head: true });
    
    if (validationsError) {
      console.error('❌ validations table error:', validationsError.message);
    } else {
      console.log(`✅ validations table exists (${validationsCount || 0} records)`);
    }

    // Check users table
    const { count: usersCount, error: usersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    if (usersError) {
      console.error('❌ users table error:', usersError.message);
    } else {
      console.log(`✅ users table exists (${usersCount || 0} records)`);
    }

    // 3. Check for pending validation trends
    console.log('\n3️⃣ Checking pending validation trends...');
    const { data: pendingTrends, error: pendingError } = await supabase
      .from('captured_trends')
      .select('id, title, platform, status, validation_count')
      .eq('status', 'pending_validation')
      .limit(5);
    
    if (pendingError) {
      console.error('❌ Error fetching pending trends:', pendingError.message);
    } else if (!pendingTrends || pendingTrends.length === 0) {
      console.log('⚠️  No pending validation trends found');
      console.log('   You may need to capture some trends first or update their status');
    } else {
      console.log(`✅ Found ${pendingTrends.length} pending validation trends:`);
      pendingTrends.forEach((trend, i) => {
        console.log(`   ${i + 1}. [${trend.platform}] ${trend.title} (${trend.validation_count} votes)`);
      });
    }

    // 4. Check all trends regardless of status
    console.log('\n4️⃣ Checking all trends in database...');
    const { data: allTrends, error: allError } = await supabase
      .from('captured_trends')
      .select('id, title, platform, status, validation_count')
      .limit(10);
    
    if (allError) {
      console.error('❌ Error fetching all trends:', allError.message);
    } else if (!allTrends || allTrends.length === 0) {
      console.log('⚠️  No trends found in database');
      console.log('   You need to capture some trends first');
    } else {
      console.log(`✅ Found ${allTrends.length} total trends:`);
      allTrends.forEach((trend, i) => {
        console.log(`   ${i + 1}. [${trend.platform}] ${trend.title} - Status: ${trend.status || 'null'}`);
      });
    }

    // 5. Test authentication
    console.log('\n5️⃣ Testing authentication...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('⚠️  No authenticated user');
      console.log('   Make sure you are logged in to the app');
    } else {
      console.log(`✅ Authenticated as: ${user.email} (${user.id})`);
      
      // Check if user has profile
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileError) {
        console.log('⚠️  User profile not found in users table');
        console.log('   This might be why validation is not working');
      } else {
        console.log('✅ User profile found:', {
          username: profile.username,
          points: profile.points,
          validations_count: profile.validations_count
        });
      }
    }

    // 6. Test RLS policies
    console.log('\n6️⃣ Testing RLS policies...');
    
    // Try to select from captured_trends (should work with the policy)
    const { data: rlsTest, error: rlsError } = await supabase
      .from('captured_trends')
      .select('id')
      .limit(1);
    
    if (rlsError) {
      console.error('❌ RLS policy error for captured_trends:', rlsError.message);
      console.log('   Check that RLS policies allow viewing all trends');
    } else {
      console.log('✅ RLS policies allow reading captured_trends');
    }

    // 7. Provide recommendations
    console.log('\n📋 Recommendations:');
    
    if (!pendingTrends || pendingTrends.length === 0) {
      console.log('1. Update existing trends to have status = "pending_validation":');
      console.log(`   UPDATE captured_trends SET status = 'pending_validation' WHERE status IS NULL;`);
    }
    
    if (!user) {
      console.log('2. Make sure you are logged in to the app');
    }
    
    console.log('3. Check the app console for any error messages');
    console.log('4. Make sure you have run the validation_schema.sql in Supabase');

  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

// Run debug
debugValidation();