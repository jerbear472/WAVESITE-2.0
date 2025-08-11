const { createClient } = require('@supabase/supabase-js');

// Test Supabase signup with detailed error checking
const SUPABASE_URL = 'https://aicahushpcslwjwrlqbo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpY2FodXNocGNzbHdqd3JscWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4ODc1NTQsImV4cCI6MjA3MDQ2MzU1NH0.rLPnouZXA1ejWG0tuurIb5sgo5CCHe15M4knaANrR2w';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testSignup() {
  const timestamp = Date.now();
  const testUser = {
    email: `test${timestamp}@example.com`,
    password: 'TestPassword123!',
    username: `testuser${timestamp}`,
    birthday: '2000-01-01'
  };
  
  console.log('Testing signup with user:', testUser.email);
  console.log('-----------------------------------\n');
  
  try {
    // Step 1: Test auth signup
    console.log('1. Testing auth.signUp...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testUser.email,
      password: testUser.password,
      options: {
        data: {
          username: testUser.username,
          birthday: testUser.birthday,
        }
      }
    });
    
    if (authError) {
      console.error('❌ Auth signup failed:', authError);
      return;
    }
    
    console.log('✅ Auth signup successful');
    console.log('User ID:', authData.user?.id);
    console.log('Email confirmed:', authData.user?.email_confirmed_at ? 'Yes' : 'No');
    console.log('Session created:', authData.session ? 'Yes' : 'No');
    
    if (!authData.user) {
      console.error('❌ No user returned from signup');
      return;
    }
    
    const userId = authData.user.id;
    
    // Step 2: Check if profile was created automatically
    console.log('\n2. Checking if profile was created...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for trigger
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (profileError) {
      console.log('❌ Profile not found in profiles table:', profileError.message);
    } else {
      console.log('✅ Profile found in profiles table');
    }
    
    // Step 3: Check user_profiles table
    console.log('\n3. Checking user_profiles table...');
    const { data: userProfile, error: userProfileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (userProfileError) {
      console.log('❌ Profile not found in user_profiles table:', userProfileError.message);
      
      // Try to create it manually
      console.log('\n4. Attempting to create profile manually...');
      const { data: createdProfile, error: createError } = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          email: testUser.email,
          username: testUser.username,
          birthday: testUser.birthday,
          age_verified: true
        })
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Failed to create profile:', createError);
      } else {
        console.log('✅ Profile created successfully:', createdProfile);
      }
    } else {
      console.log('✅ Profile found in user_profiles table');
    }
    
    // Step 4: Test RPC function
    console.log('\n4. Testing complete_user_registration RPC...');
    const { data: rpcResult, error: rpcError } = await supabase
      .rpc('complete_user_registration', {
        p_user_id: userId,
        p_email: testUser.email,
        p_username: testUser.username,
        p_birthday: testUser.birthday
      });
    
    if (rpcError) {
      console.log('❌ RPC function failed:', rpcError.message);
      console.log('This might be normal if the function doesn\'t exist');
    } else {
      console.log('✅ RPC function succeeded:', rpcResult);
    }
    
    // Cleanup
    console.log('\n5. Cleaning up test user...');
    // Note: We can't delete auth users without admin access
    console.log('⚠️ Test user created but cannot be deleted without admin access');
    console.log('Test user email:', testUser.email);
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testSignup();