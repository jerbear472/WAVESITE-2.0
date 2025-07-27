const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function quickFix() {
  console.log('🔧 Quick Fix for Authentication\n');

  const email = 'enterprise@test.com';
  const password = 'test123456';

  try {
    // 1. Delete existing user if any
    console.log('1️⃣ Cleaning up old user data...');
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const existingUser = users?.find(u => u.email === email);
    
    if (existingUser) {
      await supabase.auth.admin.deleteUser(existingUser.id);
      console.log('   Removed old user');
    }

    // 2. Create fresh user
    console.log('\n2️⃣ Creating fresh user...');
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: { 
        username: 'enterprise_test'
      }
    });

    if (createError) {
      throw createError;
    }

    console.log('✅ User created:', newUser.user.id);

    // 3. Create profile
    console.log('\n3️⃣ Creating profile...');
    await supabase
      .from('profiles')
      .delete()
      .eq('email', email); // Clean up any old profiles

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: newUser.user.id,
        email: email,
        username: 'enterprise_test',
        subscription_tier: 'enterprise'
      });

    if (profileError) {
      console.error('Profile error:', profileError);
    } else {
      console.log('✅ Profile created');
    }

    // 4. Test the login
    console.log('\n4️⃣ Testing login...');
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const clientSupabase = createClient(supabaseUrl, anonKey);
    
    const { data: authData, error: authError } = await clientSupabase.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (authError) {
      console.error('❌ Login test failed:', authError.message);
    } else {
      console.log('✅ Login test successful!');
    }

    console.log('\n🎉 Setup complete! Try logging in with:');
    console.log('   URL: http://localhost:3000/login');
    console.log('   Email:', email);
    console.log('   Password:', password);
    console.log('\n💡 If it still doesn\'t work:');
    console.log('   1. Hard refresh browser (Cmd+Shift+R)');
    console.log('   2. Try in incognito mode');
    console.log('   3. Check browser console for errors');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

quickFix().catch(console.error);