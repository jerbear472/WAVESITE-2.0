const { createClient } = require('@supabase/supabase-js');

// Load environment variables
const SUPABASE_URL = 'https://aicahushpcslwjwrlqbo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpY2FodXNocGNzbHdqd3JscWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4ODc1NTQsImV4cCI6MjA3MDQ2MzU1NH0.rLPnouZXA1ejWG0tuurIb5sgo5CCHe15M4knaANrR2w';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testLogin() {
  console.log('Testing Supabase connection and login...\n');
  
  // Test 1: Check Supabase connection
  console.log('1. Testing Supabase connection...');
  try {
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    if (error) {
      console.log('   ❌ Connection failed:', error.message);
    } else {
      console.log('   ✅ Successfully connected to Supabase');
    }
  } catch (err) {
    console.log('   ❌ Connection error:', err.message);
  }
  
  // Test 2: Try to login with working credentials
  console.log('\n2. Testing login with demo account...');
  const testEmail = 'demo1755123016943@wavesight.com';
  const testPassword = 'Demo123456!';
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
    
    if (error) {
      console.log('   ❌ Login failed:', error.message);
      console.log('   Error code:', error.code);
      console.log('   Full error:', JSON.stringify(error, null, 2));
    } else if (data.user) {
      console.log('   ✅ Login successful!');
      console.log('   User ID:', data.user.id);
      console.log('   Email:', data.user.email);
      console.log('   Email confirmed:', data.user.email_confirmed_at ? 'Yes' : 'No');
      
      // Check profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
        
      if (profile) {
        console.log('   ✅ Profile found:', profile.username);
      } else if (profileError) {
        console.log('   ❌ Profile error:', profileError.message);
      }
      
      // Sign out
      await supabase.auth.signOut();
    }
  } catch (err) {
    console.log('   ❌ Unexpected error:', err.message);
  }
  
  // Test 3: Try admin account
  console.log('\n3. Testing login with admin account...');
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'admin@wavesight.com',
      password: 'Admin123!',
    });
    
    if (error) {
      console.log('   ❌ Admin login failed:', error.message);
    } else if (data.user) {
      console.log('   ✅ Admin login successful!');
      console.log('   User ID:', data.user.id);
      
      // Sign out
      await supabase.auth.signOut();
    }
  } catch (err) {
    console.log('   ❌ Unexpected error:', err.message);
  }
  
  console.log('\n4. Checking auth configuration...');
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      console.log('   Current user session exists:', user.email);
    } else {
      console.log('   No current user session');
    }
  } catch (err) {
    console.log('   Error checking session:', err.message);
  }
  
  console.log('\n✅ Test complete!');
  console.log('\nIf login is failing, common issues are:');
  console.log('1. Email confirmation required but not completed');
  console.log('2. Incorrect password or email');
  console.log('3. User account doesn\'t exist in database');
  console.log('4. Supabase project is paused or rate limited');
}

testLogin().catch(console.error);