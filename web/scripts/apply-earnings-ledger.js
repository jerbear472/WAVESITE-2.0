const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyEarningsLedger() {
  try {
    console.log('Applying earnings ledger schema...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, '../../supabase/add_earnings_ledger.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // If the RPC function doesn't exist, try a different approach
      console.log('Note: Could not execute SQL directly. Please run the following SQL in your Supabase SQL editor:');
      console.log('\n--- Copy and paste the following SQL ---\n');
      console.log(sql);
      console.log('\n--- End of SQL ---\n');
      console.log('You can find this SQL in: supabase/add_earnings_ledger.sql');
    } else {
      console.log('✅ Earnings ledger schema applied successfully!');
    }
    
    // Check if the tables were created
    console.log('\nChecking if earnings_ledger table exists...');
    const { data, error: checkError } = await supabase
      .from('earnings_ledger')
      .select('count')
      .limit(1);
    
    if (!checkError) {
      console.log('✅ earnings_ledger table is accessible');
    } else {
      console.log('⚠️  earnings_ledger table not found. Please apply the SQL manually in Supabase.');
    }
    
  } catch (error) {
    console.error('Error applying earnings ledger:', error);
  }
}

applyEarningsLedger();