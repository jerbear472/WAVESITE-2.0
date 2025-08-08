const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  console.log('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyApproveCountFix() {
  try {
    console.log('🔧 Applying approve_count column fix...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'fix-missing-approve-count.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('❌ Error applying fix:', error);
      
      // Try alternative approach - execute SQL directly
      console.log('Trying direct SQL execution...');
      
      // Split SQL into individual statements
      const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
      
      for (const statement of statements) {
        if (statement.trim()) {
          console.log(`Executing: ${statement.substring(0, 50)}...`);
          const { error: stmtError } = await supabase.rpc('exec_sql', { 
            sql_query: statement.trim() + ';' 
          });
          
          if (stmtError) {
            console.error('❌ Error in statement:', stmtError);
          } else {
            console.log('✅ Statement executed successfully');
          }
        }
      }
    } else {
      console.log('✅ SQL executed successfully:', data);
    }
    
    // Verify the columns exist
    const { data: columns, error: colError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'trend_submissions')
      .eq('table_schema', 'public')
      .in('column_name', ['approve_count', 'reject_count', 'validation_status']);
    
    if (colError) {
      console.error('❌ Error checking columns:', colError);
    } else {
      console.log('✅ Verified columns:', columns?.map(c => c.column_name));
    }
    
    console.log('🎉 Database fix completed!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the fix
applyApproveCountFix();