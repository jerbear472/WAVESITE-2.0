const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://aicahushpcslwjwrlqbo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpY2FodXNocGNzbHdqd3JscWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4ODc1NTQsImV4cCI6MjA3MDQ2MzU1NH0.rLPnouZXA1ejWG0tuurIb5sgo5CCHe15M4knaANrR2w';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkEmailSettings() {
  console.log('Checking Email Confirmation Settings\n');
  console.log('=====================================\n');
  
  // Test with a real email
  const testEmail = 'your.real.email@gmail.com'; // Replace with your actual email
  const timestamp = Date.now();
  
  console.log('Testing signup with timestamp:', timestamp);
  
  try {
    const testEmail = `test.user.${timestamp}@example.com`;
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: 'TestPassword123!',
    });
    
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    console.log('\nSignup Results:');
    console.log('---------------');
    console.log('✓ User created:', data.user?.id);
    console.log('✓ Email confirmed at:', data.user?.email_confirmed_at || 'NOT CONFIRMED');
    console.log('✓ Session created:', data.session ? 'YES' : 'NO');
    console.log('✓ Email confirmation required:', !data.session ? 'YES' : 'NO');
    
    if (data.user?.email_confirmed_at) {
      console.log('\n⚠️  EMAIL CONFIRMATION IS DISABLED');
      console.log('Users are automatically confirmed without receiving emails.\n');
      console.log('To enable email confirmation:');
      console.log('1. Go to https://supabase.com/dashboard/project/aicahushpcslwjwrlqbo/auth/providers');
      console.log('2. Click on "Email" provider');
      console.log('3. Enable "Confirm email" option');
      console.log('4. Configure SMTP settings if you want custom emails');
    } else {
      console.log('\n✅ EMAIL CONFIRMATION IS ENABLED');
      console.log('Users should receive confirmation emails.');
    }
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkEmailSettings();