#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration - use environment variables
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testFullRegistration() {
  console.log('🔍 Testing FULL registration process...\n');
  
  const timestamp = Date.now();
  const testData = {
    email: `test${timestamp}@wavesight.com`,
    password: 'TestPassword123!',
    username: `user${timestamp}`,
    birthday: '2000-01-01'
  };
  
  console.log('📝 Test user data:');
  console.log(testData);
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Step 1: Check if tables exist
  console.log('1️⃣ Checking database tables...');
  
  try {
    // Check user_profiles
    const { error: profilesError } = await supabase
      .from('user_profiles')
      .select('count')
      .limit(1);
    
    if (profilesError) {
      console.log('   ❌ user_profiles table issue:', profilesError.message);
    } else {
      console.log('   ✅ user_profiles table exists');
    }
    
    // Check profiles view
    const { error: viewError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (viewError) {
      console.log('   ❌ profiles view issue:', viewError.message);
    } else {
      console.log('   ✅ profiles view exists');
    }
    
    // Check if helper function exists
    const { error: funcError } = await supabase
      .rpc('complete_user_registration', {
        p_user_id: '00000000-0000-0000-0000-000000000000',
        p_email: 'test@test.com',
        p_username: 'test',
        p_birthday: null
      });
    
    // We expect this to work (even if it doesn't insert due to fake UUID)
    if (funcError && funcError.message.includes('function') && funcError.message.includes('does not exist')) {
      console.log('   ❌ complete_user_registration function missing');
      console.log('      Need to run FIX_REGISTRATION.sql');
    } else {
      console.log('   ✅ complete_user_registration function exists');
    }
    
  } catch (error) {
    console.error('   ❌ Database check error:', error);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Step 2: Create auth user
  console.log('2️⃣ Creating auth user...');
  
  try {
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testData.email,
      password: testData.password,
      email_confirm: true, // Auto-confirm for testing
      user_metadata: {
        username: testData.username,
        birthday: testData.birthday
      }
    });
    
    if (authError) {
      console.log('   ❌ Auth creation failed:', authError.message);
      return;
    }
    
    console.log('   ✅ Auth user created');
    console.log('   User ID:', authData.user.id);
    console.log('   Email:', authData.user.email);
    
    const userId = authData.user.id;
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Step 3: Check if trigger created profile
    console.log('3️⃣ Checking if trigger created profile...');
    
    // Wait for trigger
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (profileError) {
      console.log('   ❌ Profile not found:', profileError.message);
      console.log('   Trigger may not be working');
      
      // Try manual creation
      console.log('\n4️⃣ Attempting manual profile creation...');
      
      const { data: manualResult, error: manualError } = await supabase
        .rpc('complete_user_registration', {
          p_user_id: userId,
          p_email: testData.email,
          p_username: testData.username,
          p_birthday: testData.birthday
        });
      
      if (manualError) {
        console.log('   ❌ Manual creation failed:', manualError.message);
        
        // Last resort - direct insert
        console.log('\n5️⃣ Attempting direct insert...');
        
        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            id: userId,
            email: testData.email,
            username: testData.username,
            birthday: testData.birthday,
            age_verified: true
          });
        
        if (insertError) {
          console.log('   ❌ Direct insert failed:', insertError.message);
          console.log('\n🚨 CRITICAL: Cannot create user profile!');
          console.log('Likely issues:');
          console.log('- Missing columns in user_profiles table');
          console.log('- RLS policies blocking insert');
          console.log('- Trigger conflict');
        } else {
          console.log('   ✅ Direct insert successful');
        }
      } else {
        console.log('   ✅ Manual creation successful');
      }
    } else {
      console.log('   ✅ Profile created by trigger');
      console.log('   Profile data:', {
        id: profile.id,
        username: profile.username,
        email: profile.email,
        birthday: profile.birthday
      });
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Step 6: Final verification
    console.log('6️⃣ Final verification...');
    
    const { data: finalProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (finalProfile) {
      console.log('   ✅ User profile exists');
      console.log('   Username:', finalProfile.username);
      console.log('   Birthday:', finalProfile.birthday);
      console.log('   Age verified:', finalProfile.age_verified);
    } else {
      console.log('   ❌ User profile missing');
    }
    
    // Check profiles view
    const { data: profileView } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (profileView) {
      console.log('   ✅ Profile accessible via view');
    } else {
      console.log('   ❌ Profile not accessible via view');
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    console.log('📊 TEST SUMMARY:');
    
    if (finalProfile && profileView) {
      console.log('✅ Registration system is working!');
    } else {
      console.log('❌ Registration system has issues');
      console.log('\nTo fix:');
      console.log('1. Run supabase/FIX_REGISTRATION.sql in SQL Editor');
      console.log('2. Check RLS policies are enabled');
      console.log('3. Verify trigger is created on auth.users');
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the test
testFullRegistration().catch(console.error);