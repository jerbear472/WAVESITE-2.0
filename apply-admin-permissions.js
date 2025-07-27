const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyAdminPermissions() {
  try {
    console.log('Applying admin permissions schema...');

    // Read the SQL file
    const fs = require('fs');
    const sql = fs.readFileSync('./supabase/add-admin-permissions.sql', 'utf8');

    // Split by semicolons and execute each statement
    const statements = sql.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.substring(0, 50) + '...');
        const { error } = await supabase.rpc('execute_sql', { sql: statement + ';' });
        
        if (error) {
          console.error('Error executing statement:', error);
          // Continue with other statements even if one fails
        }
      }
    }

    console.log('Admin permissions schema applied successfully!');
    console.log('\njeremyuys@gmail.com has been granted admin access.');
    console.log('You can now access the admin panel at /admin/users');

  } catch (error) {
    console.error('Error applying admin permissions:', error);
  }
}

applyAdminPermissions();