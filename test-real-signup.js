#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'web', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRealSignup() {
  console.log('🧪 Testing signup with realistic email...\n');
  
  // Use more realistic email format
  const timestamp = Date.now();
  const testEmail = `user${timestamp}@gmail.com`;
  const testPassword = 'Test123!@#';
  const testUsername = `wavesightuser${timestamp}`;
  
  console.log('📝 Test credentials:');
  console.log('Email:', testEmail);
  console.log('Username:', testUsername);
  console.log('Password:', testPassword);
  console.log();
  
  try {
    // Step 1: Sign up
    console.log('1️⃣ Attempting signup...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          username: testUsername,
          full_name: 'Test User'
        },
        emailRedirectTo: 'http://localhost:3000/auth/callback'
      }
    });
    
    if (authError) {
      console.error('❌ Signup failed:', authError.message);
      console.log('\nPossible issues:');
      console.log('1. Email confirmations are required - disable in Supabase dashboard');
      console.log('2. Password requirements not met');
      console.log('3. Email domain restrictions');
      return;
    }
    
    console.log('✅ User created successfully!');
    console.log('User ID:', authData.user?.id);
    console.log('Email:', authData.user?.email);
    
    if (authData.user?.confirmed_at) {
      console.log('✅ Email already confirmed');
    } else {
      console.log('⚠️  Email confirmation pending (check settings)');
    }
    
    // Step 2: Check profile
    console.log('\n2️⃣ Checking user profile...');
    
    // Wait for trigger
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();
    
    if (profileError) {
      console.error('❌ Profile not created automatically');
      console.log('Error:', profileError.message);
      console.log('\nThis means the trigger is not working.');
      console.log('Run FIX_SIGNUP_COMPLETE.sql in Supabase SQL Editor');
    } else {
      console.log('✅ Profile created successfully!');
      console.log('Username:', profile.username);
      console.log('Role:', profile.role);
      console.log('Tier:', profile.spotter_tier);
    }
    
    // Step 3: Test sign in
    console.log('\n3️⃣ Testing sign in...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    if (signInError) {
      console.error('❌ Sign in failed:', signInError.message);
      if (signInError.message.includes('Email not confirmed')) {
        console.log('\n⚠️  Email confirmation is required!');
        console.log('Go to Supabase Dashboard → Authentication → Providers → Email');
        console.log('Disable "Confirm email" for testing');
      }
    } else {
      console.log('✅ Sign in successful!');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
  
  console.log('\n📊 Summary:');
  console.log('If signup succeeded but profile wasn\'t created:');
  console.log('→ Run FIX_SIGNUP_COMPLETE.sql');
  console.log('\nIf email confirmation is blocking:');
  console.log('→ Disable it in Supabase Dashboard → Auth → Providers → Email');
}

testRealSignup().catch(console.error);