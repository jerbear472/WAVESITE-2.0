const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTestUser() {
  console.log('🚀 Creating test enterprise user...\n');

  const testEmail = 'enterprise@test.com';
  const testPassword = 'test123456';

  try {
    // Create user in auth
    console.log('1️⃣  Creating auth user...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('⚠️  User already exists, updating profile...');
        
        // Get existing user
        const { data: { users } } = await supabase.auth.admin.listUsers();
        const existingUser = users.find(u => u.email === testEmail);
        
        if (existingUser) {
          // Update profile
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ subscription_tier: 'enterprise' })
            .eq('id', existingUser.id);

          if (!updateError) {
            console.log('✅ Updated existing user to enterprise tier');
          }
        }
      } else {
        throw authError;
      }
    } else {
      console.log('✅ Auth user created');

      // Update profile to enterprise
      console.log('2️⃣  Upgrading to enterprise tier...');
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          subscription_tier: 'enterprise',
          full_name: 'Enterprise Test User'
        })
        .eq('id', authData.user.id);

      if (profileError) {
        console.log('⚠️  Profile update error:', profileError.message);
      } else {
        console.log('✅ Profile upgraded to enterprise');
      }

      // Create API key
      console.log('3️⃣  Creating API key...');
      const apiKey = 'ws_test_' + Math.random().toString(36).substring(2, 15);
      const { error: keyError } = await supabase
        .from('api_keys')
        .insert({
          user_id: authData.user.id,
          name: 'Test API Key',
          key: apiKey,
          rate_limit: 10000
        });

      if (!keyError) {
        console.log('✅ API key created:', apiKey);
      }
    }

    console.log('\n✨ Test user ready!');
    console.log('📧 Email:', testEmail);
    console.log('🔑 Password:', testPassword);
    console.log('\n🚀 You can now:');
    console.log('1. Start the dev server: npm run dev');
    console.log('2. Login at: http://localhost:3000/login');
    console.log('3. Access dashboard at: http://localhost:3000/enterprise/dashboard');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Also create some test alerts and integrations
async function createTestData() {
  console.log('\n📊 Creating test data...');

  try {
    // Get the test user
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const testUser = users.find(u => u.email === 'enterprise@test.com');

    if (!testUser) {
      console.log('⚠️  Test user not found, skipping test data');
      return;
    }

    // Create test alerts
    const alerts = [
      {
        user_id: testUser.id,
        name: 'High Velocity Tech Trends',
        type: 'velocity',
        conditions: { field: 'velocity', operator: '>', value: 80 },
        channels: ['email', 'slack'],
        is_active: true
      },
      {
        user_id: testUser.id,
        name: 'Negative Sentiment Alert',
        type: 'sentiment',
        conditions: { field: 'sentiment', operator: '<', value: -0.5 },
        channels: ['email'],
        is_active: true
      }
    ];

    const { error: alertsError } = await supabase
      .from('enterprise_alerts')
      .insert(alerts);

    if (!alertsError) {
      console.log('✅ Test alerts created');
    }

    // Create test integration
    const { error: integrationError } = await supabase
      .from('integrations')
      .insert({
        user_id: testUser.id,
        name: 'Test Slack Integration',
        type: 'slack',
        status: 'connected',
        config: { webhook_url: 'https://hooks.slack.com/test' }
      });

    if (!integrationError) {
      console.log('✅ Test integration created');
    }

  } catch (error) {
    console.log('⚠️  Test data creation error:', error.message);
  }
}

async function main() {
  await createTestUser();
  await createTestData();
}

main().catch(console.error);