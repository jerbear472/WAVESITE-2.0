const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './web/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkAuthSettings() {
  console.log('🔍 Checking Supabase Auth Configuration...\n');
  
  try {
    // Try to get auth settings
    const { data: { user } } = await supabase.auth.getUser();
    
    console.log('Current auth state:', user ? 'Logged in' : 'Not logged in');
    
    // Test registration with a dummy email
    const testEmail = `test-${Date.now()}@example.com`;
    console.log(`\n🧪 Testing registration flow with: ${testEmail}`);
    
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: 'TestPassword123!',
    });
    
    if (error) {
      console.error('Registration error:', error.message);
    } else {
      console.log('\n✅ Registration successful!');
      console.log('User created:', data.user?.id);
      console.log('Session created:', !!data.session);
      console.log('Email confirmed:', data.user?.email_confirmed_at ? 'Yes' : 'No');
      console.log('Confirmation required:', !data.session ? 'Yes' : 'No');
      
      if (data.session) {
        console.log('\n⚠️  Auto-signin is ENABLED - Users are logged in immediately');
        console.log('This causes the redirect loop issue!');
        
        // Clean up - sign out
        await supabase.auth.signOut();
      } else {
        console.log('\n✅ Email confirmation is REQUIRED - This is correct!');
      }
    }
    
    console.log('\n📋 Recommendations:');
    console.log('1. Go to Supabase Dashboard → Settings → Auth');
    console.log('2. Look for "Email Confirmations" or similar setting');
    console.log('3. Make sure email confirmation is required');
    console.log('4. If you can\'t find it, the code fix above will handle it');
    
  } catch (err) {
    console.error('Error checking settings:', err);
  }
}

checkAuthSettings();