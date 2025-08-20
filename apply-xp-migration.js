const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Initialize Supabase client with service role key for admin access
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function applyXPMigration() {
  console.log('========================================');
  console.log('Applying XP System to Existing Database');
  console.log('========================================\n');

  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'supabase/migrations/20250820_add_xp_to_existing.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split the SQL into individual statements (by semicolon followed by newline)
    // But we need to be careful with functions that contain semicolons
    const statements = [];
    let currentStatement = '';
    let inFunction = false;
    
    const lines = migrationSQL.split('\n');
    
    for (const line of lines) {
      // Check if we're entering or exiting a function definition
      if (line.includes('CREATE OR REPLACE FUNCTION') || line.includes('CREATE FUNCTION')) {
        inFunction = true;
      }
      
      currentStatement += line + '\n';
      
      // If we're not in a function and line ends with semicolon, it's end of statement
      if (!inFunction && line.trim().endsWith(';')) {
        statements.push(currentStatement.trim());
        currentStatement = '';
      }
      
      // Check if we're exiting a function
      if (inFunction && line.trim() === '$$ LANGUAGE plpgsql;') {
        statements.push(currentStatement.trim());
        currentStatement = '';
        inFunction = false;
      }
    }
    
    // Add any remaining statement
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }

    console.log(`Found ${statements.length} SQL statements to execute\n`);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip empty statements or comments only
      if (!statement || statement.startsWith('--') && !statement.includes('CREATE')) {
        continue;
      }

      // Get first 50 chars of statement for logging
      const statementPreview = statement.substring(0, 80).replace(/\n/g, ' ');
      process.stdout.write(`[${i + 1}/${statements.length}] Executing: ${statementPreview}...`);

      try {
        // Use Supabase's rpc to execute raw SQL
        const { error } = await supabase.rpc('exec_sql', {
          sql_query: statement
        }).catch(async (e) => {
          // If exec_sql doesn't exist, try direct execution through REST API
          const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': process.env.SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
            },
            body: JSON.stringify({ sql_query: statement })
          });
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          
          return { error: null };
        });

        if (error) {
          throw error;
        }

        console.log(' ✓');
        successCount++;
      } catch (error) {
        console.log(' ✗');
        console.log(`  Error: ${error.message}`);
        errors.push({ statement: statementPreview, error: error.message });
        errorCount++;
        
        // Continue with other statements even if one fails
        // Some statements might fail if they already exist
      }
    }

    console.log('\n========================================');
    console.log('Migration Summary');
    console.log('========================================');
    console.log(`✓ Successful statements: ${successCount}`);
    console.log(`✗ Failed statements: ${errorCount}`);
    
    if (errors.length > 0) {
      console.log('\nNote: Some statements failed, but this might be expected if:');
      console.log('- Tables/functions already exist');
      console.log('- You\'re running the migration again');
      console.log('\nYou can manually run the migration in Supabase SQL Editor for full control.');
    }

    // Check if XP tables were created
    console.log('\n========================================');
    console.log('Verifying XP System');
    console.log('========================================');

    const { data: xpTable, error: xpError } = await supabase
      .from('user_xp')
      .select('*')
      .limit(1);

    if (!xpError) {
      console.log('✓ XP tables created successfully');
    } else {
      console.log('✗ XP tables not found - manual migration may be needed');
    }

    const { count: userCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const { count: xpUserCount } = await supabase
      .from('user_xp')
      .select('*', { count: 'exact', head: true });

    console.log(`\nUsers in system: ${userCount}`);
    console.log(`Users with XP: ${xpUserCount || 0}`);

    if (userCount > 0 && (xpUserCount || 0) === 0) {
      console.log('\n⚠️  Users haven\'t been migrated to XP yet.');
      console.log('This is normal for the first run.');
      console.log('\nTo complete migration, run this SQL in Supabase dashboard:');
      console.log('SELECT migrate_existing_users_to_xp();');
    }

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Alternative: Direct SQL execution for Supabase
async function executeSQLDirect() {
  console.log('\n========================================');
  console.log('Alternative: Direct SQL Execution');
  console.log('========================================\n');
  
  console.log('Since automated execution may have limitations,');
  console.log('here\'s how to apply the migration manually:\n');
  
  console.log('1. Go to your Supabase Dashboard:');
  console.log(`   https://app.supabase.com/project/aicahushpcslwjwrlqbo/editor`);
  console.log('\n2. Click on "SQL Editor" in the left sidebar');
  console.log('\n3. Click "New query"');
  console.log('\n4. Copy and paste the contents of:');
  console.log('   supabase/migrations/20250820_add_xp_to_existing.sql');
  console.log('\n5. Click "Run" to execute the migration');
  console.log('\n6. After it completes, run this to migrate existing users:');
  console.log('   SELECT migrate_existing_users_to_xp();');
  
  console.log('\n========================================');
  console.log('Opening Supabase Dashboard...');
  console.log('========================================');
  
  // Try to open the dashboard
  const { exec } = require('child_process');
  exec('open https://app.supabase.com/project/aicahushpcslwjwrlqbo/editor');
}

// Run the migration
applyXPMigration().then(() => {
  console.log('\n✅ Migration process completed!');
  console.log('\nNext steps:');
  console.log('1. Verify the XP system in your Supabase dashboard');
  console.log('2. Update your frontend components to show XP');
  console.log('3. Test with a new trend submission');
  
  // Show how to do it manually if needed
  executeSQLDirect();
}).catch(error => {
  console.error('Migration failed:', error);
  executeSQLDirect();
});