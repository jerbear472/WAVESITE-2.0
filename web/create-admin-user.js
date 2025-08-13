const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://aicahushpcslwjwrlqbo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpY2FodXNocGNzbHdqd3JscWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4ODc1NTQsImV4cCI6MjA3MDQ2MzU1NH0.rLPnouZXA1ejWG0tuurIb5sgo5CCHe15M4knaANrR2w';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAdminUser() {
  const email = 'admin@wavesight.com';
  const password = 'Admin123!';
  const username = 'admin';
  
  console.log('Creating admin user...');
  console.log('Email:', email);
  console.log('Password:', password);
  console.log('');
  
  // First check if user exists
  const { data: existingAuth } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (existingAuth?.user) {
    console.log('✅ Admin user already exists and can login!');
    return;
  }
  
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
    
    if (authError.message.includes('already registered')) {
      console.log('User exists but password might be different');
    }
    return;
  }
  
  if (authData.user) {
    console.log('✅ Admin user created successfully!');
    console.log('User ID:', authData.user.id);
    
    // Create profile with admin privileges
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: email,
        username: username,
        is_admin: true,  // Set as admin
        spotter_tier: 'gold',  // Give highest tier
        total_earnings: 1000,  // Give some earnings for testing
        pending_earnings: 50
      });
      
    if (profileError) {
      console.error('⚠️ Profile creation error:', profileError.message);
      // Try to update if already exists
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          is_admin: true,
          spotter_tier: 'gold'
        })
        .eq('id', authData.user.id);
        
      if (!updateError) {
        console.log('✅ Profile updated to admin!');
      }
    } else {
      console.log('✅ Admin profile created!');
    }
    
    // Test login
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (!loginError) {
      console.log('✅ Admin login successful!');
      console.log('\n🎉 Admin account ready:');
      console.log('Email:', email);
      console.log('Password:', password);
    }
  }
}

createAdminUser().catch(console.error);