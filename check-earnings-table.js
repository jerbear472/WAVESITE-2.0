const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkEarnings() {
  console.log('🔍 Checking earnings_ledger table...');
  
  // Check if table exists
  const { data: tables, error: tableError } = await supabase
    .from('earnings_ledger')
    .select('*')
    .limit(5);
    
  if (tableError) {
    console.error('❌ Error accessing earnings_ledger:', tableError.message);
    if (tableError.message.includes('does not exist')) {
      console.log('⚠️ Table does not exist! Need to create it.');
      return true; // Indicate table needs creation
    }
    return false;
  }
  
  console.log('✅ Found', tables?.length || 0, 'earnings records');
  if (tables && tables.length > 0) {
    console.log('📊 Sample record:', JSON.stringify(tables[0], null, 2));
  }
  
  // Check recent trend submissions
  const { data: trends, error: trendsError } = await supabase
    .from('trend_submissions')
    .select('id, spotter_id, payment_amount, status, created_at')
    .order('created_at', { ascending: false })
    .limit(3);
    
  if (!trendsError && trends) {
    console.log('\n📈 Recent trend submissions:', trends.length);
    trends.forEach(t => {
      console.log('  - Amount: $' + (t.payment_amount || 0) + ', Status: ' + t.status);
    });
  }
  
  // Check if columns exist
  const { data: columns, error: colError } = await supabase
    .rpc('get_table_columns', { table_name: 'earnings_ledger' })
    .select('*');
    
  if (!colError && columns) {
    console.log('\n📋 Earnings ledger columns:', columns.map(c => c.column_name).join(', '));
  }
  
  return false;
}

checkEarnings().then(needsCreation => {
  if (needsCreation) {
    console.log('\n⚠️ NEED TO CREATE EARNINGS_LEDGER TABLE!');
    process.exit(1);
  }
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});