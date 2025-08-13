const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://aicahushpcslwjwrlqbo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpY2FodXNocGNzbHdqd3JscWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4ODc1NTQsImV4cCI6MjA3MDQ2MzU1NH0.rLPnouZXA1ejWG0tuurIb5sgo5CCHe15M4knaANrR2w';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugLogin() {
  console.log('=== LOGIN DEBUGGING ===\n');
  
  const credentials = [
    { email: 'admin@wavesight.com', password: 'Admin123!' },
    { email: 'demo1755123016943@wavesight.com', password: 'Demo123456!' }
  ];
  
  for (const cred of credentials) {
    console.log(`\nTesting: ${cred.email}`);
    console.log('-'.repeat(40));
    
    // 1. Test login
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: cred.email,
      password: cred.password
    });
    
    if (loginError) {
      console.error('❌ Login failed:', loginError.message);
      console.error('Error code:', loginError.code);
      console.error('Status:', loginError.status);
      continue;
    }
    
    console.log('✅ Login successful!');
    console.log('User ID:', loginData.user?.id);
    console.log('Session token exists:', !!loginData.session?.access_token);
    
    // 2. Check profile
    if (loginData.user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', loginData.user.id)
        .single();
        
      if (profileError) {
        console.error('❌ Profile fetch failed:', profileError.message);
      } else {
        console.log('✅ Profile found:');
        console.log('  - Username:', profile.username);
        console.log('  - Is Admin:', profile.is_admin);
        console.log('  - Created:', profile.created_at);
      }
    }
    
    // 3. Test session persistence
    const { data: { session } } = await supabase.auth.getSession();
    console.log('Session persisted:', !!session);
    
    // 4. Sign out for next test
    await supabase.auth.signOut();
  }
  
  console.log('\n=== CHECKING AUTH SETTINGS ===\n');
  
  // Check if there are any users at all
  const { count, error: countError } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });
    
  console.log('Total profiles in database:', count);
  
  // Get current session info
  const { data: { session: currentSession } } = await supabase.auth.getSession();
  console.log('Current session active:', !!currentSession);
}

debugLogin().catch(console.error);