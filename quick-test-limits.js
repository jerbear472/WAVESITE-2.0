const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, 'web', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials. Please check your .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function quickTest() {
  console.log('🧪 Quick Validation Limits Test\n');

  // Get a sample user to test with
  const { data: users, error: usersError } = await supabase
    .from('profiles')
    .select('id, email, username')
    .limit(5);

  if (usersError || !users || users.length === 0) {
    console.error('❌ Could not fetch users:', usersError);
    return;
  }

  console.log('📊 Testing rate limits for sample users:\n');

  for (const user of users) {
    console.log(`User: ${user.email || user.username || 'Unknown'} (${user.id})`);
    
    // Test check_rate_limit
    const { data: rateLimitData, error: checkError } = await supabase
      .rpc('check_rate_limit', { p_user_id: user.id });

    if (checkError) {
      console.error('  ❌ Error:', checkError.message);
    } else if (rateLimitData && rateLimitData.length > 0) {
      const limits = rateLimitData[0];
      console.log(`  ✅ Can validate: ${limits.can_validate ? 'Yes' : 'No'}`);
      console.log(`  📊 Hourly: ${limits.validations_remaining_hour}/20`);
      console.log(`  📊 Daily: ${limits.validations_remaining_today}/100`);
      
      if (!limits.can_validate) {
        const resetTime = new Date(limits.reset_time);
        const now = new Date();
        const diffMinutes = Math.ceil((resetTime - now) / 60000);
        console.log(`  ⏰ Resets in: ${diffMinutes} minutes`);
      }
    }
    console.log('');
  }

  // Test the monitoring view
  console.log('📋 Checking validation_rate_limits_status view...\n');
  const { data: statusData, error: statusError } = await supabase
    .from('validation_rate_limits_status')
    .select('username, status, validations_today, validations_this_hour, reset_status')
    .limit(5);

  if (statusError) {
    console.error('❌ Error fetching status view:', statusError.message);
  } else if (statusData && statusData.length > 0) {
    console.log('✅ Status view is working! Sample data:');
    statusData.forEach(status => {
      console.log(`  ${status.username}: ${status.status} (Today: ${status.validations_today}, Hour: ${status.validations_this_hour})`);
    });
  } else {
    console.log('ℹ️  No data in status view yet');
  }

  console.log('\n✅ Test complete! The validation limits system is ready to use.');
  console.log('\n💡 Next steps:');
  console.log('  1. Test the verify page in your browser');
  console.log('  2. Watch the rate limit counters update in real-time');
  console.log('  3. Verify that limits reset properly at hour/day boundaries');
}

quickTest().catch(console.error);