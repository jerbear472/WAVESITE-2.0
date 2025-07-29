const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './web/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRateLimitDecrement() {
  console.log('Testing rate limit decrement functionality...\n');

  // Replace with a test user ID or prompt for one
  const testUserId = process.argv[2];
  
  if (!testUserId) {
    console.error('Please provide a user ID as argument: node test-rate-limit-decrement.js <user-id>');
    process.exit(1);
  }

  try {
    // Check initial rate limit
    console.log('1. Checking initial rate limit...');
    const { data: initialLimit, error: checkError1 } = await supabase
      .rpc('check_rate_limit', { p_user_id: testUserId });
    
    if (checkError1) throw checkError1;
    
    console.log('Initial rate limit:', initialLimit[0]);
    console.log(`  Daily remaining: ${initialLimit[0].validations_remaining_today}`);
    console.log(`  Hourly remaining: ${initialLimit[0].validations_remaining_hour}`);
    console.log(`  Can validate: ${initialLimit[0].can_validate}\n`);

    // Simulate a validation
    console.log('2. Simulating validation (incrementing count)...');
    const { error: incrementError } = await supabase
      .rpc('increment_validation_count', { p_user_id: testUserId });
    
    if (incrementError) throw incrementError;
    console.log('Validation count incremented successfully\n');

    // Check rate limit after increment
    console.log('3. Checking rate limit after validation...');
    const { data: afterLimit, error: checkError2 } = await supabase
      .rpc('check_rate_limit', { p_user_id: testUserId });
    
    if (checkError2) throw checkError2;
    
    console.log('Rate limit after validation:', afterLimit[0]);
    console.log(`  Daily remaining: ${afterLimit[0].validations_remaining_today} (was ${initialLimit[0].validations_remaining_today})`);
    console.log(`  Hourly remaining: ${afterLimit[0].validations_remaining_hour} (was ${initialLimit[0].validations_remaining_hour})`);
    console.log(`  Can validate: ${afterLimit[0].can_validate}\n`);

    // Check if counts decreased
    const dailyDecreased = afterLimit[0].validations_remaining_today < initialLimit[0].validations_remaining_today;
    const hourlyDecreased = afterLimit[0].validations_remaining_hour < initialLimit[0].validations_remaining_hour;

    console.log('4. Verification:');
    console.log(`  ✓ Daily count decreased: ${dailyDecreased ? 'YES' : 'NO'}`);
    console.log(`  ✓ Hourly count decreased: ${hourlyDecreased ? 'YES' : 'NO'}`);
    
    if (dailyDecreased && hourlyDecreased) {
      console.log('\n✅ SUCCESS: Rate limits are decreasing correctly!');
    } else {
      console.log('\n❌ ISSUE: Rate limits are not decreasing as expected.');
    }

  } catch (error) {
    console.error('Error during test:', error);
  }
}

testRateLimitDecrement();