const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase configuration. Please set environment variables.');
  process.exit(1);
}

// Use service key if available for admin operations, otherwise use anon key
const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

async function runMigration() {
  try {
    console.log('🔧 Running database migration to fix missing columns...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'supabase/migrations/002_add_validation_columns.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      // If RPC doesn't exist, try a different approach
      console.log('⚠️  Direct SQL execution not available. Attempting alternative method...');
      
      // Check if the column already exists
      const { data: columns, error: checkError } = await supabase
        .from('captured_trends')
        .select('*')
        .limit(1);
      
      if (checkError && checkError.message.includes('positive_votes')) {
        console.log('✅ Confirmed: positive_votes column is missing.');
        console.log('\n📋 Please run the following SQL in your Supabase SQL editor:');
        console.log('\n' + migrationSQL);
        console.log('\n🔗 Go to: https://app.supabase.com/project/[YOUR_PROJECT_ID]/editor/sql');
      } else {
        console.log('✅ Database schema appears to be up to date.');
      }
    } else {
      console.log('✅ Migration completed successfully!');
    }
    
  } catch (error) {
    console.error('❌ Error during migration:', error.message);
    console.log('\n📋 Please manually run the SQL migration in your Supabase dashboard:');
    console.log('\n1. Go to your Supabase project');
    console.log('2. Navigate to the SQL Editor');
    console.log('3. Copy and paste the contents of:');
    console.log('   mobile/supabase/migrations/002_add_validation_columns.sql');
    console.log('4. Execute the query');
  }
}

// Run the migration
runMigration();