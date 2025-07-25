const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY/SUPABASE_ANON_KEY in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Creating scroll_sessions table...');
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '003_create_scroll_sessions.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // For Supabase, we need to execute SQL through the REST API
    // First, let's check if the table already exists
    const { data: tables, error: checkError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'scroll_sessions')
      .single();
    
    if (tables) {
      console.log('✅ Table scroll_sessions already exists');
      return;
    }
    
    // If table doesn't exist, provide instructions
    console.log('\n📋 Table does not exist. Please run the following SQL in your Supabase SQL editor:');
    console.log('\n' + migrationSQL);
    console.log('\n🔗 Go to: https://app.supabase.com/project/[YOUR_PROJECT_ID]/sql/new');
    console.log('\n1. Copy the SQL above');
    console.log('2. Paste it in the SQL editor');
    console.log('3. Click "Run" to execute');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n📋 Please manually run the migration in your Supabase dashboard:');
    console.log('1. Go to your Supabase project');
    console.log('2. Navigate to the SQL Editor');
    console.log('3. Copy and paste the contents of:');
    console.log('   mobile/supabase/migrations/003_create_scroll_sessions.sql');
    console.log('4. Execute the query');
  }
}

// Run the migration
runMigration();