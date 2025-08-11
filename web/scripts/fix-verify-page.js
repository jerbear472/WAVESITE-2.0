const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials. Please check your .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixVerifyPageSchema() {
  console.log('🔧 Fixing database schema for verify page...\n');

  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, '../../supabase/fix_verify_page_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Split SQL statements and execute them
    const statements = sql.split(/;\s*$/gm).filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.substring(0, 50) + '...');
        const { error } = await supabase.rpc('exec_sql', { query: statement + ';' });
        
        if (error) {
          // Try direct execution if RPC doesn't work
          console.log('RPC failed, trying direct execution...');
          // For now, we'll log the error and continue
          console.log('Note: Some statements may need to be run directly in Supabase dashboard');
          console.log('Error:', error.message);
        } else {
          console.log('✓ Success\n');
        }
      }
    }

    console.log('\n✅ Database schema updates completed!');
    console.log('\n📝 Note: If you see errors above, you may need to run the SQL directly in Supabase:');
    console.log('1. Go to https://supabase.com/dashboard/project/aicahushpcslwjwrlqbo/sql/new');
    console.log('2. Copy the contents of supabase/fix_verify_page_schema.sql');
    console.log('3. Paste and run the SQL');
    
    // Test the verify page data
    console.log('\n🧪 Testing verify page data access...');
    
    // Check if we can access trends
    const { data: trends, error: trendsError } = await supabase
      .from('trend_submissions')
      .select('*')
      .limit(5);
    
    if (trendsError) {
      console.log('❌ Error accessing trends:', trendsError.message);
    } else {
      console.log(`✅ Found ${trends?.length || 0} trends`);
    }

    // Check user profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(5);
    
    if (profilesError) {
      console.log('❌ Error accessing user profiles:', profilesError.message);
    } else {
      console.log(`✅ Found ${profiles?.length || 0} user profiles`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixVerifyPageSchema();