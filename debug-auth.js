const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugAuth() {
  console.log('🔍 Debugging Authentication Issues\n');
  
  const testEmail = 'enterprise@test.com';
  const testPassword = 'test123456';

  // 1. Check if user exists in auth.users
  console.log('1️⃣ Checking if user exists in auth.users...');
  try {
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) {
      console.error('❌ Error listing users:', error);
    } else {
      const testUser = users.find(u => u.email === testEmail);
      if (testUser) {
        console.log('✅ User found in auth.users');
        console.log('   ID:', testUser.id);
        console.log('   Email:', testUser.email);
        console.log('   Created:', testUser.created_at);
        console.log('   Confirmed:', testUser.email_confirmed_at ? 'Yes' : 'No');
      } else {
        console.log('❌ User NOT found in auth.users');
        console.log('   Need to create the user first');
      }
    }
  } catch (error) {
    console.error('❌ Error checking auth users:', error);
  }

  // 2. Check profiles table
  console.log('\n2️⃣ Checking profiles table...');
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', testEmail);

    if (error) {
      console.error('❌ Error querying profiles:', error);
    } else if (profiles && profiles.length > 0) {
      console.log('✅ Profile found:');
      console.log('   ID:', profiles[0].id);
      console.log('   Email:', profiles[0].email);
      console.log('   Username:', profiles[0].username);
      console.log('   Tier:', profiles[0].subscription_tier);
    } else {
      console.log('❌ No profile found');
    }
  } catch (error) {
    console.error('❌ Error checking profiles:', error);
  }

  // 3. Test authentication
  console.log('\n3️⃣ Testing authentication...');
  try {
    // First, let's try with the anon key to simulate client-side auth
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    const supabaseClient = createClient(supabaseUrl, anonKey);
    
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    if (error) {
      console.error('❌ Authentication failed:', error.message);
      console.error('   Error details:', error);
      
      // Try to create/reset the user
      console.log('\n4️⃣ Attempting to create/update user...');
      await createOrUpdateUser();
    } else {
      console.log('✅ Authentication successful!');
      console.log('   User ID:', data.user.id);
      console.log('   Session:', data.session ? 'Created' : 'Not created');
    }
  } catch (error) {
    console.error('❌ Auth test error:', error);
  }
}

async function createOrUpdateUser() {
  const testEmail = 'enterprise@test.com';
  const testPassword = 'test123456';
  
  try {
    // Check if user exists
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const existingUser = users.find(u => u.email === testEmail);
    
    if (existingUser) {
      // Update password
      console.log('🔄 Updating user password...');
      const { error } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        { password: testPassword }
      );
      
      if (error) {
        console.error('❌ Failed to update password:', error);
      } else {
        console.log('✅ Password updated successfully');
      }
      
      // Ensure profile exists
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: existingUser.id,
          email: testEmail,
          username: 'enterprise_test',
          subscription_tier: 'enterprise'
        }, {
          onConflict: 'id'
        });
        
      if (profileError) {
        console.error('❌ Profile update error:', profileError);
      } else {
        console.log('✅ Profile updated');
      }
    } else {
      // Create new user
      console.log('🆕 Creating new user...');
      const { data, error } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true
      });
      
      if (error) {
        console.error('❌ Failed to create user:', error);
      } else {
        console.log('✅ User created:', data.user.id);
        
        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: testEmail,
            username: 'enterprise_test',
            subscription_tier: 'enterprise'
          });
          
        if (profileError) {
          console.error('❌ Profile creation error:', profileError);
        } else {
          console.log('✅ Profile created');
        }
      }
    }
    
    console.log('\n✨ Try logging in again with:');
    console.log('   Email: enterprise@test.com');
    console.log('   Password: test123456');
    
  } catch (error) {
    console.error('❌ Error in createOrUpdateUser:', error);
  }
}

// Also test the actual Supabase connection
async function testConnection() {
  console.log('\n5️⃣ Testing Supabase connection...');
  console.log('   URL:', supabaseUrl);
  console.log('   Service Key:', supabaseServiceKey ? 'Present' : 'Missing');
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
      
    if (error) {
      console.error('❌ Connection test failed:', error);
    } else {
      console.log('✅ Connection successful');
    }
  } catch (error) {
    console.error('❌ Connection error:', error);
  }
}

async function main() {
  await testConnection();
  await debugAuth();
}

main().catch(console.error);