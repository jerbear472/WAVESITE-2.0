require('dotenv').config({ path: './web/.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Initialize Supabase client with service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMetadataColumns() {
  console.log('📊 Checking and applying social media metadata columns...\n');

  try {
    // First, let's check the current schema
    const { data: columns, error: schemaError } = await supabase
      .rpc('get_table_columns', { table_name: 'trend_submissions' })
      .single();

    if (schemaError) {
      console.log('Could not check schema directly. Will attempt to add columns anyway.');
    }

    // Test if columns exist by trying to select them
    console.log('Testing if social media columns exist...');
    const { data: testData, error: testError } = await supabase
      .from('trend_submissions')
      .select('id, comments_count, likes_count, creator_handle')
      .limit(1);

    if (testError && testError.message.includes("Could not find the 'comments_count' column")) {
      console.log('❌ Social media columns are missing. You need to run the migration SQL.');
      console.log('\nPlease run the following SQL in your Supabase dashboard:');
      console.log('1. Go to https://supabase.com/dashboard');
      console.log('2. Select your project');
      console.log('3. Go to SQL Editor');
      console.log('4. Run the contents of: supabase/add_social_media_metadata.sql');
      console.log('\nOr run: cat supabase/add_social_media_metadata.sql | pbcopy');
      console.log('Then paste in the Supabase SQL editor.');
      return false;
    } else if (!testError) {
      console.log('✅ Social media columns already exist!');
      return true;
    }

    console.log('Unexpected error:', testError);
    return false;

  } catch (error) {
    console.error('Error checking schema:', error);
    return false;
  }
}

// Run the check
applyMetadataColumns().then(success => {
  if (success) {
    console.log('\n✅ Database schema is ready for social media metadata!');
    console.log('You can now submit trends with full social media information.');
  } else {
    console.log('\n❌ Database schema needs to be updated.');
  }
});