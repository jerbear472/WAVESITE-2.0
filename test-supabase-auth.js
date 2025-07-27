const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './web/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Anon Key exists:', !!supabaseAnonKey);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAuth() {
  // Test if we can reach Supabase
  console.log('\n1. Testing Supabase connection...');
  const { data: health, error: healthError } = await supabase.from('user_profiles').select('count').limit(1);
  
  if (healthError) {
    console.error('Connection error:', healthError);
  } else {
    console.log('✓ Successfully connected to Supabase');
  }

  // List auth methods
  console.log('\n2. Checking auth configuration...');
  const { data: { session } } = await supabase.auth.getSession();
  console.log('Current session:', session ? 'Active' : 'None');

  // Try to sign in with a test account
  console.log('\n3. Testing sign in...');
  console.log('Please provide your email and password to test:');
  console.log('(This is just for debugging - credentials are not stored)');
  
  // For testing, you can hardcode your credentials here temporarily
  // const email = 'your-email@example.com';
  // const password = 'your-password';
  
  // Uncomment and replace with your credentials to test:
  /*
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password,
  });

  if (error) {
    console.error('Sign in error:', error);
  } else {
    console.log('✓ Sign in successful!');
    console.log('User ID:', data.user?.id);
    console.log('Email:', data.user?.email);
  }
  */
}

testAuth().catch(console.error);