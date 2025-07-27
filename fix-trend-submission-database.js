require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixTrendSubmissionTable() {
  console.log('🔧 Fixing trend_submissions table...\n');

  try {
    // Test the connection first
    const { data: testData, error: testError } = await supabase
      .from('trend_submissions')
      .select('id')
      .limit(1);

    if (testError && testError.message.includes('relation "public.trend_submissions" does not exist')) {
      console.log('❌ Table trend_submissions does not exist. Please run the SQL script in Supabase dashboard first.');
      console.log('\nGo to: https://app.supabase.com → SQL Editor → New Query');
      console.log('Then paste and run the contents of: fix-submit-trend-foreign-key.sql\n');
      return;
    }

    // Check what columns exist
    const { data: columns, error: columnError } = await supabase.rpc('get_table_columns', {
      table_name: 'trend_submissions'
    }).single();

    if (columnError) {
      console.log('⚠️  Could not check table columns. The table might need to be created or fixed.');
      console.log('\nTo fix this:');
      console.log('1. Go to your Supabase dashboard: https://app.supabase.com');
      console.log('2. Navigate to SQL Editor → New Query');
      console.log('3. Copy and run the contents of: fix-submit-trend-foreign-key.sql');
      console.log('\nThis will:');
      console.log('- Create the trend_submissions table if it doesn\'t exist');
      console.log('- Add all required columns');
      console.log('- Fix foreign key constraints');
      console.log('- Set up proper RLS policies');
      return;
    }

    // Test if we can insert
    const testInsert = {
      spotter_id: '00000000-0000-0000-0000-000000000000', // dummy UUID
      category: 'meme_format',
      description: 'Test trend',
      evidence: { test: true },
      status: 'submitted'
    };

    const { error: insertError } = await supabase
      .from('trend_submissions')
      .insert(testInsert);

    if (insertError) {
      console.log('❌ Insert test failed:', insertError.message);
      
      if (insertError.message.includes('violates foreign key constraint')) {
        console.log('\n⚠️  Foreign key constraint issue detected!');
        console.log('The spotter_id must reference a valid user in the profiles table.');
        console.log('\nPlease run the SQL fix in Supabase dashboard to correct this.');
      } else if (insertError.message.includes('null value in column')) {
        console.log('\n⚠️  Missing required columns detected!');
        console.log('Please run the SQL fix to add all required columns.');
      }
    } else {
      // Clean up test insert
      await supabase
        .from('trend_submissions')
        .delete()
        .eq('spotter_id', '00000000-0000-0000-0000-000000000000');

      console.log('✅ Table structure appears to be correct!');
      console.log('The trend submission should work now.');
    }

  } catch (error) {
    console.error('❌ Error checking table:', error.message);
    console.log('\nPlease run the SQL script manually in Supabase dashboard.');
  }
}

// Add RPC function if it doesn't exist
async function createColumnCheckFunction() {
  const functionSQL = `
    CREATE OR REPLACE FUNCTION get_table_columns(table_name text)
    RETURNS json AS $$
    BEGIN
      RETURN (
        SELECT json_agg(column_name)
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = $1
      );
    END;
    $$ LANGUAGE plpgsql;
  `;

  try {
    await supabase.rpc('query', { query: functionSQL });
  } catch (error) {
    // Function might already exist, that's ok
  }
}

async function main() {
  console.log('🚀 WaveSite Trend Submission Fix\n');
  
  await createColumnCheckFunction();
  await fixTrendSubmissionTable();
  
  console.log('\n📝 Next Steps:');
  console.log('1. If the table needs fixes, go to Supabase SQL Editor');
  console.log('2. Run the fix-submit-trend-foreign-key.sql script');
  console.log('3. Try submitting a trend again');
  console.log('\nIf you still see errors, check the browser console for details.');
}

main().catch(console.error);