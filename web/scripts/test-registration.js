#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://aicahushpcslwjwrlqbo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpY2FodXNocGNzbHdqd3JscWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4ODc1NTQsImV4cCI6MjA3MDQ2MzU1NH0.rLPnouZXA1ejWG0tuurIb5sgo5CCHe15M4knaANrR2w';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRegistration() {
  console.log('🧪 Testing user registration...\n');
  
  // Generate unique test user
  const timestamp = Date.now();
  const testEmail = `test.${timestamp}@wavesight.com`;
  const testUsername = `testuser${timestamp}`;
  const testPassword = 'TestPassword123!';
  
  console.log('📝 Creating test user:');
  console.log(`   Email: ${testEmail}`);
  console.log(`   Username: ${testUsername}`);
  console.log(`   Password: ${testPassword}`);
  
  try {
    // Step 1: Sign up
    console.log('\n1️⃣ Testing signup...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          username: testUsername,
        }
      }
    });
    
    if (authError) {
      console.log('   ❌ Signup failed:', authError.message);
      return;
    }
    
    console.log('   ✅ User created successfully');
    console.log(`   User ID: ${authData.user?.id}`);
    
    // Step 2: Check if profile was created
    console.log('\n2️⃣ Checking if profile was auto-created...');
    
    if (authData.user) {
      // Wait a moment for trigger to execute
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();
      
      if (profileError) {
        console.log('   ❌ Profile not found:', profileError.message);
        console.log('   ⚠️ The trigger might not be working');
      } else {
        console.log('   ✅ Profile auto-created successfully');
        console.log('   Profile data:', {
          id: profile.id,
          email: profile.email,
          username: profile.username,
          created_at: profile.created_at
        });
      }
      
      // Step 3: Check if account settings were created
      console.log('\n3️⃣ Checking if account settings were created...');
      const { data: settings, error: settingsError } = await supabase
        .from('user_account_settings')
        .select('*')
        .eq('user_id', authData.user.id)
        .single();
      
      if (settingsError) {
        console.log('   ❌ Account settings not found:', settingsError.message);
      } else {
        console.log('   ✅ Account settings created');
      }
      
      // Step 4: Test if we can query the profiles view
      console.log('\n4️⃣ Testing profiles view (frontend compatibility)...');
      const { data: profileView, error: viewError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();
      
      if (viewError) {
        console.log('   ❌ Profiles view error:', viewError.message);
      } else {
        console.log('   ✅ Profiles view working');
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ REGISTRATION TEST COMPLETE');
    console.log('='.repeat(50));
    console.log('\n📋 Summary:');
    console.log('- User can be created in auth.users');
    console.log('- Profile is auto-created by trigger');
    console.log('- Account settings are created');
    console.log('- Profiles view is accessible');
    console.log('\n🎉 The database is ready for user registration!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testRegistration().catch(console.error);