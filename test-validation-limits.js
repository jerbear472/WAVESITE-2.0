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

async function testValidationLimits() {
  console.log('🧪 Testing Validation Limits System\n');

  try {
    // Sign in as a test user (you'll need to replace with valid credentials)
    console.log('📝 Note: You need to be signed in to test. Update the email/password below:');
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'test@example.com', // Replace with a real test user
      password: 'testpassword'     // Replace with real password
    });

    if (authError || !authData.user) {
      console.log('⚠️  Could not sign in. Testing with a sample user ID instead...');
      
      // Get any user for testing
      const { data: users } = await supabase
        .from('profiles')
        .select('id, email')
        .limit(1);

      if (!users || users.length === 0) {
        console.error('❌ No users found in database');
        return;
      }

      const testUserId = users[0].id;
      console.log(`\n🧪 Testing with user: ${users[0].email} (${testUserId})`);
      
      // Test check_rate_limit
      console.log('\n1️⃣ Testing check_rate_limit function...');
      const { data: rateLimitData, error: checkError } = await supabase
        .rpc('check_rate_limit', { p_user_id: testUserId });

      if (checkError) {
        console.error('❌ Error calling check_rate_limit:', checkError);
        return;
      }

      if (rateLimitData && rateLimitData.length > 0) {
        const limits = rateLimitData[0];
        console.log('✅ Rate limit check successful!');
        console.log(`   Can validate: ${limits.can_validate}`);
        console.log(`   Hourly remaining: ${limits.validations_remaining_hour} / 20`);
        console.log(`   Daily remaining: ${limits.validations_remaining_today} / 100`);
        console.log(`   Reset time: ${new Date(limits.reset_time).toLocaleString()}`);
      }

      // Test the status view
      console.log('\n2️⃣ Testing validation_rate_limits_status view...');
      const { data: statusData, error: statusError } = await supabase
        .from('validation_rate_limits_status')
        .select('*')
        .eq('user_id', testUserId)
        .single();

      if (statusError) {
        console.log('⚠️  Status view might not exist yet. Run the SQL migration first.');
      } else if (statusData) {
        console.log('✅ Status view working!');
        console.log(`   Status: ${statusData.status}`);
        console.log(`   Reset status: ${statusData.reset_status}`);
      }

      // Test increment function
      console.log('\n3️⃣ Testing increment_validation_count function...');
      console.log('⚠️  Note: This will actually increment the user\'s validation count!');
      
      // Uncomment below to test increment
      /*
      const { data: incrementData, error: incrementError } = await supabase
        .rpc('increment_validation_count', { p_user_id: testUserId });

      if (incrementError) {
        console.error('❌ Error calling increment_validation_count:', incrementError);
      } else {
        console.log('✅ Increment successful!');
        
        // Check limits again
        const { data: newLimits } = await supabase
          .rpc('check_rate_limit', { p_user_id: testUserId });
        
        if (newLimits && newLimits.length > 0) {
          const limits = newLimits[0];
          console.log(`   New hourly remaining: ${limits.validations_remaining_hour}`);
          console.log(`   New daily remaining: ${limits.validations_remaining_today}`);
        }
      }
      */

      console.log('\n✅ All tests completed!');
      
    } else {
      // Test with authenticated user
      const userId = authData.user.id;
      console.log(`\n✅ Signed in as: ${authData.user.email}`);
      
      // Run the same tests as above but with authenticated user
      // ... (same test code as above)
    }

  } catch (error) {
    console.error('❌ Error during testing:', error);
  }
}

console.log('═'.repeat(60));
console.log('  Validation Limits Test Script');
console.log('═'.repeat(60));
console.log('\nThis script tests the validation rate limiting system.');
console.log('Make sure you\'ve run the SQL migration first!\n');

testValidationLimits();