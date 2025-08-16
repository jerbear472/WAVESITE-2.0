const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ndggcrjzbrxecpzxidem.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kZ2djcmp6YnJ4ZWNwenhpZGVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE0NTQyNzQsImV4cCI6MjA0NzAzMDI3NH0.zJnJ3NxYOQ5k9gqH4JLHlEBLrivt00pG5Fc0eAjbG94';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testEarningsFunction() {
  console.log('Testing earnings RPC functions...\n');
  
  // First, check if the function exists
  const { data: functions, error: funcError } = await supabase
    .rpc('pg_proc', {}, { count: 'exact' })
    .select('proname')
    .ilike('proname', '%earning%');
    
  if (funcError) {
    console.log('Could not list functions (this is normal):', funcError.message);
  } else {
    console.log('Functions with "earning" in name:', functions);
  }
  
  // Try to call add_pending_earnings
  console.log('\nTrying to call add_pending_earnings...');
  const testUserId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'; // Dummy UUID
  
  const { data, error } = await supabase.rpc('add_pending_earnings', {
    p_user_id: testUserId,
    p_amount: 0.25,
    p_description: 'Test earning'
  });
  
  if (error) {
    console.error('❌ Function call failed:', error.message);
    console.error('Error code:', error.code);
    console.error('Full error:', error);
    
    if (error.code === '42883') {
      console.log('\n⚠️  The add_pending_earnings function does not exist in the database!');
      console.log('You need to run the SQL migration to create it.');
    }
  } else {
    console.log('✅ Function exists and was called successfully!');
    console.log('Result:', data);
  }
}

testEarningsFunction().catch(console.error);