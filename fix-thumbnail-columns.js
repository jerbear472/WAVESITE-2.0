#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './web/.env.local' });

// Get Supabase credentials from environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixThumbnailColumns() {
  console.log('🔧 Adding missing thumbnail columns to trend_submissions table...\n');

  try {
    // Step 1: Add missing columns
    console.log('📦 Adding columns if they don\'t exist...');
    const addColumnsQuery = `
      ALTER TABLE public.trend_submissions 
      ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
      ADD COLUMN IF NOT EXISTS wave_score INTEGER DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS post_url TEXT,
      ADD COLUMN IF NOT EXISTS screenshot_url TEXT;
    `;

    const { data: addResult, error: addError } = await supabase.rpc('exec_sql', {
      sql: addColumnsQuery
    }).single();

    if (addError && !addError.message?.includes('already exists')) {
      // Try direct execution if RPC doesn't work
      console.log('⚠️ RPC failed, trying direct query...');
      const { error: directError } = await supabase.from('trend_submissions').select('id').limit(1);
      
      if (!directError) {
        console.log('✅ Table is accessible, columns might already exist');
      } else {
        throw directError;
      }
    } else {
      console.log('✅ Columns added successfully (or already existed)');
    }

    // Step 2: Check which columns exist
    console.log('\n📊 Checking column status...');
    const checkColumnsQuery = `
      SELECT 
        column_name, 
        data_type, 
        is_nullable, 
        column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'trend_submissions' 
        AND column_name IN ('thumbnail_url', 'wave_score', 'post_url', 'screenshot_url')
      ORDER BY column_name;
    `;

    // Try to check columns via a test query
    const { data: testData, error: testError } = await supabase
      .from('trend_submissions')
      .select('id, thumbnail_url, wave_score, post_url, screenshot_url')
      .limit(1);

    if (!testError) {
      console.log('✅ All thumbnail-related columns are accessible:');
      console.log('   - thumbnail_url: ✓');
      console.log('   - wave_score: ✓');
      console.log('   - post_url: ✓');
      console.log('   - screenshot_url: ✓');
    } else if (testError.message?.includes('column')) {
      console.log('⚠️ Some columns might be missing. Error:', testError.message);
      
      // Try to add columns individually
      const columns = [
        { name: 'thumbnail_url', type: 'TEXT' },
        { name: 'wave_score', type: 'INTEGER DEFAULT NULL' },
        { name: 'post_url', type: 'TEXT' },
        { name: 'screenshot_url', type: 'TEXT' }
      ];

      for (const column of columns) {
        try {
          const { data, error } = await supabase
            .from('trend_submissions')
            .select(column.name)
            .limit(1);
          
          if (error && error.message?.includes('column')) {
            console.log(`❌ Column ${column.name} is missing - needs to be added manually`);
          } else {
            console.log(`✅ Column ${column.name} exists`);
          }
        } catch (e) {
          console.log(`⚠️ Could not check ${column.name}`);
        }
      }
    }

    // Step 3: Test with a sample query
    console.log('\n🧪 Testing column functionality...');
    const { data: recentTrends, error: queryError } = await supabase
      .from('trend_submissions')
      .select('id, description, thumbnail_url, wave_score, post_url, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (!queryError) {
      console.log(`✅ Successfully queried ${recentTrends?.length || 0} recent trends`);
      
      // Check how many have thumbnails
      const withThumbnails = recentTrends?.filter(t => t.thumbnail_url)?.length || 0;
      const withWaveScores = recentTrends?.filter(t => t.wave_score !== null)?.length || 0;
      
      console.log(`   - ${withThumbnails} trends have thumbnails`);
      console.log(`   - ${withWaveScores} trends have wave scores`);
    } else {
      console.log('❌ Query error:', queryError.message);
    }

    console.log('\n' + '='.repeat(60));
    console.log('📋 NEXT STEPS:');
    console.log('='.repeat(60));
    
    console.log('\nIf columns are missing, run this SQL in your Supabase SQL Editor:');
    console.log('\n```sql');
    console.log(addColumnsQuery.trim());
    console.log('```\n');
    
    console.log('Then verify with:');
    console.log('\n```sql');
    console.log(`SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'trend_submissions' 
  AND column_name IN ('thumbnail_url', 'wave_score', 'post_url', 'screenshot_url');`);
    console.log('```\n');

    console.log('✅ Script completed successfully!');

  } catch (error) {
    console.error('\n❌ Error:', error.message || error);
    console.error('\nFull error:', error);
    
    console.log('\n' + '='.repeat(60));
    console.log('🔧 MANUAL FIX REQUIRED');
    console.log('='.repeat(60));
    console.log('\n1. Go to your Supabase Dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Run the following SQL:\n');
    console.log(`ALTER TABLE public.trend_submissions 
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS wave_score INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS post_url TEXT,
ADD COLUMN IF NOT EXISTS screenshot_url TEXT;`);
    
    process.exit(1);
  }
}

// Run the fix
fixThumbnailColumns().catch(console.error);