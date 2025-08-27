// Script to run the voting system migration
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function runMigration() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('Running voting system migration...');

  try {
    // Read the migration SQL file
    const migrationSQL = fs.readFileSync('supabase/migrations/20240328_create_voting_system.sql', 'utf8');
    
    // Split by semicolons and run each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements to execute`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`\nExecuting statement ${i + 1}/${statements.length}:`);
      console.log(statement.slice(0, 100) + '...');
      
      const { data, error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error) {
        console.error(`Error in statement ${i + 1}:`, error);
        // Continue with other statements
      } else {
        console.log('✓ Success');
      }
    }

    console.log('\nMigration completed!');

  } catch (err) {
    console.error('Migration failed:', err);
  }
}

runMigration();