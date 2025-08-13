const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://aicahushpcslwjwrlqbo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpY2FodXNocGNzbHdqd3JscWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4ODc1NTQsImV4cCI6MjA3MDQ2MzU1NH0.rLPnouZXA1ejWG0tuurIb5sgo5CCHe15M4knaANrR2w';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLogin() {
  console.log('Testing Supabase connection and login...\n');
  
  // Test connection
  const { data: testData, error: testError } = await supabase
    .from('profiles')
    .select('count')
    .limit(1);
    
  if (testError) {
    console.error('❌ Supabase connection failed:', testError.message);
    return;
  }
  
  console.log('✅ Supabase connection successful\n');
  
  // Test login with a test account
  const testEmail = 'test@example.com';
  const testPassword = 'test123456';
  
  console.log(`Attempting login with: ${testEmail}`);
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword
  });
  
  if (error) {
    console.error('❌ Login failed:', error.message);
    
    // Check if it's because user doesn't exist
    if (error.message.includes('Invalid login credentials')) {
      console.log('\n📝 User might not exist. Try creating a test user first.');
    }
  } else {
    console.log('✅ Login successful!');
    console.log('User ID:', data.user?.id);
    console.log('Email:', data.user?.email);
  }
  
  // Check if profiles table exists and has data
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, username')
    .limit(5);
    
  if (!profileError && profiles) {
    console.log(`\n📊 Found ${profiles.length} profiles in database`);
    if (profiles.length > 0) {
      console.log('Sample profiles:', profiles.map(p => p.email).join(', '));
    }
  }
}

testLogin().catch(console.error);