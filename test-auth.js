#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, 'web', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRegistration() {
  console.log('🧪 Testing registration flow...\n');

  const testEmail = `test${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  const testUsername = `testuser${Date.now()}`;

  console.log('Attempting to register:');
  console.log('Email:', testEmail);
  console.log('Username:', testUsername);
  console.log('Password: [hidden]\n');

  try {
    // Test registration
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          username: testUsername,
        }
      }
    });

    if (error) {
      console.error('❌ Registration error:', error.message);
      console.log('\nPossible issues:');
      console.log('1. Email confirmation might be required');
      console.log('2. Password requirements not met');
      console.log('3. Supabase auth settings need adjustment');
      console.log('\nTo disable email confirmation:');
      console.log('1. Go to https://supabase.com/dashboard/project/achuavagkhjenaypawij/auth/providers');
      console.log('2. Under "Email" provider, disable "Confirm email"');
      return;
    }

    console.log('✅ Registration successful!');
    
    if (data.user && !data.session) {
      console.log('⚠️  Email confirmation is required');
      console.log('Check your email or disable email confirmation in Supabase dashboard');
    } else if (data.session) {
      console.log('✅ Session created - user is logged in');
      console.log('User ID:', data.user.id);
      
      // Try to create user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: data.user.id,
          email: testEmail,
          username: testUsername,
          role: 'participant',
          total_earnings: 0,
          pending_earnings: 0,
          trends_spotted: 0,
          accuracy_score: 0,
          validation_score: 0
        });

      if (profileError) {
        if (profileError.code === '23505') {
          console.log('ℹ️  User profile already exists (this is fine)');
        } else {
          console.error('⚠️  Profile creation error:', profileError.message);
        }
      } else {
        console.log('✅ User profile created');
      }

      // Clean up - sign out
      await supabase.auth.signOut();
      console.log('✅ Signed out test user');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

async function checkAuthSettings() {
  console.log('\n🔍 Checking current auth configuration...\n');
  
  console.log('Supabase URL:', supabaseUrl);
  console.log('Anon Key:', supabaseKey.substring(0, 20) + '...');
  
  // Try to get session
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (session) {
    console.log('✅ Active session found');
  } else {
    console.log('ℹ️  No active session');
  }
}

async function main() {
  await checkAuthSettings();
  await testRegistration();
  
  console.log('\n✅ Test complete!');
  console.log('\nIf registration is failing, check:');
  console.log('1. Supabase dashboard for auth settings');
  console.log('2. Browser console for detailed errors');
  console.log('3. Network tab for API responses');
}

main().catch(console.error);