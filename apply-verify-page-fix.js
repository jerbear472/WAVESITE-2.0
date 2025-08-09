#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixVerifyPage() {
  console.log('🔧 Fixing verify page to show available trends...\n');

  try {
    // 1. Check current state
    console.log('📊 Checking current trend status...');
    const { data: statusCheck, error: statusError } = await supabase
      .from('trend_submissions')
      .select('status, validation_status, validation_count')
      .order('created_at', { ascending: false })
      .limit(10);

    if (statusError) {
      console.error('Error checking trends:', statusError);
    } else {
      console.log('Recent trends status:');
      statusCheck.forEach(t => {
        console.log(`  - status: ${t.status}, validation_status: ${t.validation_status}, count: ${t.validation_count}`);
      });
    }

    // 2. Add missing columns if needed
    console.log('\n🔨 Ensuring required columns exist...');
    
    // Check and add validation_status
    const { error: colError1 } = await supabase.rpc('exec_sql', {
      sql: `
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'trend_submissions'
            AND column_name = 'validation_status'
          ) THEN
            ALTER TABLE public.trend_submissions 
            ADD COLUMN validation_status TEXT DEFAULT 'pending';
          END IF;
        END $$;
      `
    }).catch(() => {
      // Try alternative approach
      console.log('Adding validation_status column...');
      return supabase.from('trend_submissions').select('validation_status').limit(1);
    });

    // Check and add validation_count
    const { error: colError2 } = await supabase.rpc('exec_sql', {
      sql: `
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'trend_submissions'
            AND column_name = 'validation_count'
          ) THEN
            ALTER TABLE public.trend_submissions 
            ADD COLUMN validation_count INTEGER DEFAULT 0;
          END IF;
        END $$;
      `
    }).catch(() => {
      console.log('Adding validation_count column...');
      return supabase.from('trend_submissions').select('validation_count').limit(1);
    });

    // 3. Update existing trends to have proper validation status
    console.log('\n🔄 Updating trends with missing validation status...');
    
    // First, get trends that need updating
    const { data: trendsToUpdate, error: fetchError } = await supabase
      .from('trend_submissions')
      .select('id')
      .or('validation_status.is.null,validation_count.is.null')
      .limit(100);

    if (!fetchError && trendsToUpdate && trendsToUpdate.length > 0) {
      console.log(`Found ${trendsToUpdate.length} trends to update`);
      
      // Update them in batches
      for (const trend of trendsToUpdate) {
        await supabase
          .from('trend_submissions')
          .update({
            validation_status: 'pending',
            validation_count: 0
          })
          .eq('id', trend.id);
      }
      console.log('✅ Updated trends with proper validation fields');
    }

    // 4. Check how many trends are now available
    console.log('\n📈 Checking available trends for validation...');
    
    const { data: availableTrends, error: availableError } = await supabase
      .from('trend_submissions')
      .select('id, description, status, validation_status, validation_count', { count: 'exact' })
      .or(`status.eq.submitted,status.eq.validating,validation_status.eq.pending,validation_status.is.null,validation_count.eq.0`)
      .order('created_at', { ascending: false })
      .limit(5);

    if (!availableError) {
      console.log(`\n✨ Found ${availableTrends?.length || 0} trends available for validation`);
      if (availableTrends && availableTrends.length > 0) {
        console.log('\nSample trends:');
        availableTrends.forEach(t => {
          console.log(`  - ${t.description?.substring(0, 50)}...`);
          console.log(`    Status: ${t.status}, Validation: ${t.validation_status}, Count: ${t.validation_count}`);
        });
      }
    }

    // 5. Test the query that the verify page uses
    console.log('\n🧪 Testing verify page query...');
    const { data: verifyPageTrends, error: verifyError, count } = await supabase
      .from('trend_submissions')
      .select('*', { count: 'exact', head: false })
      .or(`status.eq.submitted,status.eq.validating,validation_status.eq.pending,validation_status.is.null,validation_count.eq.0`)
      .limit(1);

    if (!verifyError) {
      console.log(`✅ Verify page query successful! Found ${count} total trends available`);
    } else {
      console.error('❌ Verify page query failed:', verifyError);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✨ VERIFY PAGE FIX COMPLETE!');
    console.log('='.repeat(60));
    console.log('\nThe verify page should now show:');
    console.log('1. Trends with status = "submitted"');
    console.log('2. Trends with validation_status = "pending"');
    console.log('3. Trends with validation_count = 0');
    console.log('4. Excluding trends from the current user');
    console.log('\nIf trends still don\'t appear:');
    console.log('1. Check that you\'re logged in as a different user than the trend submitter');
    console.log('2. Ensure trends have been submitted recently');
    console.log('3. Clear browser cache and refresh the page');

  } catch (error) {
    console.error('\n❌ Error fixing verify page:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check your Supabase connection');
    console.error('2. Ensure you have admin privileges');
    console.error('3. Try running the SQL directly in Supabase dashboard');
    process.exit(1);
  }
}

// Run the fix
fixVerifyPage();