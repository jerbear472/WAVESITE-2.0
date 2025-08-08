const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './web/.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testRPC() {
  try {
    // First, sign in with test credentials if needed
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('No user logged in. Attempting to sign in...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'test123'
      });
      
      if (error) {
        console.log('Could not sign in. Testing with anonymous user...');
      }
    }
    
    // Test the RPC function
    console.log('Testing check_rate_limit RPC function...');
    const { data, error } = await supabase
      .rpc('check_rate_limit', { 
        p_user_id: user?.id || '00000000-0000-0000-0000-000000000000' 
      });
    
    if (error) {
      console.error('RPC Error:', error);
      console.log('\n❌ The check_rate_limit function is not available or has an error.');
      console.log('This is likely causing the verify page error.');
      console.log('\nTo fix this, run the SQL migration:');
      console.log('1. Go to your Supabase dashboard');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Run the contents of fix-check-rate-limit.sql');
    } else {
      console.log('✅ RPC function works!');
      console.log('Result:', data);
    }
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
  
  process.exit(0);
}

testRPC();