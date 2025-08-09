#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Use both keys for different tests
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

// Create two clients - one as user, one as admin
const userClient = createClient(supabaseUrl, supabaseAnonKey);
const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function diagnoseVerifyIssue() {
  console.log('🔍 DIAGNOSING VERIFY PAGE ISSUE');
  console.log('='.repeat(50));
  console.log('Supabase URL:', supabaseUrl);
  console.log('='.repeat(50) + '\n');

  // 1. Check if trends exist at all (using admin)
  console.log('1️⃣ CHECKING IF TRENDS EXIST (Admin View)...');
  try {
    const { data: allTrends, count } = await adminClient
      .from('trend_submissions')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(5);

    console.log(`   Total trends in database: ${count}`);
    
    if (allTrends && allTrends.length > 0) {
      console.log('   Recent trends:');
      allTrends.forEach(t => {
        console.log(`   - ID: ${t.id}`);
        console.log(`     Description: ${t.description?.substring(0, 50)}...`);
        console.log(`     Status: ${t.status}`);
        console.log(`     Validation Status: ${t.validation_status}`);
        console.log(`     Validation Count: ${t.validation_count}`);
        console.log(`     Created: ${new Date(t.created_at).toLocaleString()}\n`);
      });
    }
  } catch (error) {
    console.error('   ❌ Admin query failed:', error.message);
  }

  // 2. Check what a regular user sees
  console.log('\n2️⃣ CHECKING WHAT REGULAR USER SEES...');
  try {
    const { data: userTrends, error, count } = await userClient
      .from('trend_submissions')
      .select('*', { count: 'exact' })
      .limit(5);

    if (error) {
      console.error('   ❌ User query error:', error.message);
      console.log('   This might be an RLS issue!');
    } else {
      console.log(`   User can see ${count} trends total`);
      if (userTrends && userTrends.length > 0) {
        console.log(`   User sees ${userTrends.length} trends`);
      } else {
        console.log('   ⚠️  User sees NO trends - RLS is blocking!');
      }
    }
  } catch (error) {
    console.error('   ❌ User query failed:', error.message);
  }

  // 3. Check RLS policies
  console.log('\n3️⃣ CHECKING RLS POLICIES...');
  try {
    const { data: rlsEnabled } = await adminClient.rpc('exec_sql', {
      sql: `SELECT relrowsecurity FROM pg_class WHERE relname = 'trend_submissions';`
    }).catch(() => ({ data: null }));

    if (rlsEnabled) {
      console.log('   RLS is:', rlsEnabled[0]?.relrowsecurity ? 'ENABLED ⚠️' : 'DISABLED ✅');
    }

    // Check policies
    const { data: policies } = await adminClient.rpc('exec_sql', {
      sql: `
        SELECT policyname, cmd, qual 
        FROM pg_policies 
        WHERE tablename = 'trend_submissions' 
        AND schemaname = 'public';
      `
    }).catch(() => ({ data: [] }));

    if (policies && policies.length > 0) {
      console.log('   Existing policies:');
      policies.forEach(p => {
        console.log(`   - ${p.policyname} (${p.cmd})`);
      });
    } else {
      console.log('   No policies found or unable to check');
    }
  } catch (error) {
    console.log('   Unable to check RLS:', error.message);
  }

  // 4. Test the exact query the verify page uses
  console.log('\n4️⃣ TESTING VERIFY PAGE QUERIES...');
  
  // Test Query 1: Simple recent trends
  console.log('   Testing simple query (all recent trends)...');
  try {
    const { data: simpleTrends, error } = await userClient
      .from('trend_submissions')
      .select('*')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.log('   ❌ Simple query failed:', error.message);
    } else {
      console.log(`   ✅ Simple query returned ${simpleTrends?.length || 0} trends`);
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }

  // Test Query 2: With OR conditions
  console.log('   Testing OR query (with conditions)...');
  try {
    const { data: orTrends, error } = await userClient
      .from('trend_submissions')
      .select('*')
      .or('status.eq.submitted,validation_status.eq.pending,validation_count.eq.0')
      .limit(5);

    if (error) {
      console.log('   ❌ OR query failed:', error.message);
      console.log('   This might mean columns are missing!');
    } else {
      console.log(`   ✅ OR query returned ${orTrends?.length || 0} trends`);
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }

  // 5. Check table structure
  console.log('\n5️⃣ CHECKING TABLE STRUCTURE...');
  try {
    // Try to select specific columns
    const { data, error } = await userClient
      .from('trend_submissions')
      .select('id, status, validation_status, validation_count, approve_count, reject_count')
      .limit(1);

    if (error) {
      console.log('   ❌ Column check failed:', error.message);
      console.log('   Missing columns:', error.details || 'Unknown');
      
      // Try each column individually
      const columns = ['validation_status', 'validation_count', 'approve_count', 'reject_count'];
      for (const col of columns) {
        try {
          await userClient.from('trend_submissions').select(col).limit(1);
          console.log(`   ✅ Column '${col}' exists`);
        } catch (e) {
          console.log(`   ❌ Column '${col}' MISSING!`);
        }
      }
    } else {
      console.log('   ✅ All expected columns exist');
    }
  } catch (error) {
    console.log('   ❌ Structure check failed:', error.message);
  }

  // 6. Check if user is authenticated
  console.log('\n6️⃣ CHECKING AUTHENTICATION...');
  try {
    const { data: { user }, error } = await userClient.auth.getUser();
    if (user) {
      console.log('   ✅ Authenticated as:', user.email);
      console.log('   User ID:', user.id);
    } else {
      console.log('   ⚠️  Not authenticated - using anonymous access');
    }
  } catch (error) {
    console.log('   Authentication check failed:', error.message);
  }

  // 7. Try to create a test trend
  console.log('\n7️⃣ TESTING TREND CREATION...');
  try {
    const testTrend = {
      description: 'Test trend from diagnose script',
      category: 'meme_format',
      status: 'submitted',
      spotter_id: '00000000-0000-0000-0000-000000000000' // Dummy ID
    };

    const { data, error } = await adminClient
      .from('trend_submissions')
      .insert(testTrend)
      .select()
      .single();

    if (error) {
      console.log('   ⚠️  Cannot create test trend:', error.message);
    } else {
      console.log('   ✅ Test trend created with ID:', data.id);
      console.log('   Status:', data.status);
      console.log('   Validation Status:', data.validation_status);
      
      // Clean up
      await adminClient.from('trend_submissions').delete().eq('id', data.id);
      console.log('   Cleaned up test trend');
    }
  } catch (error) {
    console.log('   Test creation failed:', error.message);
  }

  // DIAGNOSIS SUMMARY
  console.log('\n' + '='.repeat(50));
  console.log('📊 DIAGNOSIS SUMMARY');
  console.log('='.repeat(50));
  
  console.log('\n🔧 RECOMMENDED FIXES:');
  console.log('\n1. Run this SQL to disable RLS temporarily (for testing):');
  console.log('   ALTER TABLE trend_submissions DISABLE ROW LEVEL SECURITY;');
  
  console.log('\n2. Or create a permissive policy:');
  console.log(`   DROP POLICY IF EXISTS "Anyone can view trends" ON trend_submissions;
   CREATE POLICY "Anyone can view trends" ON trend_submissions
   FOR SELECT USING (true);`);
  
  console.log('\n3. Ensure all columns exist:');
  console.log(`   ALTER TABLE trend_submissions 
   ADD COLUMN IF NOT EXISTS validation_status TEXT DEFAULT 'pending',
   ADD COLUMN IF NOT EXISTS validation_count INTEGER DEFAULT 0,
   ADD COLUMN IF NOT EXISTS approve_count INTEGER DEFAULT 0,
   ADD COLUMN IF NOT EXISTS reject_count INTEGER DEFAULT 0;`);
  
  console.log('\n4. Update all trends to have proper values:');
  console.log(`   UPDATE trend_submissions 
   SET validation_status = 'pending',
       validation_count = 0
   WHERE validation_status IS NULL;`);

  console.log('\n💡 QUICK FIX - Run this in Supabase SQL Editor:');
  console.log('----------------------------------------');
  console.log(`-- Quick fix to make trends visible
ALTER TABLE trend_submissions DISABLE ROW LEVEL SECURITY;

-- Or if you want to keep RLS:
ALTER TABLE trend_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view trends" ON trend_submissions;
CREATE POLICY "Anyone can view trends" ON trend_submissions
FOR SELECT USING (true);`);
  console.log('----------------------------------------');
}

// Run diagnosis
diagnoseVerifyIssue().catch(console.error);