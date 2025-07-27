const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './web/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials');
  console.log('Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in web/.env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function setupAdminUser() {
  try {
    console.log('Setting up admin access for jeremyuys@gmail.com...');

    // First, get the user ID for jeremyuys@gmail.com
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', 'jeremyuys@gmail.com')
      .single();

    if (profileError || !profile) {
      console.error('User not found. Please ensure jeremyuys@gmail.com is registered.');
      return;
    }

    console.log('Found user:', profile);

    // Update the profile to mark as admin
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        is_admin: true,
        subscription_tier: 'enterprise'
      })
      .eq('id', profile.id);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      return;
    }

    console.log('✅ Admin access granted successfully!');
    console.log('You can now access the admin panel at /admin/users');
    console.log('Use the toggle buttons to switch users between regular and enterprise accounts.');

  } catch (error) {
    console.error('Error:', error);
  }
}

setupAdminUser();