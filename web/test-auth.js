// Test script to check Supabase auth configuration
// Run with: node test-auth.js

const { createClient } = require('@supabase/supabase-js');

// Replace these with your actual values
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testAuth() {
  console.log('Testing Supabase Auth Configuration...\n');
  
  // Test 1: Check if we can connect
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.log('❌ Failed to connect to Supabase:', error.message);
    } else {
      console.log('✅ Successfully connected to Supabase');
      console.log('   Current session:', data.session ? 'Active' : 'None');
    }
  } catch (error) {
    console.log('❌ Connection error:', error.message);
  }
  
  // Test 2: Check auth settings
  console.log('\nChecking auth configuration...');
  
  // Try to get settings (this might not work with anon key)
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
      }
    });
    
    if (response.ok) {
      const settings = await response.json();
      console.log('Auth settings:', JSON.stringify(settings, null, 2));
    } else {
      console.log('Could not fetch auth settings (this is normal with anon key)');
    }
  } catch (error) {
    console.log('Settings fetch error:', error.message);
  }
  
  // Test 3: Create a test user (optional - uncomment to test)
  /*
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  
  console.log(`\nTesting signup with ${testEmail}...`);
  try {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });
    
    if (error) {
      console.log('❌ Signup error:', error.message);
    } else {
      console.log('✅ Signup successful');
      console.log('   User:', data.user?.id);
      console.log('   Session:', data.session ? 'Created' : 'None (email confirmation required)');
      console.log('   Email confirmed:', data.user?.email_confirmed_at ? 'Yes' : 'No');
    }
  } catch (error) {
    console.log('❌ Signup exception:', error.message);
  }
  */
  
  console.log('\n📋 RECOMMENDATIONS:');
  console.log('1. Check Supabase Dashboard > Authentication > Email Templates');
  console.log('   - Ensure confirmation email template is configured');
  console.log('   - Check that the confirmation URL uses {{ .ConfirmationURL }}');
  console.log('');
  console.log('2. Check Supabase Dashboard > Authentication > Settings');
  console.log('   - Ensure "Enable email confirmations" is ON');
  console.log('   - Check "Site URL" is set correctly');
  console.log('   - Add redirect URLs: /auth/confirm, /auth/callback');
  console.log('');
  console.log('3. Check Supabase Dashboard > Authentication > Providers');
  console.log('   - Ensure Email provider is enabled');
  console.log('');
  console.log('4. Common issues:');
  console.log('   - Token expired: User waited too long to click link');
  console.log('   - Token already used: User clicked link multiple times');
  console.log('   - Wrong redirect URL: Supabase sending to wrong domain');
}

testAuth();