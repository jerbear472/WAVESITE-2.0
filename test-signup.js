#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'web', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSignup() {
  console.log('🧪 Testing signup process...\n');
  
  const testEmail = `test${Date.now()}@example.com`;
  const testPassword = 'Test123!';
  const testUsername = `testuser${Date.now()}`;
  
  console.log('📝 Test credentials:');
  console.log('Email:', testEmail);
  console.log('Username:', testUsername);
  console.log('Password:', testPassword);
  console.log();
  
  try {
    // Step 1: Try to sign up
    console.log('1️⃣ Attempting signup...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          username: testUsername
        }
      }
    });
    
    if (authError) {
      console.error('❌ Auth error:', authError);
      return;
    }
    
    console.log('✅ Auth user created:', authData.user?.id);
    console.log();
    
    // Step 2: Check if profile was created
    console.log('2️⃣ Checking if profile was created...');
    
    // Wait a moment for trigger to execute
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();
    
    if (profileError) {
      console.error('❌ Profile not found:', profileError);
      console.log('\n🔍 Debugging: Checking if trigger exists...');
      
      // Check if trigger exists
      const { data: triggers, error: triggerError } = await supabase.rpc('get_triggers', {
        table_name: 'users'
      }).catch(() => ({ data: null, error: 'Function not found' }));
      
      if (triggerError) {
        console.log('⚠️  Cannot check triggers directly');
      } else {
        console.log('Triggers:', triggers);
      }
      
      console.log('\n🔧 Attempting manual profile creation...');
      
      // Try to manually create profile
      const { data: manualProfile, error: manualError } = await supabase
        .from('user_profiles')
        .insert({
          id: authData.user.id,
          email: testEmail,
          username: testUsername,
          role: 'participant',
          spotter_tier: 'learning',
          earnings_pending: 0,
          earnings_approved: 0,
          earnings_paid: 0,
          total_earnings: 0,
          trends_spotted: 0,
          accuracy_score: 0,
          validation_score: 0,
          current_streak: 0,
          demographics: {},
          interests: {},
          is_active: true
        })
        .select()
        .single();
      
      if (manualError) {
        console.error('❌ Manual creation failed:', manualError);
        console.log('\n🔍 Possible issues:');
        console.log('1. RLS policies blocking insert');
        console.log('2. Missing columns in table');
        console.log('3. Constraint violations');
      } else {
        console.log('✅ Manual profile created:', manualProfile);
      }
    } else {
      console.log('✅ Profile found:', profile);
    }
    
    // Step 3: Check profiles view
    console.log('\n3️⃣ Checking profiles view...');
    const { data: profileView, error: viewError } = await supabase
      .from('profiles')
      .select('id, username, email')
      .eq('id', authData.user.id)
      .single();
    
    if (viewError) {
      console.error('❌ View error:', viewError);
    } else {
      console.log('✅ Profile in view:', profileView);
    }
    
    // Clean up - delete test user
    console.log('\n🧹 Cleaning up test user...');
    await supabase.auth.admin.deleteUser(authData.user.id).catch(() => {});
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
  
  console.log('\n📊 Summary:');
  console.log('If profile creation failed, run FIX_SIGNUP_COMPLETE.sql in Supabase');
}

testSignup().catch(console.error);