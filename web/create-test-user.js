const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://aicahushpcslwjwrlqbo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpY2FodXNocGNzbHdqd3JscWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4ODc1NTQsImV4cCI6MjA3MDQ2MzU1NH0.rLPnouZXA1ejWG0tuurIb5sgo5CCHe15M4knaANrR2w';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestUser() {
  const email = 'testuser@wavesight.com';
  const password = 'TestUser123!';
  const username = 'testuser';
  
  console.log('Creating test user...');
  console.log('Email:', email);
  console.log('Password:', password);
  console.log('Username:', username);
  console.log('');
  
  // Sign up the user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: username,
      },
      emailRedirectTo: 'http://localhost:3000/auth/callback'
    }
  });
  
  if (authError) {
    console.error('❌ Signup failed:', authError.message);
    
    // If user already exists, try to login
    if (authError.message.includes('already registered')) {
      console.log('\n📝 User already exists, trying to login...');
      
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (loginError) {
        console.error('❌ Login also failed:', loginError.message);
      } else {
        console.log('✅ Login successful!');
        console.log('User ID:', loginData.user?.id);
      }
    }
    return;
  }
  
  if (authData.user) {
    console.log('✅ User created successfully!');
    console.log('User ID:', authData.user.id);
    console.log('Email confirmation required:', !authData.user.email_confirmed_at);
    
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
    
    console.log('\n📧 Check email for confirmation link if required');
    console.log('Or you can login directly if email confirmation is disabled');
  }
}

createTestUser().catch(console.error);