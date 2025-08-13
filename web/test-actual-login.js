const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://aicahushpcslwjwrlqbo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpY2FodXNocGNzbHdqd3JscWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4ODc1NTQsImV4cCI6MjA3MDQ2MzU1NH0.rLPnouZXA1ejWG0tuurIb5sgo5CCHe15M4knaANrR2w';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLogin() {
  console.log('Testing login with testuser@wavesight.com...\n');
  
  const email = 'testuser@wavesight.com';
  const password = 'TestUser123!';
  
  // Try to login
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password
  });
  
  if (error) {
    console.error('❌ Login failed:', error.message);
    console.error('Error details:', error);
    
    // Try to get more info about the user
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    if (!userError) {
      console.log('\nChecking if user exists...');
    }
  } else {
    console.log('✅ Login successful!');
    console.log('User ID:', data.user?.id);
    console.log('Email:', data.user?.email);
    console.log('Session:', data.session ? 'Active' : 'No session');
    
    // Check profile
    if (data.user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
        
      if (profile) {
        console.log('\n✅ Profile found:');
        console.log('- Username:', profile.username);
        console.log('- Tier:', profile.spotter_tier);
        console.log('- Created:', profile.created_at);
      } else if (profileError) {
        console.error('⚠️ Profile error:', profileError.message);
      }
    }
  }
}

testLogin().catch(console.error);