#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function debugVerifyPage() {
  console.log('🔍 DEBUGGING VERIFY PAGE ISSUES\n');
  console.log('='.repeat(60));

  try {
    // 1. Check total trends in database
    console.log('\n1️⃣ CHECKING ALL TRENDS IN DATABASE:');
    const { data: allTrends, count: totalCount } = await supabase
      .from('trend_submissions')
      .select('*', { count: 'exact', head: true });
    
    console.log(`   Total trends in database: ${totalCount}`);

    // 2. Check recent trends (last 7 days)
    console.log('\n2️⃣ RECENT TRENDS (Last 7 days):');
    const { data: recentTrends, error: recentError } = await supabase
      .from('trend_submissions')
      .select('id, description, status, validation_status, validation_count, spotter_id, created_at')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentTrends && recentTrends.length > 0) {
      console.log(`   Found ${recentTrends.length} recent trends:`);
      recentTrends.forEach(t => {
        console.log(`   - ID: ${t.id.substring(0, 8)}...`);
        console.log(`     Description: ${t.description?.substring(0, 50)}...`);
        console.log(`     Status: ${t.status || 'NULL'}`);
        console.log(`     Validation Status: ${t.validation_status || 'NULL'}`);
        console.log(`     Validation Count: ${t.validation_count || 0}`);
        console.log(`     Created: ${new Date(t.created_at).toLocaleString()}`);
        console.log('');
      });
    } else {
      console.log('   ❌ No recent trends found!');
    }

    // 3. Check what statuses exist
    console.log('\n3️⃣ STATUS VALUES IN DATABASE:');
    const { data: statusGroups } = await supabase
      .from('trend_submissions')
      .select('status');
    
    const statusCounts = {};
    statusGroups?.forEach(t => {
      const status = t.status || 'NULL';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count} trends`);
    });

    // 4. Check validation_status values
    console.log('\n4️⃣ VALIDATION STATUS VALUES:');
    const { data: validationGroups } = await supabase
      .from('trend_submissions')
      .select('validation_status');
    
    const validationCounts = {};
    validationGroups?.forEach(t => {
      const status = t.validation_status || 'NULL';
      validationCounts[status] = (validationCounts[status] || 0) + 1;
    });
    
    Object.entries(validationCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count} trends`);
    });

    // 5. Test the exact query the verify page uses
    console.log('\n5️⃣ TESTING VERIFY PAGE QUERY:');
    const { data: verifyTrends, error: verifyError } = await supabase
      .from('trend_submissions')
      .select('*')
      .or(`status.eq.submitted,status.eq.validating,validation_status.eq.pending,validation_status.is.null,validation_count.eq.0`)
      .order('created_at', { ascending: false })
      .limit(20);

    if (verifyError) {
      console.log(`   ❌ Query error: ${verifyError.message}`);
    } else {
      console.log(`   ✅ Query returned ${verifyTrends?.length || 0} trends`);
      if (verifyTrends && verifyTrends.length > 0) {
        console.log('   First few trends:');
        verifyTrends.slice(0, 3).forEach(t => {
          console.log(`   - ${t.description?.substring(0, 50)}...`);
        });
      }
    }

    // 6. Check if there are trends that SHOULD be visible
    console.log('\n6️⃣ TRENDS THAT SHOULD BE VISIBLE FOR VALIDATION:');
    const { data: shouldBeVisible } = await supabase
      .from('trend_submissions')
      .select('id, description, status, validation_status, validation_count, approve_count, reject_count')
      .or('validation_count.eq.0,approve_count.eq.0')
      .limit(10);

    if (shouldBeVisible && shouldBeVisible.length > 0) {
      console.log(`   Found ${shouldBeVisible.length} trends with no validations:`);
      shouldBeVisible.forEach(t => {
        console.log(`   - ${t.description?.substring(0, 40)}...`);
        console.log(`     Validations: ${t.validation_count}, Approvals: ${t.approve_count}, Rejections: ${t.reject_count}`);
      });
    }

    // 7. Check RLS policies
    console.log('\n7️⃣ CHECKING RLS POLICIES:');
    const { data: policies } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT tablename, policyname, permissive, roles, cmd, qual
        FROM pg_policies
        WHERE tablename = 'trend_submissions'
        AND schemaname = 'public';
      `
    }).catch(() => {
      console.log('   Unable to check RLS policies (need admin access)');
      return { data: null };
    });

    if (policies) {
      console.log('   RLS Policies on trend_submissions:');
      policies.forEach(p => {
        console.log(`   - ${p.policyname} (${p.cmd}): ${p.permissive ? 'PERMISSIVE' : 'RESTRICTIVE'}`);
      });
    }

    // 8. Check if columns exist
    console.log('\n8️⃣ CHECKING TABLE STRUCTURE:');
    const testTrend = await supabase
      .from('trend_submissions')
      .select('id, status, validation_status, validation_count, approve_count, reject_count')
      .limit(1)
      .single();

    if (testTrend.error) {
      console.log(`   ❌ Error checking columns: ${testTrend.error.message}`);
      console.log('   Missing columns might be the issue!');
    } else {
      console.log('   ✅ All expected columns exist');
    }

    // 9. Try to fix missing columns
    console.log('\n9️⃣ ATTEMPTING TO FIX MISSING COLUMNS:');
    
    // Try to add validation_status if missing
    await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE trend_submissions 
        ADD COLUMN IF NOT EXISTS validation_status TEXT DEFAULT 'pending';
      `
    }).catch(e => console.log('   validation_status: ' + (e.message.includes('already exists') ? 'already exists ✅' : e.message)));

    // Try to add validation_count if missing
    await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE trend_submissions 
        ADD COLUMN IF NOT EXISTS validation_count INTEGER DEFAULT 0;
      `
    }).catch(e => console.log('   validation_count: ' + (e.message.includes('already exists') ? 'already exists ✅' : e.message)));

    // Try to add approve_count if missing
    await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE trend_submissions 
        ADD COLUMN IF NOT EXISTS approve_count INTEGER DEFAULT 0;
      `
    }).catch(e => console.log('   approve_count: ' + (e.message.includes('already exists') ? 'already exists ✅' : e.message)));

    // Try to add reject_count if missing
    await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE trend_submissions 
        ADD COLUMN IF NOT EXISTS reject_count INTEGER DEFAULT 0;
      `
    }).catch(e => console.log('   reject_count: ' + (e.message.includes('already exists') ? 'already exists ✅' : e.message)));

    // 10. Update trends to have proper validation values
    console.log('\n🔟 FIXING TREND VALIDATION VALUES:');
    const { error: updateError } = await supabase
      .from('trend_submissions')
      .update({
        validation_status: 'pending',
        validation_count: 0,
        approve_count: 0,
        reject_count: 0
      })
      .or('validation_status.is.null,validation_count.is.null')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (updateError) {
      console.log(`   ❌ Update error: ${updateError.message}`);
    } else {
      console.log('   ✅ Updated trends with proper validation fields');
    }

    // Final check
    console.log('\n✨ FINAL CHECK - TRENDS AVAILABLE NOW:');
    const { data: finalCheck, count: finalCount } = await supabase
      .from('trend_submissions')
      .select('*', { count: 'exact' })
      .or(`status.eq.submitted,status.eq.validating,validation_status.eq.pending,validation_count.eq.0`)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    console.log(`   ${finalCount || 0} trends should be available for validation`);

    // Diagnostic summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 DIAGNOSTIC SUMMARY:');
    console.log('='.repeat(60));
    
    if (finalCount === 0) {
      console.log('\n❌ NO TRENDS AVAILABLE - Possible reasons:');
      console.log('1. All trends have already been validated');
      console.log('2. RLS policies are blocking access');
      console.log('3. The status/validation_status fields have unexpected values');
      console.log('4. You are logged in as the same user who submitted the trends');
      console.log('\n🔧 SUGGESTED FIXES:');
      console.log('1. Run the SQL fix directly in Supabase dashboard');
      console.log('2. Check that you\'re testing with different user accounts');
      console.log('3. Temporarily disable RLS on trend_submissions table');
    } else {
      console.log('\n✅ TRENDS ARE AVAILABLE!');
      console.log(`Found ${finalCount} trends ready for validation.`);
      console.log('\nIf they still don\'t show on the verify page:');
      console.log('1. Clear your browser cache');
      console.log('2. Check the browser console for errors');
      console.log('3. Make sure you\'re logged in as a different user');
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
  }
}

// Run the debug
debugVerifyPage();