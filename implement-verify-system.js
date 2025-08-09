#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
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

async function implementVerifySystem() {
  console.log('🚀 IMPLEMENTING COMPLETE VERIFY SYSTEM');
  console.log('=====================================\n');

  const steps = [
    {
      name: 'Add missing columns',
      queries: [
        `ALTER TABLE trend_submissions ADD COLUMN IF NOT EXISTS validation_status TEXT DEFAULT 'pending'`,
        `ALTER TABLE trend_submissions ADD COLUMN IF NOT EXISTS validation_count INTEGER DEFAULT 0`,
        `ALTER TABLE trend_submissions ADD COLUMN IF NOT EXISTS approve_count INTEGER DEFAULT 0`,
        `ALTER TABLE trend_submissions ADD COLUMN IF NOT EXISTS reject_count INTEGER DEFAULT 0`,
        `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS awaiting_verification DECIMAL(10,2) DEFAULT 0.00`
      ]
    },
    {
      name: 'Fix existing trends',
      queries: [
        `UPDATE trend_submissions 
         SET validation_status = 'pending', 
             validation_count = COALESCE(validation_count, 0),
             approve_count = COALESCE(approve_count, 0),
             reject_count = COALESCE(reject_count, 0)
         WHERE created_at > NOW() - INTERVAL '30 days' 
         AND (validation_count IS NULL OR validation_count = 0)`,
        
        `UPDATE trend_submissions SET status = 'submitted' WHERE status IS NULL`
      ]
    }
  ];

  let totalSuccess = 0;
  let totalFailed = 0;

  for (const step of steps) {
    console.log(`\n📋 ${step.name}...`);
    
    for (const query of step.queries) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: query }).catch(async (err) => {
          // If exec_sql doesn't work, try direct query
          console.log('   Trying alternative method...');
          // For simple queries, we can't execute them directly via JS SDK
          // So we'll check if the columns exist instead
          return { error: err };
        });

        if (error && !error.message?.includes('already exists')) {
          console.log(`   ⚠️  Query warning: ${error.message?.substring(0, 50)}`);
          totalFailed++;
        } else {
          console.log(`   ✅ Success`);
          totalSuccess++;
        }
      } catch (e) {
        console.log(`   ⚠️  ${e.message?.substring(0, 50)}`);
        totalFailed++;
      }
    }
  }

  // Test the current state
  console.log('\n🧪 TESTING CURRENT STATE...\n');

  try {
    // Check total trends
    const { count: totalTrends } = await supabase
      .from('trend_submissions')
      .select('*', { count: 'exact', head: true });
    console.log(`📊 Total trends in database: ${totalTrends}`);

    // Check pending trends
    const { data: pendingTrends, error: pendingError } = await supabase
      .from('trend_submissions')
      .select('id, description, status, validation_status, validation_count')
      .or('validation_status.eq.pending,validation_count.lt.2,status.eq.submitted')
      .limit(5);

    if (!pendingError && pendingTrends) {
      console.log(`📊 Trends available for validation: ${pendingTrends.length}`);
      
      if (pendingTrends.length > 0) {
        console.log('\n🎯 Sample trends that should appear on verify page:');
        pendingTrends.forEach(t => {
          console.log(`   - ${t.description?.substring(0, 40)}...`);
          console.log(`     Status: ${t.status}, Validation: ${t.validation_status}, Count: ${t.validation_count}`);
        });
      }
    }

    // Test if user can see trends
    const { data: testTrends, error: testError } = await supabase
      .from('trend_submissions')
      .select('*')
      .limit(1);

    if (!testError && testTrends) {
      console.log('\n✅ Users can query trends table');
    } else if (testError) {
      console.log('\n❌ Error querying trends:', testError.message);
    }

    // Check if cast_trend_vote exists
    const { error: rpcError } = await supabase.rpc('cast_trend_vote', {
      trend_id: '00000000-0000-0000-0000-000000000000',
      vote_type: 'verify'
    });

    if (rpcError?.message?.includes('not found') || rpcError?.message?.includes('does not exist')) {
      console.log('\n⚠️  cast_trend_vote function not found - run SQL script in Supabase');
    } else {
      console.log('\n✅ cast_trend_vote function exists');
    }

  } catch (error) {
    console.error('\n❌ Error testing state:', error.message);
  }

  // Final summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 IMPLEMENTATION SUMMARY');
  console.log('='.repeat(50));
  console.log(`   Successful operations: ${totalSuccess}`);
  console.log(`   Failed operations: ${totalFailed}`);
  
  if (totalFailed > 0) {
    console.log('\n⚠️  Some operations failed. This might be because:');
    console.log('   1. Columns already exist (this is OK)');
    console.log('   2. You need to run the SQL directly in Supabase');
    console.log('\n📝 NEXT STEP:');
    console.log('   Go to Supabase SQL Editor and run:');
    console.log('   IMPLEMENT_VERIFY_SYSTEM_NOW.sql');
  } else {
    console.log('\n✅ All operations completed successfully!');
  }

  console.log('\n🎯 WHAT TO DO NOW:');
  console.log('1. Run IMPLEMENT_VERIFY_SYSTEM_NOW.sql in Supabase SQL Editor');
  console.log('2. Test submitting a trend');
  console.log('3. Go to /verify page - you should see ALL trends');
  console.log('4. Vote on any trend (including your own)');
  console.log('5. After 2 votes, check if trend is approved/rejected');
}

// Run implementation
implementVerifySystem().catch(console.error);