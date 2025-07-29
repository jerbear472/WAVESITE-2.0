const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, 'web', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials. Please check your .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyValidationLimitsFix() {
  console.log('🔧 Applying validation limits fix...\n');

  try {
    // Read the SQL file
    const sqlContent = fs.readFileSync(
      path.join(__dirname, 'fix-validation-limits-complete.sql'),
      'utf8'
    );

    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', {
      query: sqlContent
    }).single();

    if (error) {
      // If exec_sql doesn't exist, try executing statements one by one
      console.log('⚠️  exec_sql not available, executing statements individually...');
      
      // Split SQL content by semicolons, but be careful with functions
      const statements = sqlContent
        .split(/;\s*$/m)
        .filter(stmt => stmt.trim())
        .map(stmt => stmt.trim() + ';');

      for (const statement of statements) {
        if (statement.includes('DROP FUNCTION') || 
            statement.includes('CREATE FUNCTION') || 
            statement.includes('CREATE OR REPLACE FUNCTION') ||
            statement.includes('CREATE TABLE') ||
            statement.includes('CREATE VIEW') ||
            statement.includes('GRANT')) {
          
          console.log('Executing:', statement.substring(0, 50) + '...');
          
          // For these complex statements, we need to use raw SQL execution
          // This is a limitation - you may need to run the SQL directly in Supabase dashboard
          console.log('⚠️  Complex SQL statement detected. Please run this in Supabase SQL editor.');
        }
      }
      
      console.log('\n📋 Please execute the following SQL file in your Supabase dashboard:');
      console.log('   fix-validation-limits-complete.sql');
      console.log('\n   Go to: Your Supabase Project > SQL Editor');
      console.log('   Copy and paste the contents of the SQL file and execute.');
      return;
    }

    console.log('✅ Validation limits fix applied successfully!');

    // Test the functions
    console.log('\n🧪 Testing the new functions...');
    
    // Get a test user (you can replace with a specific user ID)
    const { data: users } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (users && users.length > 0) {
      const testUserId = users[0].id;
      
      // Test check_rate_limit
      const { data: rateLimitCheck, error: checkError } = await supabase
        .rpc('check_rate_limit', { p_user_id: testUserId });

      if (!checkError && rateLimitCheck) {
        console.log('\n✅ check_rate_limit function works!');
        console.log('   Rate limit status:', rateLimitCheck[0]);
      } else {
        console.log('❌ Error testing check_rate_limit:', checkError);
      }

      // Test the validation limits view
      const { data: statusView } = await supabase
        .from('validation_rate_limits_status')
        .select('*')
        .eq('user_id', testUserId)
        .single();

      if (statusView) {
        console.log('\n✅ validation_rate_limits_status view works!');
        console.log('   User status:', statusView);
      }
    }

    console.log('\n🎉 All validation limits fixes have been applied!');
    console.log('\n📝 Summary of changes:');
    console.log('   - Improved check_rate_limit function with better reset logic');
    console.log('   - Enhanced increment_validation_count with proper boundary handling');
    console.log('   - Added set_user_validation_limits for admin use');
    console.log('   - Created validation_rate_limits_status view for monitoring');
    console.log('   - Added test_validation_limits function for debugging');
    console.log('\n✨ The verify page will now properly handle hourly and daily limits!');

  } catch (error) {
    console.error('❌ Error applying validation limits fix:', error);
    console.log('\n📋 Please manually execute the SQL file in your Supabase dashboard.');
  }
}

// Run the fix
applyValidationLimitsFix();