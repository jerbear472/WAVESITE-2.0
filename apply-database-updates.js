#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'web', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyDatabaseUpdates() {
  console.log('🔧 Applying database updates for trend submission...\n');

  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'supabase', 'apply_all_updates.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Note: Supabase JS client doesn't support raw SQL execution
    // Users need to run this SQL in Supabase dashboard
    console.log('📋 Please run the following SQL in your Supabase SQL Editor:');
    console.log('   1. Go to: https://supabase.com/dashboard/project/achuavagkhjenaypawij/sql/new');
    console.log('   2. Copy and paste the contents of: supabase/apply_all_updates.sql');
    console.log('   3. Click "Run" to execute the SQL\n');

    // Check if tables exist
    console.log('🔍 Checking current database state...\n');

    // Check trend_submissions table
    const { data: submissions, error: submissionsError } = await supabase
      .from('trend_submissions')
      .select('*')
      .limit(1);

    if (submissionsError) {
      console.log('❌ trend_submissions table not found or not accessible');
      console.log('   Error:', submissionsError.message);
    } else {
      console.log('✅ trend_submissions table exists');
    }

    // Check if trend_umbrellas table exists
    const { data: umbrellas, error: umbrellasError } = await supabase
      .from('trend_umbrellas')
      .select('*')
      .limit(1);

    if (umbrellasError && umbrellasError.message.includes('relation "public.trend_umbrellas" does not exist')) {
      console.log('❌ trend_umbrellas table does not exist - needs to be created');
    } else if (umbrellasError) {
      console.log('⚠️  trend_umbrellas table exists but has access issues');
      console.log('   Error:', umbrellasError.message);
    } else {
      console.log('✅ trend_umbrellas table exists and is accessible');
    }

    // Check storage bucket
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (!bucketsError && buckets) {
      const trendImagesBucket = buckets.find(b => b.name === 'trend-images');
      if (trendImagesBucket) {
        console.log('✅ trend-images storage bucket exists');
      } else {
        console.log('❌ trend-images storage bucket needs to be created');
      }
    }

    console.log('\n📝 Summary:');
    console.log('1. Run the SQL script in Supabase dashboard to ensure all tables and columns exist');
    console.log('2. The script will:');
    console.log('   - Add social media metadata columns to trend_submissions');
    console.log('   - Create trend_umbrellas table for grouping similar trends');
    console.log('   - Set up proper RLS policies');
    console.log('   - Create storage bucket for trend images');
    console.log('\n✨ After running the SQL, your trend submission feature will be fully functional!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the script
applyDatabaseUpdates();