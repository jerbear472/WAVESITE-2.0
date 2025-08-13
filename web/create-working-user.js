const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://aicahushpcslwjwrlqbo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpY2FodXNocGNzbHdqd3JscWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4ODc1NTQsImV4cCI6MjA3MDQ2MzU1NH0.rLPnouZXA1ejWG0tuurIb5sgo5CCHe15M4knaANrR2w';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAndTestUser() {
  // Generate unique email with timestamp
  const timestamp = Date.now();
  const email = `demo${timestamp}@wavesight.com`;
  const password = 'Demo123456!';
  const username = `demo${timestamp}`;
  
  console.log('Creating new user (email confirmation should be disabled)...');
  console.log('Email:', email);
  console.log('Password:', password);
  console.log('');
  
  // Sign up the user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: username,
      }
    }
  });
  
  if (authError) {
    console.error('❌ Signup failed:', authError.message);
    return;
  }
  
  if (authData.user) {
    console.log('✅ User created successfully!');
    console.log('User ID:', authData.user.id);
    console.log('Email confirmed?:', authData.user.email_confirmed_at ? 'Yes' : 'No');
    
    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: email,
        username: username,
        spotter_tier: 'learning',
        total_earnings: 0,
        pending_earnings: 0
      });
      
    if (profileError) {
      console.error('⚠️ Profile creation error:', profileError.message);
    } else {
      console.log('✅ Profile created successfully!');
    }
    
    // Now try to login immediately
    console.log('\n🔑 Testing immediate login...');
    
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (loginError) {
      console.error('❌ Login failed:', loginError.message);
      console.log('\n⚠️ Email confirmation may still be required for this user.');
      console.log('Try logging in with these credentials on the website.');
    } else {
      console.log('✅ Login successful!');
      console.log('Session active:', !!loginData.session);
      console.log('\n🎉 You can now login with:');
      console.log('Email:', email);
      console.log('Password:', password);
    }
  }
}

createAndTestUser().catch(console.error);