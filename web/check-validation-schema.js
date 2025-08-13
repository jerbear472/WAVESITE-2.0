// Check the trend_validations table schema
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for admin access
);

async function checkSchema() {
  console.log('Checking trend_validations table schema...\n');
  
  // Get table columns
  const { data: columns, error: columnsError } = await supabase
    .from('trend_validations')
    .select('*')
    .limit(0);
  
  if (columnsError) {
    console.error('Error accessing trend_validations:', columnsError);
    return;
  }
  
  // Get actual column info from information_schema
  const { data: columnInfo, error: infoError } = await supabase
    .rpc('get_table_columns', { table_name: 'trend_validations' })
    .catch(() => ({ data: null, error: 'RPC not available' }));
  
  if (columnInfo) {
    console.log('Columns in trend_validations table:');
    columnInfo.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });
  } else {
    // Try a simpler approach - insert a dummy record to see the error
    console.log('Attempting to understand schema through error messages...\n');
    
    const { error: insertError } = await supabase
      .from('trend_validations')
      .insert({
        trend_submission_id: '00000000-0000-0000-0000-000000000000',
        validator_id: '00000000-0000-0000-0000-000000000000',
        vote: 'verify'
      });
    
    if (insertError) {
      console.log('Insert error (expected):', insertError.message);
      console.log('\nThis error helps us understand the schema requirements.');
    }
  }
  
  // Check if cast_trend_vote function exists
  console.log('\n\nChecking cast_trend_vote function...');
  const { data: voteResult, error: voteError } = await supabase
    .rpc('cast_trend_vote', {
      p_trend_id: '00000000-0000-0000-0000-000000000000',
      p_vote: 'verify'
    });
  
  if (voteError) {
    console.log('Function error:', voteError.message);
    if (voteError.message.includes('user_id')) {
      console.log('\n⚠️  ERROR FOUND: The function or a trigger is referencing "user_id" instead of "validator_id"');
      console.log('This needs to be fixed in the database function/trigger.');
    }
  } else {
    console.log('Function response:', voteResult);
  }
}

checkSchema().catch(console.error);