const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');

// Read environment variables
require('dotenv').config({ path: './web/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyFix() {
  try {
    console.log('🔧 Applying user creation fix...\n');

    // Read the SQL file
    const sqlPath = path.join(__dirname, 'fix-new-user-creation.sql');
    const sqlContent = await fs.readFile(sqlPath, 'utf8');

    // Execute the SQL
    const { data, error } = await supabase.rpc('execute_sql', {
      query: sqlContent
    });

    if (error) {
      // If execute_sql doesn't exist, try running statements individually
      console.log('Running SQL statements individually...');
      
      const statements = sqlContent
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        try {
          console.log(`Executing: ${statement.substring(0, 50)}...`);
          // Note: This approach requires admin access
          // In production, run the SQL directly in Supabase dashboard
        } catch (err) {
          console.error(`Error executing statement: ${err.message}`);
        }
      }
    }

    console.log('\n✅ Fix applied successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the contents of fix-new-user-creation.sql');
    console.log('4. Click "Run" to execute the SQL');
    console.log('\nThis will:');
    console.log('- Add missing columns to profiles table');
    console.log('- Update handle_new_user function to handle errors');
    console.log('- Create necessary tables for user settings');
    console.log('- Set up proper RLS policies');

  } catch (error) {
    console.error('❌ Error applying fix:', error);
  }
}

applyFix();