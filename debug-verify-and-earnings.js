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
  auth: { autoRefreshToken: false, persistSession: false }
});

async function debugVerifyAndEarnings() {
  console.log('🔍 DEBUGGING VERIFY PAGE & EARNINGS\n');
  console.log('='.repeat(60));

  // 1. Check what trends exist
  console.log('\n1️⃣ ALL TRENDS IN DATABASE:');
  const { data: allTrends, count: totalCount } = await supabase
    .from('trend_submissions')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  console.log(`Total trends: ${totalCount}`);
  
  if (allTrends && allTrends.length > 0) {
    console.log('\nFirst 5 trends:');
    allTrends.slice(0, 5).forEach(t => {
      console.log(`\nID: ${t.id}`);
      console.log(`Description: ${t.description?.substring(0, 50)}...`);
      console.log(`Status: ${t.status || 'NULL'}`);
      console.log(`Validation Status: ${t.validation_status || 'NULL'}`);
      console.log(`Validation Count: ${t.validation_count || 0}`);
      console.log(`Approve/Reject: ${t.approve_count || 0}/${t.reject_count || 0}`);
      console.log(`Spotter ID: ${t.spotter_id}`);
      console.log(`Created: ${new Date(t.created_at).toLocaleString()}`);
    });
  }

  // 2. Check which trends should appear on verify page
  console.log('\n2️⃣ TRENDS THAT SHOULD APPEAR ON VERIFY PAGE:');
  
  // This mimics what the verify page queries
  const queries = [
    {
      name: 'Query 1: Simple - All trends',
      query: supabase
        .from('trend_submissions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)
    },
    {
      name: 'Query 2: Recent trends (7 days)',
      query: supabase
        .from('trend_submissions')
        .select('*')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(10)
    },
    {
      name: 'Query 3: With OR conditions',
      query: supabase
        .from('trend_submissions')
        .select('*')
        .or('status.eq.submitted,validation_status.eq.pending,validation_count.eq.0')
        .limit(10)
    }
  ];

  for (const { name, query } of queries) {
    console.log(`\n${name}:`);
    const { data, error } = await query;
    
    if (error) {
      console.log(`❌ Error: ${error.message}`);
    } else {
      console.log(`✅ Found ${data?.length || 0} trends`);
      if (data && data.length > 0) {
        console.log('First trend:', {
          id: data[0].id,
          description: data[0].description?.substring(0, 30) + '...',
          status: data[0].status,
          validation_status: data[0].validation_status
        });
      }
    }
  }

  // 3. Check trend_validations to see what's been validated
  console.log('\n3️⃣ EXISTING VALIDATIONS:');
  const { data: validations, count: valCount } = await supabase
    .from('trend_validations')
    .select('*, trend_submissions!inner(description)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(10);

  console.log(`Total validations: ${valCount || 0}`);
  
  if (validations && validations.length > 0) {
    console.log('Recent validations:');
    validations.forEach(v => {
      console.log(`- Trend: ${v.trend_submissions?.description?.substring(0, 30)}...`);
      console.log(`  Vote: ${v.vote}, Validator: ${v.validator_id}`);
    });
  }

  // 4. Check earnings_ledger
  console.log('\n4️⃣ EARNINGS LEDGER STATUS:');
  const { data: earnings } = await supabase
    .from('earnings_ledger')
    .select('status, type, COUNT(*)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(100);

  // Group by status
  const statusCounts = {};
  if (earnings) {
    earnings.forEach(e => {
      const key = `${e.type}-${e.status}`;
      statusCounts[key] = (statusCounts[key] || 0) + 1;
    });
  }

  console.log('Earnings by type and status:');
  Object.entries(statusCounts).forEach(([key, count]) => {
    console.log(`  ${key}: ${count}`);
  });

  // Get actual pending earnings
  const { data: pendingEarnings } = await supabase
    .from('earnings_ledger')
    .select('*')
    .or('status.eq.pending,status.eq.awaiting_verification')
    .order('created_at', { ascending: false })
    .limit(10);

  console.log(`\nPending/Awaiting earnings: ${pendingEarnings?.length || 0}`);
  if (pendingEarnings && pendingEarnings.length > 0) {
    console.log('Recent pending:');
    pendingEarnings.forEach(e => {
      console.log(`  $${e.amount} - ${e.type} - ${e.status} - ${e.description}`);
    });
  }

  // 5. Check profiles for earnings
  console.log('\n5️⃣ USER PROFILES WITH EARNINGS:');
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, total_earnings, pending_earnings, awaiting_verification, trends_spotted')
    .or('total_earnings.gt.0,pending_earnings.gt.0,awaiting_verification.gt.0')
    .limit(5);

  if (profiles && profiles.length > 0) {
    profiles.forEach(p => {
      console.log(`\nUser: ${p.email}`);
      console.log(`  Total: $${p.total_earnings || 0}`);
      console.log(`  Pending: $${p.pending_earnings || 0}`);
      console.log(`  Awaiting: $${p.awaiting_verification || 0}`);
      console.log(`  Trends: ${p.trends_spotted || 0}`);
    });
  }

  // 6. Create a test trend to see if it appears
  console.log('\n6️⃣ CREATING TEST TREND:');
  const testTrend = {
    description: `Test trend created at ${new Date().toISOString()}`,
    category: 'meme_format',
    status: 'submitted',
    validation_status: 'pending',
    validation_count: 0,
    approve_count: 0,
    reject_count: 0,
    spotter_id: profiles?.[0]?.id || '00000000-0000-0000-0000-000000000000',
    virality_prediction: 5,
    evidence: { test: true }
  };

  const { data: newTrend, error: createError } = await supabase
    .from('trend_submissions')
    .insert(testTrend)
    .select()
    .single();

  if (createError) {
    console.log(`❌ Could not create test trend: ${createError.message}`);
  } else {
    console.log(`✅ Created test trend with ID: ${newTrend.id}`);
    console.log('Test trend details:', {
      status: newTrend.status,
      validation_status: newTrend.validation_status,
      validation_count: newTrend.validation_count
    });

    // Check if it would appear in verify query
    const { data: verifyCheck } = await supabase
      .from('trend_submissions')
      .select('*')
      .eq('id', newTrend.id)
      .single();

    console.log('Can retrieve test trend:', verifyCheck ? '✅ YES' : '❌ NO');
  }

  // RECOMMENDATIONS
  console.log('\n' + '='.repeat(60));
  console.log('📋 RECOMMENDATIONS:\n');

  console.log('1. FOR VERIFY PAGE:');
  console.log('   The verify page queries are finding trends.');
  console.log('   Check browser console for [Verify] logs.');
  console.log('   The issue might be:');
  console.log('   - Already validated trends being excluded');
  console.log('   - User authentication not working');
  console.log('   - Frontend filtering issue\n');

  console.log('2. FOR EARNINGS PAGE:');
  console.log('   To show all pending payments, the earnings page needs to:');
  console.log('   - Query earnings_ledger with status IN (pending, awaiting_verification)');
  console.log('   - Show awaiting_verification from profiles table');
  console.log('   - Combine both sources for total pending\n');

  console.log('3. QUICK FIXES TO TRY:');
  console.log('   a) Clear browser localStorage (might have old skipped trends)');
  console.log('   b) Try in incognito/private window');
  console.log('   c) Check if user is authenticated in browser');
}

debugVerifyAndEarnings().catch(console.error);