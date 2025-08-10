const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://achuavagkhjenaypawij.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjaHVhdmFna2hqZW5heXBhd2lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1OTY0MjQsImV4cCI6MjA2ODE3MjQyNH0.L4J5SIVGZDYAFAwNuR9b_hIvcpTJWGfu0Dvry7Umg2g';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createTestUser() {
  console.log('Creating test user...');
  
  // Sign up test user
  const { data, error } = await supabase.auth.signUp({
    email: 'test@wavesight.com',
    password: 'Test123\!',
    options: {
      data: {
        username: 'testuser',
      },
    },
  });

  if (error) {
    console.error('Error creating user:', error);
    return;
  }

  if (data.user) {
    console.log('Test user created successfully\!');
    console.log('Email: test@wavesight.com');
    console.log('Password: Test123\!');
    console.log('User ID:', data.user.id);
    
    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: data.user.id,
        username: 'testuser',
        onboarding_completed: false,
        persona_completed: false,
        created_at: new Date().toISOString(),
      });
    
    if (profileError) {
      console.error('Profile error:', profileError);
    } else {
      console.log('Profile created successfully\!');
    }
  }
}

createTestUser();
