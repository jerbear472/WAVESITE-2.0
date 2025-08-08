const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyVerifyPersistenceFix() {
  console.log('🔧 Applying verify page persistence fixes...\n');

  try {
    // Read the SQL file
    const fs = require('fs');
    const path = require('path');
    const sqlContent = fs.readFileSync(
      path.join(__dirname, 'fix-verify-page-persistence.sql'),
      'utf8'
    );

    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: sqlContent
    }).single();

    if (error) {
      // If exec_sql doesn't exist, try executing statements individually
      console.log('exec_sql not available, executing statements individually...');
      
      // Split SQL into individual statements
      const statements = sqlContent
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        try {
          // For CREATE INDEX, CREATE FUNCTION, etc., we need to use raw SQL
          console.log(`Executing: ${statement.substring(0, 50)}...`);
          
          // Note: Supabase doesn't allow direct SQL execution via the client
          // These changes need to be applied via the Supabase dashboard SQL editor
          console.log('⚠️  This statement needs to be run in Supabase SQL Editor:');
          console.log(statement + ';');
          console.log('---');
        } catch (err) {
          console.error('Error executing statement:', err.message);
        }
      }
    }

    console.log('\n✅ Database schema updates prepared!');
    console.log('\n📝 IMPORTANT: Please run the following SQL in your Supabase SQL Editor:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the contents of fix-verify-page-persistence.sql');
    console.log('4. Run the SQL');

    // Test the current state
    console.log('\n🔍 Checking current database state...');
    
    // Check how many trends are in each status
    const { data: statusCounts, error: statusError } = await supabase
      .from('trend_submissions')
      .select('status')
      .order('status');

    if (!statusError && statusCounts) {
      const counts = statusCounts.reduce((acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      }, {});
      
      console.log('\nTrend status distribution:');
      Object.entries(counts).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
      });
    }

    // Check validation counts
    const { count: validationCount } = await supabase
      .from('trend_validations')
      .select('*', { count: 'exact', head: true });

    console.log(`\nTotal validations in database: ${validationCount || 0}`);

    // Suggest cleanup actions
    console.log('\n🧹 Suggested cleanup actions:');
    
    // Check for old pending trends
    const { data: oldTrends, error: oldError } = await supabase
      .from('trend_submissions')
      .select('id, created_at, status')
      .in('status', ['submitted', 'validating', 'pending'])
      .lt('created_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
      .limit(5);

    if (!oldError && oldTrends && oldTrends.length > 0) {
      console.log(`Found ${oldTrends.length} trends older than 48 hours that might need cleanup`);
      console.log('Run this to auto-reject old unvalidated trends:');
      console.log(`
UPDATE trend_submissions
SET status = 'rejected', validation_status = 'rejected'
WHERE status IN ('submitted', 'pending')
AND created_at < NOW() - INTERVAL '48 hours'
AND validation_count = 0;
      `);
    }

    console.log('\n✅ Verify page persistence fix preparation complete!');
    console.log('\n📱 Next steps:');
    console.log('1. Apply the SQL changes in Supabase dashboard');
    console.log('2. Test the verify page - trends should now persist properly');
    console.log('3. Users should only see trends they haven\'t voted on');
    console.log('4. Only pending/validating trends should appear');

  } catch (error) {
    console.error('❌ Error applying fixes:', error);
    process.exit(1);
  }
}

// Run the fix
applyVerifyPersistenceFix();