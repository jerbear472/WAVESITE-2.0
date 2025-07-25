const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read Supabase configuration from environment or use defaults
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'your-service-key';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('Applying admin features migration...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, '../../supabase/add_admin_features.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('Error applying migration:', error);
      return;
    }
    
    console.log('Migration applied successfully!');
    console.log('Remember to update jeremyuys to admin role in the database.');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Instructions for manual application
console.log(`
To apply the admin features:

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of supabase/add_admin_features.sql
4. Run the SQL commands

Or set the environment variables and run:
NEXT_PUBLIC_SUPABASE_URL=your-url SUPABASE_SERVICE_KEY=your-key node scripts/apply-admin-features.js
`);

// Only run if environment variables are set
if (process.env.SUPABASE_SERVICE_KEY) {
  applyMigration();
}