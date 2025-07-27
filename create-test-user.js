#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, 'web', '.env.local') });

// You'll need the service role key for this - get it from Supabase dashboard
// Go to: Settings > API > service_role (secret)
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY_HERE';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabase = createClient(supabaseUrl, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTestUser() {
  const email = 'test@wavesight.com';
  const password = 'TestUser123!';
  const username = 'testuser';

  console.log('Creating test user...');
  console.log('Email:', email);
  console.log('Password:', password);
  console.log('Username:', username);

  try {
    // Create user in auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        username: username
      }
    });

    if (authError) {
      console.error('❌ Error creating auth user:', authError.message);
      return;
    }

    console.log('✅ Auth user created:', authUser.user.id);

    // Create profile in user_profiles
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: authUser.user.id,
        email: email,
        username: username,
        role: 'participant',
        total_earnings: 0,
        pending_earnings: 0,
        trends_spotted: 0,
        accuracy_score: 0,
        validation_score: 0
      })
      .select()
      .single();

    if (profileError) {
      if (profileError.code === '23505') {
        console.log('ℹ️  User profile already exists');
      } else {
        console.error('❌ Error creating profile:', profileError.message);
      }
    } else {
      console.log('✅ User profile created');
    }

    console.log('\n✅ Test user created successfully!');
    console.log('\nYou can now login with:');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('\nGo to: http://localhost:3000/login');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Check if we have service role key
if (SUPABASE_SERVICE_ROLE_KEY === 'YOUR_SERVICE_ROLE_KEY_HERE') {
  console.log('⚠️  You need to add your Supabase service role key!');
  console.log('\n1. Go to: https://supabase.com/dashboard/project/achuavagkhjenaypawij/settings/api');
  console.log('2. Copy the "service_role" key (keep it secret!)');
  console.log('3. Replace YOUR_SERVICE_ROLE_KEY_HERE in this script');
  console.log('\nAlternatively, add it to your .env.local file as:');
  console.log('SUPABASE_SERVICE_ROLE_KEY=your_key_here');
} else {
  createTestUser();
}