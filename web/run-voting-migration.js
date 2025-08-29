const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: './.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function runMigration() {
  console.log('🚀 Running voting tables migration...\n');
  
  try {
    // Read the SQL file
    const sql = fs.readFileSync('./create-voting-tables.sql', 'utf8');
    
    // Execute via direct API call
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ query: sql })
    });
    
    if (!response.ok) {
      // Try using the SQL editor endpoint
      const editorResponse = await fetch(`${supabaseUrl.replace('/rest/v1', '')}/sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({ query: sql })
      });
      
      if (!editorResponse.ok) {
        console.log('Could not execute via API. Please run the following SQL manually in Supabase dashboard:\n');
        console.log('='.repeat(60));
        console.log(sql);
        console.log('='.repeat(60));
        return;
      }
    }
    
    console.log('✅ Migration completed successfully!');
    
    // Test the new table
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
      .from('trend_user_votes')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error testing table:', error);
    } else {
      console.log('✅ Table trend_user_votes created and accessible!');
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
    console.log('\nPlease run the SQL in create-voting-tables.sql manually in your Supabase dashboard.');
  }
}

runMigration();