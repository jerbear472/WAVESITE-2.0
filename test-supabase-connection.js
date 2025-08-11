const { createClient } = require('@supabase/supabase-js');

// Test Supabase connection
const SUPABASE_URL = 'https://aicahushpcslwjwrlqbo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpY2FodXNocGNzbHdqd3JscWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4ODc1NTQsImV4cCI6MjA3MDQ2MzU1NH0.rLPnouZXA1ejWG0tuurIb5sgo5CCHe15M4knaANrR2w';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testConnection() {
  console.log('Testing Supabase connection...\n');
  
  try {
    // Test 1: Check if we can connect
    console.log('1. Testing basic connection...');
    const { data: tables, error: tablesError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (tablesError) {
      console.error('❌ Connection failed:', tablesError.message);
    } else {
      console.log('✅ Successfully connected to Supabase');
    }
    
    // Test 2: Check auth configuration
    console.log('\n2. Testing auth configuration...');
    const testEmail = `test${Date.now()}@example.com`;
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: 'TestPassword123!',
      options: {
        data: {
          username: `testuser${Date.now()}`,
        }
      }
    });
    
    if (signUpError) {
      console.error('❌ Auth signup test failed:', signUpError.message);
      console.error('Full error:', signUpError);
    } else {
      console.log('✅ Auth is configured');
      console.log('Email confirmation required:', !signUpData.session);
      
      // Clean up test user
      if (signUpData.user) {
        await supabase.auth.admin?.deleteUser?.(signUpData.user.id).catch(() => {});
      }
    }
    
    // Test 3: Check table structure
    console.log('\n3. Checking database tables...');
    const tableNames = ['profiles', 'user_profiles', 'captured_trends', 'user_personas'];
    
    for (const table of tableNames) {
      const { error } = await supabase
        .from(table)
        .select('*')
        .limit(0);
      
      if (error) {
        console.log(`❌ Table '${table}' - Error: ${error.message}`);
      } else {
        console.log(`✅ Table '${table}' exists and is accessible`);
      }
    }
    
    // Test 4: Check RLS policies
    console.log('\n4. Checking RLS policies...');
    const { data: rlsCheck, error: rlsError } = await supabase
      .rpc('check_rls_policies', {})
      .single();
    
    if (rlsError) {
      console.log('⚠️ RLS check function not available (this is normal)');
    } else {
      console.log('✅ RLS policies checked');
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testConnection();