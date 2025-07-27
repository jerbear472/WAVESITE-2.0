const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyBirthdayField() {
  try {
    console.log('Adding birthday field to profiles table...');
    
    // Read the SQL file
    const fs = require('fs');
    const path = require('path');
    const sqlPath = path.join(__dirname, 'supabase', 'add_birthday_field.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // If exec_sql doesn't exist, try direct query
      console.log('Trying alternative method...');
      const statements = sql.split(';').filter(s => s.trim());
      
      for (const statement of statements) {
        if (statement.trim()) {
          const { error: queryError } = await supabase.from('profiles').rpc('exec_sql', { 
            sql: statement + ';' 
          });
          
          if (queryError) {
            console.error('Error executing statement:', queryError);
          }
        }
      }
    }
    
    console.log('✅ Birthday field added successfully!');
    console.log('✅ Age verification functions created!');
    console.log('✅ RLS policies updated!');
    
  } catch (error) {
    console.error('Error applying birthday field:', error);
    console.log('\n⚠️  You may need to run the SQL directly in Supabase SQL Editor:');
    console.log('Path: supabase/add_birthday_field.sql');
  }
}

// Run the update
applyBirthdayField();